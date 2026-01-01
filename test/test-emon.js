// Direct test with explicit password
const { Pool } = require("pg");

const config = {
  host: "127.0.0.1",
  database: "oliver_db",
  user: "emon",
  password: "emon@12",
  port: 5432,
};

console.log("Testing with config:", { ...config, password: "***" });

const pool = new Pool(config);

pool.query("SELECT current_user, current_database()")
  .then(result => {
    console.log("\n✓ SUCCESS!");
    console.log("User:", result.rows[0].current_user);
    console.log("Database:", result.rows[0].current_database);
    return pool.end();
  })
  .then(() => {
    console.log("\nConnection closed.");
    process.exit(0);
  })
  .catch(error => {
    console.error("\n✗ FAILED!");
    console.error("Error:", error.message);
    console.error("Code:", error.code);
    process.exit(1);
  });
