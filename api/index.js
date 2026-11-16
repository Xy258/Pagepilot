const backend = import('../backend/index.js');

module.exports = async function handler(request, response) {
  try {
    const { default: app, databaseConnection } = await backend;
    await databaseConnection;
    return app(request, response);
  } catch (error) {
    console.error('Serverless API initialization failed:', error.message);
    return response.status(503).json({ error: 'API service unavailable.' });
  }
};
