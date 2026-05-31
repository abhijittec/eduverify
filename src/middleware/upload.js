/* File upload handling — multer.
   Files are held in memory only long enough to forward them to
   Cloudinary; they are never written to the server disk. */
const multer = require("multer");

const MAX_BYTES = 6 * 1024 * 1024; // 6 MB
const ALLOWED = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED[file.mimetype]) return cb(null, true);
    cb(new Error("Unsupported file type. Upload a PDF, JPG or PNG."));
  },
});

// Wrap multer so its errors become clean JSON responses.
function singleFile(field) {
  return (req, res, next) => {
    upload.single(field)(req, res, (err) => {
      if (err) {
        const msg =
          err.code === "LIMIT_FILE_SIZE"
            ? "File too large. The maximum size is 6 MB."
            : err.message || "File upload failed.";
        return res.status(400).json({ error: msg });
      }
      next();
    });
  };
}

module.exports = { singleFile, MAX_BYTES, ALLOWED };
