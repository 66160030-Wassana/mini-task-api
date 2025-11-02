# Mini-Task API

โปรเจกต์นี้เป็น API สำหรับจัดการ Task ที่มีระบบสมาชิก การยืนยันตัวตน (Authentication) และการจัดการสิทธิ์ (Authorization) ตาม Role ของผู้ใช้งาน

## Features 
- User Authentication:
  - สมัครสมาชิก (register) พร้อมการเข้ารหัสรหัสผ่าน (Password Hashing)
  - เข้าสู่ระบบ (login) เพื่อรับ JWT Token
- Role-Based Access Control (RBAC):
  - แบ่งผู้ใช้งานเป็น 3 Roles: user , premium , และ admin
  - User:    -จัดการ tasks ของตัวเอง
             -ดู public tasks ได้
  - Premium: -เหมือน user
             -rate limit สูงกว่า (500 req/15min)
             -สามารถสร้าง high pri
  - Admin:   -เข้าถึงทุก task
             -ดู/ลบ users ทั้งหมด
             -ดู API usage statistics
- Protected Routes: Endpoints ส่วนใหญ่ต้องการการยืนยันตัวตนผ่าน JWT Bearer Token
- Standardized Error Handling: จัดการ Error Response ในรูปแบบ JSON ที่เป็นมาตรฐานเดียวกัน

## Tech Stack
- Backend: Node.js, Express.js
- Database: phpMyAdmin
- Libraries:
  -mysql2: สำหรับเชื่อมต่อฐานข้อมูล MySQL
  -jsonwebtoken: สำหรับสร้างและยืนยัน JWT
  -bcryptjs: สำหรับ Hash รหัสผ่าน
  -dotenv: สำหรับจัดการ Environment Variables
  -nodemon: สำหรับ auto-restart server ตอนพัฒนา

## Prerequisites
ก่อนจะเริ่ม โปรดตรวจสอบให้แน่ใจว่าคุณได้ติดตั้งโปรแกรมเหล่านี้แล้ว:
- Node.js (LTS version)
- Github
- Postman
- โปรแกรมฐานข้อมูล MySQL คือ "XAMPP" (เมื่อติดตั้งสำเร็จให้กด start ที่แถว Apache และ MySQL)

## 🚀 Installation & Setup

ทำตามขั้นตอนต่อไปนี้เพื่อติดตั้งและรันโปรเจกต์บนเครื่องของคุณ
1. Clone the repository:
- git clone [https://github.com/66160030-Wassana/mini-task-api.git]
- cd mini-task-api

2. Install dependency
- npm install

3. Database Setup
- เปิด phpMyAdmin
- สร้าง Database ใหม่ชื่อ mini-task-api (Collation เป็น utf8mb4_unicode_ci)
- ไปที่แท็บ SQL แล้วรัน Script ข้างล่างนี้เพื่อสร้างตารางที่จำเป็นทั้งหมด:
    - SQL สำหรับสร้างตาราง user
CREATE TABLE `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('user','premium','admin') COLLATE utf8mb4_unicode_ci NOT NULL,
  `isPremium` tinyint(1) NOT NULL,
  `subscriptionExpiry` datetime DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    - SQL สำหรับสร้างตาราง tasks
CREATE TABLE `tasks` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','in progress','completed') COLLATE utf8mb4_unicode_ci NOT NULL,
  `priority` enum('low','medium','high') COLLATE utf8mb4_unicode_ci NOT NULL,
  `ownerId` INT NOT NULL,
  `assignedTo` INT NOT NULL,
  `isPublic` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `idempotencyKey` VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  -- Foreign Key เชื่อม ownerId ไปยัง users.id
  CONSTRAINT `fk_task_owner` 
    FOREIGN KEY (`ownerId`) 
    REFERENCES `users` (`id`) 
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  -- Foreign Key เชื่อม assignedTo ไปยัง users.id
  CONSTRAINT `fk_task_assignee`
    FOREIGN KEY (`assignedTo`)
    REFERENCES `users` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  UNIQUE KEY `idx_idempotency_key` (`idempotencyKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    - SQL สำหรับสร้างตาราง refresh_tokens
CREATE TABLE `refresh_tokens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL, -- <-- แก้ไขเป็น INT
  `token_id` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX (user_id),
  UNIQUE INDEX (token_id),

  -- Foreign Key เชื่อม user_id ไปยัง users.id
  CONSTRAINT `fk_token_user`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE -- (ถ้า user ถูกลบ, ให้ลบ token ของเขาออกไปด้วย)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

4. Environment Variables
- สร้างไฟล์ใหม่ใน root ของโปรเจกต์ชื่อว่า .env
- คัดลอกเนื้อหาข้างล่างนี้ไปวางในไฟล์ .env 
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD= # <-- ใส่รหัสผ่าน MySQL ของคุณ (ถ้าไม่มีให้เว้นว่าง)
    DB_DATABASE=mini-task-api

    # สำหรับ Access Token (15 นาที)
    JWT_SECRET=your_secret_for_access_token
    JWT_EXPIRE=15m

    # สำหรับ Refresh Token (7 วัน)
    JWT_REFRESH_SECRET=your_DIFFERENT_secret_for_refresh_token
    JWT_REFRESH_EXPIRE=7d

5. Running Application
- เมื่อตั้งค่าทุกอย่างสำเร็จ ให้เปิด Terminal แล้วรันคำสั่ง npm run dev

Endpoints 
- POST /api/v1/auth/register - สมัครสมาชิก (Body: name, email, password, role)
- POST /api/v1/auth/login - เข้าสู่ระบบ (Body: email, password)
- DELETE /api/v1/users/:id - (Protected, Admin only) ลบผู้ใช้งาน
- POST /api/v1/tasks - (Protected) สร้าง Task ใหม่ (Body: title, description, priority)
- POST /api/v1/auth/refresh - (Body: refreshToken)