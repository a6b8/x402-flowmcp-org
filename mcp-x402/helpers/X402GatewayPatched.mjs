// X402 Gateway v2 for MCP - PATCHED for Streamable Transport
// Fixes: Intercepts res.write/res.end in addition to res.json
// for MCP Streamable HTTP transport compatibility

import { JsonRpc, Meta } from 'x402-mcp-middleware/v2'
import { ClientExact, ServerExact } from 'x402-core/v2/exact/evm'


class X402GatewayPatched {
    static mcp( { paymentRequiredCache, serverExactPool, config } ) {
        const {
            paymentMetaKey = Meta.DEFAULT_PAYMENT_KEY,
            paymentResponseMetaKey = Meta.DEFAULT_PAYMENT_RESPONSE_KEY,
            simulateBeforeSettle = true
        } = config

        return async function x402Middleware( req, res, next ) {
            const body = req.body

            // No body (e.g., SSE connection) - pass through
            if( !body ) {
                return next()
            }

            // Check if notification (no id) - pass through without response
            const { isNotification } = JsonRpc.isNotification( { request: body } )
            if( isNotification ) {
                return next()
            }

            const { id, method, params } = body

            // Only intercept tools/call
            if( method !== 'tools/call' ) {
                return next()
            }

            const toolName = params?.name
            if( !toolName ) {
                return next()
            }

            // Check if this tool is restricted
            const { paymentRequiredPayload, isRestricted } = paymentRequiredCache
                .get( { method: 'tools/call', name: toolName } )

            if( !isRestricted ) {
                return next()
            }

            // Tool is restricted - check for payment
            const { paymentPayload, paymentFound } = Meta
                .getPaymentFromMeta( { params, paymentMetaKey } )

            if( !paymentFound ) {
                // No payment provided - return 402
                const { errorData } = Meta
                    .createPaymentRequiredErrorData( { paymentRequiredPayload } )
                const { response } = JsonRpc
                    .createPaymentRequiredResponse( { id, paymentRequiredPayload: errorData } )

                return res.status( 200 ).json( response )
            }

            // Validate payment payload
            const validationResult = await X402GatewayPatched
                .#validatePayment( { paymentPayload, paymentRequiredPayload, serverExactPool, simulateBeforeSettle } )

            if( !validationResult.valid ) {
                const { response } = JsonRpc
                    .createErrorResponse( {
                        id,
                        code: validationResult.errorCode,
                        message: validationResult.errorMessage,
                        data: validationResult.errorData
                    } )

                return res.status( 200 ).json( response )
            }

            // Store settlement context for response interceptor
            res.locals.x402 = {
                paymentPayload,
                paymentRequiredPayload,
                matchedRequirement: validationResult.matchedRequirement,
                serverExact: validationResult.serverExact,
                requestId: id
            }

            // Wrap res.json for standard Express responses
            const originalJson = res.json.bind( res )
            res.json = async function( responseBody ) {
                const x402Context = res.locals.x402

                if( !x402Context ) {
                    return originalJson( responseBody )
                }

                // Check if response is an error
                if( responseBody.error ) {
                    return originalJson( responseBody )
                }

                // Attempt settlement
                const settlementResult = await X402GatewayPatched
                    .#settlePayment( {
                        paymentPayload: x402Context.paymentPayload,
                        matchedRequirement: x402Context.matchedRequirement,
                        serverExact: x402Context.serverExact
                    } )

                if( !settlementResult.ok ) {
                    // Settlement failed - return 402 with failure details
                    const { mergedErrorData } = Meta
                        .mergePaymentResponseIntoError( {
                            errorData: x402Context.paymentRequiredPayload,
                            paymentResponse: settlementResult.settlementResponse,
                            paymentResponseMetaKey
                        } )

                    const { response } = JsonRpc
                        .createPaymentRequiredResponse( { id: responseBody.id, paymentRequiredPayload: mergedErrorData } )

                    return originalJson( response )
                }

                // Settlement successful - merge payment response into result
                const { mergedResult } = Meta
                    .mergePaymentResponseIntoResult( {
                        result: responseBody.result,
                        paymentResponse: settlementResult.settlementResponse,
                        paymentResponseMetaKey
                    } )

                responseBody.result = mergedResult

                return originalJson( responseBody )
            }

            // PATCH: Also wrap res.write and res.end for streamable transport
            // MCP Streamable HTTP transport writes via res.write(), not res.json()
            const chunks = []
            const originalWrite = res.write.bind( res )
            const originalEnd = res.end.bind( res )

            res.write = function( chunk, encoding, callback ) {
                // Buffer chunks for later processing
                if( chunk ) {
                    chunks.push( Buffer.isBuffer( chunk ) ? chunk : Buffer.from( chunk, encoding || 'utf8' ) )
                }

                // Don't write yet - we'll write in end() after settlement
                if( typeof encoding === 'function' ) {
                    encoding()
                } else if( typeof callback === 'function' ) {
                    callback()
                }

                return true
            }

            res.end = async function( chunk, encoding, callback ) {
                const x402Context = res.locals.x402

                // Handle final chunk
                if( chunk ) {
                    chunks.push( Buffer.isBuffer( chunk ) ? chunk : Buffer.from( chunk, encoding || 'utf8' ) )
                }

                // If no x402 context, just pass through
                if( !x402Context ) {
                    res.write = originalWrite
                    chunks.forEach( ( c ) => originalWrite( c ) )

                    return originalEnd( null, null, callback )
                }

                // Combine all chunks
                const fullBody = Buffer.concat( chunks ).toString( 'utf8' )

                // Try to parse as JSON-RPC response
                // MCP Streamable uses SSE format: "data: {json}\n\n"
                let responseBody = null
                let sseDataLine = null
                try {
                    // Find SSE data line
                    const lines = fullBody.split( '\n' ).filter( ( l ) => l.trim() )
                    sseDataLine = lines.find( ( l ) => l.startsWith( 'data: ' ) )

                    if( !sseDataLine ) {
                        res.write = originalWrite
                        chunks.forEach( ( c ) => originalWrite( c ) )

                        return originalEnd( null, null, callback )
                    }

                    // Extract JSON from SSE data line
                    const jsonStr = sseDataLine.slice( 6 ) // Remove "data: " prefix
                    responseBody = JSON.parse( jsonStr )
                } catch( e ) {
                    // Not JSON or parse error - pass through unchanged
                    res.write = originalWrite
                    chunks.forEach( ( c ) => originalWrite( c ) )

                    return originalEnd( null, null, callback )
                }

                // Check if response is an error
                if( responseBody.error ) {
                    // Pass through error responses unchanged
                    res.write = originalWrite
                    chunks.forEach( ( c ) => originalWrite( c ) )

                    return originalEnd( null, null, callback )
                }

                // Attempt settlement
                const settlementResult = await X402GatewayPatched
                    .#settlePayment( {
                        paymentPayload: x402Context.paymentPayload,
                        matchedRequirement: x402Context.matchedRequirement,
                        serverExact: x402Context.serverExact
                    } )

                if( !settlementResult.ok ) {
                    // Settlement failed - replace response with 402
                    const { mergedErrorData } = Meta
                        .mergePaymentResponseIntoError( {
                            errorData: x402Context.paymentRequiredPayload,
                            paymentResponse: settlementResult.settlementResponse,
                            paymentResponseMetaKey
                        } )

                    const { response: errorResponse } = JsonRpc
                        .createPaymentRequiredResponse( { id: x402Context.requestId, paymentRequiredPayload: mergedErrorData } )

                    // Format as SSE: "data: {json}\n\n"
                    const sseResponse = `data: ${JSON.stringify( errorResponse )}\n\n`

                    res.write = originalWrite
                    originalWrite( sseResponse )

                    return originalEnd( null, null, callback )
                }

                // Settlement successful - merge payment response into result
                const { mergedResult } = Meta
                    .mergePaymentResponseIntoResult( {
                        result: responseBody.result,
                        paymentResponse: settlementResult.settlementResponse,
                        paymentResponseMetaKey
                    } )

                responseBody.result = mergedResult

                // Format as SSE: "data: {json}\n\n"
                const sseResponse = `data: ${JSON.stringify( responseBody )}\n\n`

                res.write = originalWrite
                originalWrite( sseResponse )

                return originalEnd( null, null, callback )
            }

            return next()
        }
    }


    static async #validatePayment( { paymentPayload, paymentRequiredPayload, serverExactPool, simulateBeforeSettle } ) {
        try {
            // Validate payload structure
            const { validationOk: shapeOk, validationIssueList: shapeIssues } = ClientExact
                .validatePaymentRequiredResponsePayload( { paymentRequiredResponsePayloadToValidate: paymentPayload } )

            // Extract network from payment
            const { accepted } = paymentPayload
            if( !accepted || !accepted.network ) {
                return {
                    valid: false,
                    errorCode: JsonRpc.ErrorCodes.INVALID_PARAMS,
                    errorMessage: 'Missing network in payment payload',
                    errorData: null
                }
            }

            const paymentNetworkId = accepted.network

            // Get ServerExact for this network
            const { serverExact, found } = serverExactPool
                .get( { paymentNetworkId } )

            if( !found ) {
                return {
                    valid: false,
                    errorCode: JsonRpc.ErrorCodes.INVALID_PARAMS,
                    errorMessage: `Unsupported payment network: ${paymentNetworkId}`,
                    errorData: null
                }
            }

            // Validate payment against requirements
            const { paymentSignatureRequestPayloadValidationOutcome } = await serverExact
                .validatePaymentSignatureRequestPayload( {
                    decodedPaymentSignatureRequestPayloadToValidate: paymentPayload,
                    paymentRequiredResponsePayload: paymentRequiredPayload
                } )

            if( !paymentSignatureRequestPayloadValidationOutcome.validationOk ) {
                return {
                    valid: false,
                    errorCode: JsonRpc.ErrorCodes.INVALID_PARAMS,
                    errorMessage: 'Payment validation failed',
                    errorData: paymentSignatureRequestPayloadValidationOutcome.validationIssueList
                }
            }

            const { matchedPaymentRequirementsFromClientPayload } = paymentSignatureRequestPayloadValidationOutcome

            // Optional simulation
            if( simulateBeforeSettle ) {
                const { paymentSimulationOutcome } = await serverExact
                    .simulateTransaction( {
                        decodedPaymentSignatureRequestPayload: paymentPayload,
                        matchedPaymentRequirementsFromClientPayload
                    } )

                if( !paymentSimulationOutcome.simulationOk ) {
                    return {
                        valid: false,
                        errorCode: JsonRpc.ErrorCodes.INTERNAL_ERROR,
                        errorMessage: 'Payment simulation failed',
                        errorData: { simulationError: paymentSimulationOutcome.simulationError }
                    }
                }
            }

            return {
                valid: true,
                serverExact,
                matchedRequirement: matchedPaymentRequirementsFromClientPayload
            }
        } catch( e ) {
            return {
                valid: false,
                errorCode: JsonRpc.ErrorCodes.INTERNAL_ERROR,
                errorMessage: `Validation error: ${e.message}`,
                errorData: null
            }
        }
    }


    static async #settlePayment( { paymentPayload, matchedRequirement, serverExact } ) {
        try {
            const { paymentSettlementOutcome } = await serverExact
                .settleTransaction( {
                    decodedPaymentSignatureRequestPayload: paymentPayload,
                    matchedPaymentRequirementsFromClientPayload: matchedRequirement
                } )

            if( !paymentSettlementOutcome.settlementOk ) {
                return {
                    ok: false,
                    settlementResponse: paymentSettlementOutcome.settlementResponse
                }
            }

            return {
                ok: true,
                settlementResponse: paymentSettlementOutcome.settlementResponse
            }
        } catch( e ) {
            return {
                ok: false,
                settlementResponse: {
                    success: false,
                    errorReason: e.message
                }
            }
        }
    }
}


export { X402GatewayPatched }
