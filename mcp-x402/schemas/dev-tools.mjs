/**
 * x402 Development & Testing Tools Schema
 *
 * Comprehensive test tools for:
 * - Free vs Paid route testing
 * - Gate simulation (all reason codes)
 * - Payment tier testing (cheap/standard/premium)
 * - Consent/Policy workflow testing
 *
 * Test Tools Overview:
 * ---------------------------------------------------------------------------
 * Tool Name                  | Type   | Payment | Purpose
 * ---------------------------------------------------------------------------
 * free_ping                  | FREE   | -       | Basic connectivity test
 * paid_ping                  | PAID   | cheap   | Basic paid route test
 * ---------------------------------------------------------------------------
 * test_tier_cheap            | PAID   | cheap   | Payment tier: 0.0001 USD
 * test_tier_standard         | PAID   | standard| Payment tier: 0.005 USD
 * test_tier_premium          | PAID   | premium | Payment tier: 0.0777 USD
 * ---------------------------------------------------------------------------
 * test_chain_fuji_only       | PAID   | fuji    | Single chain: Fuji only
 * test_chain_base_only       | PAID   | base    | Single chain: Base only
 * test_chain_multi           | PAID   | both    | Multi-chain: Fuji + Base
 * ---------------------------------------------------------------------------
 * sim_chain_inactive         | PAID   | cheap   | Simulate CHAIN_INACTIVE
 * sim_route_inactive         | PAID   | cheap   | Simulate ROUTE_INACTIVE
 * sim_contract_unapproved    | PAID   | cheap   | Simulate CONTRACT_UNAPPROVED
 * sim_wallet_not_configured  | PAID   | cheap   | Simulate WALLET_NOT_CONFIGURED
 * sim_wallet_unfunded        | PAID   | cheap   | Simulate WALLET_UNFUNDED
 * ---------------------------------------------------------------------------
 * sim_recipient_blacklisted  | PAID   | cheap   | Simulate RECIPIENT_BLACKLISTED
 * sim_recipient_flagged      | PAID   | cheap   | Simulate RECIPIENT_FLAGGED
 * sim_server_untrusted       | PAID   | cheap   | Simulate SERVER_UNTRUSTED
 * ---------------------------------------------------------------------------
 * sim_consent_required       | PAID   | cheap   | Simulate CONSENT_REQUIRED
 * sim_consent_expired        | PAID   | cheap   | Simulate CONSENT_EXPIRED
 * sim_consent_declined       | PAID   | cheap   | Simulate CONSENT_DECLINED
 * sim_allowance_expired      | PAID   | cheap   | Simulate ALLOWANCE_EXPIRED
 * sim_policy_blocked         | PAID   | cheap   | Simulate POLICY_BLOCKED
 * ---------------------------------------------------------------------------
 * sim_budget_exceeded        | PAID   | cheap   | Simulate BUDGET_EXCEEDED
 * sim_credits_exhausted      | PAID   | cheap   | Simulate CREDITS_EXHAUSTED
 * sim_credits_insufficient   | PAID   | cheap   | Simulate CREDITS_INSUFFICIENT
 * ---------------------------------------------------------------------------
 */


const schema = {
    namespace: "x402",
    name: "x402 Development & Testing Tools",
    description: "Comprehensive test schema for verifying free/paid routes, gate behaviors, payment tiers, and consent workflows under FlowMCP v1.2.0",
    docs: [ "https://docs.via402.com/testing" ],
    tags: [ "testing", "development", "payment" ],
    flowMCP: "1.2.0",
    root: "https://api.x402.test/v1",
    requiredServerParams: [],
    headers: {},
    routes: {
        // =========================================================================
        // BASIC PING TOOLS
        // =========================================================================
        free_ping: {
            requestMethod: "GET",
            description: "Simple free route to verify server responsiveness",
            route: "/ping",
            parameters: [],
            tests: [ { _description: "Basic ping test" } ],
            modifiers: [ { phase: "execute", handlerName: "free_ping" } ]
        },
        paid_ping: {
            requestMethod: "GET",
            description: "Simulated paid route to test vault access",
            route: "/vault/item",
            parameters: [],
            tests: [ { _description: "Basic paid ping test" } ],
            modifiers: [ { phase: "execute", handlerName: "paid_ping" } ]
        },

        // =========================================================================
        // PAYMENT TIER TOOLS
        // =========================================================================
        test_tier_cheap: {
            requestMethod: "GET",
            description: "Test cheap payment tier (0.0001 USD). Validates low-cost micropayment flow.",
            route: "/test/tier/cheap",
            parameters: [],
            tests: [ { _description: "Cheap tier payment test" } ],
            modifiers: [ { phase: "execute", handlerName: "test_tier_cheap" } ]
        },
        test_tier_standard: {
            requestMethod: "GET",
            description: "Test standard payment tier (0.005 USD). Validates typical API call pricing.",
            route: "/test/tier/standard",
            parameters: [],
            tests: [ { _description: "Standard tier payment test" } ],
            modifiers: [ { phase: "execute", handlerName: "test_tier_standard" } ]
        },
        test_tier_premium: {
            requestMethod: "GET",
            description: "Test premium payment tier (0.0777 USD). Validates higher-cost operation pricing.",
            route: "/test/tier/premium",
            parameters: [],
            tests: [ { _description: "Premium tier payment test" } ],
            modifiers: [ { phase: "execute", handlerName: "test_tier_premium" } ]
        },

        // =========================================================================
        // CHAIN-SPECIFIC TOOLS
        // =========================================================================
        test_chain_fuji_only: {
            requestMethod: "GET",
            description: "Test Avalanche Fuji chain only. Payment restricted to USDC on Fuji testnet.",
            route: "/test/chain/fuji",
            parameters: [],
            tests: [ { _description: "Fuji-only chain test" } ],
            modifiers: [ { phase: "execute", handlerName: "test_chain_fuji_only" } ]
        },
        test_chain_base_only: {
            requestMethod: "GET",
            description: "Test Base Sepolia chain only. Payment restricted to USDC on Base Sepolia testnet.",
            route: "/test/chain/base",
            parameters: [],
            tests: [ { _description: "Base-only chain test" } ],
            modifiers: [ { phase: "execute", handlerName: "test_chain_base_only" } ]
        },
        test_chain_multi: {
            requestMethod: "GET",
            description: "Test multi-chain payment. User can choose between Fuji or Base Sepolia.",
            route: "/test/chain/multi",
            parameters: [],
            tests: [ { _description: "Multi-chain test" } ],
            modifiers: [ { phase: "execute", handlerName: "test_chain_multi" } ]
        },

        // =========================================================================
        // GATE SIMULATION TOOLS - Infrastructure (G1-G4)
        // =========================================================================
        sim_chain_inactive: {
            requestMethod: "GET",
            description: "Simulate CHAIN_INACTIVE gate. Server indicates blockchain network is unavailable.",
            route: "/sim/gate/chain-inactive",
            parameters: [],
            tests: [ { _description: "Simulate chain inactive" } ],
            modifiers: [ { phase: "execute", handlerName: "sim_chain_inactive" } ]
        },
        sim_route_inactive: {
            requestMethod: "GET",
            description: "Simulate ROUTE_INACTIVE gate. Payment route temporarily unavailable.",
            route: "/sim/gate/route-inactive",
            parameters: [],
            tests: [ { _description: "Simulate route inactive" } ],
            modifiers: [ { phase: "execute", handlerName: "sim_route_inactive" } ]
        },
        sim_contract_unapproved: {
            requestMethod: "GET",
            description: "Simulate CONTRACT_UNAPPROVED gate. Smart contract not whitelisted for payments.",
            route: "/sim/gate/contract-unapproved",
            parameters: [],
            tests: [ { _description: "Simulate contract unapproved" } ],
            modifiers: [ { phase: "execute", handlerName: "sim_contract_unapproved" } ]
        },
        sim_wallet_not_configured: {
            requestMethod: "GET",
            description: "Simulate WALLET_NOT_CONFIGURED gate. User has no payment wallet set up.",
            route: "/sim/gate/wallet-not-configured",
            parameters: [],
            tests: [ { _description: "Simulate wallet not configured" } ],
            modifiers: [ { phase: "execute", handlerName: "sim_wallet_not_configured" } ]
        },
        sim_wallet_unfunded: {
            requestMethod: "GET",
            description: "Simulate WALLET_UNFUNDED gate. User wallet has insufficient balance.",
            route: "/sim/gate/wallet-unfunded",
            parameters: [],
            tests: [ { _description: "Simulate wallet unfunded" } ],
            modifiers: [ { phase: "execute", handlerName: "sim_wallet_unfunded" } ]
        },

        // =========================================================================
        // GATE SIMULATION TOOLS - Trust & Risk (G5-G7)
        // =========================================================================
        sim_recipient_blacklisted: {
            requestMethod: "GET",
            description: "Simulate RECIPIENT_BLACKLISTED gate. Recipient address on blocklist (hard block).",
            route: "/sim/gate/recipient-blacklisted",
            parameters: [],
            tests: [ { _description: "Simulate recipient blacklisted" } ],
            modifiers: [ { phase: "execute", handlerName: "sim_recipient_blacklisted" } ]
        },
        sim_recipient_flagged: {
            requestMethod: "GET",
            description: "Simulate RECIPIENT_FLAGGED gate. Recipient under AML review (soft hold).",
            route: "/sim/gate/recipient-flagged",
            parameters: [],
            tests: [ { _description: "Simulate recipient flagged" } ],
            modifiers: [ { phase: "execute", handlerName: "sim_recipient_flagged" } ]
        },
        sim_server_untrusted: {
            requestMethod: "GET",
            description: "Simulate SERVER_UNTRUSTED gate. MCP server not verified by user.",
            route: "/sim/gate/server-untrusted",
            parameters: [],
            tests: [ { _description: "Simulate server untrusted" } ],
            modifiers: [ { phase: "execute", handlerName: "sim_server_untrusted" } ]
        },

        // =========================================================================
        // GATE SIMULATION TOOLS - Consent (PRD-03)
        // =========================================================================
        sim_consent_required: {
            requestMethod: "GET",
            description: "Simulate CONSENT_REQUIRED gate. User must approve tool before payment.",
            route: "/sim/gate/consent-required",
            parameters: [],
            tests: [ { _description: "Simulate consent required" } ],
            modifiers: [ { phase: "execute", handlerName: "sim_consent_required" } ]
        },
        sim_consent_expired: {
            requestMethod: "GET",
            description: "Simulate CONSENT_EXPIRED gate. Previous consent has timed out.",
            route: "/sim/gate/consent-expired",
            parameters: [],
            tests: [ { _description: "Simulate consent expired" } ],
            modifiers: [ { phase: "execute", handlerName: "sim_consent_expired" } ]
        },
        sim_consent_declined: {
            requestMethod: "GET",
            description: "Simulate CONSENT_DECLINED gate. User explicitly rejected this tool (hard block).",
            route: "/sim/gate/consent-declined",
            parameters: [],
            tests: [ { _description: "Simulate consent declined" } ],
            modifiers: [ { phase: "execute", handlerName: "sim_consent_declined" } ]
        },
        sim_allowance_expired: {
            requestMethod: "GET",
            description: "Simulate ALLOWANCE_EXPIRED gate. 5-minute payment allowance window expired.",
            route: "/sim/gate/allowance-expired",
            parameters: [],
            tests: [ { _description: "Simulate allowance expired" } ],
            modifiers: [ { phase: "execute", handlerName: "sim_allowance_expired" } ]
        },
        sim_policy_blocked: {
            requestMethod: "GET",
            description: "Simulate POLICY_BLOCKED gate. Tool blocked by account policy (hard block).",
            route: "/sim/gate/policy-blocked",
            parameters: [],
            tests: [ { _description: "Simulate policy blocked" } ],
            modifiers: [ { phase: "execute", handlerName: "sim_policy_blocked" } ]
        },

        // =========================================================================
        // GATE SIMULATION TOOLS - Budget & Credits (PRD-04)
        // =========================================================================
        sim_budget_exceeded: {
            requestMethod: "GET",
            description: "Simulate BUDGET_EXCEEDED gate. User's spending budget is depleted.",
            route: "/sim/gate/budget-exceeded",
            parameters: [],
            tests: [ { _description: "Simulate budget exceeded" } ],
            modifiers: [ { phase: "execute", handlerName: "sim_budget_exceeded" } ]
        },
        sim_credits_exhausted: {
            requestMethod: "GET",
            description: "Simulate CREDITS_EXHAUSTED gate. User's credit balance is zero.",
            route: "/sim/gate/credits-exhausted",
            parameters: [],
            tests: [ { _description: "Simulate credits exhausted" } ],
            modifiers: [ { phase: "execute", handlerName: "sim_credits_exhausted" } ]
        },
        sim_credits_insufficient: {
            requestMethod: "GET",
            description: "Simulate CREDITS_INSUFFICIENT gate. Credit balance too low for this operation.",
            route: "/sim/gate/credits-insufficient",
            parameters: [],
            tests: [ { _description: "Simulate credits insufficient" } ],
            modifiers: [ { phase: "execute", handlerName: "sim_credits_insufficient" } ]
        }
    },
    handlers: {
        // =========================================================================
        // BASIC PING HANDLERS
        // =========================================================================
        free_ping: async ( { struct, payload } ) => {
            struct.data = {
                method: "free_ping",
                status: "alive",
                version: "x402-v2.0",
                time: new Date().toISOString(),
                message: "Free endpoint - no payment required"
            }
            struct.status = true

            return { struct, payload }
        },

        paid_ping: async ( { struct, payload } ) => {
            struct.data = {
                method: "paid_ping",
                itemId: "VAULT-001",
                content: "Premium content unlocked via x402 payment",
                access_level: "licensed",
                metadata: {
                    retrieved_at: new Date().toISOString(),
                    source: "x402-vault",
                    payment_tier: "cheap"
                }
            }
            struct.status = true

            return { struct, payload }
        },

        // =========================================================================
        // PAYMENT TIER HANDLERS
        // =========================================================================
        test_tier_cheap: async ( { struct, payload } ) => {
            struct.data = {
                method: "test_tier_cheap",
                tier: "cheap",
                price_usd: "0.0001",
                price_description: "100 micro-units (0.0001 USD)",
                message: "Cheap tier payment successful",
                timestamp: new Date().toISOString()
            }
            struct.status = true

            return { struct, payload }
        },

        test_tier_standard: async ( { struct, payload } ) => {
            struct.data = {
                method: "test_tier_standard",
                tier: "standard",
                price_usd: "0.005",
                price_description: "5000 micro-units (0.005 USD)",
                message: "Standard tier payment successful",
                timestamp: new Date().toISOString()
            }
            struct.status = true

            return { struct, payload }
        },

        test_tier_premium: async ( { struct, payload } ) => {
            struct.data = {
                method: "test_tier_premium",
                tier: "premium",
                price_usd: "0.0777",
                price_description: "77700 micro-units (0.0777 USD)",
                message: "Premium tier payment successful",
                timestamp: new Date().toISOString()
            }
            struct.status = true

            return { struct, payload }
        },

        // =========================================================================
        // CHAIN-SPECIFIC HANDLERS
        // =========================================================================
        test_chain_fuji_only: async ( { struct, payload } ) => {
            struct.data = {
                method: "test_chain_fuji_only",
                chain: "avalanche-fuji",
                chain_id: "43113",
                payment_network_id: "eip155:43113",
                message: "Fuji testnet payment successful",
                timestamp: new Date().toISOString()
            }
            struct.status = true

            return { struct, payload }
        },

        test_chain_base_only: async ( { struct, payload } ) => {
            struct.data = {
                method: "test_chain_base_only",
                chain: "base-sepolia",
                chain_id: "84532",
                payment_network_id: "eip155:84532",
                message: "Base Sepolia payment successful",
                timestamp: new Date().toISOString()
            }
            struct.status = true

            return { struct, payload }
        },

        test_chain_multi: async ( { struct, payload } ) => {
            struct.data = {
                method: "test_chain_multi",
                supported_chains: [
                    { chain: "avalanche-fuji", chain_id: "43113", network_id: "eip155:43113" },
                    { chain: "base-sepolia", chain_id: "84532", network_id: "eip155:84532" }
                ],
                message: "Multi-chain payment successful (user chose their preferred chain)",
                timestamp: new Date().toISOString()
            }
            struct.status = true

            return { struct, payload }
        },

        // =========================================================================
        // GATE SIMULATION HANDLERS - Infrastructure
        // =========================================================================
        sim_chain_inactive: async ( { struct, payload } ) => {
            struct.data = {
                method: "sim_chain_inactive",
                simulation: true,
                gate: "G1",
                reason_code: "CHAIN_INACTIVE",
                decision_state: "on_hold",
                hold_state: null,
                severity: "info",
                message: "Simulated: Blockchain network is currently inactive",
                timestamp: new Date().toISOString()
            }
            struct.status = true

            return { struct, payload }
        },

        sim_route_inactive: async ( { struct, payload } ) => {
            struct.data = {
                method: "sim_route_inactive",
                simulation: true,
                gate: "G2",
                reason_code: "ROUTE_INACTIVE",
                decision_state: "on_hold",
                hold_state: null,
                severity: "info",
                message: "Simulated: Payment route is not available",
                timestamp: new Date().toISOString()
            }
            struct.status = true

            return { struct, payload }
        },

        sim_contract_unapproved: async ( { struct, payload } ) => {
            struct.data = {
                method: "sim_contract_unapproved",
                simulation: true,
                gate: "G3",
                reason_code: "CONTRACT_UNAPPROVED",
                decision_state: "blocked",
                hold_state: null,
                severity: "info",
                message: "Simulated: Smart contract has not been approved for use",
                timestamp: new Date().toISOString()
            }
            struct.status = true

            return { struct, payload }
        },

        sim_wallet_not_configured: async ( { struct, payload } ) => {
            struct.data = {
                method: "sim_wallet_not_configured",
                simulation: true,
                gate: "G4",
                reason_code: "WALLET_NOT_CONFIGURED",
                decision_state: "on_hold",
                hold_state: null,
                severity: "info",
                required_action: "provider_fix",
                actions: [ "CONFIGURE_WALLET" ],
                message: "Simulated: Please configure a wallet to enable payments",
                timestamp: new Date().toISOString()
            }
            struct.status = true

            return { struct, payload }
        },

        sim_wallet_unfunded: async ( { struct, payload } ) => {
            struct.data = {
                method: "sim_wallet_unfunded",
                simulation: true,
                gate: "G5",
                reason_code: "WALLET_UNFUNDED",
                decision_state: "on_hold",
                hold_state: "funding_hold",
                severity: "critical",
                required_action: "provider_fix",
                actions: [ "FUND_WALLET" ],
                message: "Simulated: Your wallet needs funds to make payments",
                timestamp: new Date().toISOString()
            }
            struct.status = true

            return { struct, payload }
        },

        // =========================================================================
        // GATE SIMULATION HANDLERS - Trust & Risk
        // =========================================================================
        sim_recipient_blacklisted: async ( { struct, payload } ) => {
            struct.data = {
                method: "sim_recipient_blacklisted",
                simulation: true,
                gate: "G6",
                reason_code: "RECIPIENT_BLACKLISTED",
                decision_state: "blocked",
                hold_state: null,
                severity: "critical",
                hard_stop: true,
                required_action: "admin_review",
                actions: [ "CONTACT_SUPPORT" ],
                message: "Simulated: This recipient wallet has been blocked due to risk assessment",
                timestamp: new Date().toISOString()
            }
            struct.status = true

            return { struct, payload }
        },

        sim_recipient_flagged: async ( { struct, payload } ) => {
            struct.data = {
                method: "sim_recipient_flagged",
                simulation: true,
                gate: "G6",
                reason_code: "RECIPIENT_FLAGGED",
                decision_state: "on_hold",
                hold_state: "trust_hold",
                severity: "warning",
                required_action: "admin_review",
                actions: [ "CONTACT_SUPPORT" ],
                message: "Simulated: This recipient has been flagged and is under review",
                timestamp: new Date().toISOString()
            }
            struct.status = true

            return { struct, payload }
        },

        sim_server_untrusted: async ( { struct, payload } ) => {
            struct.data = {
                method: "sim_server_untrusted",
                simulation: true,
                gate: "G7",
                reason_code: "SERVER_UNTRUSTED",
                decision_state: "on_hold",
                hold_state: "trust_hold",
                severity: "warning",
                required_action: "provider_fix",
                actions: [ "VERIFY_SERVER", "VIEW_VERIFICATION_STEPS" ],
                message: "Simulated: This server needs to be verified before payments can be processed",
                timestamp: new Date().toISOString()
            }
            struct.status = true

            return { struct, payload }
        },

        // =========================================================================
        // GATE SIMULATION HANDLERS - Consent
        // =========================================================================
        sim_consent_required: async ( { struct, payload } ) => {
            struct.data = {
                method: "sim_consent_required",
                simulation: true,
                gate: "consent",
                reason_code: "CONSENT_REQUIRED",
                decision_state: "on_hold",
                hold_state: "waiting_for_consent",
                severity: "warning",
                required_action: "user_consent",
                actions: [ "ACCEPT_CONSENT", "DECLINE_CONSENT", "BLOCK_TOOL" ],
                message: "Simulated: This tool requires your consent before it can make payments on your behalf",
                timestamp: new Date().toISOString()
            }
            struct.status = true

            return { struct, payload }
        },

        sim_consent_expired: async ( { struct, payload } ) => {
            struct.data = {
                method: "sim_consent_expired",
                simulation: true,
                gate: "consent",
                reason_code: "CONSENT_EXPIRED",
                decision_state: "on_hold",
                hold_state: "waiting_for_consent",
                severity: "warning",
                required_action: "user_consent",
                actions: [ "ACCEPT_CONSENT", "DECLINE_CONSENT" ],
                message: "Simulated: Your consent for this tool has expired. Please review and renew",
                timestamp: new Date().toISOString()
            }
            struct.status = true

            return { struct, payload }
        },

        sim_consent_declined: async ( { struct, payload } ) => {
            struct.data = {
                method: "sim_consent_declined",
                simulation: true,
                gate: "consent",
                reason_code: "CONSENT_DECLINED",
                decision_state: "blocked",
                hold_state: null,
                severity: "warning",
                hard_stop: true,
                required_action: "admin_review",
                actions: [ "ACCEPT_CONSENT", "VIEW_POLICY" ],
                message: "Simulated: You declined consent for this tool. It cannot make payments",
                timestamp: new Date().toISOString()
            }
            struct.status = true

            return { struct, payload }
        },

        sim_allowance_expired: async ( { struct, payload } ) => {
            struct.data = {
                method: "sim_allowance_expired",
                simulation: true,
                gate: "consent",
                reason_code: "ALLOWANCE_EXPIRED",
                decision_state: "on_hold",
                hold_state: "waiting_for_consent",
                severity: "warning",
                required_action: "user_consent",
                actions: [ "ACCEPT_CONSENT", "DECLINE_CONSENT" ],
                message: "Simulated: Your payment allowance for this tool has expired (5-minute window)",
                timestamp: new Date().toISOString()
            }
            struct.status = true

            return { struct, payload }
        },

        sim_policy_blocked: async ( { struct, payload } ) => {
            struct.data = {
                method: "sim_policy_blocked",
                simulation: true,
                gate: "consent",
                reason_code: "POLICY_BLOCKED",
                decision_state: "blocked",
                hold_state: null,
                severity: "critical",
                hard_stop: true,
                required_action: "admin_review",
                actions: [ "UNBLOCK_TOOL", "VIEW_POLICY" ],
                message: "Simulated: This tool has been blocked by your account policy",
                timestamp: new Date().toISOString()
            }
            struct.status = true

            return { struct, payload }
        },

        // =========================================================================
        // GATE SIMULATION HANDLERS - Budget & Credits
        // =========================================================================
        sim_budget_exceeded: async ( { struct, payload } ) => {
            struct.data = {
                method: "sim_budget_exceeded",
                simulation: true,
                gate: "budget",
                reason_code: "BUDGET_EXCEEDED",
                decision_state: "on_hold",
                hold_state: "budget_hold",
                severity: "critical",
                hard_stop: true,
                required_action: "increase_budget",
                actions: [ "INCREASE_BUDGET", "VIEW_SPENDING", "TOP_UP" ],
                message: "Simulated: Your spending budget has been reached. Increase your budget or wait for the next period",
                timestamp: new Date().toISOString()
            }
            struct.status = true

            return { struct, payload }
        },

        sim_credits_exhausted: async ( { struct, payload } ) => {
            struct.data = {
                method: "sim_credits_exhausted",
                simulation: true,
                gate: "credits",
                reason_code: "CREDITS_EXHAUSTED",
                decision_state: "on_hold",
                hold_state: "credits_hold",
                severity: "critical",
                hard_stop: true,
                required_action: "top_up",
                actions: [ "TOP_UP", "VIEW_SPENDING" ],
                message: "Simulated: Your credits have been exhausted. Please top up to continue",
                timestamp: new Date().toISOString()
            }
            struct.status = true

            return { struct, payload }
        },

        sim_credits_insufficient: async ( { struct, payload } ) => {
            struct.data = {
                method: "sim_credits_insufficient",
                simulation: true,
                gate: "credits",
                reason_code: "CREDITS_INSUFFICIENT",
                decision_state: "on_hold",
                hold_state: "credits_hold",
                severity: "critical",
                hard_stop: true,
                required_action: "top_up",
                actions: [ "TOP_UP", "VIEW_SPENDING" ],
                message: "Simulated: You don't have enough credits for this transaction",
                timestamp: new Date().toISOString()
            }
            struct.status = true

            return { struct, payload }
        }
    }
}


export { schema }
