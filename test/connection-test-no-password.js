// Test without password field at all
const { Pool } = require("pg");

const config = {
  host: "127.0.0.1",
  database: "oliver_db",
  user: "leuel",
  port: 5432,
};

// Don't set password at all

const pool = new Pool(config);

console.log("Testing connection without password field...\n");
console.log("Config:", config);

pool.query("SELECT current_user, current_database()")
  .then(result => {
    console.log("\n✓ SUCCESS!");
    console.log("User:", result.rows[0].current_user);
    console.log("Database:", result.rows[0].current_database);
    return pool.end();
  })
  .then(() => {
    console.log("\nConnection closed. Database is ready!");
    process.exit(0);
  })
  .catch(error => {
    console.error("\n✗ FAILED!");
    console.error("Error:", error.message);
    console.error("Code:", error.code);
    process.exit(1);
  });
