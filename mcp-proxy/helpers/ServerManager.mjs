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


    static getUpstreamUrl( { environment, defaultUrl } ) {
        if( environment === 'development' ) {
            return { upstreamUrl: defaultUrl }
        } else if( environment !== 'production' ) {
            console.log( `Unknown environment: ${environment}` )
            process.exit( 1 )
        }
console.log('HERE')

        return true
    } 
}


export { ServerManager}