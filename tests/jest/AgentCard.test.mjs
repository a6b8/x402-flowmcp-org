import { describe, test, expect } from '@jest/globals'
import { AgentCard } from '../../mcp-x402/helpers/a2a/AgentCard.mjs'


describe( 'AgentCard', () => {
    const schemas = [
        {
            'namespace': 'testNs',
            'routes': {
                'getBalances': {
                    'description': 'Get token balances',
                    'parameters': [
                        { 'position': { 'key': 'address' } }
                    ]
                },
                'freePing': {
                    'description': 'Free ping tool',
                    'parameters': []
                }
            }
        }
    ]

    const restrictedCalls = [
        { 'method': 'tools/call', 'name': 'get_balances_test_ns' }
    ]

    const serverUrl = 'http://localhost:4002'


    describe( 'generate', () => {
        test( 'generates agent card with correct structure', () => {
            const { card } = AgentCard.generate( { schemas, restrictedCalls, serverUrl } )

            expect( card ).toBeDefined()
            expect( card[ 'name' ] ).toBe( 'x402 MCP Server Agent' )
            expect( card[ 'url' ] ).toBe( serverUrl )
            expect( card[ 'version' ] ).toBe( '1.0.0' )
        } )


        test( 'includes supported interfaces with A2A endpoint', () => {
            const { card } = AgentCard.generate( { schemas, restrictedCalls, serverUrl } )

            expect( card[ 'supported_interfaces' ] ).toHaveLength( 1 )
            expect( card[ 'supported_interfaces' ][ 0 ][ 'url' ] ).toBe( `${serverUrl}/a2a` )
            expect( card[ 'supported_interfaces' ][ 0 ][ 'protocol_binding' ] ).toBe( 'JSONRPC' )
        } )


        test( 'generates skills from schemas', () => {
            const { card } = AgentCard.generate( { schemas, restrictedCalls, serverUrl } )

            expect( card[ 'skills' ] ).toHaveLength( 2 )

            const skillNames = card[ 'skills' ].map( ( s ) => s[ 'id' ] )
            expect( skillNames ).toContain( 'get_balances_test_ns' )
            expect( skillNames ).toContain( 'free_ping_test_ns' )
        } )


        test( 'marks restricted tools with x402 tag', () => {
            const { card } = AgentCard.generate( { schemas, restrictedCalls, serverUrl } )

            const restrictedSkill = card[ 'skills' ]
                .find( ( s ) => s[ 'id' ] === 'get_balances_test_ns' )

            expect( restrictedSkill[ 'tags' ] ).toContain( 'x402-payment-required' )
        } )


        test( 'does not add x402 tag to free tools', () => {
            const { card } = AgentCard.generate( { schemas, restrictedCalls, serverUrl } )

            const freeSkill = card[ 'skills' ]
                .find( ( s ) => s[ 'id' ] === 'free_ping_test_ns' )

            expect( freeSkill[ 'tags' ] ).not.toContain( 'x402-payment-required' )
        } )


        test( 'includes capabilities with extensions', () => {
            const { card } = AgentCard.generate( { schemas, restrictedCalls, serverUrl } )

            expect( card[ 'capabilities' ][ 'streaming' ] ).toBe( true )
            expect( card[ 'capabilities' ][ 'extensions' ] ).toHaveLength( 2 )
        } )


        test( 'generates examples for skills with parameters', () => {
            const { card } = AgentCard.generate( { schemas, restrictedCalls, serverUrl } )

            const skillWithParams = card[ 'skills' ]
                .find( ( s ) => s[ 'id' ] === 'get_balances_test_ns' )

            expect( skillWithParams[ 'examples' ].length ).toBeGreaterThan( 0 )
        } )


        test( 'handles empty schemas array', () => {
            const { card } = AgentCard.generate( {
                'schemas': [],
                restrictedCalls,
                serverUrl
            } )

            expect( card[ 'skills' ] ).toHaveLength( 0 )
        } )


        test( 'handles schema with no routes', () => {
            const { card } = AgentCard.generate( {
                'schemas': [ { 'namespace': 'empty', 'routes': {} } ],
                restrictedCalls,
                serverUrl
            } )

            expect( card[ 'skills' ] ).toHaveLength( 0 )
        } )
    } )
} )
