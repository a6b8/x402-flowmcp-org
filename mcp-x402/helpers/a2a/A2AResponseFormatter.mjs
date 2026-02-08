class A2AResponseFormatter {
    static formatSuccess( { taskId, toolName, mcpResult } ) {
        const textContent = A2AResponseFormatter.#extractTextFromMcpResult( { mcpResult } )

        const message = {
            'role': 'agent',
            'parts': [
                {
                    'type': 'text',
                    'text': textContent
                }
            ]
        }

        const artifact = {
            'name': `${toolName}-result`,
            'parts': [
                {
                    'type': 'data',
                    'data': mcpResult
                }
            ]
        }

        return { message, artifact }
    }


    static formatPaymentRequired( { paymentRequiredPayload } ) {
        const message = {
            'role': 'agent',
            'parts': [
                {
                    'type': 'text',
                    'text': 'Payment required to access this tool. Please provide an X402 payment.'
                },
                {
                    'type': 'data',
                    'data': {
                        'x402_payment_required': true,
                        'paymentRequirements': paymentRequiredPayload
                    }
                }
            ]
        }

        return { message }
    }


    static formatError( { errorMessage, errorCode } ) {
        const message = {
            'role': 'agent',
            'parts': [
                {
                    'type': 'text',
                    'text': `Error: ${errorMessage}`
                },
                {
                    'type': 'data',
                    'data': {
                        'error': true,
                        'code': errorCode || -1,
                        'message': errorMessage
                    }
                }
            ]
        }

        return { message }
    }


    static buildTaskStatusEvent( { taskId, state, message } ) {
        const event = {
            'jsonrpc': '2.0',
            'method': 'tasks/status',
            'params': {
                'id': taskId,
                'status': {
                    'state': state,
                    'timestamp': new Date().toISOString()
                },
                'final': [ 'completed', 'failed', 'canceled' ].includes( state )
            }
        }

        if( message ) {
            event[ 'params' ][ 'status' ][ 'message' ] = message
        }

        return { event }
    }


    static buildTaskArtifactEvent( { taskId, artifact } ) {
        const event = {
            'jsonrpc': '2.0',
            'method': 'tasks/artifact',
            'params': {
                'id': taskId,
                'artifact': artifact
            }
        }

        return { event }
    }


    static #extractTextFromMcpResult( { mcpResult } ) {
        if( !mcpResult ) {
            return 'No result'
        }

        const { content } = mcpResult
        if( !content || !Array.isArray( content ) ) {
            return JSON.stringify( mcpResult )
        }

        const texts = content
            .filter( ( c ) => c.type === 'text' )
            .map( ( c ) => c.text )

        if( texts.length > 0 ) {
            return texts.join( '\n' )
        }

        return JSON.stringify( mcpResult )
    }
}


export { A2AResponseFormatter }
