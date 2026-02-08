import { createUIResource, RESOURCE_URI_META_KEY } from '@mcp-ui/server'


class WalletBalances {
    static attachToExistingTool( { server, mcpTools } ) {
        const targetToolName = 'get_balances_evm_avax'
        const uri = 'ui://x402/wallet-balances'
        const htmlString = WalletBalances.#buildHTML()

        const uiResource = createUIResource( {
            uri,
            'content': { 'type': 'rawHtml', htmlString },
            'encoding': 'text'
        } )

        server.resource(
            'x402-wallet-balances',
            uri,
            { 'mimeType': 'text/html' },
            async () => uiResource
        )

        const matchedTool = mcpTools
            .find( ( t ) => t.toolName === targetToolName )

        if( !matchedTool ) {
            console.log( `[UIWidgets] Tool "${targetToolName}" not found, skipping WalletBalances attachment` )

            return
        }

        const originalHandler = matchedTool.mcpTool?.handler
        if( originalHandler ) {
            matchedTool.mcpTool.handler = async ( params ) => {
                const result = await originalHandler( params )

                if( result && result.content ) {
                    result.content.push( uiResource )
                    result[ '_meta' ] = {
                        ...( result[ '_meta' ] || {} ),
                        [ RESOURCE_URI_META_KEY ]: uri
                    }
                }

                return result
            }
        }
    }


    static #buildHTML() {
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
        gap: 10px;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 1px solid #21262d;
    }
    .header h1 {
        font-size: 1.2em;
        color: #f0f6fc;
    }
    .chain-badge {
        font-size: 0.7em;
        padding: 2px 8px;
        border-radius: 12px;
        background: rgba(163, 113, 247, 0.15);
        color: #a371f7;
        border: 1px solid rgba(163, 113, 247, 0.3);
        font-weight: 600;
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
        font-size: 0.75em;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 10px 14px;
        text-align: left;
    }
    td {
        padding: 10px 14px;
        border-top: 1px solid #21262d;
        font-size: 0.9em;
    }
    .symbol {
        font-weight: 600;
        color: #f0f6fc;
    }
    .balance {
        font-family: 'SF Mono', Menlo, monospace;
        color: #3fb950;
    }
    .usd {
        font-family: 'SF Mono', Menlo, monospace;
        color: #8b949e;
        font-size: 0.85em;
    }
    .note {
        margin-top: 16px;
        font-size: 0.8em;
        color: #484f58;
        text-align: center;
    }
</style>
</head>
<body>
    <div class="header">
        <h1>Token Balances</h1>
        <span class="chain-badge">Avalanche</span>
    </div>

    <table>
        <thead>
            <tr>
                <th>Token</th>
                <th>Balance</th>
                <th>USD Value</th>
            </tr>
        </thead>
        <tbody id="balances">
            <tr>
                <td colspan="3" style="text-align:center; color:#8b949e;">
                    Data loaded from tool response
                </td>
            </tr>
        </tbody>
    </table>

    <p class="note">Balances are fetched via Sim by Dune API</p>

    <script>
        window.addEventListener( 'message', function( event ) {
            if( event.data && event.data.type === 'ui-lifecycle-iframe-render-data' ) {
                var data = event.data.data
                if( data && data.toolOutput && data.toolOutput.content ) {
                    var textContent = data.toolOutput.content
                        .filter( function( c ) { return c.type === 'text' } )
                        .map( function( c ) { return c.text } )
                        .join( '' )

                    try {
                        var parsed = JSON.parse( textContent )
                        var balances = parsed.balances || parsed.data || parsed
                        if( Array.isArray( balances ) ) {
                            var tbody = document.getElementById( 'balances' )
                            tbody.innerHTML = balances
                                .map( function( token ) {
                                    var symbol = token.symbol || token.name || 'Unknown'
                                    var balance = token.amount || token.balance || '0'
                                    var usd = token.value_usd || token.usd_value || '-'
                                    return '<tr>' +
                                        '<td class="symbol">' + symbol + '</td>' +
                                        '<td class="balance">' + balance + '</td>' +
                                        '<td class="usd">' + ( usd !== '-' ? '$' + Number( usd ).toFixed( 2 ) : '-' ) + '</td>' +
                                        '</tr>'
                                } )
                                .join( '' )
                        }
                    } catch( e ) {
                        // Data not parseable, keep placeholder
                    }
                }
            }
        } )
    </script>
</body>
</html>`

        return html
    }
}


export { WalletBalances }
