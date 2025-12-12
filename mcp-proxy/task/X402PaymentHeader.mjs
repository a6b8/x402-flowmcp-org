import { ClientExact } from 'x402-core'

/*
const cfg =  {
    chainId: '43113',
    chainName: 'avax-fuji',
    allowedPaymentOptions: [
        {
            name: 'USDC',
            tokenAddress: '0x5425890298aed601595a70ab815c96711a31bc65',
            decimals: 6,
            maxAmountRequired: '0.01',
            domain: {
                name: 'USD Coin',
                version: '2'
            }
        }
    ]
}
const { allowedPaymentOptions, chainId } = cfg
*/


class X402PaymentHeader {
    #paymentPrivateKey
    #providerUrl


    constructor( { paymentPrivateKey, providerUrl, silent = false } ) {
        if( !paymentPrivateKey || typeof paymentPrivateKey !== 'string' ) {
            throw new Error( '[X402] Missing or invalid facilitator private key' )
        }
        this.#paymentPrivateKey = paymentPrivateKey

        if( !providerUrl || typeof providerUrl !== 'string' ) {
            throw new Error( '[X402] Missing or invalid provider URL' )
        }
        this.#providerUrl = providerUrl

        return true
    }


    async get( { errorPayload, paymentOptionsEntry, chainId } ) {
        const allowedPaymentOptions = paymentOptionsEntry?.allowedPaymentOptions || []
        const chainIdNormalized = chainId ?? paymentOptionsEntry?.chainId ?? null
        const chainIdNumber = chainIdNormalized !== null && chainIdNormalized !== undefined
            ? Number( chainIdNormalized )
            : null
        const messages = []
        let headerString = null

        try {
            const { messages: m0 } = X402PaymentHeader
                .#validateGet( { errorPayload, allowedPaymentOptions, chainId: chainIdNumber } )
            if( m0.length > 0 ) { messages.push( ...m0 ); return { headerString, messages } }

            const { messages: m1, headerString: header } = await this
                .#get( { errorPayload, allowedPaymentOptions, chainId: chainIdNumber } )
            messages.push( ...m1 )
            headerString = header
        } catch( err ) {
            messages.push( `[X402] Error generating payment header: ${err.message}` )
        }
        
        return { headerString, messages }
    }


    async #get( { errorPayload, allowedPaymentOptions, chainId } )  {
        const messages = []
        let headerString = null 

        const { clientExact, messages: m2 } = await X402PaymentHeader
            .#getExactClient( {
                providerUrl: this.#providerUrl,
                paymentPrivateKey: this.#paymentPrivateKey,
                allowedPaymentOptions
            } )
        if( m2.length > 0 ) { messages.push( ...m2 ); return { headerString, messages } }

        const { scheme, network, paymentOption, messages: m3 } = X402PaymentHeader
            .#selectPaymentOption( { errorPayload, allowedPaymentOptions, chainId } )
        if( m3.length > 0 ) { messages.push( ...m3 ); return { headerString, messages } }

        const { authorization, signature, messages: m4 } = await X402PaymentHeader
            .#createAuthorization( { clientExact, paymentOption, allowedPaymentOptions, chainId } )
        if( m4.length > 0 ) { messages.push( ...m4 ); return { headerString, messages } }

        const { headerString: header, messages: m5 } = X402PaymentHeader
            .#createXPaymentHeader( { clientExact, scheme, network, authorization, signature } )
        if( m5.length > 0 ) { messages.push( ...m5 ); return { headerString, messages } }
        headerString = header

        return { headerString, messages }
    }


    static #validateGet( { errorPayload, allowedPaymentOptions, chainId } ) {
        const messages = []

        if( !errorPayload || typeof errorPayload !== 'object' || !Array.isArray( errorPayload.accepts ) ) {
            messages.push( '[X402] Invalid error payload format' )
        }

        if( !Array.isArray( allowedPaymentOptions ) || allowedPaymentOptions.length === 0 ) {
            messages.push( '[X402] Missing allowed payment options' )
        }

        if( chainId === null || chainId === undefined || Number.isNaN( chainId ) ) {
            messages.push( '[X402] Missing chainId' )
        }

        return { messages }
    }


    static async #getUserPermissions( { token } )  {
        const messages = []
        let userPermissions = {}

        // fetch user permissions from X402 server
        try {

        } catch( err ) {
            messages.push( `[X402] Error fetching user permissions: ${err.message}` )
        }

        return { userPermissions, messages }
    }


    static async #getExactClient( { providerUrl, paymentPrivateKey, allowedPaymentOptions } ) {
        const messages = []
        let clientExact = null

        try {
            clientExact = new ClientExact( { silent: true } )
                .init( { providerUrl } )
            await clientExact
                .setWallet( { privateKey: paymentPrivateKey, allowedPaymentOptions } )
        } catch( err ) {
            messages.push( `[X402] Error initializing ClientExact: ${err.message}` )
        }

        return { clientExact, messages }
    }


    static #selectPaymentOption( { errorPayload, allowedPaymentOptions, chainId } ) {
        const messages = []
        let result = {
            'scheme': null,
            'network': null,
            'paymentOption': null
        }

        try{
            // console.log( 'Selecting payment option from:', JSON.stringify( errorPayload, null, 2 ) )
            // console.log( '>>>', JSON.stringify( allowedPaymentOptions, null, 2 ) )

            const { paymentOption } = ClientExact
                .selectMatchingPaymentOption( { 
                    paymentRequirementsPayload: errorPayload, 
                    allowedPaymentOptions, 
                    chainId 
                } )

            const { scheme, network } = paymentOption
            result = { ...result, scheme, network, paymentOption }
        } catch( err ) {
            messages.push( `[X402] Error selecting payment option: ${err.message}` )
        }

        return { ...result, messages }
    }


    static async #createAuthorization( { clientExact, paymentOption, allowedPaymentOptions, chainId } ) {
        const messages = []
        let result = {
            'authorization': null,
            'signature': null
        }
        
        try {
            const matchingAllowed = allowedPaymentOptions
                .find(
                    ( option ) => option.tokenAddress.toLowerCase() === paymentOption?.extra?.domain?.verifyingContract?.toLowerCase()
                )

            const domainOverride = matchingAllowed?.domain
            const domainFromServer = paymentOption?.extra?.domain || {}
            const normalizedPaymentOption = domainOverride
                ? {
                    ...paymentOption,
                    extra: {
                        ...paymentOption.extra,
                        domain: {
                            ...domainFromServer,
                            ...domainOverride,
                            verifyingContract: domainFromServer.verifyingContract,
                            chainId: domainFromServer.chainId
                        }
                    }
                }
                : paymentOption
console.log( 'Normalized payment option:', JSON.stringify( normalizedPaymentOption, null, 2 ) )
console.log( 'Allowed payment options:', JSON.stringify( allowedPaymentOptions, null, 2 ) )
console.log( 'Chain ID:', chainId )
            const { authorization, signature } = await clientExact
                .createAuthorization( { paymentOption: normalizedPaymentOption, allowedPaymentOptions, chainId } )
            result = { ...result, authorization, signature }
        } catch( err ) {
            messages.push( `[X402] Error creating authorization: ${err.message}` )
        }

        return { ...result, messages }
    }


    static #createXPaymentHeader( { clientExact, scheme, network, authorization, signature } ) {
        const messages = []
        let result = {
            'headerString': null
        }

        try {
            if( !clientExact ) {
                throw new Error( 'Missing clientExact instance' )
            }
console.log( 'Creating X-PAYMENT header with:', { scheme, network, authorization, signature } )

            const { headerString } = clientExact
                .createXPaymentHeader( { scheme, network, authorization, signature } )
            result = { ...result, headerString }
        } catch( err ) {
            messages.push( `[X402] Error creating X-PAYMENT header: ${err.message}` )
        }

        return { ...result, messages }
    }
}


export { X402PaymentHeader }


/*
async function getPaymentHeader( originalRequest, response ) {
    if( !response || typeof response !== 'object' || !Array.isArray( response.accepts ) ) {
        console.warn( '[x402] Missing "accepts" field in response, skipping payment header generation' )

        return null
    }

    const paymentRequirementsPayload = response

    const { paymentOption } = ClientExact
        .selectMatchingPaymentOption( { paymentRequirementsPayload, allowedPaymentOptions, chainId } )

    const { scheme, network } = paymentOption

    const { authorization, signature } = await clientExact
        .createAuthorization( { paymentOption, allowedPaymentOptions, chainId } )

    const { headerString } = clientExact
        .createXPaymentHeader( { scheme, network, authorization, signature } )

    if( !silent ) console.warn( 'Generated X-PAYMENT header:', headerString )

    return headerString
}
*/
