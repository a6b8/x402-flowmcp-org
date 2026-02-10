import { A2ATaskStore } from './A2ATaskStore.mjs'
import { A2AMessageProcessor } from './A2AMessageProcessor.mjs'
import { A2AResponseFormatter } from './A2AResponseFormatter.mjs'


class A2ARouter {
    static create( { app, agentCard } ) {
        app.get( '/.well-known/agent-card.json', ( req, res ) => {
            res.setHeader( 'A2A-Extensions', 'https://github.com/google-agentic-commerce/ap2/tree/v0.1' )
            res.json( agentCard )
        } )

        app.post( '/a2a', async ( req, res ) => {
            const body = req.body
            if( !body || !body[ 'jsonrpc' ] || body[ 'jsonrpc' ] !== '2.0' ) {
                res.status( 400 ).json( {
                    'jsonrpc': '2.0',
                    'id': body?.id || null,
                    'error': {
                        'code': -32600,
                        'message': 'Invalid JSON-RPC 2.0 request'
                    }
                } )

                return
            }

            const { id, method, params } = body

            if( method === 'message/send' ) {
                await A2ARouter.#handleMessageSend( { id, params, res } )

                return
            }

            if( method === 'message/stream' ) {
                await A2ARouter.#handleMessageStream( { id, params, res } )

                return
            }

            if( method === 'tasks/get' ) {
                A2ARouter.#handleTasksGet( { id, params, res } )

                return
            }

            if( method === 'tasks/cancel' ) {
                A2ARouter.#handleTasksCancel( { id, params, res } )

                return
            }

            res.json( {
                'jsonrpc': '2.0',
                id,
                'error': {
                    'code': -32601,
                    'message': `Method not found: ${method}`
                }
            } )
        } )
    }


    static async #handleMessageSend( { id, params, res } ) {
        const message = params?.message
        if( !message ) {
            res.json( {
                'jsonrpc': '2.0',
                id,
                'error': {
                    'code': -32602,
                    'message': 'Missing message in params'
                }
            } )

            return
        }

        const taskId = params?.taskId || null
        let existingTask = null

        if( taskId ) {
            const { task, found } = A2ATaskStore.get( { taskId } )
            if( found ) {
                existingTask = task
            }
        }

        let currentTaskId = taskId

        if( !existingTask ) {
            const { task } = A2ATaskStore.create( { message } )
            currentTaskId = task[ 'id' ]
        } else {
            A2ATaskStore.addMessage( { 'taskId': currentTaskId, message } )
        }

        A2ATaskStore.updateStatus( { 'taskId': currentTaskId, 'state': 'working' } )

        const { state, message: responseMessage, artifact } = await A2AMessageProcessor
            .processMessage( { message, 'existingTaskId': currentTaskId } )

        A2ATaskStore.updateStatus( { 'taskId': currentTaskId, state } )

        if( responseMessage ) {
            A2ATaskStore.addMessage( { 'taskId': currentTaskId, 'message': responseMessage } )
        }

        if( artifact ) {
            A2ATaskStore.addArtifact( { 'taskId': currentTaskId, artifact } )
        }

        const { task: finalTask } = A2ATaskStore.get( { 'taskId': currentTaskId } )

        res.json( {
            'jsonrpc': '2.0',
            id,
            'result': finalTask
        } )
    }


    static async #handleMessageStream( { id, params, res } ) {
        const message = params?.message
        if( !message ) {
            res.json( {
                'jsonrpc': '2.0',
                id,
                'error': {
                    'code': -32602,
                    'message': 'Missing message in params'
                }
            } )

            return
        }

        res.setHeader( 'Content-Type', 'text/event-stream' )
        res.setHeader( 'Cache-Control', 'no-cache' )
        res.setHeader( 'Connection', 'keep-alive' )

        const { task } = A2ATaskStore.create( { message } )
        const currentTaskId = task[ 'id' ]

        const { event: submittedEvent } = A2AResponseFormatter
            .buildTaskStatusEvent( { 'taskId': currentTaskId, 'state': 'submitted' } )
        res.write( `data: ${JSON.stringify( submittedEvent )}\n\n` )

        A2ATaskStore.updateStatus( { 'taskId': currentTaskId, 'state': 'working' } )
        const { event: workingEvent } = A2AResponseFormatter
            .buildTaskStatusEvent( { 'taskId': currentTaskId, 'state': 'working' } )
        res.write( `data: ${JSON.stringify( workingEvent )}\n\n` )

        const { state, message: responseMessage, artifact } = await A2AMessageProcessor
            .processMessage( { message, 'existingTaskId': currentTaskId } )

        A2ATaskStore.updateStatus( { 'taskId': currentTaskId, state } )

        if( responseMessage ) {
            A2ATaskStore.addMessage( { 'taskId': currentTaskId, 'message': responseMessage } )
        }

        if( artifact ) {
            A2ATaskStore.addArtifact( { 'taskId': currentTaskId, artifact } )

            const { event: artifactEvent } = A2AResponseFormatter
                .buildTaskArtifactEvent( { 'taskId': currentTaskId, artifact } )
            res.write( `data: ${JSON.stringify( artifactEvent )}\n\n` )
        }

        const { event: finalEvent } = A2AResponseFormatter
            .buildTaskStatusEvent( {
                'taskId': currentTaskId,
                state,
                'message': responseMessage
            } )
        res.write( `data: ${JSON.stringify( finalEvent )}\n\n` )

        res.end()
    }


    static #handleTasksGet( { id, params, res } ) {
        const taskId = params?.id
        if( !taskId ) {
            res.json( {
                'jsonrpc': '2.0',
                id,
                'error': {
                    'code': -32602,
                    'message': 'Missing task id in params'
                }
            } )

            return
        }

        const { task, found } = A2ATaskStore.get( { taskId } )
        if( !found ) {
            res.json( {
                'jsonrpc': '2.0',
                id,
                'error': {
                    'code': -32602,
                    'message': `Task not found: ${taskId}`
                }
            } )

            return
        }

        res.json( {
            'jsonrpc': '2.0',
            id,
            'result': task
        } )
    }


    static #handleTasksCancel( { id, params, res } ) {
        const taskId = params?.id
        if( !taskId ) {
            res.json( {
                'jsonrpc': '2.0',
                id,
                'error': {
                    'code': -32602,
                    'message': 'Missing task id in params'
                }
            } )

            return
        }

        const { task, found } = A2ATaskStore.get( { taskId } )
        if( !found ) {
            res.json( {
                'jsonrpc': '2.0',
                id,
                'error': {
                    'code': -32602,
                    'message': `Task not found: ${taskId}`
                }
            } )

            return
        }

        A2ATaskStore.updateStatus( { taskId, 'state': 'canceled' } )
        const { task: canceledTask } = A2ATaskStore.get( { taskId } )

        res.json( {
            'jsonrpc': '2.0',
            id,
            'result': canceledTask
        } )
    }
}


export { A2ARouter }
