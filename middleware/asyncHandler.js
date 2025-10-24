// ตัวช่วยสำหรับฟังก์ชัน Async (ไม่ต้องเขียน try-catch)
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;