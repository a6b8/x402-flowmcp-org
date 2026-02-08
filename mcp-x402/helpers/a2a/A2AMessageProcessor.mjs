import { A2AResponseFormatter } from './A2AResponseFormatter.mjs'
import { A2APaymentBridge } from './A2APaymentBridge.mjs'


class A2AMessageProcessor {
    static #toolNames = []
    static #keywordMap = {}
    static #mcpEndpoint = ''
    static #paymentMetaKey = 'x402/payment'


    static init( { toolNames, mcpEndpoint, paymentMetaKey } ) {
        A2AMessageProcessor.#toolNames = toolNames
        A2AMessageProcessor.#mcpEndpoint = mcpEndpoint
        A2AMessageProcessor.#paymentMetaKey = paymentMetaKey || 'x402/payment'

        A2AMessageProcessor.#keywordMap = {
            'balance': 'get_balances_evm_avax',
            'balances': 'get_balances_evm_avax',
            'transaction': 'get_transactions_evm_avax',
            'transactions': 'get_transactions_evm_avax',
            'collectible': 'get_collectibles_evm_avax',
            'collectibles': 'get_collectibles_evm_avax',
            'nft': 'get_collectibles_evm_avax',
            'nfts': 'get_collectibles_evm_avax',
            'token info': 'get_token_info_evm_avax',
            'token holders': 'get_token_holders_evm_avax',
            'holders': 'get_token_holders_evm_avax',
            'activity': 'get_activity_evm_avax',
            'ping': 'free_ping_x402',
            'paid ping': 'paid_ping_x402'
        }
    }


    static async processMessage( { message, existingTaskId } ) {
        const { toolName, toolArguments } = A2AMessageProcessor
            .#matchTool( { message } )

        if( !toolName ) {
            const { message: errorMsg } = A2AResponseFormatter
                .formatError( {
                    'errorMessage': 'Could not determine which tool to call. Please specify the tool name in a DataPart or include it in your message.',
                    'errorCode': -32600
                } )

            return {
                'state': 'failed',
                'message': errorMsg,
                'artifact': null
            }
        }

        const { paymentPayload, paymentFound } = A2APaymentBridge
            .extractPaymentFromMessage( { message } )

        const { mcpResponse } = await A2AMessageProcessor
            .#callMcpInternal( { toolName, toolArguments, paymentPayload, paymentFound } )

        if( !mcpResponse ) {
            const { message: errorMsg } = A2AResponseFormatter
                .formatError( {
                    'errorMessage': 'Internal MCP call failed',
                    'errorCode': -32603
                } )

            return {
                'state': 'failed',
                'message': errorMsg,
                'artifact': null
            }
        }

        const { isRequired, paymentRequirements } = A2APaymentBridge
            .isPaymentRequired( { mcpResponse } )

        if( isRequired ) {
            const { message: payMsg } = A2AResponseFormatter
                .formatPaymentRequired( { 'paymentRequiredPayload': paymentRequirements } )

            return {
                'state': 'input_required',
                'message': payMsg,
                'artifact': null
            }
        }

        if( mcpResponse[ 'error' ] ) {
            const { message: errorMsg } = A2AResponseFormatter
                .formatError( {
                    'errorMessage': mcpResponse[ 'error' ][ 'message' ] || 'MCP error',
                    'errorCode': mcpResponse[ 'error' ][ 'code' ] || -1
                } )

            return {
                'state': 'failed',
                'message': errorMsg,
                'artifact': null
            }
        }

        const mcpResult = mcpResponse[ 'result' ] || null
        const { message: successMsg, artifact } = A2AResponseFormatter
            .formatSuccess( { 'taskId': existingTaskId, toolName, mcpResult } )

        return {
            'state': 'completed',
            'message': successMsg,
            'artifact': artifact
        }
    }


    static #matchTool( { message } ) {
        if( !message || !message[ 'parts' ] ) {
            return { toolName: null, toolArguments: {} }
        }

        const dataPart = message[ 'parts' ]
            .find( ( part ) =>
                part[ 'type' ] === 'data' &&
                part[ 'data' ] &&
                part[ 'data' ][ 'tool_name' ]
            )

        if( dataPart ) {
            const toolName = dataPart[ 'data' ][ 'tool_name' ]
            const toolArguments = dataPart[ 'data' ][ 'arguments' ] || {}

            return { toolName, toolArguments }
        }

        const textPart = message[ 'parts' ]
            .find( ( part ) => part[ 'type' ] === 'text' )

        if( !textPart ) {
            return { toolName: null, toolArguments: {} }
        }

        const text = textPart[ 'text' ] || ''
        const textLower = text.toLowerCase()

        const exactMatch = A2AMessageProcessor.#toolNames
            .find( ( name ) => textLower.includes( name ) )

        if( exactMatch ) {
            return { toolName: exactMatch, toolArguments: {} }
        }

        const keywordEntries = Object.entries( A2AMessageProcessor.#keywordMap )
            .sort( ( a, b ) => b[ 0 ].length - a[ 0 ].length )
        const keywordMatch = keywordEntries
            .find( ( [ keyword ] ) => textLower.includes( keyword ) )

        if( keywordMatch ) {
            const toolArguments = A2AMessageProcessor
                .#extractArgumentsFromText( { text } )

            return { toolName: keywordMatch[ 1 ], toolArguments }
        }

        return { toolName: null, toolArguments: {} }
    }


    static #extractArgumentsFromText( { text } ) {
        const args = {}

        const addressMatch = text.match( /0x[a-fA-F0-9]{40}/ )
        if( addressMatch ) {
            args[ 'walletAddress' ] = addressMatch[ 0 ]
        }

        const chainPatterns = {
            'fuji': 'AVALANCHE_FUJI',
            'avalanche fuji': 'AVALANCHE_FUJI',
            'avalanche mainnet': 'AVALANCHE_MAINNET',
            'avalanche': 'AVALANCHE_MAINNET',
            'avax': 'AVALANCHE_MAINNET'
        }

        const textLower = text.toLowerCase()
        Object
            .entries( chainPatterns )
            .forEach( ( [ pattern, chainName ] ) => {
                if( textLower.includes( pattern ) && !args[ 'chainName' ] ) {
                    args[ 'chainName' ] = chainName
                }
            } )

        return args
    }


    static async #callMcpInternal( { toolName, toolArguments, paymentPayload, paymentFound } ) {
        const mcpRequest = {
            'jsonrpc': '2.0',
            'id': crypto.randomUUID(),
            'method': 'tools/call',
            'params': {
                'name': toolName,
                'arguments': toolArguments
            }
        }

        if( paymentFound && paymentPayload ) {
            const { meta } = A2APaymentBridge
                .buildPaymentMeta( {
                    paymentPayload,
                    'paymentMetaKey': A2AMessageProcessor.#paymentMetaKey
                } )
            mcpRequest[ 'params' ][ '_meta' ] = meta
        }

        try {
            const response = await fetch( A2AMessageProcessor.#mcpEndpoint, {
                'method': 'POST',
                'headers': {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/event-stream'
                },
                'body': JSON.stringify( mcpRequest )
            } )

            const contentType = response.headers.get( 'content-type' ) || ''

            if( contentType.includes( 'text/event-stream' ) ) {
                const sseText = await response.text()
                const mcpResponse = A2AMessageProcessor
                    .#parseSseResponse( { sseText } )

                return { mcpResponse }
            }

            const mcpResponse = await response.json()

            return { mcpResponse }
        } catch( e ) {
            console.error( '[A2A] Internal MCP call failed:', e.message )

            return { mcpResponse: null }
        }
    }


    static #parseSseResponse( { sseText } ) {
        const lines = sseText.split( '\n' )
        const dataLines = lines
            .filter( ( line ) => line.startsWith( 'data: ' ) )

        if( dataLines.length === 0 ) {
            return null
        }

        const lastDataLine = dataLines[ dataLines.length - 1 ]
        const jsonStr = lastDataLine.slice( 6 )

        try {
            const parsed = JSON.parse( jsonStr )

            return parsed
        } catch( e ) {
            return null
        }
    }
}


export { A2AMessageProcessor }
