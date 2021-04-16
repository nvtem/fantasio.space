const path = require('path')
const HTMLPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin: CleanPlugin } = require('clean-webpack-plugin')
const CopyPLugin = require('copy-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const { VueLoaderPlugin } = require('vue-loader')

const srcPath = path.resolve(__dirname, 'src/client')
const distPath = path.resolve(__dirname, 'dist')

module.exports = {
  devServer: {
    port: 1000,
    disableHostCheck: true,
    overlay: true
  },

  optimization: {
    splitChunks: {
      chunks: 'all'
    }
  },

  mode: 'development',
  context: srcPath,

  entry: {
    'main': '@/main.ts'
  },

  output: {
    filename: '[name].[contenthash].bundle.js',
    path: path.resolve(__dirname, 'dist')
  },

  resolve: {
    alias: {
      '@': './',
      '@dist': path.resolve(__dirname, 'dist'),
      'vue$': 'vue/dist/vue.esm.js'
    },
    extensions: ['*', '.ts', '.js', '.vue', '.json']
  },

  module: {
    rules: [
      {
        test: /\.ts?$/,
        loader: 'ts-loader',
        exclude: [
          /node_modules/,
          path.resolve(__dirname, 'src/server')
        ],
        options: {
          appendTsSuffixTo: [/\.vue$/],
          configFile: "tsconfig-client.json"
        }
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-proposal-class-properties', '@babel/plugin-transform-runtime']
          }
        }
      },
      {
        test: /\.css$/,
        use: [
          'vue-style-loader',
          MiniCssExtractPlugin.loader,
          'css-loader'
        ]
      },
      {
        test: /\.styl(us)?$/,
        use: [
          'vue-style-loader',
          MiniCssExtractPlugin.loader,
          'css-loader',
          'stylus-loader'
        ]
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader',
      },
      {
        test: /\.pug$/,
        loader: 'pug-plain-loader'
      },
      {
        test: /\.(png|jpg|gif|svg|mp3|wav)$/,
        loader: 'file-loader',
        options: {
          name: '[contenthash].[ext]'
        }
      }
    ]
  },

  plugins: [
    new VueLoaderPlugin(),
    new CleanPlugin(),

    new HTMLPlugin({
      template: './index.html',
      filename: 'index.html',
      chunks: ['main'],
    }),

    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css'
    }),

    new CopyPLugin({
      patterns: [
        {
          from: `${srcPath}/images/`,
          to: `${distPath}/images/`
        },
        {
          from: `${srcPath}/images/favicon.ico`,
          to: `${distPath}/favicon.ico`
        },
        {
          from: `${srcPath}/../data/map.json`,
          to: `${distPath}/map.json`
        },
        {
          from: `${srcPath}/ads.txt`,
          to: `${distPath}/ads.txt`
        },
      ]
    }),
  ]
}