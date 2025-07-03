import multer from "multer";
import path from "path";
import fs from "fs";

const uploadRoot = path.resolve("uploads"); // Absolute uploads folder
const tempDir = path.join(uploadRoot, "temp");

// Ensure base temp directory exists
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Multer storage config with user-specific temp folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use user ID from req.user, fallback to 'anonymous' if missing
    const userId = req.user?.id || "anonymous";
    const userTempDir = path.join(tempDir, `user_${userId}`);

    // Ensure user temp folder exists
    if (!fs.existsSync(userTempDir)) {
      fs.mkdirSync(userTempDir, { recursive: true });
    }

    cb(null, userTempDir); // Save file to user-specific temp folder
  },
  filename: (req, file, cb) => {
    // Create unique filename with timestamp and random number
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter: accept only images with allowed extensions/mimetypes
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|bmp|svg|tiff/;
  const extValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeValid = allowedTypes.test(file.mimetype.toLowerCase());
  cb(null, extValid && mimeValid);
};

// Multer middleware for uploading up to 5 images, saved in user-specific temp folder
export const uploadImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5MB per file
}).array("images", 5);

// Function to move images from temp to final product folder
export const moveImagesToProductFolder = (files, productId) => {
  if (!files || !Array.isArray(files) || files.length === 0) return [];

  const productDir = path.join(uploadRoot, "products", `product_${productId}`);

  // Ensure product folder exists
  if (!fs.existsSync(productDir)) {
    fs.mkdirSync(productDir, { recursive: true });
  }

  const newPaths = [];

  for (const file of files) {
    const oldPath = file.path;
    const newFilename = file.filename;
    const newPath = path.join(productDir, newFilename);

    try {
      fs.renameSync(oldPath, newPath);
      const relativePath = `/${path.posix.join("uploads", "products", `product_${productId}`, newFilename)}`;
      newPaths.push(relativePath);
    } catch (error) {
      console.error("Error moving image:", error.message);
    }
  }

  // After moving, delete the user's temp folder if empty
  try {
    const tempUserFolder = path.dirname(files[0].path);
    const remainingFiles = fs.readdirSync(tempUserFolder);
    if (remainingFiles.length === 0) {
      fs.rmdirSync(tempUserFolder);
    }
  } catch (cleanupErr) {
    console.warn("Failed to clean up temp folder:", cleanupErr.message);
  }

  return newPaths;
};

// Function to safely remove one or multiple image files by relative paths
export const removeImages = (paths) => {
  if (!paths) return false;

  const pathsArray = Array.isArray(paths) ? paths : [paths];
  let allRemoved = true;

  for (const relativePath of pathsArray) {
    try {
      // Resolve absolute path from relative path
      const absolutePath = path.resolve(`.${relativePath}`);

      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath); // delete file synchronously
      }
    } catch (error) {
      console.error("Failed to remove image:", error.message);
      allRemoved = false;
    }
  }

  return allRemoved;
};
