// MCPStreamableProxyServer.mjs

import http from 'node:http'
import express from 'express'
import z from 'zod'

const DEFAULT_PROTOCOL_VERSION = '2025-06-18'

const JSONRPCMessageSchema = z.object({
    jsonrpc: z.literal('2.0'),
    id: z.union([z.string(), z.number()]).optional(),
    method: z.string().optional(),
    params: z.any().optional(),
    result: z.any().optional(),
    error: z.object({
        code: z.number(),
        message: z.string(),
        data: z.any().optional()
    }).optional()
})

function escapeHtmlForSrcdoc(html) {
    if (!html) return ''
    return String(html)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/<\/script/gi, '<\\/script')
}

/**
 * Options for MCPStreamableProxyServer:
 *
 * - upstreamUrl?            : string | null
 * - allowedUpstreamHosts?   : string[] | null
 * - listenHost?             : string
 * - listenPort?             : number
 * - bearerToken?            : string | null
 *
 * - getX402PaymentHeader?   : ( { originalMessage, errorPayload, upstreamUrl, token } ) => Promise<string | null>
 *      Resolve a valid X-PAYMENT header for retrying 402 responses from the upstream.
 *
 * - onX402PaymentEvent?     : ( { upstreamUrl, token, originalMessage, xPaymentHeader, errorPayload, upstreamStatus, upstreamError } ) => Promise<void> | void
 *      Called AFTER the retry fetch completed (meaning the X-PAYMENT header was actually sent).
 *
 * - silent?                 : boolean
 * - mountPath?              : string
 * - wrapGetHtml?            : (ctx) => string | null
 */
class MCPStreamableProxyServer {
    #server
    #app
    #defaultUpstreamUrl
    #allowedUpstreamHosts
    #listenHost
    #listenPort
    #bearerToken
    #getX402PaymentHeader
    #onX402PaymentEvent
    #silent
    #mountPath
    #wrapGetHtml

    constructor({
        upstreamUrl = null,
        allowedUpstreamHosts = null,
        listenHost = '127.0.0.1',
        listenPort = 4001,
        bearerToken = null,
        getX402PaymentHeader = null,
        onX402PaymentEvent = null,
        silent = false,
        mountPath = '/mcp',
        wrapGetHtml = null
    } = {}) {
        // Express app is created immediately so callers can use getApp()
        this.#app = express()
        this.#mountPath = mountPath

        this.#defaultUpstreamUrl = upstreamUrl ? new URL(upstreamUrl) : null

        // Normalize allowlist (lowercase, trim, remove empty strings)
        if (Array.isArray(allowedUpstreamHosts) && allowedUpstreamHosts.length > 0) {
            this.#allowedUpstreamHosts = allowedUpstreamHosts
                .map((h) => String(h).trim().toLowerCase())
                .filter(Boolean)
        } else {
            this.#allowedUpstreamHosts = null
        }

        this.#listenHost = listenHost
        this.#listenPort = listenPort
        this.#bearerToken = bearerToken
        this.#getX402PaymentHeader = getX402PaymentHeader
        this.#onX402PaymentEvent = typeof onX402PaymentEvent === 'function' ? onX402PaymentEvent : null
        this.#silent = silent
        this.#wrapGetHtml = typeof wrapGetHtml === 'function' ? wrapGetHtml : null

        if (!this.#defaultUpstreamUrl && !this.#allowedUpstreamHosts) {
            throw new Error(
                'You must configure either a default upstreamUrl or an allowedUpstreamHosts allowlist ' +
                'to enable dynamic ?url= upstreams.'
            )
        }
    }

    getApp() {
        return this.#app
    }

    getListenHost() {
        return this.#listenHost
    }

    getListenPort() {
        return this.#listenPort
    }

    async start() {
        if (this.#server) {
            throw new Error('Proxy server already started')
        }

        this.#app.use(this.#mountPath, (req, res) => {
            this.#handleRequest(req, res).catch((err) => {
                console.warn('[DEBUG] Unhandled error in request handler:', err)
                if (!res.headersSent) {
                    res.statusCode = 500
                    res.setHeader('Content-Type', 'text/plain')
                    res.end('Internal Server Error')
                }
            })
        })

        this.#server = http.createServer(this.#app)

        await new Promise((resolve) => {
            this.#server.listen(this.#listenPort, this.#listenHost, () => {
                if (!this.#silent) {
                    console.warn(
                        `[MCPStreamableProxyServer] Listening on http://${this.#listenHost}:${this.#listenPort}${this.#mountPath}`
                    )
                }
                resolve()
            })
        })
    }

    async stop() {
        if (!this.#server) return
        await new Promise((resolve, reject) => {
            this.#server.close((err) => (err ? reject(err) : resolve()))
        })
        this.#server = null
    }

    async #handleRequest(req, res) {
        if (this.#bearerToken) {
            const authHeader = req.headers['authorization'] || ''
            const token = authHeader.startsWith('Bearer ')
                ? authHeader.slice('Bearer '.length).trim()
                : null
            if (token !== this.#bearerToken) {
                if (!this.#silent) {
                    console.warn('[DEBUG] Unauthorized request (missing/invalid Bearer token)')
                }
                res.statusCode = 401
                res.setHeader('Content-Type', 'text/plain')
                res.end('Unauthorized')
                return
            }
        }

        const method = (req.method || 'GET').toUpperCase()

        if (method === 'GET') {
            return this.#handleGet(req, res)
        }

        if (method !== 'POST' && method !== 'DELETE') {
            res.statusCode = 405
            res.setHeader('Content-Type', 'application/json')
            res.end(
                JSON.stringify({
                    error: 'Method Not Allowed',
                    message: `Method ${method} is not supported. Use GET for HTTP-based tools or POST/DELETE for JSON-RPC.`
                })
            )
            return
        }

        // Read body
        const chunks = []
        req.on('data', (chunk) => chunks.push(chunk))
        await new Promise((resolve) => req.on('end', resolve))
        const body = Buffer.concat(chunks).toString('utf8')

        return this.#handleWithBody(req, res, body)
    }

    #resolveUpstreamUrl(req) {
        const url = new URL(req.originalUrl || req.url, `http://${req.headers.host}`)
        const rawParam = url.searchParams.get('url')

        if (rawParam) {
            const candidate = new URL(rawParam)

            if (!this.#allowedUpstreamHosts) {
                throw new Error('Dynamic upstream URL not allowed (no allowlist configured)')
            }

            const hostname = (candidate.hostname || '').toLowerCase()
            if (!this.#allowedUpstreamHosts.includes(hostname)) {
                throw new Error(
                    `Upstream host "${hostname}" is not in the allowedUpstreamHosts allowlist.`
                )
            }

            return candidate
        }

        if (!this.#defaultUpstreamUrl) {
            throw new Error('No upstreamUrl provided and no dynamic ?url= was specified.')
        }

        return new URL(this.#defaultUpstreamUrl.toString())
    }

    #buildUpstreamHeaders(req, { method, acceptSSE = false }) {
        const headers = new Map()
        const incoming = req.headers || {}

        for (const [key, value] of Object.entries(incoming)) {
            if (typeof value === 'undefined') continue
            const lower = key.toLowerCase()

            if (['connection', 'keep-alive', 'transfer-encoding'].includes(lower)) continue
            if (['accept-encoding'].includes(lower)) continue
            if (lower === 'host') continue

            headers.set(lower, value)
        }

        headers.set('accept-encoding', 'identity')

        if (method === 'POST' || method === 'DELETE') {
            if (!headers.has('content-type')) {
                headers.set('content-type', 'application/json')
            }
        }

        if (!headers.has('accept')) {
            headers.set('accept', '*/*')
        }

        // do not forward x-payment; we manage it
        headers.delete('x-payment')

        if (!headers.has('mcp-protocol-version')) {
            headers.set('mcp-protocol-version', DEFAULT_PROTOCOL_VERSION)
        }

        if (acceptSSE) {
            const existing = headers.get('accept') || ''
            const parts = new Set(
                existing
                    .split(',')
                    .map((v) => v.trim())
                    .filter(Boolean)
            )
            parts.add('text/event-stream')
            headers.set('accept', Array.from(parts).join(', '))
        }

        return headers
    }

    async #handleGet(req, res) {
        const controller = new AbortController()
        const signal = controller.signal

        res.on('close', () => controller.abort())

        let upstreamUrl
        try {
            upstreamUrl = this.#resolveUpstreamUrl(req)
        } catch (err) {
            console.warn('[DEBUG] Upstream URL resolution failed for GET:', err)
            res.statusCode = 400
            res.setHeader('Content-Type', 'text/plain')
            res.end(`Bad Request: ${err.message}`)
            return
        }

        const headers = this.#buildUpstreamHeaders(req, {
            method: 'GET',
            acceptSSE: true
        })

        const upstreamResponse = await fetch(upstreamUrl, {
            method: 'GET',
            headers,
            signal
        })

        if (!this.#silent) {
            console.warn(
                '[DEBUG] Upstream GET response:',
                upstreamResponse.status,
                upstreamResponse.headers.get('content-type'),
                'from',
                upstreamUrl.toString()
            )
        }

        const contentType = upstreamResponse.headers.get('content-type') || ''

        if (this.#wrapGetHtml && contentType.includes('text/html')) {
            const upstreamHtml = await upstreamResponse.text()
            const ctx = {
                req,
                upstreamUrl: upstreamUrl.toString(),
                upstreamStatus: upstreamResponse.status,
                upstreamHeaders: Object.fromEntries(upstreamResponse.headers.entries()),
                upstreamHtml,
                upstreamHtmlEscaped: escapeHtmlForSrcdoc(upstreamHtml)
            }

            let wrappedHtml = null
            try {
                wrappedHtml = this.#wrapGetHtml(ctx)
            } catch (err) {
                console.warn('[DEBUG] wrapGetHtml threw an error, falling back to direct proxying:', err)
            }

            if (typeof wrappedHtml === 'string' && wrappedHtml.length > 0) {
                const buf = Buffer.from(wrappedHtml, 'utf8')
                res.statusCode = 200
                res.setHeader('Content-Type', 'text/html; charset=utf-8')
                res.setHeader('Content-Length', String(buf.length))
                res.end(buf)
                return
            }
        }

        await this.#pipeUpstreamResponse(upstreamResponse, res)
    }

    async #handleWithBody(req, res, body) {
        const method = req.method || 'POST'

        const controller = new AbortController()
        const signal = controller.signal
        res.on('close', () => controller.abort())

        let upstreamUrl
        try {
            upstreamUrl = this.#resolveUpstreamUrl(req)
        } catch (err) {
            console.warn('[DEBUG] Upstream URL resolution failed for POST/DELETE:', err)
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Bad Request', message: err.message }))
            return
        }

        const fullUrl = new URL(req.originalUrl || req.url, `http://${req.headers.host}`)
        const token = fullUrl.searchParams.get('token') || null

        if (!this.#silent && body?.length) {
            try {
                const parsed = JSON.parse(body)
                console.warn('[DEBUG] Upstream JSON-RPC request:', parsed)
            } catch (err) {
                console.warn('[DEBUG] Request body is not valid JSON:', err)
            }
        }

        const headers = this.#buildUpstreamHeaders(req, {
            method,
            acceptSSE: false
        })

        let attempt = 0
        let lastError

        // Track the X-PAYMENT header we actually used for the retry.
        let x402RetryHeader = null
        let x402RetryOriginalMessage = null
        let x402RetryFirstErrorPayload = null
        let x402EventFired = false

        while (attempt < 2) {
            attempt += 1

            const requestInit = {
                method,
                headers,
                body,
                signal
            }

            let upstreamResponse
            try {
                upstreamResponse = await fetch(upstreamUrl, requestInit)
            } catch (err) {
                lastError = err

                // If retry fetch fails, we still know the header was attempted to be sent.
                if( attempt === 2 && x402RetryHeader && this.#onX402PaymentEvent && !x402EventFired ) {
                    x402EventFired = true
                    try {
                        await this.#onX402PaymentEvent( {
                            upstreamUrl: upstreamUrl.toString(),
                            token,
                            originalMessage: x402RetryOriginalMessage,
                            xPaymentHeader: x402RetryHeader,
                            errorPayload: x402RetryFirstErrorPayload,
                            upstreamStatus: null,
                            upstreamError: String( err?.message || err )
                        } )
                    } catch( e ) {
                        // ignore logging errors
                    }
                }

                console.warn('[DEBUG] Upstream fetch error:', err)
                break
            }

            if (!this.#silent) {
                console.warn(
                    '[DEBUG] Upstream response:',
                    upstreamResponse.status,
                    upstreamResponse.headers.get('content-type'),
                    'from',
                    upstreamUrl.toString()
                )
            }

            // If this is the retry attempt (attempt===2) and we previously attached an X-PAYMENT header,
            // this means the header has definitely been sent to the upstream (fetch completed).
            if( attempt === 2 && x402RetryHeader && this.#onX402PaymentEvent && !x402EventFired && upstreamResponse.status !== 402 ) {
                x402EventFired = true
                try {
                    await this.#onX402PaymentEvent( {
                        upstreamUrl: upstreamUrl.toString(),
                        token,
                        originalMessage: x402RetryOriginalMessage,
                        xPaymentHeader: x402RetryHeader,
                        errorPayload: x402RetryFirstErrorPayload,
                        upstreamStatus: upstreamResponse.status
                    } )
                } catch( err ) {
                    // ignore logging errors
                }
            }

            if (upstreamResponse.status !== 402 || !this.#getX402PaymentHeader) {
                await this.#pipeUpstreamResponse(upstreamResponse, res)
                return
            }

            let errorPayload = null
            try {
                const cloned = upstreamResponse.clone()
                const text = await cloned.text()
                try {
                    errorPayload = JSON.parse(text)
                } catch {
                    errorPayload = { raw: text }
                }
            } catch (err) {
                console.warn('[x402] Failed to read upstream 402 body:', err)
            }

            let originalMessage = null
            try {
                originalMessage = JSON.parse(body || '{}')
            } catch (err) {
                console.warn('[x402] Failed to parse original request body as JSON:', err)
            }

            console.warn('[x402] 402 Payment Required - payload:', JSON.stringify( errorPayload, null, 2 ) )

            // Retry attempt came back as 402 again (payment rejected/failed); fire event once.
            if( attempt === 2 && x402RetryHeader && this.#onX402PaymentEvent && !x402EventFired ) {
                x402EventFired = true
                try {
                    await this.#onX402PaymentEvent( {
                        upstreamUrl: upstreamUrl.toString(),
                        token,
                        originalMessage: x402RetryOriginalMessage,
                        xPaymentHeader: x402RetryHeader,
                        errorPayload,
                        upstreamStatus: upstreamResponse.status
                    } )
                } catch( err ) {
                    // ignore logging errors
                }
            }

            try {
                const header = await this.#getX402PaymentHeader({
                    originalMessage,
                    errorPayload,
                    upstreamUrl: upstreamUrl.toString(),
                    token
                })

                if (header) {
                    console.warn('[x402] Retrying upstream request with X-PAYMENT header')
                    x402RetryHeader = header
                    x402RetryOriginalMessage = originalMessage
                    x402RetryFirstErrorPayload = errorPayload
                    headers.set('x-payment', header)
                    continue
                } else {
                    console.warn('[x402] No X-PAYMENT header provided, returning original 402 to client.')
                }
            } catch (err) {
                console.warn('[x402] getX402PaymentHeader threw an error:', err)
                lastError = err
            }

            await this.#pipeUpstreamResponse(upstreamResponse, res)
            return
        }

        if (!res.headersSent) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
                error: 'Bad Gateway',
                message: lastError ? String(lastError.message || lastError) : 'Unknown upstream error'
            }))
        }
    }

    async #pipeUpstreamResponse(upstreamResponse, res) {
        const status = upstreamResponse.status
        const headers = {}

        for (const [key, value] of upstreamResponse.headers.entries()) {
            const lower = key.toLowerCase()
            if (['connection', 'keep-alive', 'transfer-encoding'].includes(lower)) continue
            headers[key] = value
        }

        const contentType = upstreamResponse.headers.get('content-type') || ''

        if (contentType.includes('text/event-stream')) {
            res.writeHead(status, headers)
            for await (const chunk of upstreamResponse.body) {
                res.write(chunk)
            }
            res.end()
            return
        }

        const chunks = []
        for await (const chunk of upstreamResponse.body) {
            chunks.push(chunk)
        }
        const arrBuf = Buffer.concat(chunks)
        const buf = Buffer.from(arrBuf)

        if (contentType && !headers['Content-Type']) {
            headers['Content-Type'] = contentType
        }

        headers['Content-Length'] = String(buf.length)

        res.writeHead(status, headers)
        res.end(buf)
    }
}

export { MCPStreamableProxyServer }
