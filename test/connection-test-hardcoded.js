// Direct hardcoded connection test
const { Pool } = require("pg");

const pool = new Pool({
  host: "127.0.0.1",
  database: "oliver_db",
  user: "leuel",
  password: "password123",
  port: 5432,
});

console.log("Testing direct hardcoded connection...\n");

pool.query("SELECT current_user, current_database(), version()")
  .then(result => {
    console.log("✓ SUCCESS! Connection works!");
    console.log("User:", result.rows[0].current_user);
    console.log("Database:", result.rows[0].current_database);
    return pool.end();
  })
  .then(() => {
    console.log("\nConnection closed. Database is ready!");
    process.exit(0);
  })
  .catch(error => {
    console.error("✗ FAILED!");
    console.error("Error:", error.message);
    console.error("Code:", error.code);
    process.exit(1);
  });
