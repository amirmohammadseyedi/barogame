const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    host: '0.0.0.0',
    port: 8080,
    allowedHosts: 'all',
    hot: true,
    liveReload: true,
    historyApiFallback: true,
    client: {
      webSocketURL: 'auto://localhost:13082/ws',
    },
    watchFiles: {
      paths: ['src/**/*', 'public/**/*'],
      options: {
        usePolling: true,
        interval: 300,
      },
    },
  },
})
