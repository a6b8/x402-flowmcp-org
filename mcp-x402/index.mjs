import fs from 'fs'

import { FlowMCP } from 'flowmcp'
import { RemoteServer } from './flowmcpServers/src/index.mjs'
import { schema as avax } from './schemas/avax.mjs'
import { schema as devToolsSchema } from './schemas/dev-tools.mjs'
import { X402Middleware } from 'x402-mcp-middleware/v2'
import { ServerManager } from './helpers/ServerManager.mjs'
import { HTML } from './helpers/HTML.mjs'


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
                'domainName': 'USDC',
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
            {
                'method': 'tools/call',
                'name': 'paid_ping_x402',
                'acceptedPaymentOptionIdList': [ 'usdc-fuji-cheap', 'usdc-base-cheap' ]
            },
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
    .setConfig( { overwrite: { port: parseInt( port ) } } )

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

remoteServer
    .start( { routesActivationPayloads } )
