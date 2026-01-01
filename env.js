// Environment configuration
module.exports = {
  NODE_ENV: process.env.NODE_ENV || "development",
  LOGGING_ENABLED: "1",
  LOGGING_CONSOLE_ENABLED: "1",
  LOG_LOCAL_ROOT: "./logs",
  EFS_ROOT: "/mnt/efs/logs",
  EFS_CRITICAL_ROOT: "/mnt/efs/logs/critical",
  SLACK_TIMEOUT_MS: "5000"
};
