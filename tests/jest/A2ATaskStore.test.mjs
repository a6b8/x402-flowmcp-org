import { describe, test, expect, beforeEach } from '@jest/globals'
import { A2ATaskStore } from '../../mcp-x402/helpers/a2a/A2ATaskStore.mjs'


describe( 'A2ATaskStore', () => {
    describe( 'create', () => {
        test( 'creates a new task with correct structure', () => {
            const message = { 'role': 'user', 'parts': [ { 'type': 'text', 'text': 'hello' } ] }
            const { task } = A2ATaskStore.create( { message } )

            expect( task ).toBeDefined()
            expect( task[ 'id' ] ).toBeDefined()
            expect( task[ 'status' ][ 'state' ] ).toBe( 'submitted' )
            expect( task[ 'messages' ] ).toHaveLength( 1 )
            expect( task[ 'artifacts' ] ).toHaveLength( 0 )
            expect( task[ 'createdAt' ] ).toBeDefined()
            expect( task[ 'updatedAt' ] ).toBeDefined()
        } )


        test( 'creates task with empty messages when message is null', () => {
            const { task } = A2ATaskStore.create( { 'message': null } )

            expect( task[ 'messages' ] ).toHaveLength( 0 )
        } )


        test( 'generates unique task IDs', () => {
            const { task: task1 } = A2ATaskStore.create( {
                'message': { 'role': 'user', 'parts': [] }
            } )
            const { task: task2 } = A2ATaskStore.create( {
                'message': { 'role': 'user', 'parts': [] }
            } )

            expect( task1[ 'id' ] ).not.toBe( task2[ 'id' ] )
        } )
    } )


    describe( 'get', () => {
        test( 'retrieves an existing task', () => {
            const { task: created } = A2ATaskStore.create( {
                'message': { 'role': 'user', 'parts': [] }
            } )

            const { task, found } = A2ATaskStore.get( { 'taskId': created[ 'id' ] } )

            expect( found ).toBe( true )
            expect( task[ 'id' ] ).toBe( created[ 'id' ] )
        } )


        test( 'returns not found for nonexistent task', () => {
            const { task, found } = A2ATaskStore.get( { 'taskId': 'nonexistent-id' } )

            expect( found ).toBe( false )
            expect( task ).toBeNull()
        } )
    } )


    describe( 'updateStatus', () => {
        test( 'updates task state', () => {
            const { task: created } = A2ATaskStore.create( {
                'message': { 'role': 'user', 'parts': [] }
            } )

            const { updated } = A2ATaskStore.updateStatus( {
                'taskId': created[ 'id' ],
                'state': 'working'
            } )

            expect( updated ).toBe( true )

            const { task } = A2ATaskStore.get( { 'taskId': created[ 'id' ] } )
            expect( task[ 'status' ][ 'state' ] ).toBe( 'working' )
        } )


        test( 'updates task with message', () => {
            const { task: created } = A2ATaskStore.create( {
                'message': { 'role': 'user', 'parts': [] }
            } )

            A2ATaskStore.updateStatus( {
                'taskId': created[ 'id' ],
                'state': 'completed',
                'message': { 'role': 'agent', 'parts': [ { 'type': 'text', 'text': 'done' } ] }
            } )

            const { task } = A2ATaskStore.get( { 'taskId': created[ 'id' ] } )
            expect( task[ 'status' ][ 'state' ] ).toBe( 'completed' )
            expect( task[ 'status' ][ 'message' ] ).toBeDefined()
        } )


        test( 'returns false for nonexistent task', () => {
            const { updated } = A2ATaskStore.updateStatus( {
                'taskId': 'nonexistent',
                'state': 'working'
            } )

            expect( updated ).toBe( false )
        } )
    } )


    describe( 'addMessage', () => {
        test( 'adds message to existing task', () => {
            const { task: created } = A2ATaskStore.create( {
                'message': { 'role': 'user', 'parts': [] }
            } )

            const newMessage = { 'role': 'agent', 'parts': [ { 'type': 'text', 'text': 'response' } ] }
            const { added } = A2ATaskStore.addMessage( {
                'taskId': created[ 'id' ],
                'message': newMessage
            } )

            expect( added ).toBe( true )

            const { task } = A2ATaskStore.get( { 'taskId': created[ 'id' ] } )
            expect( task[ 'messages' ] ).toHaveLength( 2 )
        } )


        test( 'returns false for nonexistent task', () => {
            const { added } = A2ATaskStore.addMessage( {
                'taskId': 'nonexistent',
                'message': { 'role': 'agent', 'parts': [] }
            } )

            expect( added ).toBe( false )
        } )
    } )


    describe( 'addArtifact', () => {
        test( 'adds artifact to existing task', () => {
            const { task: created } = A2ATaskStore.create( {
                'message': { 'role': 'user', 'parts': [] }
            } )

            const artifact = { 'name': 'result', 'parts': [ { 'type': 'data', 'data': {} } ] }
            const { added } = A2ATaskStore.addArtifact( {
                'taskId': created[ 'id' ],
                artifact
            } )

            expect( added ).toBe( true )

            const { task } = A2ATaskStore.get( { 'taskId': created[ 'id' ] } )
            expect( task[ 'artifacts' ] ).toHaveLength( 1 )
        } )


        test( 'returns false for nonexistent task', () => {
            const { added } = A2ATaskStore.addArtifact( {
                'taskId': 'nonexistent',
                'artifact': { 'name': 'test', 'parts': [] }
            } )

            expect( added ).toBe( false )
        } )
    } )
} )
