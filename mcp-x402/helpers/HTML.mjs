class HTML {
    static start( {
        app,
        routePath,
        suffix = 'streamable',
        paymentNetworkIds = [],
        schema,
        restrictedCalls,
        facilitatorPublicKey,
        payToAddress
    } ) {

        const { namespace } = schema
        const tools = Object
            .keys( schema[ 'routes' ] )
            .map( ( routeName ) => {
                const routeNameSnakeCase = routeName
                    .replace( /([a-z0-9])([A-Z])/g, '$1_$2' )
                    .toLowerCase()
                const suffixSnakeCase = namespace
                    .replace( /([a-z0-9])([A-Z])/g, '$1_$2' )
                    .toLowerCase()
                const name = `${routeNameSnakeCase}_${suffixSnakeCase}`

                return { name, 'protected': null }
            } )
            .map( ( tool ) => {
                const isProtected = restrictedCalls
                    .some( ( rc ) => rc[ 'name' ] === tool.name )
                tool.protected = isProtected

                return tool
            } )

        const fullPath = routePath + '/' + suffix

        app.get( fullPath, ( req, res ) => {
            const serverUrl =
                req.protocol + '://' + req.get( 'host' ) + routePath + '/' + suffix

            return res.send(
                HTML.#getFrontpage( {
                    serverUrl,
                    tools,
                    paymentNetworkIds,
                    facilitatorPublicKey,
                    payToAddress
                } )
            )
        } )
    }


    static #getFrontpage( {
        serverUrl,
        tools = [],
        paymentNetworkIds = [],
        facilitatorPublicKey,
        payToAddress
    } ) {
        const networkLabels = paymentNetworkIds
            .map( ( id ) => HTML.#getNetworkLabel( { paymentNetworkId: id } ) )

        const rows =
            tools.length > 0
                ? tools
                      .map(
                          ( tool ) => `
            <tr>
                <td><code>${tool.name}</code></td>
                <td>${tool.protected ? 'X402-protected' : 'free'}</td>
            </tr>`
                      )
                      .join( '' )
                : `<tr><td colspan="2">No tools provided.</td></tr>`

        const networkListItems = paymentNetworkIds
            .map( ( id, index ) => {
                const label = networkLabels[ index ]
                const explorerUrl = HTML.#getExplorerUrl( { paymentNetworkId: id } )

                return `
            <li>
                <strong>${label}</strong><br>
                <code>${id}</code>
                ${explorerUrl ? ` - <a href="${explorerUrl}" target="_blank" rel="noopener noreferrer">Explorer</a>` : ''}
            </li>`
            } )
            .join( '' )

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>X402 v2 Test MCP Server</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 40px;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 720px;
            margin: 0 auto;
            background: #ffffff;
            padding: 24px 28px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        }
        h1 {
            margin-top: 0;
            color: #222;
        }
        h2 {
            margin-top: 1.6em;
            color: #333;
        }
        p {
            font-size: 0.98em;
            line-height: 1.6;
            color: #333;
        }
        code {
            font-family: Menlo, Consolas, monospace;
            background: #f0f0f0;
            padding: 3px 6px;
            border-radius: 4px;
        }
        .endpoint {
            margin: 12px 0 18px;
            padding: 10px 12px;
            background: #f7f9fc;
            border-radius: 8px;
            border: 1px solid #d9e2f2;
            font-size: 0.95em;
            word-break: break-all;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 0.95em;
        }
        th, td {
            padding: 6px 8px;
            border-bottom: 1px solid #e2e2e2;
            text-align: left;
        }
        th {
            background: #f5f5f5;
        }
        a {
            color: #0066cc;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        .meta {
            font-size: 0.9em;
            color: #666;
        }
        .badge {
            display: inline-block;
            background: #28a745;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            margin-left: 8px;
        }
        .network-list {
            margin-top: 8px;
        }
        .network-list li {
            margin-bottom: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>x402 Test MCP Server <span class="badge">v2</span></h1>
        <p>
            This is a <strong>test MCP server</strong> with routes exposed via MCP.
            Some tools are free, some require an <strong>X402 v2 payment</strong>.
        </p>

        <h2>MCP endpoint</h2>
        <p>Use this URL as MCP server in your AI client:</p>
        <div class="endpoint">
            <code>${serverUrl}</code>
        </div>

        <h2>Tools</h2>
        <p>Available tools and whether they require X402:</p>
        <table>
            <thead>
                <tr>
                    <th>Tool</th>
                    <th>Access</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>

        <h2>Payments (Multi-Chain)</h2>
        <p>
            Paid tools accept X402 v2 payments on <strong>${paymentNetworkIds.length} network(s)</strong>.
            Users can choose which chain to pay on.
        </p>

        <h3>Supported Networks</h3>
        <ul class="network-list">
            ${networkListItems}
        </ul>

        <h3>Payment Addresses</h3>
        <ul>
            <li>
                <strong>Facilitator (pays gas & signs):</strong>
                ${facilitatorPublicKey
                    ? `<code>${facilitatorPublicKey}</code>`
                    : 'not configured'}
            </li>
            <li>
                <strong>Pay-to / recipient address:</strong>
                ${payToAddress
                    ? `<code>${payToAddress}</code>`
                    : 'not configured'}
            </li>
        </ul>
        <p class="meta">
            Payments are made in test USDC; this server is for demo and testing only.
        </p>
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
            'eip155:11155111': 'Sepolia (Testnet)',
            'eip155:324705682': 'SKALE Base Sepolia (Testnet)'
        }

        const label = networkLabels[ paymentNetworkId ] || paymentNetworkId || 'Unknown network'

        return label
    }


    static #getExplorerUrl( { paymentNetworkId } ) {
        const explorerUrls = {
            'eip155:43113': 'https://testnet.snowtrace.io',
            'eip155:43114': 'https://snowtrace.io',
            'eip155:84532': 'https://sepolia.basescan.org',
            'eip155:8453': 'https://basescan.org',
            'eip155:1': 'https://etherscan.io',
            'eip155:11155111': 'https://sepolia.etherscan.io',
            'eip155:324705682': 'https://base-sepolia-testnet-explorer.skalenodes.com'
        }

        const url = explorerUrls[ paymentNetworkId ] || null

        return url
    }
}


export { HTML }
