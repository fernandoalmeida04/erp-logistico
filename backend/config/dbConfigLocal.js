require('dotenv').config();
const mysql = require('mysql2');

const sqlPoolLocal = mysql.createPool({
  host: process.env.DB_FKS_HOST,
  user: process.env.DB_FKS_USER,
  password: process.env.DB_FKS_PASSWORD,
  database: process.env.DB_FKS_DATABASE,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0
});

// Exporta ambos os bancos
module.exports = sqlPoolLocal;
