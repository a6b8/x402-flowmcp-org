import { describe, test, expect } from '@jest/globals'
import { A2APaymentBridge } from '../../mcp-x402/helpers/a2a/A2APaymentBridge.mjs'


describe( 'A2APaymentBridge', () => {
    describe( 'isPaymentRequired', () => {
        test( 'returns false when mcpResponse is null', () => {
            const { isRequired } = A2APaymentBridge.isPaymentRequired( {
                'mcpResponse': null
            } )

            expect( isRequired ).toBe( false )
        } )


        test( 'returns false when no error in response', () => {
            const { isRequired } = A2APaymentBridge.isPaymentRequired( {
                'mcpResponse': { 'result': { 'content': [] } }
            } )

            expect( isRequired ).toBe( false )
        } )


        test( 'detects payment required by error code 402', () => {
            const { isRequired } = A2APaymentBridge.isPaymentRequired( {
                'mcpResponse': {
                    'error': {
                        'code': 402,
                        'data': { 'paymentRequirements': [ { 'amount': '100' } ] }
                    }
                }
            } )

            expect( isRequired ).toBeTruthy()
        } )


        test( 'detects payment required by paymentRequirements in data', () => {
            const { isRequired, paymentRequirements } = A2APaymentBridge.isPaymentRequired( {
                'mcpResponse': {
                    'error': {
                        'code': -32000,
                        'data': {
                            'paymentRequirements': [ { 'amount': '5000' } ]
                        }
                    }
                }
            } )

            expect( isRequired ).toBeTruthy()
            expect( paymentRequirements ).toEqual( [ { 'amount': '5000' } ] )
        } )


        test( 'returns false when error has no payment data', () => {
            const { isRequired } = A2APaymentBridge.isPaymentRequired( {
                'mcpResponse': {
                    'error': {
                        'code': -32600,
                        'message': 'Regular error'
                    }
                }
            } )

            expect( isRequired ).toBeFalsy()
        } )
    } )


    describe( 'extractPaymentFromMessage', () => {
        test( 'returns not found when message is null', () => {
            const { paymentPayload, paymentFound } = A2APaymentBridge
                .extractPaymentFromMessage( { 'message': null } )

            expect( paymentFound ).toBe( false )
            expect( paymentPayload ).toBeNull()
        } )


        test( 'returns not found when message has no parts', () => {
            const { paymentFound } = A2APaymentBridge.extractPaymentFromMessage( {
                'message': {}
            } )

            expect( paymentFound ).toBe( false )
        } )


        test( 'extracts payment from data part', () => {
            const paymentData = { 'accepted': { 'network': 'eip155:43113' } }
            const message = {
                'parts': [
                    {
                        'type': 'data',
                        'data': { 'x402_payment': paymentData }
                    }
                ]
            }

            const { paymentPayload, paymentFound } = A2APaymentBridge
                .extractPaymentFromMessage( { message } )

            expect( paymentFound ).toBe( true )
            expect( paymentPayload ).toEqual( paymentData )
        } )


        test( 'returns not found when no x402_payment in data parts', () => {
            const message = {
                'parts': [
                    { 'type': 'data', 'data': { 'other': 'data' } },
                    { 'type': 'text', 'text': 'hello' }
                ]
            }

            const { paymentFound } = A2APaymentBridge
                .extractPaymentFromMessage( { message } )

            expect( paymentFound ).toBe( false )
        } )
    } )


    describe( 'buildPaymentMeta', () => {
        test( 'builds meta object with payment key', () => {
            const paymentPayload = { 'accepted': { 'network': 'eip155:43113' } }

            const { meta } = A2APaymentBridge.buildPaymentMeta( {
                paymentPayload,
                'paymentMetaKey': 'x402/payment'
            } )

            expect( meta[ 'x402/payment' ] ).toEqual( paymentPayload )
        } )


        test( 'uses custom payment meta key', () => {
            const paymentPayload = { 'test': true }

            const { meta } = A2APaymentBridge.buildPaymentMeta( {
                paymentPayload,
                'paymentMetaKey': 'custom/key'
            } )

            expect( meta[ 'custom/key' ] ).toEqual( paymentPayload )
        } )
    } )
} )
