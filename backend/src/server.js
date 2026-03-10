require('dotenv').config();

const path = require('path');
// Load .env from backend folder (so it works even if you run from project root)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Quick check: DB env loaded? (password not printed)
  const dbSet = process.env.DB_HOST && process.env.DB_NAME;
  console.log(`DB config: ${dbSet ? 'OK (' + process.env.DB_USER + '@' + process.env.DB_HOST + ')' : 'not set (add DB_HOST, DB_NAME, DB_USER to .env for database)'}`);
});
