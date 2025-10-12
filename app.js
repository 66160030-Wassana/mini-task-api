require('dotenv').config();
const express = require('express');
const db = require('./config/db');
const ErrorResponse = require('./utils/errorResponse');
const errorHandler = require('./middleware/errorHandler');

// นำเข้า Route files
const users = require('./routes/userRoutes');
const tasks = require('./routes/taskRoutes')
const auth = require('./routes/authRoutes');

const app = express();

// Body parser middleware
app.use(express.json());

// Mount routers
app.use('/api/v1/users', users); 
app.use('/api/v1/tasks', tasks);
app.use((req, res, next) => {
  next(new ErrorResponse(`ไม่พบ URL ที่เรียกใช้งาน - ${req.originalUrl}`, 404));
});
app.use('/api/v1/auth', auth);

app.use(errorHandler);

const port = 3000;

app.listen(port, () => {
  console.log(`Server is running at http://localhost:3000`);
});