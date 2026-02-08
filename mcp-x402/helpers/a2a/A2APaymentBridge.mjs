class A2APaymentBridge {
    static isPaymentRequired( { mcpResponse } ) {
        if( !mcpResponse ) {
            return { isRequired: false }
        }

        const { error } = mcpResponse
        if( !error ) {
            return { isRequired: false }
        }

        const errorCode = error.code || 0
        const errorData = error.data || null

        const isRequired = errorCode === 402 ||
            ( errorData && errorData[ 'paymentRequirements' ] ) ||
            ( errorData && Array.isArray( errorData ) && errorData.length > 0 &&
              errorData[ 0 ][ 'paymentRequirements' ] )

        const paymentRequirements = isRequired
            ? ( errorData[ 'paymentRequirements' ] || errorData )
            : null

        return { isRequired, paymentRequirements }
    }


    static extractPaymentFromMessage( { message } ) {
        if( !message || !message[ 'parts' ] ) {
            return { paymentPayload: null, paymentFound: false }
        }

        const dataPart = message[ 'parts' ]
            .find( ( part ) =>
                part[ 'type' ] === 'data' &&
                part[ 'data' ] &&
                part[ 'data' ][ 'x402_payment' ]
            )

        if( !dataPart ) {
            return { paymentPayload: null, paymentFound: false }
        }

        const paymentPayload = dataPart[ 'data' ][ 'x402_payment' ]

        return { paymentPayload, paymentFound: true }
    }


    static buildPaymentMeta( { paymentPayload, paymentMetaKey } ) {
        const meta = {
            [ paymentMetaKey ]: paymentPayload
        }

        return { meta }
    }
}


export { A2APaymentBridge }
