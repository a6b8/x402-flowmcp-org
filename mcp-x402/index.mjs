import fs from 'fs'

import { FlowMCP } from 'flowmcp'
import { RemoteServer } from './flowmcpServers/src/index.mjs'
import { schema as avax } from './schemas/avax.mjs'
import { schema as devToolsSchema } from './schemas/dev-tools.mjs'
import { X402MiddlewarePatched as X402Middleware } from './helpers/X402MiddlewarePatched.mjs'
import { ServerManager } from './helpers/ServerManager.mjs'
import { HTML } from './helpers/HTML.mjs'
import { UIWidgets } from './helpers/UIWidgets.mjs'
import { AgentCard } from './helpers/a2a/AgentCard.mjs'
import { A2ARouter } from './helpers/a2a/A2ARouter.mjs'
import { A2AMessageProcessor } from './helpers/a2a/A2AMessageProcessor.mjs'


const config = {
    'silent': false,
    'envPath': './../.via402.env',
    'snowtraceAddressBaseUrl': 'https://testnet.snowtrace.io/address',
    'envSelection': [
        [ 'facilitatorPublicKey',    'X402_FACILITATOR_PUBLIC_KEY'    ],
        [ 'facilitatorPrivateKey',   'X402_FACILITATOR_PRIVATE_KEY'   ],
        [ 'recipientAddress',        'X402_RECEPIENT_PUBLIC_KEY'      ],
        [ 'fujiProviderUrl',         'X402_FUJI_PROVIDER_URL'         ],
        [ 'baseSepoliaProviderUrl',  'X402_BASE_SEPOLIA_PROVIDER_URL' ],
        [ 'DUNE_SIM_API_KEY',        'DUNE_SIM_API_KEY'               ]
    ],
    'arrayOfRoutes': [
        {
            'includeNamespaces': [],
            'routePath': '/mcp',
            'protocol': 'streamable'
        }
    ],
    'x402V2ExactEvmConfiguration': {
        'contractCatalog': {
            'usdc-fuji': {
                'paymentNetworkId': 'eip155:43113',
                'address': '0x5425890298aed601595a70AB815c96711a31Bc65',
                'decimals': 6,
                'domainName': 'USD Coin',
                'domainVersion': '2'
            },
            'usdc-base-sepolia': {
                'paymentNetworkId': 'eip155:84532',
                'address': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
                'decimals': 6,
                'domainName': 'USDC',
                'domainVersion': '2'
            }
        },
        'paymentOptionCatalog': {
            'usdc-fuji-cheap': {
                'contractId': 'usdc-fuji',
                'amount': '100',
                'payTo': '{{recipient}}',
                'maxTimeoutSeconds': 300
            },
            'usdc-fuji-standard': {
                'contractId': 'usdc-fuji',
                'amount': '5000',
                'payTo': '{{recipient}}',
                'maxTimeoutSeconds': 300
            },
            'usdc-fuji-premium': {
                'contractId': 'usdc-fuji',
                'amount': '77700',
                'payTo': '{{recipient}}',
                'maxTimeoutSeconds': 300
            },
            'usdc-base-cheap': {
                'contractId': 'usdc-base-sepolia',
                'amount': '100',
                'payTo': '{{recipient}}',
                'maxTimeoutSeconds': 300
            },
            'usdc-base-standard': {
                'contractId': 'usdc-base-sepolia',
                'amount': '5000',
                'payTo': '{{recipient}}',
                'maxTimeoutSeconds': 300
            },
            'usdc-base-premium': {
                'contractId': 'usdc-base-sepolia',
                'amount': '77700',
                'payTo': '{{recipient}}',
                'maxTimeoutSeconds': 300
            }
        },
        'restrictedCalls': [
            // =========================================================================
            // BASIC PING TOOLS
            // =========================================================================
            {
                'method': 'tools/call',
                'name': 'paid_ping_x402',
                'acceptedPaymentOptionIdList': [ 'usdc-fuji-cheap', 'usdc-base-cheap' ]
            },

            // =========================================================================
            // PRODUCTION TOOLS (avax schema)
            // =========================================================================
            {
                'method': 'tools/call',
                'name': 'get_activity_evm_avax',
                'acceptedPaymentOptionIdList': [ 'usdc-fuji-standard', 'usdc-base-standard' ]
            },
            {
                'method': 'tools/call',
                'name': 'get_token_holders_evm_avax',
                'acceptedPaymentOptionIdList': [ 'usdc-fuji-premium', 'usdc-base-premium' ]
            },
            {
                'method': 'tools/call',
                'name': 'get_collectibles_evm_avax',
                'acceptedPaymentOptionIdList': [ 'usdc-fuji-standard', 'usdc-base-standard' ]
            },

            // =========================================================================
            // PAYMENT TIER TEST TOOLS
            // =========================================================================
            {
                'method': 'tools/call',
                'name': 'test_tier_cheap_x402',
                'acceptedPaymentOptionIdList': [ 'usdc-fuji-cheap', 'usdc-base-cheap' ]
            },
            {
                'method': 'tools/call',
                'name': 'test_tier_standard_x402',
                'acceptedPaymentOptionIdList': [ 'usdc-fuji-standard', 'usdc-base-standard' ]
            },
            {
                'method': 'tools/call',
                'name': 'test_tier_premium_x402',
                'acceptedPaymentOptionIdList': [ 'usdc-fuji-premium', 'usdc-base-premium' ]
            },

            // =========================================================================
            // CHAIN-SPECIFIC TEST TOOLS
            // =========================================================================
            {
                'method': 'tools/call',
                'name': 'test_chain_fuji_only_x402',
                'acceptedPaymentOptionIdList': [ 'usdc-fuji-cheap' ]
            },
            {
                'method': 'tools/call',
                'name': 'test_chain_base_only_x402',
                'acceptedPaymentOptionIdList': [ 'usdc-base-cheap' ]
            },
            {
                'method': 'tools/call',
                'name': 'test_chain_multi_x402',
                'acceptedPaymentOptionIdList': [ 'usdc-fuji-cheap', 'usdc-base-cheap' ]
            },

            // =========================================================================
            // GATE SIMULATION TOOLS - Infrastructure (G1-G5)
            // =========================================================================
            {
                'method': 'tools/call',
                'name': 'sim_chain_inactive_x402',
                'acceptedPaymentOptionIdList': [ 'usdc-fuji-cheap', 'usdc-base-cheap' ]
            },
            {
                'method': 'tools/call',
                'name': 'sim_route_inactive_x402',
                'acceptedPaymentOptionIdList': [ 'usdc-fuji-cheap', 'usdc-base-cheap' ]
            },
            {
                'method': 'tools/call',
                'name': 'sim_contract_unapproved_x402',
                'acceptedPaymentOptionIdList': [ 'usdc-fuji-cheap', 'usdc-base-cheap' ]
            },
            {
                'method': 'tools/call',
                'name': 'sim_wallet_not_configured_x402',
                'acceptedPaymentOptionIdList': [ 'usdc-fuji-cheap', 'usdc-base-cheap' ]
            },
            {
                'method': 'tools/call',
                'name': 'sim_wallet_unfunded_x402',
                'acceptedPaymentOptionIdList': [ 'usdc-fuji-cheap', 'usdc-base-cheap' ]
            },

            // =========================================================================
            // GATE SIMULATION TOOLS - Trust & Risk (G6-G7)
            // =========================================================================
            {
                'method': 'tools/call',
                'name': 'sim_recipient_blacklisted_x402',
                'acceptedPaymentOptionIdList': [ 'usdc-fuji-cheap', 'usdc-base-cheap' ]
            },
            {
                'method': 'tools/call',
                'name': 'sim_recipient_flagged_x402',
                'acceptedPaymentOptionIdList': [ 'usdc-fuji-cheap', 'usdc-base-cheap' ]
            },
            {
                'method': 'tools/call',
                'name': 'sim_server_untrusted_x402',
                'acceptedPaymentOptionIdList': [ 'usdc-fuji-cheap', 'usdc-base-cheap' ]
            },

            // =========================================================================
            // GATE SIMULATION TOOLS - Consent (PRD-03)
            // =========================================================================
            {
                'method': 'tools/call',
                'name': 'sim_consent_required_x402',
                'acceptedPaymentOptionIdList': [ 'usdc-fuji-cheap', 'usdc-base-cheap' ]
            },
            {
                'method': 'tools/call',
                'name': 'sim_consent_expired_x402',
                'acceptedPaymentOptionIdList': [ 'usdc-fuji-cheap', 'usdc-base-cheap' ]
            },
            {
                'method': 'tools/call',
                'name': 'sim_consent_declined_x402',
                'acceptedPaymentOptionIdList': [ 'usdc-fuji-cheap', 'usdc-base-cheap' ]
            },
            {
                'method': 'tools/call',
                'name': 'sim_allowance_expired_x402',
                'acceptedPaymentOptionIdList': [ 'usdc-fuji-cheap', 'usdc-base-cheap' ]
            },
            {
                'method': 'tools/call',
                'name': 'sim_policy_blocked_x402',
                'acceptedPaymentOptionIdList': [ 'usdc-fuji-cheap', 'usdc-base-cheap' ]
            },

            // =========================================================================
            // GATE SIMULATION TOOLS - Budget & Credits (PRD-04)
            // =========================================================================
            {
                'method': 'tools/call',
                'name': 'sim_budget_exceeded_x402',
                'acceptedPaymentOptionIdList': [ 'usdc-fuji-cheap', 'usdc-base-cheap' ]
            },
            {
                'method': 'tools/call',
                'name': 'sim_credits_exhausted_x402',
                'acceptedPaymentOptionIdList': [ 'usdc-fuji-cheap', 'usdc-base-cheap' ]
            },
            {
                'method': 'tools/call',
                'name': 'sim_credits_insufficient_x402',
                'acceptedPaymentOptionIdList': [ 'usdc-fuji-cheap', 'usdc-base-cheap' ]
            }
        ]
    },
    'server': {
        'payToAddressMap': {
            'recipient': null
        },
        'providerUrlByPaymentNetworkId': {
            'eip155:43113': null,
            'eip155:84532': null
        },
        'facilitatorPrivateKeyByPaymentNetworkId': {
            'eip155:43113': null,
            'eip155:84532': null
        },
        'defaultMaxTimeoutSeconds': 300,
        'simulateBeforeSettle': true,
        'silent': false
    },
    'mcp': {
        'paymentMetaKey': 'x402/payment',
        'paymentResponseMetaKey': 'x402/payment-response',
        'resourcePrefix': 'mcp://tool/'
    }
}


const {
    silent,
    envPath,
    envSelection,
    arrayOfRoutes,
    x402V2ExactEvmConfiguration,
    server: serverConfig,
    mcp: mcpConfig,
    snowtraceAddressBaseUrl
} = config

const { routePath } = arrayOfRoutes[ 0 ]
const { restrictedCalls } = x402V2ExactEvmConfiguration


const { version } = ServerManager
    .getNpmPackageVersion( { 'path': './package.json' } )
console.log( `Starting MCP X402 Server v2 - Version ${version}` )

const { port, environment } = ServerManager
    .getArgs( { argv: process.argv } )
const { x402Credentials, x402PrivateKey, DUNE_SIM_API_KEY } = ServerManager
    .getX402Credentials( { environment, envPath, envSelection } )

const {
    facilitatorPublicKey,
    facilitatorPrivateKey,
    recipientAddress,
    fujiProviderUrl,
    baseSepoliaProviderUrl
} = x402Credentials

serverConfig[ 'payToAddressMap' ][ 'recipient' ] = recipientAddress

serverConfig[ 'providerUrlByPaymentNetworkId' ][ 'eip155:43113' ] = fujiProviderUrl
serverConfig[ 'facilitatorPrivateKeyByPaymentNetworkId' ][ 'eip155:43113' ] = facilitatorPrivateKey

serverConfig[ 'providerUrlByPaymentNetworkId' ][ 'eip155:84532' ] = baseSepoliaProviderUrl
serverConfig[ 'facilitatorPrivateKeyByPaymentNetworkId' ][ 'eip155:84532' ] = facilitatorPrivateKey

const envObject = { DUNE_SIM_API_KEY }
console.log( 'Using DUNE_SIM_API_KEY:', DUNE_SIM_API_KEY ? '****' + DUNE_SIM_API_KEY.slice( -4 ) : 'not set' )

const objectOfSchemaArrays = arrayOfRoutes
    .reduce( ( acc, route ) => {
        acc[ route.routePath ] = [ avax, devToolsSchema ]

        return acc
    }, {} )

const remoteServer = new RemoteServer( { silent } )
const app = remoteServer.getApp()

remoteServer
    .setConfig( {
        overwrite: {
            port: parseInt( port ),
            serverOptions: {
                capabilities: {
                    'experimental': {
                        'io.modelcontextprotocol/ui': {
                            'version': '2025-03-26',
                            'mimeTypes': [ 'text/html;profile=mcp-app' ]
                        }
                    }
                }
            }
        }
    } )

const { routesActivationPayloads } = RemoteServer
    .prepareRoutesActivationPayloads( { arrayOfRoutes, objectOfSchemaArrays, envObject } )

const middleware = await X402Middleware
    .create( {
        x402V2ExactEvmConfiguration,
        'server': serverConfig,
        'mcp': mcpConfig
    } )

app.use( middleware.mcp() )

HTML.start( {
    app,
    routePath,
    'suffix': 'streamable',
    'schema': avax,
    restrictedCalls,
    'paymentNetworkIds': [ 'eip155:43113', 'eip155:84532' ],
    facilitatorPublicKey,
    'payToAddress': recipientAddress
} )

const uiTools = [ avax, devToolsSchema ]
    .reduce( ( acc, s ) => {
        const { namespace } = s
        Object
            .keys( s[ 'routes' ] )
            .forEach( ( routeName ) => {
                const routeNameSnakeCase = routeName
                    .replace( /([a-z0-9])([A-Z])/g, '$1_$2' )
                    .toLowerCase()
                const suffixSnakeCase = namespace
                    .replace( /([a-z0-9])([A-Z])/g, '$1_$2' )
                    .toLowerCase()
                const name = `${routeNameSnakeCase}_${suffixSnakeCase}`
                const isProtected = restrictedCalls
                    .some( ( rc ) => rc[ 'name' ] === name )

                acc.push( { name, 'protected': isProtected } )
            } )

        return acc
    }, [] )

const serverInfo = {
    'tools': uiTools,
    'paymentNetworkIds': [ 'eip155:43113', 'eip155:84532' ],
    facilitatorPublicKey,
    'payToAddress': recipientAddress
}

remoteServer.setOnServerCreated( {
    'callback': ( { server, mcpTools } ) => {
        UIWidgets.register( { server, mcpTools, serverInfo } )
    }
} )

const parsedPort = parseInt( port )
const serverUrl = `http://localhost:${parsedPort}`
const mcpEndpoint = `${serverUrl}${routePath}/streamable`

const toolNames = uiTools.map( ( t ) => t.name )

A2AMessageProcessor.init( {
    toolNames,
    mcpEndpoint,
    'paymentMetaKey': mcpConfig[ 'paymentMetaKey' ]
} )

const { card: agentCard } = AgentCard.generate( {
    'schemas': [ avax, devToolsSchema ],
    restrictedCalls,
    serverUrl
} )

A2ARouter.create( { app, agentCard } )

console.log( `[A2A] Agent Card available at ${serverUrl}/.well-known/agent-card.json` )
console.log( `[A2A] A2A endpoint available at ${serverUrl}/a2a` )

remoteServer
    .start( { routesActivationPayloads } )
