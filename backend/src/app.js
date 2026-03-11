/**
 * app.js
 * Configures the Express application: middleware, CORS, JSON parsing,
 * and mounts versioned API routes. Does NOT start the server (see server.js).
 */

const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

const v1Router = require('./routes/v1');
const openApiSpec = require('./openapi');

const app = express();

// Parse JSON request bodies
app.use(express.json());

// Enable CORS for frontend requests
app.use(cors());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

// Mount all v1 routes under /api/v1
app.use('/api/v1', v1Router);

// Root: remind which URL to use
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API running',
    try: ['GET /api/v1/health', 'GET /api/v1/users', 'GET /api-docs (Swagger UI)'],
  });
});

module.exports = app;
