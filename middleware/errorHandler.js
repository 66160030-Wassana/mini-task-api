const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc Middleware สำหรับจัดการ Error ทั้งหมด
 * (จะทำงานเมื่อมีการเรียก next(err))
 */
const errorHandler = (err, req, res, next) => {
  // สร้างตัวแปร error (copy มาจาก err ที่ controller ส่งมา)
  let error = { ...err };

  // (err.message อาจจะไม่ได้ถูก copy มาใน { ...err } เสมอไป)
  error.message = err.message;

  // Log error stack ไว้ดูใน console (สำหรับ developer)
  console.error(err);

  // --- แปลง Error ที่พบบ่อย ให้เป็น ErrorResponse ที่มีความหมาย ---

  // 1. MySQL Error: ER_DUP_ENTRY (1062)
  //    (เกิดขึ้นเมื่อ INSERT ข้อมูลซ้ำในช่องที่เป็น UNIQUE เช่น email, idempotencyKey)
  if (err.errno === 1062) {
    const message = 'Duplicate field value entered. Please check your input.';
    error = new ErrorResponse(message, 400); // 400 Bad Request
  }

  // 2. MySQL Error: ER_NO_REFERENCED_ROW_2 (1452)
  //    (เกิดขึ้นเมื่อ INSERT โดยใช้ Foreign Key ที่ไม่มีอยู่จริง เช่น สร้าง task ด้วย ownerId ที่ไม่มี)
  if (err.errno === 1452) {
    const message = 'Foreign key constraint fails. The referenced ID does not exist.';
    error = new ErrorResponse(message, 400); // 400 Bad Request
  }

  // 3. MySQL Error: ER_DATA_TOO_LONG (1406)
  //    (เกิดขึ้นเมื่อข้อมูลยาวเกินขนาดคอลัมน์)
  if (err.errno === 1406) {
    const message = `Data too long for field: ${err.sqlMessage.match(/'(.*?)'/)[1]}`;
    error = new ErrorResponse(message, 400); // 400 Bad Request
  }

  // 4. JWT Error: Invalid Token
  //    (เกิดขึ้นเมื่อ Token ผิดรูปแบบ หรือ Signature ไม่ตรง)
  if (err.name === 'JsonWebTokenError') {
    const message = 'Not authorized. Token is invalid.';
    error = new ErrorResponse(message, 401); // 401 Unauthorized
  }

  // 5. JWT Error: Token Expired
  //    (เกิดขึ้นเมื่อ Token หมดอายุ)
  if (err.name === 'TokenExpiredError') {
    const message = 'Not authorized. Token has expired.';
    error = new ErrorResponse(message, 401); // 401 Unauthorized
  }

  // --- ตอบกลับ Client ---

  // ใช้ statusCode จาก error ที่เราแปลงมา
  // หรือถ้าเป็น Error ที่เราไม่รู้จัก (เช่น DB ล่ม) ให้ใช้ 500
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Internal Server Error',

    // (Tip: แสดง stack trace เฉพาะตอน development)
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

module.exports = errorHandler;