// UtilityLogger.js ?'" EFS-Optimized Logger (SQS/S3 removed, direct EFS writes)

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const dotenv = require("dotenv");
const logConfig = require("./configs/logRoutes");
const Slack = require("./utils/slack");

dotenv.config();

// Load env.js values into process.env
const envConfig = require("./env.js");
Object.keys(envConfig).forEach(key => {
  process.env[key] = String(envConfig[key]);
});

// --- Environment Configuration ---
const ENV = Object.freeze({
  NODE_ENV: (process.env.NODE_ENV || "unknown").toLowerCase(),
  LOGGING_ENABLED: process.env.LOGGING_ENABLED === "1",
  LOGGING_CONSOLE_ENABLED: process.env.LOGGING_CONSOLE_ENABLED === "1",
  LOG_LOCAL_ROOT: process.env.LOG_LOCAL_ROOT || "",
  EFS_ROOT: process.env.EFS_ROOT || "/mnt/efs/logs",
  EFS_CRITICAL_ROOT: process.env.EFS_CRITICAL_ROOT || "/mnt/efs/logs/critical",
  SLACK_TIMEOUT_MS: Number(process.env.SLACK_TIMEOUT_MS) || 5000,
});

const IS_LOCAL = ["local", "dev", "test"].includes(ENV.NODE_ENV);
const IS_REMOTE = ["stage", "prod"].includes(ENV.NODE_ENV);

// --- Log Storage Paths ---
// Use EFS in remote environments, local filesystem in local/dev
const LOG_ROOT = IS_REMOTE
  ? ENV.EFS_ROOT
  : (ENV.LOG_LOCAL_ROOT || logConfig?.root || path.join(process.cwd(), "logs"));

const CRITICAL_ROOT = IS_REMOTE
  ? ENV.EFS_CRITICAL_ROOT
  : (logConfig?.criticalRoot || path.join(LOG_ROOT, "critical"));

// --- Logger Class ---
class Logger {
  static _resolveCache = new Map();
  static _routeCache = new Map();

  static debugLog(...args) {
    if (!ENV.LOGGING_CONSOLE_ENABLED) return null;
    console.log(...args);
    return true;
  }

  static sanitizeSegment(val) {
    return String(val)
      .replace(/[^A-Za-z0-9._-]/g, "_") // whitelist
      .replace(/_{2,}/g, "_") // collapse underscores
      .replace(/^\.+/, "") // strip leading dots
      .replace(/\.{3,}/g, ".."); // limit dot runs
  }

  static formatDate(date, format) {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "1970-01-01";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    if (format === "YYYY-MM-DD") return `${yyyy}-${mm}-${dd}`;
    if (format === "DD-MM-YYYY") return `${dd}-${mm}-${yyyy}`;
    return d.toISOString();
  }

  static ensureRelativeSafe(relPath) {
    const s = String(relPath);

    if (path.isAbsolute(s)) {
      throw new Error("Absolute paths are not allowed");
    }

    // Block any parent traversal on either separator style
    if (/(^|[\\/])\.\.([\\/]|$)/.test(s)) {
      throw new Error("Parent traversal not allowed");
    }

    // Strip leading slashes/backslashes
    return s.replace(/^[/\\]+/, "");
  }

  static getRouteByFlag(flag) {
    if (Logger._routeCache.has(flag)) return Logger._routeCache.get(flag);
    for (const category of Object.values(logConfig)) {
      if (!category?.logs) continue;
      const meta = {
        retention: category.retention,
        category: category.category,
        description: category.description,
      };
      const found = category.logs.find((log) => log.flag === flag);
      if (found) {
        const route = { ...meta, ...found };
        Logger._routeCache.set(flag, route);
        return route;
      }
    }
    const fallback = {
      retention: "unknown",
      category: "unknown",
      description: "?'sA???1,? Missing route definition",
      path: `missingLogRoutes/${flag}/${Logger.formatDate(
        new Date(),
        "YYYY-MM-DD"
      )}.log`,
      PciCompliance: false,
      critical: false,
    };
    Logger._routeCache.set(flag, fallback);
    return fallback;
  }

  static resolvePath(template, data) {
    // Include values in the cache key to avoid collisions
    const cacheKey =
      template +
      "::" +
      JSON.stringify(
        Object.keys(data)
          .sort()
          .reduce((acc, k) => {
            acc[k] = data[k];
            return acc;
          }, {})
      );

    if (Logger._resolveCache.has(cacheKey)) {
      return Logger._resolveCache.get(cacheKey);
    }

    const placeholders = Array.from(template.matchAll(/\{([^}]+)\}/g)).map(
      (m) => m[1]
    );

    // Validate all required keys exist
    for (const placeholder of placeholders) {
      const rawKey = placeholder.split(":")[0].trim();
      const key = Object.keys(data).find(
        (k) => k.toLowerCase() === rawKey.toLowerCase()
      );
      if (!key || !(key in data)) {
        Logger.debugLog?.(
          `[Logger] ?'?O Missing key "${rawKey}" for template "${template}"`
        );
        return null;
      }
    }

    // Build the output, with per-token formatting + validation
    let out = template;
    for (const placeholder of placeholders) {
      const [rawKey, format] = placeholder.split(":").map((s) => s.trim());
      const key = Object.keys(data).find(
        (k) => k.toLowerCase() === rawKey.toLowerCase()
      );
      let val = data[key];

      if (format) {
        const formatted = Logger.formatDate(val, format);
        if (formatted === "1970-01-01") {
          Logger.debugLog?.(
            `[Logger] ?'?O Invalid date for "${rawKey}" in template "${template}" (value: ${String(
              val
            )})`
          );
          return null;
        }
        val = formatted;
      }

      // Global replace for repeated tokens
      const re = new RegExp(
        "\\{" + placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\}",
        "g"
      );
      out = out.replace(re, Logger.sanitizeSegment(val));
    }

    Logger._resolveCache.set(cacheKey, out);
    return out;
  }

  static async writeLog({
    flag,
    data = {},
    action,
    critical = false,
    message = "",
    level = "info",
  }) {

    Logger.debugLog(`[${level.toUpperCase()}] ${flag}: ${message}`, data);

    if (!ENV.LOGGING_ENABLED) {
      Logger.debugLog?.("[Logger] ?'sA???1,? Logging is disabled via configuration");
      return;
    }

    if (typeof flag !== "string" || !flag.trim())
      throw new Error("Logger.writeLog: invalid flag");
    if (typeof data !== "object" || data === null)
      throw new Error("Logger.writeLog: data must be object");

    const route = Logger.getRouteByFlag(flag);
    const isCritical = !!(critical || route.critical);
    const resolvedPath = Logger.resolvePath(route.path, data);
    const timestamp = new Date().toISOString();

    const entry = {
      schemaVersion: "1.0",
      timestamp,
      level,
      flag,
      action: action || null,
      message,
      critical: isCritical,
      data,
      retention: route.retention,
      PciCompliance: route.PciCompliance,
      description: route.description,
      category: route.category,
      env: ENV.NODE_ENV,
    };

    if (!resolvedPath) {
      const fallback = `fallback/missing_path_${flag}_${Date.now()}.log`;
      await Logger.writeToStorage(fallback, {
        ...entry,
        logError: "Missing required placeholders",
      });
      return;
    }

    // Write to primary storage (EFS in prod, local in dev)
    await Logger.writeToStorage(resolvedPath, entry);

    // Write to critical storage if needed
    if (isCritical) {
      await Logger.writeToCriticalStorage(resolvedPath, entry);
      await Logger.sendToSlackCritical(entry);
    }
  }

  static async writeToStorage(relativePath, entry) {
    const safeRel = Logger.ensureRelativeSafe(relativePath);
    const full = path.join(LOG_ROOT, safeRel);
    const dir = path.dirname(full);
    try {
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.appendFile(full, JSON.stringify(entry) + "\n");
    } catch (err) {
      const fallback = path.join(
        process.cwd(),
        "logs_fallback",
        "write_errors.log"
      );
      await fs.promises.mkdir(path.dirname(fallback), { recursive: true });
      await fs.promises.appendFile(
        fallback,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          error: err.message,
          attemptedPath: full,
          env: ENV.NODE_ENV,
          errorCode: "E_WRITE_FAIL",
        }) + "\n"
      );
    }
  }

  static async writeToCriticalStorage(relativePath, entry) {
    const criticalRel = relativePath.endsWith(".log")
      ? relativePath.replace(/\.log$/, ".critical.log")
      : relativePath + ".critical.log";

    const safeRel = Logger.ensureRelativeSafe(criticalRel);

    // If CRITICAL_ROOT is a subdir of LOG_ROOT, use relative path
    const rootWithSep = LOG_ROOT.endsWith(path.sep)
      ? LOG_ROOT
      : LOG_ROOT + path.sep;
    const isSubdir = String(CRITICAL_ROOT).startsWith(rootWithSep);

    if (isSubdir) {
      const relFromRoot = path.join(
        path.relative(LOG_ROOT, CRITICAL_ROOT),
        safeRel
      );
      return Logger.writeToStorage(relFromRoot, entry);
    }

    // Otherwise write directly under CRITICAL_ROOT
    const full = path.join(CRITICAL_ROOT, safeRel);
    const dir = path.dirname(full);
    try {
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.appendFile(full, JSON.stringify(entry) + "\n");
    } catch (err) {
      const fallback = path.join(
        process.cwd(),
        "logs_fallback",
        "critical_write_errors.log"
      );
      await fs.promises.mkdir(path.dirname(fallback), { recursive: true });
      await fs.promises.appendFile(
        fallback,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          error: err.message,
          attemptedPath: full,
          env: ENV.NODE_ENV,
          errorCode: "E_WRITE_FAIL_CRITICAL",
        }) + "\n"
      );
    }
  }

  static async writeLogs(logs) {
    if (!Array.isArray(logs)) {
      throw new Error("Logger.writeLogs: logs must be an array");
    }

    logs.forEach(log => {
      Logger.debugLog(
        `[${(log.level || "info").toUpperCase()}] ${log.flag}: ${log.message}`,
        log.data
      );
    });

    if (!ENV.LOGGING_ENABLED) {
      Logger.debugLog?.("[Logger] ?'sA???1,? Logging is disabled via configuration");
      return;
    }

    // Validate all logs
    for (const log of logs) {
      if (typeof log.flag !== "string" || !log.flag.trim())
        throw new Error("Logger.writeLogs: invalid flag in log entry");
      if (typeof log.data !== "object" || log.data === null)
        throw new Error("Logger.writeLogs: data must be object in log entry");
    }

    // Prepare entries and group for batching
    const storageGroups = new Map(); // resolvedPath -> [entries]
    const criticalEntries = [];

    for (const log of logs) {
      const route = Logger.getRouteByFlag(log.flag);
      const isCritical = !!(log.critical || route.critical);
      const resolvedPath = Logger.resolvePath(route.path, log.data);
      const timestamp = new Date().toISOString();

      const entry = {
        schemaVersion: "1.0",
        timestamp,
        level: log.level || "info",
        flag: log.flag,
        action: log.action || null,
        message: log.message || "",
        critical: isCritical,
        data: log.data,
        retention: route.retention,
        PciCompliance: route.PciCompliance,
        description: route.description,
        category: route.category,
        env: ENV.NODE_ENV,
      };

      if (!resolvedPath) {
        const fallback = `fallback/missing_path_${log.flag}_${Date.now()}.log`;
        if (!storageGroups.has(fallback)) storageGroups.set(fallback, []);
        storageGroups.get(fallback).push({
          ...entry,
          logError: "Missing required placeholders",
        });
        continue;
      }

      // Group for storage writing
      if (!storageGroups.has(resolvedPath)) storageGroups.set(resolvedPath, []);
      storageGroups.get(resolvedPath).push(entry);

      // Group critical logs
      if (isCritical) {
        const criticalPath = resolvedPath.endsWith(".log")
          ? resolvedPath.replace(/\.log$/, ".critical.log")
          : resolvedPath + ".critical.log";
        if (!storageGroups.has(criticalPath)) storageGroups.set(criticalPath, []);
        storageGroups.get(criticalPath).push(entry);
        criticalEntries.push(entry);
      }
    }

    // Batch write to storage
    const storagePromises = [];
    for (const [relativePath, entries] of storageGroups) {
      storagePromises.push(Logger.writeStorageBatch(relativePath, entries));
    }

    // Send critical to Slack
    const slackPromises = criticalEntries.map(entry => Logger.sendToSlackCritical(entry));

    // Wait for all operations
    await Promise.allSettled([...storagePromises, ...slackPromises]);
  }

  static async writeStorageBatch(relativePath, entries) {
    const safeRel = Logger.ensureRelativeSafe(relativePath);
    const full = path.join(LOG_ROOT, safeRel);
    const dir = path.dirname(full);
    try {
      await fs.promises.mkdir(dir, { recursive: true });
      const content = entries.map(entry => JSON.stringify(entry)).join('\n') + '\n';
      await fs.promises.appendFile(full, content);
    } catch (err) {
      const fallback = path.join(
        process.cwd(),
        "logs_fallback",
        "batch_write_errors.log"
      );
      await fs.promises.mkdir(path.dirname(fallback), { recursive: true });
      await fs.promises.appendFile(
        fallback,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          error: err.message,
          attemptedPath: full,
          entryCount: entries.length,
          env: ENV.NODE_ENV,
          errorCode: "E_BATCH_WRITE_FAIL",
        }) + "\n"
      );
    }
  }

  static async sendToSlackCritical(entry) {
    try {
      const timer = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Slack timeout")),
          ENV.SLACK_TIMEOUT_MS
        )
      );
      const slackPromise = Slack.critical(entry);
      await Promise.race([slackPromise, timer]);
    } catch (err) {
      Logger.debugLog?.(`[Logger] ?'sA???1,? Slack send failed: ${err.message}`);
      const fallback = `fallback/slack_failed_${entry.flag}_${Date.now()}.log`;
      await Logger.writeToStorage(fallback, {
        ...entry,
        slackError: err.message,
        errorCode: "E_SLACK_FAIL",
      });
    }
  }
}

module.exports = Logger;
