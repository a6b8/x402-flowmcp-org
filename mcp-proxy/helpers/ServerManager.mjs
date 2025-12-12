import fs from 'fs'


class ServerManager {
    static getArgs( { argv } ) {
        const requiredArgs = [ 'port', 'environment' ]

        const args = argv
            .slice( 2 )
            .filter( arg => arg.includes( '=' ) )
            .reduce( ( acc, arg ) => {
                const [ key, value ] = arg.split( '=' )
                acc[ key.trim() ] = value.trim()
                return acc
            }, {} )

        const test = requiredArgs
            .reduce( ( acc, key ) => {
                if( !( key in args ) ) {
                    acc.messages.push( `Missing required argument: ${key}` )
                }
                return acc
            }, { 'messages': [] }  )
        if( test['messages'].length > 0 ) {
            test['messages'].forEach( message => console.log( message ) )
            process.exit( 1 )
        }

        return args
    }


    static getX402Credentials( { environment, envPath, envSelection } ) {
        const envObject = this
            .#getEnvObject( { environment, envPath } )
        const test = envSelection
            .reduce( ( acc, [ _, envVar ] ) => {
                if( !( envVar in envObject ) ) {
                    acc.messages.push( `Missing required environment variable: ${envVar}` )
                }
                return acc
            }, { 'messages': [] }  )
        if( test['messages'].length > 0 ) {
            test['messages'].forEach( message => console.log( message ) )
            process.exit( 1 )
        }

        const result = envSelection
            .reduce( ( acc, [ key, envVar ] ) => {
                acc[ key ] = envObject[ envVar ]
                return acc
            }, {} )


        return { ...result}
    }


    static getUpstreamUrl( { environment, defaultUrl } ) {
        if( environment === 'development' ) {
            return { upstreamUrl: defaultUrl }
        } else if( environment !== 'production' ) {
            console.log( `Unknown environment: ${environment}` )
            process.exit( 1 )
        }


        return true
    } 


    static #getEnvObject( { environment, envPath } ) {
        if( environment === 'production' ) {
            return process.env
        } else if( environment !== 'development' ) {
            console.error( `Unknown environment: ${environment}` )
            process.exit( 1 )
            return false
        }

        if( !envPath ) {
            console.error( `No environment file found for stage type: ${stageType}` )
            return false
        }

        try {
            const envFile = fs
                .readFileSync( envPath, 'utf-8' )
                .split( "\n" )
                .filter( line => line && !line.startsWith( '#' ) && line.includes( '=' ) )
                .map( line => line.split( '=' ) )
                .reduce( ( acc, [ k, v ] ) => {
                    acc[ k ] = v.trim()
                    return acc
                }, {} )
            return envFile
        } catch( err ) {
            console.error( `Error reading environment file at ${envPath}:`, err )
            process.exit( 1 )
            return false
        }

        return false
    }
}


export { ServerManager}