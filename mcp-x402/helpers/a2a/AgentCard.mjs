class AgentCard {
    static generate( { schemas, restrictedCalls, serverUrl } ) {
        const skills = schemas
            .reduce( ( acc, schema ) => {
                const { namespace } = schema
                Object
                    .keys( schema[ 'routes' ] || {} )
                    .forEach( ( routeName ) => {
                        const route = schema[ 'routes' ][ routeName ]
                        const routeNameSnakeCase = routeName
                            .replace( /([a-z0-9])([A-Z])/g, '$1_$2' )
                            .toLowerCase()
                        const suffixSnakeCase = namespace
                            .replace( /([a-z0-9])([A-Z])/g, '$1_$2' )
                            .toLowerCase()
                        const toolName = `${routeNameSnakeCase}_${suffixSnakeCase}`

                        const isRestricted = restrictedCalls
                            .some( ( rc ) => rc[ 'name' ] === toolName )

                        const tags = [ `namespace:${namespace}` ]
                        if( isRestricted ) {
                            tags.push( 'x402-payment-required' )
                        }

                        const skill = {
                            'id': toolName,
                            'name': toolName,
                            'description': route.description || `Tool: ${toolName}`,
                            'tags': tags,
                            'examples': []
                        }

                        const parameters = route.parameters || []
                        if( parameters.length > 0 ) {
                            skill[ 'examples' ] = [
                                `Call ${toolName} with required parameters`
                            ]
                        }

                        acc.push( skill )
                    } )

                return acc
            }, [] )

        const card = {
            'name': 'x402 MCP Server Agent',
            'description': 'X402-enabled MCP server providing blockchain data tools with on-chain micropayments. Some tools are free, some require X402 payment in test USDC.',
            'url': serverUrl,
            'version': '1.0.0',
            'supported_interfaces': [
                {
                    'url': `${serverUrl}/a2a`,
                    'protocol_binding': 'JSONRPC',
                    'protocol_version': '1.0'
                }
            ],
            'capabilities': {
                'streaming': true,
                'pushNotifications': false,
                'stateTransitionHistory': false,
                'extensions': [
                    {
                        'uri': 'https://github.com/google-agentic-commerce/ap2/tree/v0.1',
                        'description': 'Supports the Agent Payments Protocol.',
                        'required': true,
                        'params': {
                            'roles': [ 'merchant' ]
                        }
                    },
                    {
                        'uri': 'https://github.com/google-a2a/a2a-x402/v0.1',
                        'description': 'Supports payments using the x402 protocol for on-chain settlement.',
                        'required': true
                    }
                ]
            },
            'default_input_modes': [ 'text', 'data' ],
            'default_output_modes': [ 'text', 'data' ],
            'skills': skills,
            'security': [
                { 'public': [] }
            ]
        }

        return { card }
    }
}


export { AgentCard }
