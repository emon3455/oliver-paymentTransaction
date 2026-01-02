/**
 * Gulpfile for Code Formatting
 * Formats JavaScript, HTML, CSS, and JSON files using Prettier
 */

// Import required modules
const gulp = require("gulp");
const prettier = require("gulp-prettier");
const path = require("path");
const fs = require("fs");

// Define project root directory (parent of formatting folder)
const projectRoot = path.resolve(__dirname, "..");

// Define source directories to format
const sourcePaths = {
  // JavaScript files
  js: [
    path.join(projectRoot, "assets/js/**/*.js"),
    path.join(projectRoot, "page/**/*.js")
  ],
  // HTML files
  html: [
    path.join(projectRoot, "page/**/*.html"),
    path.join(projectRoot, "index.html")
  ],
  // CSS files
  css: [
    path.join(projectRoot, "assets/css/**/*.css"),
    path.join(projectRoot, "page/**/*.css")
  ],
  // JSON files (excluding node_modules)
  json: [
    path.join(projectRoot, "page/**/*.json"),
    path.join(projectRoot, "package.json"),
    path.join(projectRoot, "formatting/package.json")
  ]
};

// Backup directory
const backupDir = path.join(__dirname, "backup");

/**
 * Create backup of files before formatting
 */
function backupFiles(done) {
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Create timestamp for backup folder
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const timestampedBackupDir = path.join(backupDir, timestamp);

  // Create timestamped backup directory
  fs.mkdirSync(timestampedBackupDir, { recursive: true });

  // Copy all source files to backup
  const allPaths = [
    ...sourcePaths.js,
    ...sourcePaths.html,
    ...sourcePaths.css,
    ...sourcePaths.json
  ];

  // Use gulp to copy files, preserving directory structure
  return gulp
    .src(allPaths, { base: projectRoot, allowEmpty: true })
    .pipe(gulp.dest(timestampedBackupDir));
}

/**
 * Format JavaScript files
 */
function formatJS() {
  return gulp
    .src(sourcePaths.js, { base: projectRoot, allowEmpty: true })
    .pipe(
      prettier({
        parser: "babel",
        printWidth: 100,
        tabWidth: 2,
        useTabs: false,
        semi: true,
        singleQuote: false,
        trailingComma: "none",
        arrowParens: "always",
        endOfLine: "lf"
      })
    )
    .pipe(gulp.dest(projectRoot));
}

/**
 * Format HTML files
 */
function formatHTML() {
  return gulp
    .src(sourcePaths.html, { base: projectRoot, allowEmpty: true })
    .pipe(
      prettier({
        parser: "html",
        printWidth: 100,
        tabWidth: 2,
        useTabs: false,
        htmlWhitespaceSensitivity: "css",
        endOfLine: "lf"
      })
    )
    .pipe(gulp.dest(projectRoot));
}

/**
 * Format CSS files
 */
function formatCSS() {
  return gulp
    .src(sourcePaths.css, { base: projectRoot, allowEmpty: true })
    .pipe(
      prettier({
        parser: "css",
        printWidth: 100,
        tabWidth: 2,
        useTabs: false,
        endOfLine: "lf"
      })
    )
    .pipe(gulp.dest(projectRoot));
}

/**
 * Format JSON files
 */
function formatJSON() {
  return gulp
    .src(sourcePaths.json, { base: projectRoot, allowEmpty: true })
    .pipe(
      prettier({
        parser: "json",
        tabWidth: 2,
        useTabs: false,
        endOfLine: "lf"
      })
    )
    .pipe(gulp.dest(projectRoot));
}

/**
 * Main format task - backs up files then formats all file types
 */
const format = gulp.series(
  backupFiles,
  gulp.parallel(formatJS, formatHTML, formatCSS, formatJSON)
);

/**
 * Check formatting without modifying files
 */
function checkFormatJS() {
  return gulp
    .src(sourcePaths.js, { base: projectRoot, allowEmpty: true })
    .pipe(
      prettier.check({
        parser: "babel",
        printWidth: 100,
        tabWidth: 2,
        useTabs: false,
        semi: true,
        singleQuote: false,
        trailingComma: "none",
        arrowParens: "always",
        endOfLine: "lf"
      })
    );
}

function checkFormatHTML() {
  return gulp
    .src(sourcePaths.html, { base: projectRoot, allowEmpty: true })
    .pipe(
      prettier.check({
        parser: "html",
        printWidth: 100,
        tabWidth: 2,
        useTabs: false,
        htmlWhitespaceSensitivity: "css",
        endOfLine: "lf"
      })
    );
}

function checkFormatCSS() {
  return gulp
    .src(sourcePaths.css, { base: projectRoot, allowEmpty: true })
    .pipe(
      prettier.check({
        parser: "css",
        printWidth: 100,
        tabWidth: 2,
        useTabs: false,
        endOfLine: "lf"
      })
    );
}

function checkFormatJSON() {
  return gulp
    .src(sourcePaths.json, { base: projectRoot, allowEmpty: true })
    .pipe(
      prettier.check({
        parser: "json",
        tabWidth: 2,
        useTabs: false,
        endOfLine: "lf"
      })
    );
}

const formatCheck = gulp.parallel(
  checkFormatJS,
  checkFormatHTML,
  checkFormatCSS,
  checkFormatJSON
);

// Export tasks
exports.format = format;
exports["format:check"] = formatCheck;
exports.backup = backupFiles;
exports.default = format;

