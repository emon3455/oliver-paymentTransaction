/*
 * Methods:
 *    setBaseDir() — Configure the logs base directory.
 *    setAllowedFiles() — Override allowed config file names.
 *    loadConfig() — Load a sanitized config file.
 *    load() — Load a file via absolute path.
 *    makeError() — Create a standardized error instance.
 *    sanitizeFileName() — Ensure config file names are safe.
 *    resolveInLogsDir() — Resolve path within the logs directory.
 *    atomicReadFile() — Perform atomic file reads.
 *    parseJsonStrict() — Parse JSON with strict validation.
 *    validateLogRoutesShape() — Validate log routes configuration.
 *    validateRoutePathSafety() — Evaluate route path safety.
 *    throwValidationErrors() — Throw a standardized config validation error.
 *    deepFreeze() — Deep freeze an object graph recursively.
 */

"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Class ConfigLoader
 *
 * A secure JSON configuration file loader designed for log routing/config files. It enforces a strict
 * allowlist of filenames under a configurable logs directory, blocks path traversal, performs atomic
 * reads to avoid mid-read corruption, parses JSON with strict validation, validates the expected
 * config schema (including duplicate detection and route-path safety checks), caches by file metadata,
 * and deep-freezes the resulting object to prevent mutation.
 *
 * @link #TODO
 */
class ConfigLoader {
  // Private in-memory cache keyed by sanitized file name; stores last-known file stats and the frozen parsed config.
  static #cache = new Map(); // fileName -> { mtimeMs, size, config }
  // Base directory used for resolving allowed config files (defaults to "<cwd>/logs"); override via setBaseDir().
  static #logsBaseDirectoryPath = path.resolve(process.cwd(), "logs");
  // Allowlist of permitted config filenames to prevent arbitrary file reads; override via setAllowedFiles().
  static #allowedFiles = new Set(["LogRoutes.json"]); // update as needed

  /**
   * Configure the logs base directory.
   *
   * Update the path used when resolving relative log configuration files.
   *
   * @author Linden May
   * @version 1.0.0
   * @since -
   * @updated -
   * @link https://docs.example.com/ConfigLoader#setBaseDir #TODO
   *
   * @param {string} newBaseDirectoryPath - directory path to use for log files
   * @returns {boolean} confirmation that the base directory was updated
   */
  static setBaseDir(newBaseDirectoryPath) {
    // Validate the directory path argument
    if (!newBaseDirectoryPath || typeof newBaseDirectoryPath !== "string") {
      // Throw error if base directory input is missing or invalid
      throw this.#makeError({
        // Specify error code for invalid base directory setting
        code: "INVALID_BASE_DIR",
        // Provide guidance within the error message
        message:
          "ConfigLoader.setBaseDir(directoryPath) requires a string path.",
      });
    }
    // Resolve and store the provided directory path
    this.#logsBaseDirectoryPath = path.resolve(newBaseDirectoryPath);
    // Confirm successful update
    return true;
  }

  /**
   * Override allowed config file names.
   *
   * Replace the current allowlist with a sanitized candidate set.
   *
   * @author Linden May
   * @version 1.0.0
   * @since -
   * @updated -
   * @link https://docs.example.com/ConfigLoader#setAllowedFiles #TODO
   *
   * @param {string[]} allowedFileNameCandidates - candidate names permitted for loading
   * @returns {boolean} confirmation that the allowlist was refreshed
   */
  static setAllowedFiles(allowedFileNameCandidates) {
    // Validate the allowlist input
    if (
      !Array.isArray(allowedFileNameCandidates) ||
      !allowedFileNameCandidates.length
    ) {
      // Throw error when allowlist candidates are invalid
      throw this.#makeError({
        // Indicate invalid allowlist configuration
        code: "INVALID_ALLOWLIST",
        // Provide guidance within the error message
        message:
          "ConfigLoader.setAllowedFiles(candidateFileNames) requires a non-empty array of file names.",
      });
    }
    // Build new sanitized allowlist
    const updatedAllowedFileSet = new Set();
    // Iterate through the provided candidates
    for (const allowedFileNameCandidate of allowedFileNameCandidates) {
      // Sanitize the candidate file name
      const sanitizedAllowedFileName = this.#sanitizeFileName(
        allowedFileNameCandidate,
      );
      // Add sanitized file name to the updated set
      updatedAllowedFileSet.add(sanitizedAllowedFileName);
    }
    // Replace the stored allowlist with the new set
    this.#allowedFiles = updatedAllowedFileSet;
    // Confirm allowlist update
    return true;
  }

  /**
   * Load a sanitized config file.
   *
   * Validate, cache, and return the requested config JSON content.
   *
   * @author Linden May
   * @version 1.0.0
   * @since -
   * @updated -
   * @link https://docs.example.com/ConfigLoader#loadConfig #TODO
   *
   * @param {string} requestedConfigFileName - name of the allowed config file
   * @returns {object} frozen config object resolved from disk
   */
  static loadConfig(requestedConfigFileName) {
    // Sanitize the requested config file name
    const sanitizedConfigFileName = this.#sanitizeFileName(
      requestedConfigFileName,
    );
    // Validate that the sanitized name exists in the allowlist
    if (!this.#allowedFiles.has(sanitizedConfigFileName)) {
      // Throw error when the file is not allowed
      throw this.#makeError({
        // Specify error code for disallowed files
        code: "FILE_NOT_ALLOWED",
        // Provide file detail for diagnostics
        file: sanitizedConfigFileName,
        // Provide user-facing message for deny
        message: `Config file not allowed: ${sanitizedConfigFileName}`,
      });
    }
    // Resolve the absolute path under the logs directory
    const resolvedConfigFilePath = this.#resolveInLogsDir(
      sanitizedConfigFileName,
    );
    // Ensure the resolved path actually exists
    if (!fs.existsSync(resolvedConfigFilePath)) {
      // Throw error when the file cannot be located
      throw this.#makeError({
        // Set error code for missing files
        code: "FILE_NOT_FOUND",
        // Attach file path details for debugging
        file: resolvedConfigFilePath,
        // Notify user that the log file is absent
        message: `Config file not found: ${resolvedConfigFilePath}`,
      });
    }
    // Capture file metadata before reading
    const initialConfigFileStats = fs.statSync(resolvedConfigFilePath);
    // Confirm the path points to a file
    if (!initialConfigFileStats.isFile()) {
      // Throw error when the resolved path is not a file
      throw this.#makeError({
        // Provide error code for non-file paths
        code: "NOT_A_FILE",
        // Attach problematic path for clarity
        file: resolvedConfigFilePath,
        // Provide actionable message for callers
        message: `Config path is not a file: ${resolvedConfigFilePath}`,
      });
    }
    // Retrieve cached entry if available
    const cachedConfigEntry = this.#cache.get(sanitizedConfigFileName);
    // Check whether the cache entry matches current stats
    if (
      // Ensure cached entry is present
      cachedConfigEntry &&
      // Compare modification time for cache validity
      cachedConfigEntry.mtimeMs === initialConfigFileStats.mtimeMs &&
      // Compare file size for cache validity
      cachedConfigEntry.size === initialConfigFileStats.size
    ) {
      // Return cached configuration when valid
      return cachedConfigEntry.config;
    }
    // Read the serialized config content atomically
    const serializedConfig = this.#atomicReadFile(resolvedConfigFilePath);
    // Parse the JSON content strictly
    const parsedConfigObject = this.#parseJsonStrict(
      serializedConfig,
      resolvedConfigFilePath,
    );
    // Validate the parsed structure and safety
    this.#validateLogRoutesShape(parsedConfigObject, resolvedConfigFilePath);
    // Freeze the config for immutability
    const frozenConfig = this.#deepFreeze(parsedConfigObject);
    // Capture the latest file metadata after reading
    const latestConfigFileStats = fs.statSync(resolvedConfigFilePath);
    // Update the cache with fresh metadata and frozen config
    this.#cache.set(sanitizedConfigFileName, {
      // Store latest modification time
      mtimeMs: latestConfigFileStats.mtimeMs,
      // Store latest file size
      size: latestConfigFileStats.size,
      // Store the frozen configuration object
      config: frozenConfig,
    });
    // Return the immutable configuration
    return frozenConfig;
  }

  /**
   * Load a file via absolute path.
   *
   * Resolve, validate, and parse any provided filesystem path.
   *
   * @author Linden May
   * @version 1.0.0
   * @since -
   * @updated -
   * @link https://docs.example.com/ConfigLoader#load #TODO
   *
   * @param {string} requestedArbitraryFilePath - absolute or relative path to load
   * @returns {object} parsed and frozen configuration object
   */
  static load(requestedArbitraryFilePath) {
    // Validate that a file path string was provided
    if (
      !requestedArbitraryFilePath ||
      typeof requestedArbitraryFilePath !== "string"
    ) {
      // Throw error when the file path argument is invalid
      throw this.#makeError({
        // Set error code for invalid paths
        code: "INVALID_FILE_PATH",
        // Provide the problematic input for diagnostics
        file: requestedArbitraryFilePath || null,
        // Explain the required argument type
        message: "load(filePath) requires a file path string.",
      });
    }
    // Resolve the provided path against the current working directory
    const resolvedArbitraryFilePath = path.resolve(
      process.cwd(),
      requestedArbitraryFilePath,
    );
    // Confirm the resolved file path exists
    if (!fs.existsSync(resolvedArbitraryFilePath)) {
      // Throw error when the resolved file is missing
      throw this.#makeError({
        // Set missing file error code
        code: "FILE_NOT_FOUND",
        // Attach missing path details
        file: resolvedArbitraryFilePath,
        // Notify the caller that the file is absent
        message: `Config file not found: ${resolvedArbitraryFilePath}`,
      });
    }
    // Read file statistics for validation
    const resolvedFileStats = fs.statSync(resolvedArbitraryFilePath);
    // Ensure the path refers to a file
    if (!resolvedFileStats.isFile()) {
      // Throw error when the path is not a file
      throw this.#makeError({
        // Set code for non-file inputs
        code: "NOT_A_FILE",
        // Attach path details for error context
        file: resolvedArbitraryFilePath,
        // Explain why the input failed
        message: `Config path is not a file: ${resolvedArbitraryFilePath}`,
      });
    }
    // Load raw file content
    const fileContent = fs.readFileSync(resolvedArbitraryFilePath, "utf8");
    // Parse the JSON content with strict validation
    const parsedConfigObject = this.#parseJsonStrict(
      fileContent,
      resolvedArbitraryFilePath,
    );
    // Return the deep-frozen configuration
    return this.#deepFreeze(parsedConfigObject);
  }

  /**
   * Create a standardized error instance.
   *
   * Enrich the provided error metadata into a ConfigLoaderError.
   *
   * @author Linden May
   * @version 1.0.0
   * @since -
   * @updated -
   * @link https://docs.example.com/ConfigLoader#_makeError #TODO
   *
   * @param {object} errorDetails - metadata used to build the error
   * @returns {Error} ConfigLoaderError with attached metadata
   */
  static #makeError({
    code: errorCode,
    file: errorFilePath,
    jsonPath: errorJsonPath,
    message: errorMessage,
  }) {
    // Construct the base error instance
    const errorInstance = new Error(errorMessage || "ConfigLoader error");
    // Label the error type for consumers
    errorInstance.name = "ConfigLoaderError";
    // Assign the provided or fallback error code
    errorInstance.code = errorCode || "CONFIG_ERROR";
    // Attach the file path associated with the error
    errorInstance.file = errorFilePath || null;
    // Attach the JSON path related to the error
    errorInstance.path = errorJsonPath || null;
    // Return the constructed error
    return errorInstance;
  }

  /**
   * Ensure config file names are safe.
   *
   * Validate structure and extension of incoming config file names.
   *
   * @author Linden May
   * @version 1.0.0
   * @since -
   * @updated -
   * @link https://docs.example.com/ConfigLoader#_sanitizeFileName #TODO
   *
   * @param {string} candidateFileName - incoming config file name to sanitize
   * @returns {string} sanitized base name for allowed files
   */
  static #sanitizeFileName(candidateFileName) {
    // Validate the candidate file name input
    if (!candidateFileName || typeof candidateFileName !== "string") {
      // Throw error for invalid file name input
      throw this.#makeError({
        // Set specific error code for invalid file names
        code: "INVALID_FILE_NAME",
        // Attach the invalid input for diagnostics
        file: candidateFileName || null,
        // Provide guidance about required argument format
        message: "loadConfig(fileName) requires a file name string.",
      });
    }
    // Determine the base name of the candidate
    const candidateBaseName = path.basename(candidateFileName);
    // Validate characters used in the base name
    if (!/^[a-zA-Z0-9._-]+$/.test(candidateBaseName)) {
      // Throw error when file name contains unsafe characters
      throw this.#makeError({
        // Set error code for invalid characters
        code: "INVALID_FILE_NAME",
        // Attach original candidate for context
        file: candidateFileName,
        // Provide message describing invalid format
        message: `Invalid config file name: ${candidateFileName}`,
      });
    }
    // Ensure the file name ends with .json
    if (!candidateBaseName.toLowerCase().endsWith(".json")) {
      // Throw error for unsupported file extension
      throw this.#makeError({
        // Set error code for invalid extension
        code: "INVALID_FILE_EXT",
        // Attach base name for clarity
        file: candidateBaseName,
        // Provide message explaining required extension
        message: `Config file must be .json: ${candidateBaseName}`,
      });
    }
    // Return the validated base name
    return candidateBaseName;
  }

  /**
   * Resolve path within the logs directory.
   *
   * Build an absolute path and prevent traversal outside the logs directory.
   *
   * @author Linden May
   * @version 1.0.0
   * @since -
   * @updated -
   * @link https://docs.example.com/ConfigLoader#_resolveInLogsDir #TODO
   *
   * @param {string} sanitizedLogFileName - validated log file name to resolve
   * @returns {string} absolute path to the log file within the directory
   */
  static #resolveInLogsDir(sanitizedLogFileName) {
    // Resolve the file name against the logs base directory
    const resolvedLogsFilePath = path.resolve(
      this.#logsBaseDirectoryPath,
      sanitizedLogFileName,
    );
    // Normalize the base directory path with trailing separator
    const normalizedLogsBaseDirectory = this.#logsBaseDirectoryPath.endsWith(
      path.sep,
    )
      ? this.#logsBaseDirectoryPath
      : this.#logsBaseDirectoryPath + path.sep;
    // Prevent resolving paths outside the base directory
    if (!resolvedLogsFilePath.startsWith(normalizedLogsBaseDirectory)) {
      // Throw error when a traversal attempt is detected
      throw this.#makeError({
        // Set error code for blocked path traversal
        code: "PATH_TRAVERSAL_BLOCKED",
        // Attach the unsafe resolved path
        file: resolvedLogsFilePath,
        // Provide message explaining the block
        message: "Blocked path traversal attempt.",
      });
    }
    // Return the safe resolved path
    return resolvedLogsFilePath;
  }

  /**
   * Perform atomic file reads.
   *
   * Retry reading the file until consecutive stats match to avoid mid-read corruption.
   *
   * @author Linden May
   * @version 1.0.0
   * @since -
   * @updated -
   * @link https://docs.example.com/ConfigLoader#_atomicReadFile #TODO
   *
   * @param {string} configFilePath - path to the config file to read
   * @returns {string} raw file contents
   */
  static #atomicReadFile(configFilePath) {
    // Attempt atomic read up to three times
    for (
      let readAttemptNumber = 1;
      readAttemptNumber <= 3;
      readAttemptNumber++
    ) {
      // Capture stats before reading
      const fileStatsBeforeRead = fs.statSync(configFilePath);
      // Read the file contents
      const fileRawContent = fs.readFileSync(configFilePath, "utf8");
      // Capture stats after reading
      const fileStatsAfterRead = fs.statSync(configFilePath);
      // Determine whether the file changed during the read
      const isContentChanged =
        // Compare modification timestamps
        fileStatsBeforeRead.mtimeMs !== fileStatsAfterRead.mtimeMs ||
        // Compare file sizes
        fileStatsBeforeRead.size !== fileStatsAfterRead.size ||
        // Detect zero-length reads with growing file size
        (typeof fileRawContent === "string" &&
          fileRawContent.length === 0 &&
          fileStatsAfterRead.size > 0);
      // Return the content when no changes occurred
      if (!isContentChanged) {
        // Return stable file content
        return fileRawContent;
      }
      // On final attempt, raise an error if content still unstable
      if (readAttemptNumber === 3) {
        // Throw atomic read failure with context
        throw this.#makeError({
          // Set error code for failed atomic read
          code: "ATOMIC_READ_FAILED",
          // Attach the target file path
          file: configFilePath,
          // Provide a descriptive failure message
          message:
            "Config file changed while reading; atomic read failed after retries.",
        });
      }
    }
    // Throw when all attempts failed
    throw this.#makeError({
      // Set error code for atomic read failure
      code: "ATOMIC_READ_FAILED",
      // Attach file path for diagnostics
      file: configFilePath,
      // Provide a concise failure message
      message: "Atomic read failed.",
    });
  }

  /**
   * Parse JSON with strict validation.
   *
   * Syntactically validate JSON text before parsing to provide better error messaging.
   *
   * @author Linden May
   * @version 1.0.0
   * @since -
   * @updated -
   * @link https://docs.example.com/ConfigLoader#_parseJsonStrict #TODO
   *
   * @param {string} rawJsonString - raw string content from disk
   * @param {string} configFilePath - file path used for error context
   * @returns {*} parsed JSON value
   */
  static #parseJsonStrict(rawJsonString, configFilePath) {
    // Validate that raw content is a string
    if (typeof rawJsonString !== "string") {
      // Throw error for invalid content type
      throw this.#makeError({
        // Set error code for invalid content
        code: "INVALID_CONTENT",
        // Attach file path for context
        file: configFilePath,
        // Provide explanatory message
        message: "Invalid config content (expected string).",
      });
    }
    // Trim the raw JSON string
    const trimmedJsonContent = rawJsonString.trim();
    // Verify the trimmed content starts with a JSON structure
    if (
      !trimmedJsonContent.startsWith("{") &&
      !trimmedJsonContent.startsWith("[")
    ) {
      // Throw error for syntactically invalid JSON
      throw this.#makeError({
        // Set error code for invalid syntax
        code: "INVALID_JSON_SYNTAX",
        // Attach file path for debugging
        file: configFilePath,
        // Provide descriptive syntax error message
        message: "Invalid JSON syntax: content does not look like JSON.",
      });
    }
    // Attempt to parse the JSON content
    try {
      // Parse and return the JSON
      return JSON.parse(trimmedJsonContent);
    } catch (jsonParseError) {
      // Capture the parse error message
      const parseErrorMessage =
        // Prefer the original message when available
        jsonParseError && jsonParseError.message
          ? jsonParseError.message
          : String(jsonParseError);
      // Throw enhanced syntax error
      throw this.#makeError({
        // Set error code for JSON syntax failures
        code: "INVALID_JSON_SYNTAX",
        // Attach file path to the error
        file: configFilePath,
        // Provide message including parse error details
        message: `Invalid JSON syntax: ${parseErrorMessage}`,
      });
    }
  }

  /**
   * Validate log routes configuration.
   *
   * Ensure the parsed config matches the expected schema and safety rules.
   *
   * @author Linden May
   * @version 1.0.0
   * @since -
   * @updated -
   * @link https://docs.example.com/ConfigLoader#_validateLogRoutesShape #TODO
   *
   * @param {object} cfg - parsed configuration object
   * @param {string} fullPath - path to the file for error context
   * @returns {void} nothing
   */
  static #validateLogRoutesShape(cfg, fullPath) {
    // Collect validation failures
    const validationErrors = [];
    // Define helper to detect plain objects
    const isPlainObject = (subject) =>
      subject !== null &&
      typeof subject === "object" &&
      !Array.isArray(subject);
    // Reject non-object configurations
    if (!isPlainObject(cfg)) {
      // Record error when config is not an object
      validationErrors.push({ jsonPath: "$", message: "expected object" });
      // Surface validation errors
      this.#throwValidationErrors(validationErrors, fullPath);
      // Stop processing when top level is invalid
      return;
    }
    // Require root entry
    if (typeof cfg.root !== "string" || !cfg.root.trim()) {
      // Record missing root error
      validationErrors.push({
        jsonPath: "$.root",
        message: "required non-empty string",
      });
    }
    // Require criticalRoot entry
    if (typeof cfg.criticalRoot !== "string" || !cfg.criticalRoot.trim()) {
      // Record missing critical root error
      validationErrors.push({
        jsonPath: "$.criticalRoot",
        message: "required non-empty string",
      });
    }
    // Track seen flags to detect duplicates
    const seenFlags = new Set();
    // Track seen IDs to detect duplicates
    const seenIds = new Set();
    // Iterate through each group entry in the config
    for (const [groupName, groupVal] of Object.entries(cfg)) {
      // Skip reserved root entries
      if (groupName === "root" || groupName === "criticalRoot") continue;
      // Skip groups that are not plain objects
      if (!isPlainObject(groupVal)) continue;
      // Skip groups lacking a logs array
      if (!Array.isArray(groupVal.logs)) continue;
      // Validate category metadata
      if (typeof groupVal.category !== "string" || !groupVal.category.trim()) {
        // Record missing category error
        validationErrors.push({
          jsonPath: `$.${groupName}.category`,
          message: "required non-empty string",
        });
      }
      // Validate retention metadata
      if (
        typeof groupVal.retention !== "string" ||
        !groupVal.retention.trim()
      ) {
        // Record missing retention error
        validationErrors.push({
          jsonPath: `$.${groupName}.retention`,
          message: "required non-empty string",
        });
      }
      // Iterate through each log entry in the group
      for (let i = 0; i < groupVal.logs.length; i++) {
        // Capture the current log item
        const logItem = groupVal.logs[i];
        // Prepare the JSON path for this log entry
        const logJsonPath = `$.${groupName}.logs[${i}]`;
        // Ensure the log entry is an object
        if (!isPlainObject(logItem)) {
          // Record error for non-object log entry
          validationErrors.push({
            jsonPath: logJsonPath,
            message: "expected object",
          });
          // Skip to the next log entry
          continue;
        }
        // Extract log id for validation
        const logId = logItem.id;
        // Validate required log id
        if (typeof logId !== "string" || !logId.trim()) {
          // Record missing log id error
          validationErrors.push({
            jsonPath: `${logJsonPath}.id`,
            message: "required non-empty string",
          });
          // Detect duplicate log id values
        } else if (seenIds.has(logId)) {
          // Record duplicate id error
          validationErrors.push({
            jsonPath: `${logJsonPath}.id`,
            message: `duplicate id "${logId}"`,
          });
          // Handle unique log id entries
        } else {
          // Track this id to prevent future duplicates
          seenIds.add(logId);
        }
        // Extract log flag for validation
        const logFlag = logItem.flag;
        // Validate required log flag
        if (typeof logFlag !== "string" || !logFlag.trim()) {
          // Record missing log flag error
          validationErrors.push({
            jsonPath: `${logJsonPath}.flag`,
            message: "required non-empty string",
          });
          // Detect duplicate log flags
        } else if (seenFlags.has(logFlag)) {
          // Record duplicate flag error
          validationErrors.push({
            jsonPath: `${logJsonPath}.flag`,
            message: `duplicate flag "${logFlag}"`,
          });
          // Handle unique log flag entries
        } else {
          // Track this flag to prevent future duplicates
          seenFlags.add(logFlag);
        }
        // Extract path value for validation
        const pathValue = logItem.path;
        // Validate required path string
        if (typeof pathValue !== "string" || !pathValue.trim()) {
          // Record missing path error
          validationErrors.push({
            jsonPath: `${logJsonPath}.path`,
            message: "required non-empty string",
          });
          // Validate provided path safety
        } else {
          // Validate the safety of the route path
          const safetyError = this.#validateRoutePathSafety(pathValue);
          // Attach safety error if one was detected
          if (safetyError) {
            // Record unsafe path error
            validationErrors.push({
              jsonPath: `${logJsonPath}.path`,
              message: safetyError,
            });
          }
        }
        // Validate critical flag when present
        if (
          Object.prototype.hasOwnProperty.call(logItem, "critical") &&
          typeof logItem.critical !== "boolean"
        ) {
          // Record invalid critical flag type error
          validationErrors.push({
            jsonPath: `${logJsonPath}.critical`,
            message: "must be boolean if present",
          });
        }
      }
    }
    // Throw if any validation errors were collected
    this.#throwValidationErrors(validationErrors, fullPath);
  }

  /**
   * Evaluate route path safety.
   *
   * Enforce relative path rules and detect unsafe patterns inside log routes.
   *
   * @author Linden May
   * @version 1.0.0
   * @since -
   * @updated -
   * @link https://docs.example.com/ConfigLoader#_validateRoutePathSafety #TODO
   *
   * @param {string} routePath - candidate route path from the config
   * @returns {string|null} descriptive safety error string or null when safe
   */
  static #validateRoutePathSafety(routePath) {
    // Trim the provided path string for validation
    const trimmedRoutePath = String(routePath).trim();
    // Check for null byte characters
    if (trimmedRoutePath.includes("\0")) {
      // Return null byte detection error
      return "contains null byte";
    }
    // Check for backslash usage
    if (trimmedRoutePath.includes("\\")) {
      // Return backslash detection error
      return "contains backslash '\\\\'";
    }
    // Check for absolute path starting with slash
    if (trimmedRoutePath.startsWith("/")) {
      // Return requirement for relative paths
      return "must be a relative path (cannot start with '/')";
    }
    // Check for drive-letter path indicators
    if (/^[a-zA-Z]:[\\/]/.test(trimmedRoutePath)) {
      // Return requirement for relative paths
      return "must be a relative path (cannot be a drive path)";
    }
    // Check for path traversal patterns
    if (
      trimmedRoutePath === ".." ||
      trimmedRoutePath.startsWith("../") ||
      trimmedRoutePath.includes("/../") ||
      trimmedRoutePath.endsWith("/..")
    ) {
      // Return traversal detection error
      return "contains traversal '..'";
    }
    // Return null when the route path is safe
    return null;
  }

  /**
   * Throw a standardized config validation error.
   *
   * Builds a readable message from validation errors and throws a class error payload.
   *
   * @author Linden May
   * @version 1.0.0
   * @since -
   * @updated -
   * @link https://docs.example.com/ClassName#throwValidationErrors #TODO
   *
   * @param {Array<{jsonPath?: string, message: string}>} errors - Validation errors to format and surface
   * @param {string} fullPath - Full path of the config file being validated
   * @returns {void} Does not return when errors exist
   */
  static #throwValidationErrors(errors, fullPath) {
    // Return early if there are no errors
    if (!errors.length) return;

    // Define the formatted error lines to show
    const shown = errors
      // Limit the number of displayed errors
      .slice(0, 60)
      // Format each error into a single line
      .map((e) => `${e.jsonPath}: ${e.message}`)
      // Join the formatted lines into a single message block
      .join("\n");

    // Define the first error for primary jsonPath selection
    const first = errors[0];

    // Throw a standardized validation error
    throw this.#makeError({
      // Define the error code
      code: "CONFIG_VALIDATION_FAILED",
      // Define the file path for the error context
      file: fullPath,
      // Define the primary jsonPath for the error context
      jsonPath: first && first.jsonPath ? first.jsonPath : null,
      // Define the error message payload
      message: `Config validation failed:\n${shown}${errors.length > 60 ? "\n… (more errors)" : ""}`,
      // Close the error payload object
    });
  }

  /**
   * Deep freeze an object graph recursively.
   *
   * Freezes the provided object and all nested objects to prevent accidental mutation.
   *
   * @author Linden May
   * @version 1.0.0
   * @since -
   * @updated -
   * @link https://docs.example.com/ClassName#deepFreeze #TODO
   *
   * @param {any} objectToFreeze - The value to deep-freeze if it is an object
   * @returns {any} The original value, frozen when applicable
   */
  static #deepFreeze(objectToFreeze) {
    // Return the value as-is if it is not an object
    if (objectToFreeze === null || typeof objectToFreeze !== "object")
      return objectToFreeze;

    // Freeze the current object to prevent mutation
    Object.freeze(objectToFreeze);

    // Loop over each own enumerable property key
    for (const propertyKey of Object.keys(objectToFreeze)) {
      // Define the current property value
      const propertyValue = objectToFreeze[propertyKey];

      // Recurse into nested objects that are not already frozen
      if (
        propertyValue &&
        typeof propertyValue === "object" &&
        !Object.isFrozen(propertyValue)
      ) {
        // Deep freeze the nested property value
        this.#deepFreeze(propertyValue);
      }
    }

    // Return the frozen object reference
    return objectToFreeze;
  }
}

module.exports = ConfigLoader;
