class Via402 {
    #baseUrl
    #serverApiToken


    constructor( { baseUrl, serverApiToken } ) {
        if( !baseUrl || typeof baseUrl !== 'string' ) {
            throw new Error( '[Via402] Missing or invalid base URL' )
        }
        this.#baseUrl = baseUrl.replace( /\/+$/, '' )

        if( !serverApiToken || typeof serverApiToken !== 'string' ) {
            throw new Error( '[Via402] Missing or invalid server API token' )
        }
        this.#serverApiToken = serverApiToken
    }


    async getServerPing() {
        const { messages: m0, data } = await this
            .#fetch( { token: null, routeName: 'ping' } )
        if( m0.length > 0 ) { return { 'serverOk': false, 'messages': m0 }  }

        if( !data || typeof data !== 'object' ) {
            const msg = '[Via402] Invalid server status response format'
            return { 'serverOk': false, 'messages': [ msg ] }
        }

        if( data['status'] !== 'ok' ) {
            const msg = `[Via402] Server status not ok: ${data['status']}`
            return { 'serverOk': false, 'messages': [ msg ] }
        }

        return { 'serverOk': true, 'messages': m0, data }   
    }


    async getPermissions( { token } ) {
        const { messages: m0, data } = await this
            .#fetch( { token, routeName: 'permissions' } )
        return { 'permissions': data, 'messages': m0 }
    }


    static selectPaymentOptionsEntry( { permissions, originalMessage, upstreamUrl, chainId } ) {
        const messages = []
        let paymentOptionsEntry = null
        const targetChainId = String( chainId )

        try {
            if( !permissions || typeof permissions !== 'object' ) {
                messages.push( '[Via402] Missing or invalid permissions object' )
                return { paymentOptionsEntry, messages }
            }

            const cfg = { 'server': null, 'toolName': null }
            try {
                cfg['server'] = upstreamUrl.toLowerCase()
                cfg['toolName'] = originalMessage['params']['name'].toLowerCase()
            } catch( err ) {
                messages.push( `[Via402] Error accessing permissions for upstream URL: ${upstreamUrl}` )
                return { paymentOptionsEntry, messages }
            }

            const serverKeys = Object.keys( permissions?.toolNames || {} )
            const matchedServerKey = serverKeys.find( key => key.toLowerCase() === cfg['server'] )
            if( !matchedServerKey ) {
                messages.push( `[Via402] No permissions found for upstream URL: ${upstreamUrl}` )
                return { paymentOptionsEntry, messages }
            }

            const toolKeys = Object.keys( permissions['toolNames'][ matchedServerKey ] || {} )
            const matchedToolKey = toolKeys.find( key => key.toLowerCase() === cfg['toolName'] )
            if( !matchedToolKey ) {
                messages.push( `[Via402] No permissions found for tool name: ${cfg['toolName']}` )
                return { paymentOptionsEntry, messages }
            }

            const paymentOptionsByChain = permissions['toolNames'][ matchedServerKey ][ matchedToolKey ]['paymentOptionsByChain']

            if( !Array.isArray( paymentOptionsByChain ) ) {
                messages.push( `[Via402] No payment options found for tool name: ${cfg['toolName']}` )
                return { paymentOptionsEntry, messages }
            }

            paymentOptionsEntry = paymentOptionsByChain
                .find( option => String( option.chainId ) === targetChainId.toString() )

        } catch( err ) {
            messages.push( `[Via402] Error selecting allowed payment options: ${err.message}` )
            return { paymentOptionsEntry, messages }
        }
        return { paymentOptionsEntry, messages }
    }


    static selectAllowedPaymentOptions( args ) {
        return Via402.selectPaymentOptionsEntry( args )
    }


    async logXPaymentHeader({ token, upstreamUrl, originalMessage, headerString, errorPayload }) {
        const messages = []
        let data = null

        try {
            const id = originalMessage?.id
            const request_id = ( id !== null && id !== undefined )
                ? `req_${String( id )}`
                : `req_${crypto.randomUUID()}`

            const tool_call_id = originalMessage?.params?.tool_call_id
                || originalMessage?.params?.toolCallId
                || ( id !== null && id !== undefined ? `call_${String( id )}` : null )
                || `call_${crypto.randomUUID()}`

            const body = {
                server_url: upstreamUrl || null,
                tool_name: originalMessage?.params?.name || null,

                schema_type: 'EXACT-EVM',
                chain_type: 'EVM',
                chain_key: errorPayload?.accepts?.[0]?.network || null,

                status: 'pending',
                request_id,
                tool_call_id,

                x_payment_header: headerString,

                x402_error_payload: errorPayload || null
            }

            const { messages: m0, data: d0 } = await this
                .#fetch({ token, routeName: 'payment_logs', body })
            messages.push(...m0)
            data = d0
        } catch (err) {
            messages.push(`[Via402] Error logging payment header: ${err.message}`)
        }

        return { data, messages }
    }


    async #fetch({ token, routeName, body }) {
        const routes = {
            permissions: {
                path: '/api/v1/agent_payz/user_permissions',
                method: 'GET'
            },
            ping: {
                path: '/api/v1/agent_payz/ping',
                method: 'GET'
            },
            payment_logs: {
                path: '/api/v1/agent_payz/payment_logs',
                method: 'POST'
            }
        }

        const messages = []
        let data = null
        let url = null

        try {
            const route = routes[routeName]
            if (!route) {
                messages.push(`[Via402] Unknown route name: ${routeName}`)
                return { messages, data }
            }

            const { method = 'GET', path } = route

            url = new URL(path, this.#baseUrl).toString()
            const headers = { Accept: 'application/json' }

            if (this.#serverApiToken) {
                headers['X-Server-Token'] = this.#serverApiToken
            }

            if (token) {
                headers['Authorization'] = `Bearer ${token}`
            }

            const fetchOptions = { method, headers }

            if (method !== 'GET' && body !== undefined) {
                headers['Content-Type'] = 'application/json'
                fetchOptions.body = JSON.stringify(body)
            }

            const response = await fetch(url, fetchOptions)
            if (!response.ok) {
                messages.push(`[Via402] Request failed (${response.status} ${response.statusText})`)
                const text = await response.text()
                if (text) { messages.push(`[Via402] Response body: ${text}`) }
                return { messages, data }
            }

            const contentType = response.headers.get('content-type') || ''
            if (contentType.includes('application/json')) {
                data = await response.json()
            } else {
                const text = await response.text()
                messages.push(`[Via402] Unexpected content type: ${contentType || 'unknown'} - ${text}`)
            }
        } catch (err) {
            const location = url || this.#baseUrl
            messages.push(`[Via402] Error fetching data from ${location}: ${err.message}`)
        }

        return { messages, data }
    }
}


export { Via402 }


/*
 Test User Permissions API

GET /api/v1/agent_payz/user_permissions 


{
  "valid": true,
  "toolNames": {
    "https://via402-mcp-8m3mr.ondigitalocean.app/one/streamable": {
      "free_ping_x402": {
        "paymentOptionsByChain": []
      },
      "paid_ping_x402": {
        "paymentOptionsByChain": [
          {
            "chainId": "43113",
            "chainName": "avax-fuji",
            "allowedPaymentOptions": [
              {
                "name": "USDC",
                "tokenAddress": "0x5425890298aed601595a70AB815c96711a31Bc65",
                "decimals": 6,
                "maxAmountRequired": "0.001"
              }
            ]
          }
        ]
      }
    }
  }
}
*/
