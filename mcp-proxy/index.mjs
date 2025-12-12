
import { Via402 } from './task/Via402.mjs'
import { X402PaymentHeader } from './task/X402PaymentHeader.mjs'
import { MCPStreamableProxyServer } from './proxies/MCPStreamableProxyServer.mjs'
import { HTML } from './helpers/HTML.mjs'
import { ServerManager } from './helpers/ServerManager.mjs'


const config = {
    'envPath': './../.via402.env',
    'chainId': '43113',
    'envSelection': [
        [ 'paymentPrivateKey' , 'X402_PAYMENT_PRIVATE_KEY' ],
        [ 'paymentPublicKey'  , 'X402_PAYMENT_PUBLIC_KEY'  ],
        [ 'providerUrl'       , 'X402_FUJI_PROVIDER_URL'   ],
        [ 'serverBaseUrl'     , 'VIA402_SERVER_BASE_URL'   ],
        [ 'serverApiToken'    , 'VIA402_SERVER_API_TOKEN'  ]
    ],
    'allowedUpstreamHosts': [
        'localhost',
        'community.flowmcp.org',
        'x402.flowmcp.org'
    ]
}
const { envSelection, envPath, allowedUpstreamHosts, chainId } = config

const { port: listenPort, environment } = ServerManager
    .getArgs( { argv: process.argv } )
const { paymentPrivateKey, paymentPublicKey, providerUrl, serverBaseUrl, serverApiToken } = ServerManager
    .getX402Credentials( { environment, envPath, envSelection } )

const via402 = new Via402( { baseUrl: serverBaseUrl, serverApiToken } )
const { serverOk, messages, data } = await via402
    .getServerPing()
if( !serverOk ) { messages.forEach( message => console.log( message ) ); process.exit( 1 ) }


const proxy = new MCPStreamableProxyServer( {
    listenHost: '0.0.0.0',
    listenPort,
    upstreamUrl: null,
    allowedUpstreamHosts,
    getX402PaymentHeader: async(  { originalMessage, errorPayload, upstreamUrl, token } ) => {
        const { permissions, messages: m1 } = await via402
            .getPermissions( { token } )
        if( m1.length > 0 ) { m1.forEach( message => console.log( message ) ); return null }

        const { paymentOptionsEntry, messages: m2 } = Via402
            .selectPaymentOptionsEntry( { permissions, originalMessage, upstreamUrl, chainId } )
        if( m2.length > 0 ) { m2.forEach( message => console.log( message ) ); return null }

        // quick fix for USDC domain data on Fuji
        const USDC_FUJI = '0x5425890298aed601595a70ab815c96711a31bc65'
        for (const opt of paymentOptionsEntry?.allowedPaymentOptions || []) {
            if ((opt.tokenAddress || '').toLowerCase() === USDC_FUJI) {
                opt.domain ??= { name: 'USD Coin', version: '2' }
            }
        }

        const x402PaymentHeader = new X402PaymentHeader( { paymentPrivateKey, providerUrl, silent: false } )
        const { messages, headerString } = await x402PaymentHeader
            .get( { errorPayload, paymentOptionsEntry, chainId } )
        if( messages.length > 0 ) { messages.forEach( message => console.log( message ) ); return null }

        return headerString || null
    },
    onX402PaymentEvent: async( { upstreamUrl, token, originalMessage, xPaymentHeader, errorPayload, upstreamStatus } ) => {
        if( !xPaymentHeader ) { return }
        const { messages, data } = await via402.logXPaymentHeader( { token, upstreamUrl, originalMessage, headerString: xPaymentHeader, errorPayload } )
        console.log( 'Logged X402 Payment Header event to Via 402 server', data, messages  )
        if( messages.length > 0 ) { messages.forEach( message => console.log( message ) ); return }
    },
    wrapGetHtml: ({
        upstreamUrl,
        upstreamStatus,
        upstreamHeaders,
        upstreamHtmlEscaped
    }) => `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>MCP Proxy UI</title>
            <style>
              * { box-sizing: border-box; }
              body {
                margin: 0;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
                background: #050608;
                color: #eee;
              }
              .meta {
                padding: 10px 14px;
                background: #11141a;
                border-bottom: 1px solid #22252b;
                font-size: 13px;
              }
              .meta-row {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
                align-items: center;
              }
              .meta-label {
                opacity: 0.7;
                text-transform: uppercase;
                font-size: 11px;
                letter-spacing: 0.06em;
              }
              code {
                background: #1b1f27;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 12px;
                word-break: break-all;
              }
              .status-badge {
                padding: 2px 8px;
                border-radius: 999px;
                font-size: 11px;
                border: 1px solid #444;
              }
              .frame-wrapper {
                margin: 10px;
                border: 3px solid red;       /* <--- rote Umrandung */
                border-radius: 6px;
                overflow: hidden;
              }
              .frame-wrapper iframe {
                width: 100%;
                height: calc(100vh - 80px);
                border: none;
                background: #fff;
              }
            </style>
          </head>
          <body>
            <div class="meta">
              <div class="meta-row">
                <div>
                  <div class="meta-label">Upstream URL</div>
                  <code>${upstreamUrl}</code>
                </div>
                <div>
                  <div class="meta-label">Status</div>
                  <span class="status-badge">${upstreamStatus}</span>
                </div>
              </div>
            </div>
            <div class="frame-wrapper">
              <iframe
                sandbox=""
                srcdoc="${upstreamHtmlEscaped}">
              </iframe>
            </div>
          </body>
        </html>
    `
})


const app = proxy.getApp()

HTML.start({
    app,
    routePath: '/dashboard',
    suffix: 'token_validation',
    apiPath: '/api/v1/agent_payz/token_validation',
    allowedUpstreamHosts
})

await proxy.start()
