import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = "uploads";
const tempDir = `${uploadDir}/temp`;

// Create main and temp folders if they don't exist
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // If user is logged in, use their folder; otherwise use temp
    const userId = req.user?.id;
    // Store images in uploads/user/photo_path
    const targetDir = userId ? `${uploadDir}/user/photo_path` : tempDir;

    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// Accept only image files
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|bmp|svg|tiff/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mime = allowedTypes.test(file.mimetype);
  if (ext && mime) cb(null, true);
  else cb(new Error("Only images are allowed"), false);
};

// Multer config
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// Move image from temp folder to user folder
export const moveImageToUserFolder = (file, userId) => {
  if (!file || !userId) return null;

  const userDir = path.join(uploadDir, `user/photo_path`); // Store in the new path
  const oldPath = file.path; // current location (temp)
  const newPath = path.join(userDir, file.filename); // new destination

  // Create user folder if not exists
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }

  // Move file from temp to user folder
  fs.renameSync(oldPath, newPath);

  return newPath; // Return new file path
};
