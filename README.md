[![Test](https://img.shields.io/github/actions/workflow/status/flowmcp/x402-flowmcp-org/test-on-release.yml)]()
[![Codecov](https://img.shields.io/codecov/c/github/flowmcp/x402-flowmcp-org)]()
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

# x402-flowmcp-org

Payment-gated MCP server that combines FlowMCP schemas with X402 on-chain payments. Exposes Avalanche blockchain data (via Sim by Dune) as MCP tools — some free, some requiring ERC20 payment on testnet. Includes A2A (Agent-to-Agent) protocol support and a comprehensive test suite for payment gate simulation.

## Features

- **X402 payment middleware** — ERC20 on-chain payments via EIP-3009 signed authorizations
- **FlowMCP schemas** — Avalanche blockchain data (balances, transactions, collectibles, token info, activity)
- **Multi-chain testnet** — Avalanche Fuji, Base Sepolia, SKALE
- **Payment tiers** — Cheap (0.0001), Standard (0.005), Premium (0.0777 USDC)
- **A2A protocol** — Agent Card generation, task routing, payment bridge
- **Gate simulation tools** — 15+ test tools for simulating payment failures, consent flows, budget limits
- **MCP UI widgets** — Server dashboard, wallet balances, payment visualizer

## Architecture

```
                  ┌──────────────────────────────┐
                  │       AI Agent / Client       │
                  └──────────────┬───────────────┘
                                 │
                        MCP (Streamable HTTP)
                                 │
                  ┌──────────────▼───────────────┐
                  │     x402-flowmcp-org Server   │
                  │                               │
                  │  ┌─────────┐  ┌────────────┐  │
                  │  │ FlowMCP │  │ X402       │  │
                  │  │ Schemas │  │ Middleware  │  │
                  │  └────┬────┘  └─────┬──────┘  │
                  │       │             │         │
                  │  ┌────▼─────────────▼──────┐  │
                  │  │    Route Handler         │  │
                  │  └────┬────────────────────┘  │
                  └───────┼───────────────────────┘
                          │
              ┌───────────▼───────────┐
              │   Sim by Dune API     │
              │   (Avalanche data)    │
              └───────────────────────┘
```

## Schemas

### Avalanche Data (avax)

Sim by Dune API for Avalanche Mainnet and Fuji testnet:

| Tool | Description | Payment |
|------|-------------|---------|
| `get_balances_evm_avax` | Token balances with USD valuations | Free |
| `get_transactions_evm_avax` | Transaction history | Free |
| `get_collectibles_evm_avax` | NFT collectibles (ERC721/ERC1155) | Standard |
| `get_token_info_evm_avax` | Token metadata (symbol, price, logo) | Free |
| `get_token_holders_evm_avax` | Token holder list | Premium |
| `get_activity_evm_avax` | Summarized activity feed | Standard |
| `get_activity_detailed_evm_avax` | Raw activity feed | Free |

### Development & Testing (x402)

25+ test tools for verifying payment flows:

- **Ping tools** — `free_ping` (free) and `paid_ping` (paid)
- **Payment tier tests** — Cheap, Standard, Premium
- **Chain-specific tests** — Fuji-only, Base-only, Multi-chain
- **Gate simulations** — Chain inactive, route inactive, contract unapproved, wallet not configured, wallet unfunded
- **Trust simulations** — Recipient blacklisted/flagged, server untrusted
- **Consent simulations** — Required, expired, declined, allowance expired, policy blocked
- **Budget simulations** — Budget exceeded, credits exhausted/insufficient

## Setup

### Prerequisites

- Node.js 22
- Environment file with X402 credentials (see `.example.env`)

### Install & Run

```bash
git clone https://github.com/flowmcp/x402-flowmcp-org.git
cd x402-flowmcp-org
npm install

# Development
npm run server:dev

# Production
npm run server:prod
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `X402_FACILITATOR_PUBLIC_KEY` | Facilitator wallet public key |
| `X402_FACILITATOR_PRIVATE_KEY` | Facilitator wallet private key |
| `X402_RECEPIENT_PUBLIC_KEY` | Payment recipient address |
| `X402_FUJI_PROVIDER_URL` | Avalanche Fuji RPC endpoint |
| `X402_BASE_SEPOLIA_PROVIDER_URL` | Base Sepolia RPC endpoint |
| `X402_SKALE_BASE_SEPOLIA_PROVIDER_URL` | SKALE RPC endpoint |
| `DUNE_SIM_API_KEY` | Sim by Dune API key |

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `http://localhost:4002/mcp/streamable` | MCP Streamable HTTP |
| `http://localhost:4002/.well-known/agent-card.json` | A2A Agent Card |
| `http://localhost:4002/a2a` | A2A Protocol endpoint |

## Tests

```bash
npm test
npm run test:coverage:src
```

Unit tests cover ServerManager, A2A components (AgentCard, TaskStore, PaymentBridge, ResponseFormatter).

## Related

- [x402-core](https://github.com/FlowMCP/x402-core) — Multi-chain ERC20 payment layer
- [x402-mcp-middleware](https://github.com/FlowMCP/x402-mcp-middleware) — Express middleware for payment-gated MCP
- [flowmcp-servers](https://github.com/FlowMCP/flowmcp-servers) — Local and remote MCP server runtime
- [flowmcp-schemas](https://github.com/FlowMCP/flowmcp-schemas) — 187+ API schemas for MCP

## License

MIT
