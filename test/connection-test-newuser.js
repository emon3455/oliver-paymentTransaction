// Test with new user that never had a password
const { Pool } = require("pg");

const pool = new Pool({
  host: "127.0.0.1",
  database: "oliver_db",
  user: "testuser",
  port: 5432,
});

console.log("Testing with testuser (no password)...\n");

pool.query("SELECT current_user, current_database()")
  .then(result => {
    console.log("✓ SUCCESS!");
    console.log("User:", result.rows[0].current_user);
    console.log("Database:", result.rows[0].current_database);
    return pool.end();
  })
  .then(() => {
    console.log("\nWorks! Now let's use this user.");
    process.exit(0);
  })
  .catch(error => {
    console.error("✗ FAILED!");
    console.error("Error:", error.message);
    process.exit(1);
  });
