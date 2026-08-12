const { Sequelize } = require('sequelize');

const {
  DB_HOST = '127.0.0.1',
  DB_PORT = 3306,
  DB_NAME = 'ecommerce_db',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_LOGGING = 'false',
} = process.env;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: Number(DB_PORT),
  dialect: 'mysql',
  logging: DB_LOGGING === 'true' ? console.log : false,
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
});

// The database itself cannot be created by Sequelize, so create it first with a
// connection that has no database selected.
async function ensureDatabaseExists() {
  const mysql = require('mysql2/promise');
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
  });
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await connection.end();
}

module.exports = { sequelize, ensureDatabaseExists };
