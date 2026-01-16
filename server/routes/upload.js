const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Create unique filename: timestamp-random-originalExt
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('רק קבצי תמונה (jpg, png, webp, gif) מותרים'));
    }
});

// Route: POST /api/upload
router.post('/', authenticate, (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            console.error('Upload Multer Error:', err);
            return res.status(500).json({ error: err.message || 'שגיאה בהעלאת הקובץ' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'לא נבחר קובץ' });
        }

        // Return URL relative to server
        const fileUrl = `/uploads/${req.file.filename}`;

        res.json({
            success: true,
            url: fileUrl,
            filename: req.file.filename
        });
    });
});

module.exports = router;
