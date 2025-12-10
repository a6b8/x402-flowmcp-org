import http from 'node:http'
import process from 'node:process'
import z from 'zod'

const DEFAULT_PROTOCOL_VERSION = '2025-06-18'

const JSONRPCMessageSchema = z.object( {
    jsonrpc: z.literal( '2.0' ),
    id: z.union( [ z.string(), z.number() ] ).optional(),
    method: z.string().optional(),
    params: z.any().optional(),
    result: z.any().optional(),
    error: z.object( {
        code: z.number(),
        message: z.string(),
        data: z.any().optional()
    } ).optional()
} )

class MCPStreamableProxyServer {
    #server
    #upstreamUrl
    #listenHost
    #listenPort
    #bearerToken
    #getPaymentHeader
    #silent

    constructor( {
        upstreamUrl,
        listenHost = '127.0.0.1',
        listenPort = 4001,
        bearerToken = null,
        getPaymentHeader = null,
        silent = false
    } ) {
        if( !upstreamUrl ) {
            throw new Error( 'upstreamUrl is required' )
        }

        this.#upstreamUrl = new URL( upstreamUrl )
        this.#listenHost = listenHost
        this.#listenPort = listenPort
        this.#bearerToken = bearerToken
        this.#getPaymentHeader = getPaymentHeader
        this.#silent = silent
    }

    async start() {
        if( this.#server ) {
            throw new Error( 'Proxy server already started' )
        }

        this.#server = http.createServer( ( req, res ) => {
            this.#handleRequest( req, res ).catch( ( err ) => {
                console.warn( '[DEBUG] Unhandled error in request handler:', err )

                if( !res.headersSent ) {
                    res.statusCode = 500
                    res.setHeader( 'Content-Type', 'text/plain' )
                    res.end( 'Internal Server Error' )
                } else {
                    try {
                        res.end()
                    } catch( _ ) {
                        // ignore
                    }
                }
            } )
        } )

        await new Promise( ( resolve ) => {
            this.#server.listen( this.#listenPort, this.#listenHost, () => {
                if( !this.#silent ) {
                    console.warn(
                        `[INFO] MCP Streamable proxy listening on http://${this.#listenHost}:${this.#listenPort}, ` +
                        `upstream=${this.#upstreamUrl.toString()}`
                    )
                }

                resolve()
            } )
        } )
    }

    async close() {
        if( !this.#server ) return

        await new Promise( ( resolve, reject ) => {
            this.#server.close( ( err ) => {
                if( err ) reject( err )
                else resolve()
            } )
        } )

        this.#server = null
    }

    async #handleRequest( req, res ) {
        const method = req.method || 'GET'

        if( !this.#silent ) {
            console.warn( `[DEBUG] Incoming request: ${method} ${req.url}` )
        }

        if( method === 'GET' ) {
            return this.#handleGet( req, res )
        }

        if( method === 'POST' || method === 'DELETE' ) {
            const body = await this.#readRequestBody( req )
            return this.#handleWithBody( req, res, body )
        }

        res.statusCode = 405
        res.setHeader( 'Content-Type', 'text/plain' )
        res.end( 'Method Not Allowed' )
    }

    #readRequestBody( req ) {
        return new Promise( ( resolve, reject ) => {
            const chunks = []

            req.on( 'data', ( chunk ) => {
                chunks.push( chunk )
            } )

            req.on( 'end', () => {
                resolve( Buffer.concat( chunks ) )
            } )

            req.on( 'error', ( err ) => {
                reject( err )
            } )
        } )
    }

    async #handleGet( req, res ) {
        const controller = new AbortController()
        const signal = controller.signal

        res.on( 'close', () => {
            controller.abort()
        } )

        const headers = this.#buildUpstreamHeaders( req, {
            method: 'GET',
            acceptSSE: true
        } )

        const upstreamResponse = await fetch( this.#upstreamUrl, {
            method: 'GET',
            headers,
            signal
        } )

        if( !this.#silent ) {
            console.warn(
                '[DEBUG] Upstream GET response:',
                upstreamResponse.status,
                upstreamResponse.headers.get( 'content-type' )
            )
        }

        await this.#pipeUpstreamResponse( upstreamResponse, res )
    }

    async #handleWithBody( req, res, body ) {
        const method = req.method || 'POST'
        const controller = new AbortController()
        const signal = controller.signal

        res.on( 'close', () => {
            controller.abort()
        } )

        if( !this.#silent && body?.length ) {
            try {
                const parsed = JSON.parse( body.toString( 'utf8' ) )
                const msg = JSONRPCMessageSchema.parse( parsed )
                console.warn( '[DEBUG] Incoming JSON-RPC message from client:', msg )
            } catch( err ) {
                console.warn( '[DEBUG] Failed to parse incoming JSON as JSON-RPC:', err )
            }
        }

        const headers = this.#buildUpstreamHeaders( req, {
            method,
            ensureStreamableAccept: true
        } )

        let upstreamResponse = await fetch( this.#upstreamUrl, {
            method,
            headers,
            body,
            signal
        } )

        if( !this.#silent ) {
            console.warn(
                '[DEBUG] Upstream POST/DELETE response:',
                upstreamResponse.status,
                upstreamResponse.headers.get( 'content-type' )
            )
        }

        // Optional: 402 Payment Required Handling (ähnlich wie im SSE-Proxy)
        if( upstreamResponse.status === 402 && this.#getPaymentHeader && method === 'POST' ) {
            let errorPayload = null
            let originalMessage = null

            try {
                errorPayload = await upstreamResponse.json()
            } catch( err ) {
                console.warn( '[x402] Failed to parse 402 JSON payload:', err )
            }

            try {
                if( body?.length ) {
                    originalMessage = JSON.parse( body.toString( 'utf8' ) )
                }
            } catch( err ) {
                console.warn( '[x402] Failed to parse original request body as JSON:', err )
            }

            console.warn( '[x402] 402 Payment Required - payload:', errorPayload )

            try {
                const header = await this.#getPaymentHeader( originalMessage, errorPayload )

                if( header ) {
                    console.warn( '[x402] Retrying upstream request with X-PAYMENT header.' )

                    const retryHeaders = this.#buildUpstreamHeaders( req, {
                        method,
                        ensureStreamableAccept: true
                    } )

                    retryHeaders.set( 'X-PAYMENT', header )

                    upstreamResponse = await fetch( this.#upstreamUrl, {
                        method,
                        headers: retryHeaders,
                        body,
                        signal
                    } )

                    if( !upstreamResponse.ok && upstreamResponse.status !== 202 ) {
                        console.warn(
                            `[x402] Retry failed: HTTP ${upstreamResponse.status} ${upstreamResponse.statusText}`
                        )
                    }
                } else {
                    console.warn( '[x402] getPaymentHeader returned no header, forwarding original 402 to client.' )
                }
            } catch( err ) {
                console.warn( '[x402] Error during payment header handling, forwarding original 402:', err )
            }
        }

        await this.#pipeUpstreamResponse( upstreamResponse, res )
    }

    #buildUpstreamHeaders( req, {
        method,
        acceptSSE = false,
        ensureStreamableAccept = false
    } = {} ) {
        const headers = new Headers()

        // Eingehende Header (bis auf ein paar Hop-by-hop Sachen) durchreichen
        for( const [ name, value ] of Object.entries( req.headers ) ) {
            if( !value ) continue

            const lower = name.toLowerCase()

            // Hop-by-hop / uninteressante Header rausfiltern
            if( lower === 'host' ) continue
            if( lower === 'connection' ) continue
            if( lower === 'content-length' ) continue
            if( lower === 'accept-encoding' ) continue

            if( Array.isArray( value ) ) {
                headers.set( name, value.join( ', ' ) )
            } else {
                headers.set( name, String( value ) )
            }
        }

        // Optionaler statischer Bearer Token vom Proxy selbst
        if( this.#bearerToken ) {
            headers.set( 'Authorization', `Bearer ${this.#bearerToken}` )
        }

        // MCP-Protocol-Version sicherstellen
        if( !headers.has( 'mcp-protocol-version' ) ) {
            headers.set( 'mcp-protocol-version', DEFAULT_PROTOCOL_VERSION )
        }

        // Für GET: text/event-stream erzwingen
        if( acceptSSE ) {
            const existing = headers.get( 'accept' ) || ''
            const parts = new Set(
                existing
                    .split( ',' )
                    .map( ( v ) => v.trim() )
                    .filter( Boolean )
            )
            parts.add( 'text/event-stream' )
            headers.set( 'accept', Array.from( parts ).join( ', ' ) )
        }

        // Für POST/DELETE: application/json + text/event-stream sicherstellen
        if( ensureStreamableAccept && ( method === 'POST' || method === 'DELETE' ) ) {
            const existing = headers.get( 'accept' ) || ''
            const parts = new Set(
                existing
                    .split( ',' )
                    .map( ( v ) => v.trim() )
                    .filter( Boolean )
            )
            parts.add( 'application/json' )
            parts.add( 'text/event-stream' )
            headers.set( 'accept', Array.from( parts ).join( ', ' ) )
        }

        return headers
    }

    async #pipeUpstreamResponse( upstreamResponse, res ) {
        const status = upstreamResponse.status
        const contentType = upstreamResponse.headers.get( 'content-type' ) || ''

        // Basis-Header aus Upstream übernehmen, aber problematische rausfiltern
        const headers = {}

        upstreamResponse.headers.forEach( ( value, name ) => {
            const lower = name.toLowerCase()

            if( lower === 'transfer-encoding' ) return
            if( lower === 'connection' ) return
            if( lower === 'keep-alive' ) return
            if( lower === 'content-length' ) return

            headers[ name ] = value
        } )

        // SSE-Stream -> direkt durchreichen
        if( contentType.includes( 'text/event-stream' ) ) {
            headers[ 'Content-Type' ] = 'text/event-stream'

            if( !headers[ 'Cache-Control' ] ) {
                headers[ 'Cache-Control' ] = 'no-cache'
            }

            headers[ 'Connection' ] = 'keep-alive'

            res.writeHead( status, headers )

            const body = upstreamResponse.body

            if( !body ) {
                res.end()
                return
            }

            const reader = body.getReader()

            try {
                while( true ) {
                    const { value, done } = await reader.read()

                    if( done ) break
                    if( value ) {
                        res.write( Buffer.from( value ) )
                    }
                }
            } catch( err ) {
                console.warn( '[DEBUG] Error while piping SSE upstream response:', err )
            } finally {
                res.end()
            }

            return
        }

        // 202 Accepted ohne (oder quasi ohne) Body
        if( status === 202 ) {
            res.writeHead( status, headers )

            if( upstreamResponse.body ) {
                try {
                    const arrBuf = await upstreamResponse.arrayBuffer()
                    const buf = Buffer.from( arrBuf )
                    if( buf.length ) {
                        res.write( buf )
                    }
                } catch( _ ) {
                    // Ignorieren – 202 hat normalerweise keinen Body
                }
            }

            res.end()
            return
        }

        // Alles andere als Buffer lesen und einmalig zurückgeben
        const arrBuf = upstreamResponse.body
            ? await upstreamResponse.arrayBuffer()
            : new ArrayBuffer( 0 )

        const buf = Buffer.from( arrBuf )

        if( contentType && !headers[ 'Content-Type' ] ) {
            headers[ 'Content-Type' ] = contentType
        }

        headers[ 'Content-Length' ] = String( buf.length )

        res.writeHead( status, headers )
        res.end( buf )
    }
}

export { MCPStreamableProxyServer }
