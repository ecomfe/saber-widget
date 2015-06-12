var epr = require( 'edp-provider-rider' );
var riderUI = require( 'rider-ui' );
var phpcgi = require('node-phpcgi/edp');

exports.stylus = epr.stylus;

function stylusConfig( style ) {
    style.use( epr.plugin() );
    style.use( riderUI() );
}

exports.port = 8848;
exports.directoryIndexes = true;
exports.documentRoot = __dirname + '/../';
exports.getLocations = function () {
    return [
        {
            location: /\/$/,
            handler: [
                home( 'index.html' ),
                livereload()
            ]
        },
        {
            location: /\.html($|\?)/,
            handler: [
                file(),
                livereload()
            ]
        },
        // edp内置的php handler接收不了文件
        // 所以这里使用了node-phpcgi
        // 方便别人使用demo
        {
            location: /\.php($|\?)/,
            handler: [
                phpcgi()
            ]
        },
        {
            location: /\.css($|\?)/,
            handler: [
                autocss({
                    stylus: {
                        use: stylusConfig
                    }
                })
            ]
        },
        {
            location: /\.less($|\?)/,
            handler: [
                file(),
                less()
            ]
        },
        {
            location: /\.styl($|\?)/,
            handler: [
                file(),
                stylus()
            ]
        },
        {
            location: /^.*$/,
            handler: [
                file(),
                proxyNoneExists()
            ]
        }
    ];
};

exports.injectResource = function ( res ) {
    for ( var key in res ) {
        global[ key ] = res[ key ];
    }
};
