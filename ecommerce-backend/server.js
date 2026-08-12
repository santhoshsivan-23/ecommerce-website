require('dotenv').config();

const app = require('./src/app');
const { sequelize, ensureDatabaseExists } = require('./src/config/db');
require('./src/models');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await ensureDatabaseExists();
    await sequelize.authenticate();
    console.log(`[db] connected to MySQL database "${process.env.DB_NAME || 'ecommerce_db'}"`);

    // `alter` keeps the schema in step with the models during development.
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('[db] models synchronised');

    app.listen(PORT, () => {
      console.log(`[server] listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[server] failed to start:', error.message);
    if (error.original) console.error('[server] cause:', error.original.message);
    process.exit(1);
  }
}

start();

process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandled rejection:', reason);
});
