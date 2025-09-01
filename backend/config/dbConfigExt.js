require('dotenv').config();
const mysql = require('mysql2');

const sqlPoolExt = mysql.createPool({
  host: process.env.DB_NUCCI_HOST,
  user: process.env.DB_NUCCI_USER,
  password: process.env.DB_NUCCI_PASSWORD,
  database: process.env.DB_NUCCI_DATABASE,
  waitForConnections: true,
  connectionLimit: 10, // Número máximo de conexões
  queueLimit: 0
});

// Exporta ambos os bancos
module.exports = sqlPoolExt;
