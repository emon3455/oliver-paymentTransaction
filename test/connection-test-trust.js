// Test connection without password to localhost
const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  database: "oliver_db",
  user: "leuel",
  password: "anything", // Just needs a string value with trust auth
  port: 5432,
});

console.log("Testing connection to 127.0.0.1 with trust auth (empty password)...\n");

pool.query("SELECT current_user, current_database()")
  .then(result => {
    console.log("✓ Connection successful!");
    console.log("User:", result.rows[0].current_user);
    console.log("Database:", result.rows[0].current_database);
    return pool.end();
  })
  .then(() => {
    console.log("\nConnection closed.");
    process.exit(0);
  })
  .catch(error => {
    console.error("✗ Connection failed!");
    console.error("Error:", error.message);
    process.exit(1);
  });
