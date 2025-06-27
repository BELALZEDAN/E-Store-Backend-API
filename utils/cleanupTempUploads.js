import path from "path";
import fs from 'fs'

const uploadDir = path.join("uploads"); // Main uploads folder
const tempDir = path.join(uploadDir, "temp"); // Temporary storage for uploaded files
const logFile = path.join(uploadDir, "cleanup.log"); // Log file path
const maxAgeInMs = 60 * 60 * 1000; // 1 hour in milliseconds

function ensureTempDirExists() {
    // Create temp dir if it doesn't exist
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
        log(`Created temp directory at ${tempDir}`);
    }
}

function log(message) {
    // Append log message with timestamp
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
}

function deleteOldFiles(dir) {
    const now = Date.now();
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);

        if (stats.isFile()) {
            // Delete file if older than max age
            const fileAge = now - stats.mtimeMs;
            if (fileAge > maxAgeInMs) {
                fs.unlinkSync(filePath);
                log(`Deleted file: ${filePath}`);
            }
        } else if (stats.isDirectory()) {
            // Recursively delete inside subfolder
            deleteOldFiles(filePath);
            tryRemoveEmptyFolder(filePath); // Clean empty dirs
        }
    });
}

function tryRemoveEmptyFolder(dirPath) {
    // Remove directory if it's empty
    const files = fs.readdirSync(dirPath);
    if (files.length === 0) {
        fs.rmdirSync(dirPath);
        log(`Removed empty folder: ${dirPath}`);
    }
}

export default function cleanupTempDirectory() {
    ensureTempDirExists(); // Make sure temp dir exists
    deleteOldFiles(tempDir); // Start cleanup
    log(`Cleanup completed.`);
}
