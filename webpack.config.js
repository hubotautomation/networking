/* global __dirname, require, module*/

const webpack = require('webpack')
const UglifyJsPlugin = webpack.optimize.UglifyJsPlugin
const path = require('path')
const env = require('yargs').argv.env

let libraryName = 'Hubot'

let plugins = [], outputFile

if (env === 'build') {
    plugins.push(new UglifyJsPlugin({ minimize: true }))
    outputFile = libraryName + '.min.js'
} else {
    outputFile = libraryName + '.js'
}

const config = {
    entry: [
        'whatwg-fetch',
        __dirname + '/src/index.js'
    ],
    devtool: 'source-map',
    output: {
        path: __dirname + '/lib',
        filename: outputFile,
        library: libraryName,
        libraryTarget: 'umd',
        umdNamedDefine: true
    },
    module: {
        rules: [{
            test: /(\.jsx|\.js)$/,
            loader: 'babel-loader',
            exclude: /(node_modules|bower_components)/
        }, {
            test: /(\.jsx|\.js)$/,
            loader: 'eslint-loader',
            exclude: /node_modules/
        }]
    },
    resolve: {
        modules: [path.resolve('./node_modules'), path.resolve('./src')],
        extensions: ['.json', '.js']
    },
    plugins: plugins,
    externals: {
        lodash: {
            commonjs: 'lodash',
            commonjs2: 'lodash',
            amd: '_',
            root: '_'
        },
        WebSocket: {
            WebSocket: 'WebSocket'
        },
        'isomorphic-fetch': {
            root: 'isomorphic-fetch',
            commonjs2: 'isomorphic-fetch',
            commonjs: 'isomorphic-fetch',
            amd: 'isomorphic-fetch'
        }
    }
}

module.exports = config
