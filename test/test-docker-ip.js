// Try connecting to Docker container IP directly
const { Pool } = require("pg");

const config = {
  host: "172.17.0.2",
  database: "oliver_db",
  user: "emon",
  password: "emon@12",
  port: 5432,
};

console.log("Testing with Docker container IP:", config.host);

const pool = new Pool(config);

pool.query("SELECT current_user")
  .then(result => {
    console.log("✓ SUCCESS with Docker IP!");
    console.log("User:", result.rows[0].current_user);
    return pool.end();
  })
  .then(() => {
    console.log("\nNow let's try localhost...");
    
    const pool2 = new Pool({
      host: "127.0.0.1",
      database: "oliver_db",
      user: "emon",
      password: "emon@12",
      port: 5432,
    });
    
    return pool2.query("SELECT current_user")
      .then(result => {
        console.log("✓ SUCCESS with localhost!");
        return pool2.end();
      });
  })
  .then(() => {
    console.log("\nBoth work!");
    process.exit(0);
  })
  .catch(error => {
    console.error("\n✗ Error:", error.message);
    process.exit(1);
  });
