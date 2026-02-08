import { createUIResource, RESOURCE_URI_META_KEY } from '@mcp-ui/server'


class PaymentVisualizer {
    static register( { server } ) {
        const uri = 'ui://x402/payment-visualizer'
        const htmlString = PaymentVisualizer.#buildHTML()

        const uiResource = createUIResource( {
            uri,
            'content': { 'type': 'rawHtml', htmlString },
            'encoding': 'text',
            'adapters': { 'mcpApps': { 'enabled': true } }
        } )

        const cspMeta = {
            'ui': {
                'csp': {
                    'connectDomains': [],
                    'resourceDomains': [ 'self' ],
                    'frameDomains': [ 'self' ]
                }
            }
        }

        server.resource(
            'x402-payment-visualizer',
            uiResource.resource.uri,
            {},
            async () => ( {
                'contents': [ {
                    ...uiResource.resource,
                    '_meta': cspMeta
                } ]
            } )
        )

        const toolName = 'x402_payment_visualizer'

        server.tool(
            toolName,
            'Interactive step-by-step visualization of the X402 payment protocol flow. Shows how AI agents pay for MCP tools using blockchain payments. Returns a visual UI widget.',
            {
                'tier': {
                    'type': 'string',
                    'description': 'Payment tier to highlight (cheap, standard, or premium). Optional.',
                    'enum': [ 'cheap', 'standard', 'premium' ]
                }
            },
            async ( { tier } ) => {
                const result = {
                    'content': [ uiResource ],
                    '_meta': { [ RESOURCE_URI_META_KEY ]: uiResource.resource.uri }
                }

                return result
            }
        )

        server._registeredTools[ toolName ].update( {
            '_meta': {
                'ui': {
                    'resourceUri': uiResource.resource.uri
                }
            }
        } )
    }


    static #buildHTML() {
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #0d1117;
        color: #c9d1d9;
        padding: 20px;
    }
    .header {
        text-align: center;
        margin-bottom: 32px;
    }
    .header h1 {
        font-size: 1.3em;
        color: #f0f6fc;
        margin-bottom: 8px;
    }
    .header p {
        color: #8b949e;
        font-size: 0.9em;
    }
    .flow {
        display: flex;
        flex-direction: column;
        gap: 0;
        max-width: 500px;
        margin: 0 auto;
    }
    .step {
        background: #161b22;
        border: 1px solid #21262d;
        border-radius: 12px;
        padding: 20px;
        position: relative;
        opacity: 0;
        transform: translateY(20px);
        animation: fadeInUp 0.5s ease forwards;
    }
    .step:nth-child(1) { animation-delay: 0.1s; }
    .step:nth-child(3) { animation-delay: 0.3s; }
    .step:nth-child(5) { animation-delay: 0.5s; }
    .step:nth-child(7) { animation-delay: 0.7s; }
    .step:nth-child(9) { animation-delay: 0.9s; }
    @keyframes fadeInUp {
        to { opacity: 1; transform: translateY(0); }
    }
    .step-number {
        position: absolute;
        top: -12px;
        left: 20px;
        background: #238636;
        color: #fff;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75em;
        font-weight: 700;
    }
    .step-title {
        font-size: 1em;
        color: #f0f6fc;
        font-weight: 600;
        margin-bottom: 6px;
    }
    .step-desc {
        font-size: 0.85em;
        color: #8b949e;
        line-height: 1.5;
    }
    .step-actors {
        display: flex;
        gap: 8px;
        margin-top: 10px;
    }
    .actor {
        font-size: 0.7em;
        padding: 2px 8px;
        border-radius: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;
    }
    .actor.client {
        background: rgba(56, 139, 253, 0.15);
        color: #58a6ff;
        border: 1px solid rgba(56, 139, 253, 0.3);
    }
    .actor.server {
        background: rgba(163, 113, 247, 0.15);
        color: #a371f7;
        border: 1px solid rgba(163, 113, 247, 0.3);
    }
    .actor.chain {
        background: rgba(210, 153, 34, 0.15);
        color: #d29922;
        border: 1px solid rgba(210, 153, 34, 0.3);
    }
    .arrow {
        text-align: center;
        padding: 8px 0;
        color: #30363d;
        font-size: 1.2em;
    }
    .pricing {
        margin-top: 24px;
        background: #161b22;
        border: 1px solid #21262d;
        border-radius: 12px;
        padding: 20px;
    }
    .pricing h2 {
        font-size: 1em;
        color: #f0f6fc;
        margin-bottom: 12px;
    }
    .tier-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #21262d;
    }
    .tier-row:last-child { border-bottom: none; }
    .tier-name {
        font-weight: 500;
        color: #c9d1d9;
        text-transform: capitalize;
    }
    .tier-amount {
        font-family: 'SF Mono', Menlo, monospace;
        color: #3fb950;
        font-size: 0.9em;
    }
    .tier-units {
        color: #8b949e;
        font-size: 0.8em;
    }
</style>
</head>
<body>
    <div class="header">
        <h1>X402 Payment Flow</h1>
        <p>How AI agents pay for MCP tools using blockchain</p>
    </div>

    <div class="flow">
        <div class="step">
            <div class="step-number">1</div>
            <div class="step-title">Tool Request</div>
            <div class="step-desc">AI agent calls a paid MCP tool via tools/call. The request includes tool name and parameters.</div>
            <div class="step-actors">
                <span class="actor client">AI Client</span>
                <span class="actor server">MCP Server</span>
            </div>
        </div>

        <div class="arrow">&#8595;</div>

        <div class="step">
            <div class="step-number">2</div>
            <div class="step-title">402 Payment Required</div>
            <div class="step-desc">X402 middleware intercepts the request. Since no payment is attached, it returns a 402 response with payment requirements (network, amount, recipient).</div>
            <div class="step-actors">
                <span class="actor server">MCP Server</span>
            </div>
        </div>

        <div class="arrow">&#8595;</div>

        <div class="step">
            <div class="step-number">3</div>
            <div class="step-title">Sign Payment</div>
            <div class="step-desc">The AI client's wallet signs an EIP-712 typed data message authorizing the USDC transfer. No on-chain transaction yet.</div>
            <div class="step-actors">
                <span class="actor client">AI Client</span>
                <span class="actor chain">Wallet</span>
            </div>
        </div>

        <div class="arrow">&#8595;</div>

        <div class="step">
            <div class="step-number">4</div>
            <div class="step-title">Retry with Payment</div>
            <div class="step-desc">AI client retries the same tool call, attaching the signed payment in _meta["x402/payment"]. The server validates the signature and simulates the transaction.</div>
            <div class="step-actors">
                <span class="actor client">AI Client</span>
                <span class="actor server">MCP Server</span>
            </div>
        </div>

        <div class="arrow">&#8595;</div>

        <div class="step">
            <div class="step-number">5</div>
            <div class="step-title">Settle & Respond</div>
            <div class="step-desc">After executing the tool, the facilitator settles the payment on-chain. The tool result and settlement receipt are returned together.</div>
            <div class="step-actors">
                <span class="actor server">MCP Server</span>
                <span class="actor chain">Blockchain</span>
            </div>
        </div>
    </div>

    <div class="pricing">
        <h2>Payment Tiers (Test USDC)</h2>
        <div class="tier-row">
            <span class="tier-name">Cheap</span>
            <span><span class="tier-amount">$0.0001</span> <span class="tier-units">(100 units)</span></span>
        </div>
        <div class="tier-row">
            <span class="tier-name">Standard</span>
            <span><span class="tier-amount">$0.005</span> <span class="tier-units">(5,000 units)</span></span>
        </div>
        <div class="tier-row">
            <span class="tier-name">Premium</span>
            <span><span class="tier-amount">$0.0777</span> <span class="tier-units">(77,700 units)</span></span>
        </div>
    </div>

    <noscript>X402 Payment Flow: 1) Tool Request 2) 402 Payment Required 3) Sign Payment 4) Retry with Payment 5) Settle and Respond. Tiers: Cheap $0.0001, Standard $0.005, Premium $0.0777</noscript>
</body>
</html>`

        return html
    }
}


export { PaymentVisualizer }
