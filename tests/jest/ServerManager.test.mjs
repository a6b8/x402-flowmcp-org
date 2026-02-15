import { describe, test, expect, jest, beforeEach } from '@jest/globals'
import fs from 'fs'
import { ServerManager } from '../../mcp-x402/helpers/ServerManager.mjs'


describe( 'ServerManager', () => {
    describe( 'getNpmPackageVersion', () => {
        test( 'returns version from package.json', () => {
            const { version } = ServerManager.getNpmPackageVersion( {
                'path': './package.json'
            } )

            expect( version ).toBe( '0.2.0' )
        } )


        test( 'throws when file does not exist', () => {
            expect( () => {
                ServerManager.getNpmPackageVersion( {
                    'path': './nonexistent.json'
                } )
            } ).toThrow()
        } )
    } )


    describe( 'getArgs', () => {
        test( 'parses port and environment from argv', () => {
            const argv = [ 'node', 'index.mjs', 'port=4002', 'environment=development' ]
            const result = ServerManager.getArgs( { argv } )

            expect( result ).toEqual( {
                'port': '4002',
                'environment': 'development'
            } )
        } )


        test( 'exits when required args are missing', () => {
            const mockExit = jest.spyOn( process, 'exit' ).mockImplementation( () => {
                throw new Error( 'process.exit called' )
            } )
            const mockLog = jest.spyOn( console, 'log' ).mockImplementation( () => {} )

            expect( () => {
                ServerManager.getArgs( { argv: [ 'node', 'index.mjs' ] } )
            } ).toThrow( 'process.exit called' )

            mockExit.mockRestore()
            mockLog.mockRestore()
        } )


        test( 'ignores argv entries without equals sign', () => {
            const argv = [ 'node', 'index.mjs', 'port=8080', 'environment=production', '--verbose' ]
            const result = ServerManager.getArgs( { argv } )

            expect( result ).toEqual( {
                'port': '8080',
                'environment': 'production'
            } )
        } )
    } )


    describe( 'getX402Credentials', () => {
        const envSelection = [
            [ 'facilitatorPublicKey', 'X402_FACILITATOR_PUBLIC_KEY' ],
            [ 'facilitatorPrivateKey', 'X402_FACILITATOR_PRIVATE_KEY' ],
            [ 'recipientAddress', 'X402_RECEPIENT_PUBLIC_KEY' ],
            [ 'fujiProviderUrl', 'X402_FUJI_PROVIDER_URL' ],
            [ 'baseSepoliaProviderUrl', 'X402_BASE_SEPOLIA_PROVIDER_URL' ],
            [ 'skaleBaseSepoliaProviderUrl', 'X402_SKALE_BASE_SEPOLIA_PROVIDER_URL' ],
            [ 'DUNE_SIM_API_KEY', 'DUNE_SIM_API_KEY' ]
        ]


        test( 'exits when env file is missing required variables', () => {
            const tmpPath = '/tmp/test-empty.env'
            fs.writeFileSync( tmpPath, 'SOME_OTHER_VAR=value\n' )

            const mockExit = jest.spyOn( process, 'exit' ).mockImplementation( () => {
                throw new Error( 'process.exit called' )
            } )
            const mockLog = jest.spyOn( console, 'log' ).mockImplementation( () => {} )

            expect( () => {
                ServerManager.getX402Credentials( {
                    'environment': 'development',
                    'envPath': tmpPath,
                    envSelection
                } )
            } ).toThrow( 'process.exit called' )

            mockExit.mockRestore()
            mockLog.mockRestore()
            fs.unlinkSync( tmpPath )
        } )


        test( 'returns credentials from env file', () => {
            const envContent = [
                'X402_FACILITATOR_PUBLIC_KEY=0xFacilitator123',
                'X402_FACILITATOR_PRIVATE_KEY=0xPrivate456',
                'X402_RECEPIENT_PUBLIC_KEY=0xRecipient789',
                'X402_FUJI_PROVIDER_URL=https://fuji.example.com',
                'X402_BASE_SEPOLIA_PROVIDER_URL=https://base.example.com',
                'X402_SKALE_BASE_SEPOLIA_PROVIDER_URL=https://skale.example.com',
                'DUNE_SIM_API_KEY=dune_test_key'
            ].join( '\n' )

            const tmpPath = '/tmp/test-full.env'
            fs.writeFileSync( tmpPath, envContent )

            const { x402Credentials, DUNE_SIM_API_KEY } = ServerManager.getX402Credentials( {
                'environment': 'development',
                'envPath': tmpPath,
                envSelection
            } )

            expect( x402Credentials[ 'facilitatorPublicKey' ] ).toBe( '0xFacilitator123' )
            expect( x402Credentials[ 'recipientAddress' ] ).toBe( '0xRecipient789' )
            expect( DUNE_SIM_API_KEY ).toBe( 'dune_test_key' )

            fs.unlinkSync( tmpPath )
        } )
    } )


    describe( 'printServerInfo', () => {
        test( 'prints server information without throwing', () => {
            const mockLog = jest.spyOn( console, 'log' ).mockImplementation( () => {} )

            const envSelection = [
                [ 'facilitatorPublicKey', 'X402_FACILITATOR_PUBLIC_KEY' ],
                [ 'recipientAddress', 'X402_RECEPIENT_PUBLIC_KEY' ]
            ]

            const x402Credentials = {
                'facilitatorPublicKey': '0xAbCdEf1234567890',
                'recipientAddress': '0x9876543210FeDcBa'
            }

            expect( () => {
                ServerManager.printServerInfo( {
                    'environment': 'development',
                    envSelection,
                    x402Credentials,
                    'x402PrivateKey': '0xPrivateKey'
                } )
            } ).not.toThrow()

            mockLog.mockRestore()
        } )
    } )
} )
