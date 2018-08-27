const Express = require( "express" );
const path = require( "path" );

const React = require( "react" );
const { renderToString } = require( "react-dom/server" );
const { StaticRouter, matchPath } = require( "react-router-dom" );
const { ReduxProvider } = require( "react-redux" );
const Helmet = require( "react-helmet" );
const routes = require( "../constant/routes" );
const Layout = require( "../layout/Layout" );
const { createStore, initializeSession } = require( "../store.js" );

const app = Express();

app.use( Express.static( path.resolve( __dirname, "../../dist" ) ) );

app.get( "/*", ( req, res ) => {
    const context = { };
    const store = createStore( );

    store.dispatch( initializeSession( ) );

    const dataRequirements =
        routes
            .filter( route => matchPath( req.url, route ) ) // filter matching paths
            .map( route => route.component ) // map to components
            .filter( comp => comp.serverFetch ) // check if components have data requirement
            .map( comp => store.dispatch( comp.serverFetch( ) ) ); // dispatch data requirement

    Promise.all( dataRequirements ).then( ( ) => {
        const jsx = (
            <ReduxProvider store={ store }>
                <StaticRouter context={ context } location={ req.url }>
                    <Layout />
                </StaticRouter>
            </ReduxProvider>
        );
        const reactDom = renderToString( jsx );
        const reduxState = store.getState( );
        const helmetData = Helmet.renderStatic( );

        res.writeHead( 200, { "Content-Type": "text/html" } );
        res.end( htmlTemplate( reactDom, reduxState, helmetData ) );
    } );
} );

const PORT = ( process.env.PORT || 3000 );

app.listen( PORT );

function htmlTemplate( reactDom, reduxState, helmetData ) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            ${ helmetData.title.toString( ) }
            ${ helmetData.meta.toString( ) }
        </head>

        <body>
            <div id="app">${ reactDom }</div>
            <script>
                window.REDUX_DATA = ${ JSON.stringify( reduxState ) }
            </script>
            <script src="../app.bundle.js"></script>
        </body>
        </html>
    `;
}
