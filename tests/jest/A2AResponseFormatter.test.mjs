import { describe, test, expect } from '@jest/globals'
import { A2AResponseFormatter } from '../../mcp-x402/helpers/a2a/A2AResponseFormatter.mjs'


describe( 'A2AResponseFormatter', () => {
    describe( 'formatSuccess', () => {
        test( 'formats successful response with text content', () => {
            const mcpResult = {
                'content': [
                    { 'type': 'text', 'text': 'Balance: 100 USDC' }
                ]
            }

            const { message, artifact } = A2AResponseFormatter.formatSuccess( {
                'taskId': 'task-123',
                'toolName': 'get_balances',
                mcpResult
            } )

            expect( message[ 'role' ] ).toBe( 'agent' )
            expect( message[ 'parts' ][ 0 ][ 'type' ] ).toBe( 'text' )
            expect( message[ 'parts' ][ 0 ][ 'text' ] ).toBe( 'Balance: 100 USDC' )

            expect( artifact[ 'name' ] ).toBe( 'get_balances-result' )
            expect( artifact[ 'parts' ][ 0 ][ 'type' ] ).toBe( 'data' )
            expect( artifact[ 'parts' ][ 0 ][ 'data' ] ).toBe( mcpResult )
        } )


        test( 'handles null mcpResult', () => {
            const { message } = A2AResponseFormatter.formatSuccess( {
                'taskId': 'task-123',
                'toolName': 'test_tool',
                'mcpResult': null
            } )

            expect( message[ 'parts' ][ 0 ][ 'text' ] ).toBe( 'No result' )
        } )


        test( 'handles mcpResult without content array', () => {
            const { message } = A2AResponseFormatter.formatSuccess( {
                'taskId': 'task-123',
                'toolName': 'test_tool',
                'mcpResult': { 'data': 'raw' }
            } )

            expect( message[ 'parts' ][ 0 ][ 'text' ] ).toBe( JSON.stringify( { 'data': 'raw' } ) )
        } )


        test( 'joins multiple text content parts', () => {
            const mcpResult = {
                'content': [
                    { 'type': 'text', 'text': 'Line 1' },
                    { 'type': 'text', 'text': 'Line 2' }
                ]
            }

            const { message } = A2AResponseFormatter.formatSuccess( {
                'taskId': 'task-123',
                'toolName': 'test_tool',
                mcpResult
            } )

            expect( message[ 'parts' ][ 0 ][ 'text' ] ).toBe( 'Line 1\nLine 2' )
        } )
    } )


    describe( 'formatPaymentRequired', () => {
        test( 'formats payment required message', () => {
            const paymentRequiredPayload = {
                'paymentRequirements': [ { 'amount': '100' } ]
            }

            const { message } = A2AResponseFormatter.formatPaymentRequired( {
                paymentRequiredPayload
            } )

            expect( message[ 'role' ] ).toBe( 'agent' )
            expect( message[ 'parts' ] ).toHaveLength( 2 )
            expect( message[ 'parts' ][ 0 ][ 'type' ] ).toBe( 'text' )
            expect( message[ 'parts' ][ 1 ][ 'type' ] ).toBe( 'data' )
            expect( message[ 'parts' ][ 1 ][ 'data' ][ 'x402_payment_required' ] ).toBe( true )
        } )
    } )


    describe( 'formatError', () => {
        test( 'formats error message with code', () => {
            const { message } = A2AResponseFormatter.formatError( {
                'errorMessage': 'Something went wrong',
                'errorCode': -32600
            } )

            expect( message[ 'role' ] ).toBe( 'agent' )
            expect( message[ 'parts' ] ).toHaveLength( 2 )
            expect( message[ 'parts' ][ 0 ][ 'text' ] ).toBe( 'Error: Something went wrong' )
            expect( message[ 'parts' ][ 1 ][ 'data' ][ 'error' ] ).toBe( true )
            expect( message[ 'parts' ][ 1 ][ 'data' ][ 'code' ] ).toBe( -32600 )
        } )


        test( 'uses default error code when not provided', () => {
            const { message } = A2AResponseFormatter.formatError( {
                'errorMessage': 'Unknown error'
            } )

            expect( message[ 'parts' ][ 1 ][ 'data' ][ 'code' ] ).toBe( -1 )
        } )
    } )


    describe( 'buildTaskStatusEvent', () => {
        test( 'builds status event for working state', () => {
            const { event } = A2AResponseFormatter.buildTaskStatusEvent( {
                'taskId': 'task-abc',
                'state': 'working'
            } )

            expect( event[ 'jsonrpc' ] ).toBe( '2.0' )
            expect( event[ 'method' ] ).toBe( 'tasks/status' )
            expect( event[ 'params' ][ 'id' ] ).toBe( 'task-abc' )
            expect( event[ 'params' ][ 'status' ][ 'state' ] ).toBe( 'working' )
            expect( event[ 'params' ][ 'final' ] ).toBe( false )
        } )


        test( 'marks completed state as final', () => {
            const { event } = A2AResponseFormatter.buildTaskStatusEvent( {
                'taskId': 'task-abc',
                'state': 'completed'
            } )

            expect( event[ 'params' ][ 'final' ] ).toBe( true )
        } )


        test( 'marks failed state as final', () => {
            const { event } = A2AResponseFormatter.buildTaskStatusEvent( {
                'taskId': 'task-abc',
                'state': 'failed'
            } )

            expect( event[ 'params' ][ 'final' ] ).toBe( true )
        } )


        test( 'marks canceled state as final', () => {
            const { event } = A2AResponseFormatter.buildTaskStatusEvent( {
                'taskId': 'task-abc',
                'state': 'canceled'
            } )

            expect( event[ 'params' ][ 'final' ] ).toBe( true )
        } )


        test( 'includes message when provided', () => {
            const msg = { 'role': 'agent', 'parts': [] }
            const { event } = A2AResponseFormatter.buildTaskStatusEvent( {
                'taskId': 'task-abc',
                'state': 'completed',
                'message': msg
            } )

            expect( event[ 'params' ][ 'status' ][ 'message' ] ).toBe( msg )
        } )


        test( 'includes timestamp', () => {
            const { event } = A2AResponseFormatter.buildTaskStatusEvent( {
                'taskId': 'task-abc',
                'state': 'working'
            } )

            expect( event[ 'params' ][ 'status' ][ 'timestamp' ] ).toBeDefined()
        } )
    } )


    describe( 'buildTaskArtifactEvent', () => {
        test( 'builds artifact event', () => {
            const artifact = {
                'name': 'test-result',
                'parts': [ { 'type': 'data', 'data': { 'key': 'value' } } ]
            }

            const { event } = A2AResponseFormatter.buildTaskArtifactEvent( {
                'taskId': 'task-xyz',
                artifact
            } )

            expect( event[ 'jsonrpc' ] ).toBe( '2.0' )
            expect( event[ 'method' ] ).toBe( 'tasks/artifact' )
            expect( event[ 'params' ][ 'id' ] ).toBe( 'task-xyz' )
            expect( event[ 'params' ][ 'artifact' ] ).toBe( artifact )
        } )
    } )
} )
