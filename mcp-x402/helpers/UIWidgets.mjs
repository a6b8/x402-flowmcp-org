import { ServerDashboard } from '../widgets/ServerDashboard.mjs'
import { PaymentVisualizer } from '../widgets/PaymentVisualizer.mjs'
import { WalletBalances } from '../widgets/WalletBalances.mjs'


class UIWidgets {
    static register( { server, mcpTools, serverInfo } ) {
        ServerDashboard.register( { server, serverInfo } )
        PaymentVisualizer.register( { server } )
        WalletBalances.attachToExistingTool( { server, mcpTools } )

        console.log( '[UIWidgets] Registered 3 widgets: ServerDashboard, PaymentVisualizer, WalletBalances' )
    }
}


export { UIWidgets }
