/**
 * OpenAPI 3.0 spec for the Skill Exchange API.
 * Used by Swagger UI at GET /api-docs.
 */
const path = require('path');
const fs = require('fs');

const jsonPath = path.join(__dirname, 'openapi.json');
let spec;

try {
  spec = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
} catch (err) {
  // Fallback minimal spec if JSON is invalid
  spec = {
    openapi: '3.0.3',
    info: {
      title: 'Student Skill Exchange API',
      description: 'Backend API — see routes for health, users, transactions.',
      version: '1.0.0',
    },
    servers: [{ url: 'http://localhost:5000', description: 'Local dev' }],
    paths: {
      '/api/v1/health': {
        get: { summary: 'Health check', tags: ['Health'], responses: { 200: { description: 'OK' } } },
      },
      '/api/v1/users': {
        get: { summary: 'List users', tags: ['Users'], responses: { 200: { description: 'OK' } } },
      },
      '/api/v1/transactions/match-request': {
        post: {
          summary: 'Match request',
          tags: ['Transactions'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['offerId', 'requestId', 'conversationId', 'scheduledStart', 'scheduledEnd'],
                  properties: {
                    offerId: { type: 'integer', example: 7 },
                    requestId: { type: 'integer', example: 3 },
                    conversationId: { type: 'integer', example: 3 },
                    scheduledStart: { type: 'string', example: '2025-03-15 10:00:00' },
                    scheduledEnd: { type: 'string', example: '2025-03-15 11:00:00' },
                    venue: { type: 'string', example: 'ITU Lab 1' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Created' }, 400: { description: 'Bad Request' } },
        },
      },
      '/api/v1/transactions/paid-exchange': {
        post: {
          summary: 'Paid exchange',
          tags: ['Transactions'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['exchangeId', 'price'],
                  properties: {
                    exchangeId: { type: 'integer', example: 111 },
                    price: { type: 'number', example: 750 },
                    currency: { type: 'string', example: 'PKR' },
                    paymentMethod: { type: 'string', example: 'JazCash' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'OK' }, 400: { description: 'Bad Request' }, 404: { description: 'Not Found' } },
        },
      },
    },
  };
}

module.exports = spec;
