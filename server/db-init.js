const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function initializeDatabase() {
  try {
    console.log('Checking and initializing database schema...');
    const schemaPath = path.join(__dirname, 'db-schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.warn('db-schema.sql file not found at:', schemaPath);
      return;
    }
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the idempotent SQL queries
    await pool.query(sql);
    console.log('Database schema successfully checked / initialized (tables created if they did not exist).');
  } catch (err) {
    console.error('Failed to initialize database schema:', err);
  }
}

module.exports = initializeDatabase;
