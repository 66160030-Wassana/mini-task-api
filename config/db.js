const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ทดสอบการเชื่อมต่อ
pool.getConnection((err, connection) => {
  if (err) {
    console.error('!!! DATABASE CONNECTION FAILED !!!');
    console.error(err.stack);
    return;
  }
  console.log('✅ Successfully connected to the database.');
  connection.release(); // คืน connection กลับสู่ pool
});

// export pool ออกไปเพื่อให้ไฟล์อื่นใช้งานได้
module.exports = pool.promise();