import mysql from "mysql2/promise";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

/*
 * MySQL Connection Pool Configuration
 * Best practices for production-ready database connection pooling
 */
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost', // Database server host (default: localhost)
  user: process.env.MYSQL_USER || 'root',      // Database username (default: root)
  password: process.env.MYSQL_PASSWORD || '',  // Database password (default: empty)
  database: process.env.MYSQL_DATABASE || 'e-storedb', // Database name
  waitForConnections: true,    // Wait for connection when pool is full
  connectionLimit: 10,         // Maximum number of simultaneous connections
  queueLimit: 0,               // Unlimited queued connection requests
  timezone: '+00:00',            // Use UTC timezone
  charset: 'utf8mb4',          // Supports Arabic, emojis and full Unicode
  connectTimeout: 10000,       // Connection timeout after 10 seconds
  decimalNumbers: true,        // Return decimals as Numbers instead of Strings
  enableKeepAlive: true,       // Maintain active connections
  keepAliveInitialDelay: 10000 // Send keep-alive ping every 10 seconds
});

// Connection event handlers with more professional logging
pool.on('connection', (connection) => {
  console.log(`[Database] New connection created (ID: ${connection.threadId})`);
});

pool.on('acquire', (connection) => {
  console.log(`[Database] Connection acquired (ID: ${connection.threadId})`);
});

pool.on('release', (connection) => {
  console.log(`[Database] Connection released (ID: ${connection.threadId})`);
});

pool.on('enqueue', () => {
  console.log('[Database] Waiting for available connection slot');
});

pool.on('error', (err) => {
  console.error('[Database] Pool error:', err);
});

// Graceful shutdown handler
process.on('SIGINT', async () => {
  try {
    await pool.end();
    console.log('[Database] Connection pool closed gracefully');
    process.exit(0);
  } catch (err) {
    console.error('[Database] Error closing connection pool:', err);
    process.exit(1);
  }
});

// Export the configured pool instance
export default pool;