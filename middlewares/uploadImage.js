import multer from "multer";
import path from "path";
import fs from "fs";

const uploadRoot = "uploads";
const tempDir = path.join(uploadRoot, "temp");

// Ensure base and temp directories exist
[uploadRoot, tempDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Multer storage configuration (saves to temp/)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// File type filter with custom error
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpe?g|png|gif|webp|bmp|svg|tiff/i;
  const extValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeValid = allowedTypes.test(file.mimetype.toLowerCase());

  if (extValid && mimeValid) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type"));
  }
};

// Export multer upload middleware
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

/**
 * Moves uploaded image to a permanent folder based on type (user, product...)
 * @param {Object} file - Multer file object
 * @param {String} type - Folder type: 'users', 'products', etc.
 * @param {Number|String} id - The unique ID (userId, productId)
 * @returns {String|null} - Relative path to be saved in DB
 */
export const moveImageToFolder = (file, type, id) => {
  if (!file || !type || !id) return null;

  try {
    const entityDir = path.join(uploadRoot, type, `${type.slice(0, -1)}_${id}`);
    if (!fs.existsSync(entityDir)) fs.mkdirSync(entityDir, { recursive: true });

    const oldPath = file.path;
    const newFilename = file.filename;
    const newPath = path.join(entityDir, newFilename);

    // Check if uploaded file actually exists
    if (!fs.existsSync(oldPath)) {
      console.error("Uploaded file does not exist:", oldPath);
      return null;
    }

    // Move the file to its final destination
    fs.renameSync(oldPath, newPath);

    // Return the relative URL path for frontend
    return `/${path.posix.join("uploads", type, `${type.slice(0, -1)}_${id}`, newFilename)}`;
  } catch (err) {
    console.error("Error moving image file:", err);
    return null;
  }
};
