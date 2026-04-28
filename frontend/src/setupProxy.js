const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/api', // Keep the /api path as-is
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(502).json({ success: false, message: 'Bad Gateway - Failed to reach backend' });
      },
    })
  );
};

