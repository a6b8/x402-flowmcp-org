import fs from 'fs'
import { FlowMCP } from 'flowmcp'
import { RemoteServer } from 'flowmcpServers'
import { schema } from './schemas/avalanche.mjs'


function getEnvObject( { source, envPath } ) {
    let envObject

    if( source === 'unknown' ) {
        envObject = fs
            .readFileSync( envPath, 'utf-8' )
            .split( '\n' )
            .reduce( ( acc, line ) => {
                const [ key, value ] = line.split( '=' )
                if( key && value ) { acc[ key.trim() ] = value.trim() }
                return acc
            }, {} )
    } else if( source === 'claude' ) {
        envObject = process.env
    } else { 
        console.log( 'Unknown source:', source ) 
    }

    return { envObject }
}

/*
const config = {
    'silent': false,
    'envPath': './../../.env',
    'routes': [ { includeNamespaces: [ ], routePath: '/one', protocol: 'sse' } ]
}

const { silent, envPath, routes } = config
const { includeNamespaces, excludeNamespaces, activateTags, source } = FlowMCP
    .getArgvParameters( {
        'argv': process.argv,
        'includeNamespaces': [],
        'excludeNamespaces': [],
        'activateTags': [], 
    } )
const { envObject } = getEnvObject( { source, envPath } )
const arrayOfSchemas = await SchemaImporter
    .loadFromFolder( {
        excludeSchemasWithImports: true,
        excludeSchemasWithRequiredServerParams: true,
        addAdditionalMetaData: true,
        outputType: 'onlySchema'
    } )
*/


const config = {
    'silent': false,
    'envPath': './../../.env',
    'arrayOfRoutes': [ { includeNamespaces: [ ], routePath: '/one', protocol: 'streamable' } ]
}


const { silent, arrayOfRoutes } = config
const envObject = {}

const objectOfSchemaArrays = arrayOfRoutes
    .reduce( ( acc, route ) => {
        acc[ route.routePath ] = [ schema ]
        return acc
    }, {} )


const remoteServer = new RemoteServer( { silent } )
const { routesActivationPayloads } = RemoteServer
    .prepareRoutesActivationPayloads( { arrayOfRoutes, objectOfSchemaArrays, envObject } )
    // .prepareRoutesActivationPayloads( { routes, arrayOfSchemas, envObject } )
remoteServer
    .start( { routesActivationPayloads } )


