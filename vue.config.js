'use strict'
const path = require('path')

require('events').EventEmitter.prototype._maxListeners = 100

function resolve(dir) {
  return path.join(__dirname, dir)
}

// 开发启动端口，默认8080
const port = process.env.PORT || 8080 // dev port

// vuecli配置说明参考：https://cli.vuejs.org/config/
module.exports = {
  /**
   * https://cli.vuejs.org/config/#publicpath
   */
  publicPath: './',
  outputDir: 'dist',
  assetsDir: 'static',
  lintOnSave: process.env.NODE_ENV === 'development',
  productionSourceMap: false,
  devServer: {
    port,
    // 设置为true的时候会启动两个窗口，用package.json文件中启动脚本加上--open参数代替
    // open: true,
    overlay: {
      warnings: false,
      errors: true,
    },
  },
  configureWebpack: {
    // provide the app's title in webpack's name field, so that
    // it can be accessed in index.html to inject the correct title.
    resolve: {
      alias: {
        '@': resolve('src'),
        '@api': resolve('src/api'),
        '@components': resolve('src/components'),
        '@containers': resolve('src/containers'),
        '@services': resolve('src/services'),
        '@styles': resolve('src/styles'),
        '@utils': resolve('src/utils'),

        '@@': resolve('lib'),
        '@@components': resolve('lib/components'),
        '@@containers': resolve('lib/containers'),
        '@@services': resolve('lib/services'),
        '@@styles': resolve('lib/styles'),
        '@@utils': resolve('lib/utils'),
      },
    },
    // devtool: 'source-map',
  },
  chainWebpack(config) {
    config.plugins.delete('preload') // TODO: need test
    config.plugins.delete('prefetch') // TODO: need test

    // 引入全局的sass资源
    const oneOfsMap = config.module.rule('scss').oneOfs.store
    oneOfsMap.forEach((item) => {
      item
        .use('sass-resources-loader')
        .loader('sass-resources-loader')
        .options({
          resources: ['./lib/styles/variables.scss', './lib/styles/mixin.scss'],
        })
        .end()
    })

    // set svg-sprite-loader
    config.module
      .rule('svg')
      .exclude.add(resolve('src/icons'))
      .end()
    config.module
      .rule('icons')
      .test(/\.svg$/)
      .include.add(resolve('src/icons'))
      .end()
      .use('svg-sprite-loader')
      .loader('svg-sprite-loader')
      .options({
        symbolId: 'icon-[name]',
      })
      .end()

    // set preserveWhitespace
    config.module
      .rule('vue')
      .use('vue-loader')
      .loader('vue-loader')
      .tap((options) => {
        options.compilerOptions.preserveWhitespace = true
        return options
      })
      .end()

    config
      // https://webpack.js.org/configuration/devtool/#development
      .when(process.env.NODE_ENV === 'development', (config) =>
        config.devtool('source-map')
      )

    config.when(process.env.NODE_ENV !== 'development', (config) => {
      config
        .plugin('ScriptExtHtmlWebpackPlugin')
        .after('html')
        .use('script-ext-html-webpack-plugin', [
          {
            // `runtime` must same as runtimeChunk name. default is `runtime`
            inline: /runtime\..*\.js$/,
          },
        ])
        .end()
      config.optimization.splitChunks({
        chunks: 'all',
        cacheGroups: {
          libs: {
            name: 'chunk-libs',
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            chunks: 'initial', // only package third parties that are initially dependent
          },
          elementUI: {
            name: 'chunk-elementUI', // split elementUI into a single package
            priority: 20, // the weight needs to be larger than libs and app or it will be packaged into libs or app
            test: /[\\/]node_modules[\\/]_?element-ui(.*)/, // in order to adapt to cnpm
          },
          commons: {
            name: 'chunk-commons',
            test: resolve('src/components'), // can customize your rules
            minChunks: 3, //  minimum common number
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      })
      config.optimization.runtimeChunk('single')
    })
  },
  pluginOptions: {
    lintStyleOnBuild: true,
    stylelint: {
      fix: true,
      configBasedir: __dirname,
      files: ['src/**/*.{vue,css,scss}'],
    },
  },
}
