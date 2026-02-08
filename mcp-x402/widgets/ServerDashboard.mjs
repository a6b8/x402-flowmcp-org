import { createUIResource, RESOURCE_URI_META_KEY, RESOURCE_MIME_TYPE } from '@mcp-ui/server'


class ServerDashboard {
    static register( { server, serverInfo } ) {
        const {
            tools,
            paymentNetworkIds,
            facilitatorPublicKey,
            payToAddress
        } = serverInfo

        const uri = 'ui://x402/server-dashboard'
        const htmlString = ServerDashboard.#buildHTML( {
            tools,
            paymentNetworkIds,
            facilitatorPublicKey,
            payToAddress
        } )

        const uiResource = createUIResource( {
            uri,
            'content': { 'type': 'rawHtml', htmlString },
            'encoding': 'text'
        } )

        server.resource(
            'x402-server-dashboard',
            uri,
            { 'mimeType': RESOURCE_MIME_TYPE },
            async () => ( {
                'contents': [ {
                    'uri': uri,
                    'mimeType': RESOURCE_MIME_TYPE,
                    'text': htmlString
                } ]
            } )
        )

        server.tool(
            'x402_server_dashboard',
            'Interactive dashboard showing server status, available tools (free vs paid), supported payment networks, and wallet addresses. Returns a visual UI widget.',
            {},
            async () => {
                const result = {
                    'content': [ uiResource ],
                    '_meta': { [ RESOURCE_URI_META_KEY ]: uri }
                }

                return result
            }
        )
    }


    static #buildHTML( { tools, paymentNetworkIds, facilitatorPublicKey, payToAddress } ) {
        const toolRows = tools
            .map( ( tool ) => {
                const badge = tool.protected
                    ? '<span class="badge paid">PAID</span>'
                    : '<span class="badge free">FREE</span>'

                return `<tr><td><code>${tool.name}</code></td><td>${badge}</td></tr>`
            } )
            .join( '' )

        const networkItems = paymentNetworkIds
            .map( ( id ) => {
                const label = ServerDashboard.#getNetworkLabel( { paymentNetworkId: id } )

                return `<div class="network-card"><span class="network-name">${label}</span><code>${id}</code></div>`
            } )
            .join( '' )

        const truncate = ( addr ) => {
            if( !addr ) {
                return 'not configured'
            }
            const truncated = `${addr.slice( 0, 6 )}...${addr.slice( -4 )}`

            return `<code title="${addr}">${truncated}</code>`
        }

        const freeCount = tools.filter( ( t ) => !t.protected ).length
        const paidCount = tools.filter( ( t ) => t.protected ).length

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #0d1117;
        color: #c9d1d9;
        padding: 20px;
    }
    .header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid #21262d;
    }
    .header h1 {
        font-size: 1.4em;
        color: #f0f6fc;
        font-weight: 600;
    }
    .status-dot {
        width: 10px;
        height: 10px;
        background: #3fb950;
        border-radius: 50%;
        box-shadow: 0 0 8px rgba(63, 185, 80, 0.4);
    }
    .stats {
        display: flex;
        gap: 12px;
        margin-bottom: 24px;
    }
    .stat-card {
        flex: 1;
        background: #161b22;
        border: 1px solid #21262d;
        border-radius: 8px;
        padding: 16px;
        text-align: center;
    }
    .stat-card .number {
        font-size: 2em;
        font-weight: 700;
        color: #f0f6fc;
    }
    .stat-card .label {
        font-size: 0.8em;
        color: #8b949e;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: 4px;
    }
    h2 {
        font-size: 1.1em;
        color: #f0f6fc;
        margin-bottom: 12px;
        font-weight: 600;
    }
    .section {
        margin-bottom: 24px;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        background: #161b22;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #21262d;
    }
    th {
        background: #1c2128;
        color: #8b949e;
        font-size: 0.8em;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 10px 14px;
        text-align: left;
    }
    td {
        padding: 8px 14px;
        border-top: 1px solid #21262d;
        font-size: 0.9em;
    }
    td code {
        font-family: 'SF Mono', Menlo, monospace;
        font-size: 0.85em;
        background: #1c2128;
        padding: 2px 6px;
        border-radius: 4px;
        color: #79c0ff;
    }
    .badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.75em;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;
    }
    .badge.free {
        background: rgba(63, 185, 80, 0.15);
        color: #3fb950;
        border: 1px solid rgba(63, 185, 80, 0.3);
    }
    .badge.paid {
        background: rgba(210, 153, 34, 0.15);
        color: #d29922;
        border: 1px solid rgba(210, 153, 34, 0.3);
    }
    .network-card {
        background: #161b22;
        border: 1px solid #21262d;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .network-name {
        font-weight: 500;
        color: #f0f6fc;
    }
    .network-card code {
        font-family: 'SF Mono', Menlo, monospace;
        font-size: 0.8em;
        color: #8b949e;
    }
    .address-row {
        background: #161b22;
        border: 1px solid #21262d;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .address-label {
        font-size: 0.85em;
        color: #8b949e;
    }
    .address-row code {
        font-family: 'SF Mono', Menlo, monospace;
        font-size: 0.85em;
        color: #79c0ff;
    }
</style>
</head>
<body>
    <div class="header">
        <div class="status-dot"></div>
        <h1>x402 MCP Server</h1>
    </div>

    <div class="stats">
        <div class="stat-card">
            <div class="number">${tools.length}</div>
            <div class="label">Total Tools</div>
        </div>
        <div class="stat-card">
            <div class="number">${freeCount}</div>
            <div class="label">Free</div>
        </div>
        <div class="stat-card">
            <div class="number">${paidCount}</div>
            <div class="label">Paid (x402)</div>
        </div>
        <div class="stat-card">
            <div class="number">${paymentNetworkIds.length}</div>
            <div class="label">Networks</div>
        </div>
    </div>

    <div class="section">
        <h2>Tools</h2>
        <table>
            <thead><tr><th>Tool Name</th><th>Access</th></tr></thead>
            <tbody>${toolRows}</tbody>
        </table>
    </div>

    <div class="section">
        <h2>Payment Networks</h2>
        ${networkItems}
    </div>

    <div class="section">
        <h2>Addresses</h2>
        <div class="address-row">
            <span class="address-label">Facilitator</span>
            ${truncate( facilitatorPublicKey )}
        </div>
        <div class="address-row">
            <span class="address-label">Pay-to / Recipient</span>
            ${truncate( payToAddress )}
        </div>
    </div>
</body>
</html>`

        return html
    }


    static #getNetworkLabel( { paymentNetworkId } ) {
        const networkLabels = {
            'eip155:43113': 'Avalanche Fuji (Testnet)',
            'eip155:43114': 'Avalanche C-Chain (Mainnet)',
            'eip155:84532': 'Base Sepolia (Testnet)',
            'eip155:8453': 'Base (Mainnet)',
            'eip155:1': 'Ethereum Mainnet',
            'eip155:11155111': 'Sepolia (Testnet)'
        }

        const label = networkLabels[ paymentNetworkId ] || paymentNetworkId

        return label
    }
}


export { ServerDashboard }
