// Quick connection test
require("dotenv").config();

console.log("Environment variables:");
console.log("PGHOST:", process.env.PGHOST);
console.log("POSTGRES_DB:", process.env.POSTGRES_DB);
console.log("POSTGRES_USER:", process.env.POSTGRES_USER);
console.log("POSTGRES_PASSWORD:", process.env.POSTGRES_PASSWORD ? "***SET***" : "NOT SET");

const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  database: process.env.POSTGRES_DB || "oliver_db",
  user: process.env.POSTGRES_USER || "leuel",
  password: process.env.POSTGRES_PASSWORD || "LeuelAsfaw123",
  port: parseInt(process.env.PGPORT, 10) || 5432,
});

console.log("\nAttempting direct PostgreSQL connection...");

pool.query("SELECT current_user, current_database(), version()")
  .then(result => {
    console.log("\n✓ Connection successful!");
    console.log("Current user:", result.rows[0].current_user);
    console.log("Current database:", result.rows[0].current_database);
    console.log("PostgreSQL version:", result.rows[0].version.split('\n')[0]);
    return pool.end();
  })
  .then(() => {
    console.log("\nConnection closed successfully.");
    process.exit(0);
  })
  .catch(error => {
    console.error("\n✗ Connection failed!");
    console.error("Error:", error.message);
    console.error("Code:", error.code);
    process.exit(1);
  });
