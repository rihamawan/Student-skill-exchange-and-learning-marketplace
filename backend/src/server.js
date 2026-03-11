require('dotenv').config();

const path = require('path');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = require('./app');
const { attachSocket } = require('./socket');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = attachSocket(server);

app.set('io', io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  const dbSet = process.env.DB_HOST && process.env.DB_NAME;
  console.log(`DB config: ${dbSet ? 'OK (' + process.env.DB_USER + '@' + process.env.DB_HOST + ')' : 'not set (add DB_HOST, DB_NAME, DB_USER to .env for database)'}`);
});
