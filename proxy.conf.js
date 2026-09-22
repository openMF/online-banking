module.exports = {
  "/fineract-provider": {
    "target": "https://mifos-bank-1.mifos.community",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug",
    "onProxyRes": function(proxyRes, req, res) {
      if (proxyRes.headers['www-authenticate']) {
        delete proxyRes.headers['www-authenticate'];
      }
    }
  }
}
