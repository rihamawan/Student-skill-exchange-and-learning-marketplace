/**
 * server.js
 * Entry point. Loads environment variables, imports the Express app,
 * and starts the HTTP server. Use "npm run dev" for development (nodemon).
 */

const path = require('path');
// Load .env from backend folder (so it works even if you run from project root)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Quick check: DB env loaded? (password not printed)
  const dbSet = process.env.DB_HOST && process.env.DB_NAME;
  console.log(`DB config: ${dbSet ? 'OK (' + process.env.DB_USER + '@' + process.env.DB_HOST + ')' : 'missing .env?'}`);
});
