# 🛒 E-Store Backend API

A scalable and secure backend API for an e-commerce platform, built with **Node.js**, **Express**, and **MYSQL**.  
Designed with best practices in mind for RESTful APIs, security, validation, and performance.

---

## 📦 Dependencies

### ✅ Production Dependencies

These packages are essential for the core functionality of the API:

| Package               | Purpose                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------- |
| **express**           | Minimal and flexible Node.js framework for building APIs.                               |
| **mongoose**          | Elegant ODM for MongoDB to handle schema, queries, and relations.                       |
| **express-validator** | Middleware for validating and sanitizing incoming request data.                         |
| **multer**            | Handles `multipart/form-data` for file uploads (e.g. product images).                   |
| **nodemailer**        | Built-in support for sending emails from the server (e.g. user confirmation, receipts). |

---

### 🛠 Development Dependencies

These tools help during development, debugging, and securing the app:

| Package     | Purpose                                                                   |
| ----------- | ------------------------------------------------------------------------- |
| **nodemon** | Auto-restarts server on file changes for a smoother dev experience.       |
| **dotenv**  | Loads environment variables from `.env` file into `process.env`.          |
| **cors**    | Enables Cross-Origin Resource Sharing for frontend-backend communication. |
| **helmet**  | Secures app by setting HTTP headers (prevents common vulnerabilities).    |
| **morgan**  | HTTP request logger (ideal for monitoring API activity).                  |

---

## 🧠 Notes

- Always **hide sensitive config** like DB credentials in `.env`.
- Use `express-validator` to **validate all inputs**, especially for `POST` and `PUT`.
- `helmet` and `cors` should be configured properly **before production**.
- Use `morgan` logs + a logging service like Winston or LogDNA in production.

---

## 📬 Contact

For suggestions, issues, or collaboration — feel free to open a PR or issue on GitHub.

---
