/**
 * Multer configured for memory storage.
 *
 * Files are held in req.file.buffer / req.files[*].buffer.
 * Route handlers must push them to Supabase Storage via lib/supabaseStorage.js
 * — there is no local disk to write to in a Vercel serverless environment.
 */

const multer = require('multer');
const path = require('path');

const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf|doc|docx/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Only images, PDF, and DOC files are allowed'));
};

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter,
});

module.exports = upload;
