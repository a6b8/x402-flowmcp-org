import crypto from 'crypto'


class A2ATaskStore {
    static #tasks = new Map()
    static #maxTasks = 1000
    static #insertionOrder = []


    static create( { message } ) {
        const taskId = crypto.randomUUID()
        const now = new Date().toISOString()

        const task = {
            'id': taskId,
            'status': {
                'state': 'submitted',
                'timestamp': now
            },
            'messages': message ? [ message ] : [],
            'artifacts': [],
            'metadata': {},
            'createdAt': now,
            'updatedAt': now
        }

        A2ATaskStore.#evictIfNeeded()
        A2ATaskStore.#tasks.set( taskId, task )
        A2ATaskStore.#insertionOrder.push( taskId )

        return { task }
    }


    static get( { taskId } ) {
        const task = A2ATaskStore.#tasks.get( taskId ) || null
        const found = task !== null

        return { task, found }
    }


    static updateStatus( { taskId, state, message } ) {
        const { task, found } = A2ATaskStore.get( { taskId } )
        if( !found ) {
            return { updated: false }
        }

        task[ 'status' ] = {
            'state': state,
            'timestamp': new Date().toISOString()
        }

        if( message ) {
            task[ 'status' ][ 'message' ] = message
        }

        task[ 'updatedAt' ] = new Date().toISOString()
        A2ATaskStore.#tasks.set( taskId, task )

        return { updated: true }
    }


    static addMessage( { taskId, message } ) {
        const { task, found } = A2ATaskStore.get( { taskId } )
        if( !found ) {
            return { added: false }
        }

        task[ 'messages' ].push( message )
        task[ 'updatedAt' ] = new Date().toISOString()
        A2ATaskStore.#tasks.set( taskId, task )

        return { added: true }
    }


    static addArtifact( { taskId, artifact } ) {
        const { task, found } = A2ATaskStore.get( { taskId } )
        if( !found ) {
            return { added: false }
        }

        task[ 'artifacts' ].push( artifact )
        task[ 'updatedAt' ] = new Date().toISOString()
        A2ATaskStore.#tasks.set( taskId, task )

        return { added: true }
    }


    static #evictIfNeeded() {
        if( A2ATaskStore.#tasks.size < A2ATaskStore.#maxTasks ) {
            return
        }

        const oldestId = A2ATaskStore.#insertionOrder.shift()
        if( oldestId ) {
            A2ATaskStore.#tasks.delete( oldestId )
        }
    }
}


export { A2ATaskStore }
