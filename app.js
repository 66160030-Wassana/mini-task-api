require('dotenv').config();
const express = require('express');
const db = require('./config/db');
const ErrorResponse = require('./utils/errorResponse');
const errorHandler = require('./middleware/errorHandler');

// นำเข้า Route files
// (ของใหม่)
// นำเข้า Route files
const users = require('./routes/userRoutes');
const auth = require('./routes/authRoutes');
// V1 (จากไฟล์ที่เปลี่ยนชื่อ)
const tasksV1 = require('./routes/taskRoutesV1');
// V2 (จากไฟล์ที่สร้างใหม่)
const tasksV2 = require('./routes/taskRoutesV2');

const app = express();

// Body parser middleware
app.use(express.json());

// Mount routers
// (ของใหม่)
// Mount routers
app.use('/api/v1/users', users); 
app.use('/api/v1/auth', auth);

// Mount V1
app.use('/api/v1/tasks', tasksV1);

// Mount V2
app.use('/api/v2/tasks', tasksV2);
app.use((req, res, next) => {
  next(new ErrorResponse(`ไม่พบ URL ที่เรียกใช้งาน - ${req.originalUrl}`, 404));
});


app.use(errorHandler);

const port = 3000;

app.listen(port, () => {
  console.log(`Server is running at http://localhost:3000`);
});