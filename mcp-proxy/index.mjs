
import { ServerManager } from './helpers/ServerManager.mjs'
import { MCPStreamableProxyServer } from './proxies/MCPStreamableProxy.mjs'


const { port: listenPort, environment } = ServerManager
    .getArgs( { argv: process.argv } )
const { upstreamUrl } = ServerManager
    .getUpstreamUrl( { environment, defaultUrl: 'https://x402.flowmcp.org/mcp/streamable' } )


const config = {
    upstreamUrl,
    'listenHost': '127.0.0.1',
    listenPort,
    'bearerToken': null,
    'silent': false,
}





const proxy = new MCPStreamableProxyServer( {
    upstreamUrl,
    listenHost: config['listenHost'],
    listenPort,
    bearerToken: config['bearerToken'],
    getPaymentHeader: ( originalRequest, response ) => {
        console.log( 'Payment received callback' )
        console.log( 'Original Request:', originalRequest  )
        console.log( 'Response:', response  )
        return {}
    },
    silent: config['silent']
} )

await proxy.start()