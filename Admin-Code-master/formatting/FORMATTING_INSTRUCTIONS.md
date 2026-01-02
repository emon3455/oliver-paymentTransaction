# Code Formatting Instructions

This document outlines the coding standards and formatting guidelines for the Fansocial Admin project.

## Table of Contents

1. [JavaScript Coding Standards](#javascript-coding-standards)
2. [HTML Coding Standards](#html-coding-standards)
3. [CSS Coding Standards](#css-coding-standards)
4. [Running the Formatter](#running-the-formatter)
5. [Backup System](#backup-system)

---

## JavaScript Coding Standards

### 1. Descriptive Constants, Parameters, and Methods

#### Constants
- **Rule**: Use descriptive, full-word names. No abbreviations.
- **Naming**: Use `UPPER_SNAKE_CASE` for constants.
- **Examples**:
  ```javascript
  // ✅ Good
  const PAGE_SIZE = 20;
  const FETCH_TIMEOUT_DURATION = 20000;
  const MAXIMUM_RETRY_ATTEMPTS = 3;

  // ❌ Bad
  const PS = 20;
  const TO = 20000;
  const MAX_RET = 3;
  ```

#### Variables
- **Rule**: Use descriptive, full-word names. No abbreviations.
- **Naming**: Use `camelCase` for variables.
- **Examples**:
  ```javascript
  // ✅ Good
  const pageContentElement = document.querySelector('#pageContent');
  const activeFilters = window.AdminState.activeFilters;
  const fetchResponse = await window.ApiService.get(sectionName);

  // ❌ Bad
  const pc = document.querySelector('#pageContent');
  const filters = window.AdminState.activeFilters;
  const res = await window.ApiService.get(sectionName);
  ```

#### Function Parameters
- **Rule**: Use descriptive, full-word names that indicate the parameter's purpose.
- **Examples**:
  ```javascript
  // ✅ Good
  function renderTable(dataItems, paginationOffset, shouldAppend) {
    // ...
  }

  function formatDateTime(dateString) {
    // ...
  }

  // ❌ Bad
  function renderTable(items, offset, append) {
    // ...
  }

  function formatDateTime(ds) {
    // ...
  }
  ```

#### Function/Method Names
- **Rule**: Use descriptive verb-noun combinations. Be specific about what the function does.
- **Examples**:
  ```javascript
  // ✅ Good
  function loadChunk(shouldAppend) { }
  function attachChipRemovalHandlers(containerElement) { }
  function ensureOffcanvas() { }
  function formatTimestamp(timestampValue) { }

  // ❌ Bad
  function load(a) { }
  function attach(container) { }
  function ensure() { }
  function format(ts) { }
  ```

### 2. Comments Before Each and Every Line

#### Rule
Every line of executable code must have a comment preceding it that explains what the line does.

#### Format
- Comments should be on the line immediately before the code they describe.
- Use single-line comments (`//`) for line-by-line explanations.
- Comments should be concise but descriptive.
- **NO DOUBLE OR TRIPLE COMMENTS**: Only one comment line per code line. If multiple thoughts are needed, combine them into a single comment.

#### Examples

```javascript
// ✅ Good - Every line has a preceding comment
function calculateTotalPrice(itemPrice, itemQuantity) {
  // Get the base price from the item
  const basePrice = itemPrice;
  // Get the quantity of items
  const quantity = itemQuantity;
  // Calculate the total by multiplying price and quantity
  const totalPrice = basePrice * quantity;
  // Return the calculated total
  return totalPrice;
}
```

```javascript
// ✅ Good - Complex logic with detailed comments
async function fetchUserData(userId) {
  // Construct the API endpoint URL with the user ID
  const apiEndpointUrl = `https://api.example.com/users/${userId}`;
  // Fetch user data from the API with no cache
  const fetchResponse = await window.ApiService._fetchWithTimeout(apiEndpointUrl, { cache: 'no-store' });
  // Parse the JSON response
  const userData = await fetchResponse.json();
  // Return the parsed user data
  return userData;
}
```

```javascript
// ✅ Good - Conditional logic with comments
if (activeFilters.length > 0) {
  // Apply filters to the data array
  filteredData = dataArray.filter(dataItem => {
    // Check if the item matches all active filters
    return activeFilters.every(filter => {
      // Return true if the item matches the current filter
      return dataItem[filter.key] === filter.value;
    });
  });
} else {
  // If no filters are active, use the original data array
  filteredData = dataArray;
}
```

#### Exceptions
- **JSDoc comments**: Function-level documentation can be above the function declaration.
- **Block comments**: For multi-line explanations, use block comments above the code block.
- **Self-explanatory code**: Extremely simple operations (like `return value;`) still need comments, but they can be brief.

### 3. Line Breaks and Spacing (Industry Standard)

#### Between Functions
- **Rule**: Always include one blank line between function declarations.
- **Example**:
  ```javascript
  function firstFunction() {
    // Function body
  }

  function secondFunction() {
    // Function body
  }
  ```

#### Between Logical Sections
- **Rule**: Use blank lines to separate logical sections within a function.
- **Example**:
  ```javascript
  function processData(dataArray) {
    // Validate input data
    if (!Array.isArray(dataArray)) {
      throw new Error('Data must be an array');
    }

    // Filter the data
    const filteredData = dataArray.filter(item => item.active);

    // Transform the data
    const transformedData = filteredData.map(item => ({
      id: item.id,
      name: item.name.toUpperCase()
    }));

    // Return the processed data
    return transformedData;
  }
  ```

#### Between Variable Declarations and Code
- **Rule**: Use a blank line between variable declarations and the code that uses them (if the block is substantial).
- **Example**:
  ```javascript
  function renderTable(dataItems) {
    // Get the container element
    const tableContainer = document.querySelector('#tableContainer');
    // Initialize an empty string for HTML
    let tableHtml = '';

    // Generate table rows
    dataItems.forEach(item => {
      tableHtml += `<tr><td>${item.name}</td></tr>`;
    });

    // Set the container's inner HTML
    tableContainer.innerHTML = tableHtml;
  }
  ```

#### Between Import/Require Statements
- **Rule**: Group imports logically with blank lines between groups.
- **Example**:
  ```javascript
  // Core Node.js modules
  const path = require('path');
  const fs = require('fs');

  // Third-party modules
  const gulp = require('gulp');
  const prettier = require('gulp-prettier');

  // Local modules
  const utils = require('./utils');
  ```

#### In Object Literals
- **Rule**: Use consistent spacing. No blank lines between properties unless grouping related properties.
- **Example**:
  ```javascript
  const configuration = {
    apiUrl: 'https://api.example.com',
    timeout: 5000,
    
    retryOptions: {
      maxAttempts: 3,
      delay: 1000
    }
  };
  ```

---

## HTML Coding Standards

### 1. File Structure Comments

#### Page Header Comment
Every HTML file should start with a comment block describing the page's purpose:

```html
<!--
  Page Name
  Brief description of what this page does and its main functionality
-->
```

#### Example:
```html
<!--
  Products Page
  Displays product catalog with filtering, pagination, and management capabilities
-->
<!doctype html>
```

### 2. Section Comments

#### Document Head Section
Comment the `<head>` section and its contents:

```html
<!-- Document head section -->
<head>
  <!-- Character encoding declaration -->
  <meta charset="utf-8"/>
  <!-- Viewport meta tag for responsive design -->
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <!-- Page title displayed in browser tab -->
  <title>Products</title>
  <!-- Bootstrap CSS framework from CDN -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
```

#### Document Body Section
Comment major structural elements:

```html
<!-- Document body with section identifier -->
<body data-section="products">
  <!-- Main application shell container -->
  <div class="app-shell">
    <!-- Sidebar navigation container -->
    <aside class="app-sidebar">
      <!-- Sidebar header with logo and title -->
      <div class="d-flex align-items-center gap-2 mb-3">
        <div class="logo-dot"></div>
        <strong>Admin</strong>
      </div>
      <!-- Sidebar navigation menu (populated by JavaScript) -->
      <nav id="sidebarNav" class="nav flex-column gap-1"></nav>
    </aside>
    <!-- Main content area -->
    <main class="app-main">
      <!-- Page header with title and action buttons -->
      <div class="d-flex align-items-center justify-content-between mb-3">
        <!-- Page title (updated by JavaScript) -->
        <h1 id="pageTitle" class="app-title h4 mb-0">Products</h1>
        <!-- Action buttons container -->
        <div class="d-flex gap-2">
          <!-- Filter button - opens filter offcanvas panel -->
          <button id="filterBtn" class="btn btn-outline-primary btn-sm">Filter</button>
        </div>
      </div>
      <!-- Page content container (populated by JavaScript) -->
      <div id="pageContent" class="page-content"></div>
    </main>
  </div>
</body>
```

### 3. Script Loading Comments

Group and comment script tags by their purpose:

```html
<!-- Bootstrap JavaScript bundle from CDN -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<!-- Core JavaScript modules -->
<!-- Utility functions -->
<script src="../../assets/js/core/utils.js"></script>
<!-- State management -->
<script src="../../assets/js/core/state.js"></script>
<!-- Services -->
<!-- API service for data fetching -->
<script src="../../assets/js/services/api-service.js"></script>
<!-- UI Components -->
<!-- Sidebar navigation component -->
<script src="../../assets/js/ui/sidebar.js"></script>
<!-- Main -->
<!-- Main admin panel orchestrator -->
<script src="../../assets/js/admin.js"></script>
<!-- Page-specific -->
<!-- Page-specific JavaScript logic -->
<script src="./script.js"></script>
```

### 4. Inline Element Comments

For complex inline elements or those with special behavior, add comments:

```html
<!-- Reset filters button - appears when filters are active -->
<button id="resetFiltersBtn" class="btn btn-outline-secondary btn-sm" style="display: none;">
  <i class="bi bi-x-circle"></i> Reset
</button>
```

### 5. HTML Comment Guidelines

- **Purpose**: Explain the "why" and "what", not just the "what".
- **Format**: Use HTML comments (`<!-- -->`) for all HTML documentation.
- **Placement**: Place comments immediately before the element they describe.
- **Clarity**: Be concise but descriptive. Explain non-obvious behavior or important context.
- **NO DOUBLE OR TRIPLE COMMENTS**: Only one comment per element. If multiple thoughts are needed, combine them into a single comment separated by periods or semicolons.

---

## CSS Coding Standards

### 1. Comment Structure

#### File Header
```css
/**
 * Main Stylesheet
 * Global styles for the admin panel application
 */
```

#### Section Comments
```css
/* ========================================
   Sidebar Styles
   ======================================== */

/* Sidebar container */
.app-sidebar {
  /* Styles */
}

/* Sidebar navigation links */
.app-sidebar .nav-link {
  /* Styles */
}
```

#### Property Group Comments
```css
.button-primary {
  /* Color properties */
  background-color: var(--bs-primary);
  color: white;
  
  /* Spacing properties */
  padding: 0.5rem 1rem;
  margin: 0.25rem;
  
  /* Border properties */
  border: none;
  border-radius: 0.25rem;
}
```

---

## Running the Formatter

### Prerequisites

1. **Node.js**: Ensure Node.js (v14 or higher) is installed.
2. **npm**: npm comes with Node.js.

### One-Click Formatting (Windows)

1. **Double-click** `format.bat` in the `formatting` folder.
2. The script will:
   - Install dependencies (if needed)
   - Create a backup of all files
   - Format all JavaScript, HTML, CSS, and JSON files
   - Display completion message

### Manual Formatting

#### First Time Setup

```bash
# Navigate to formatting directory
cd formatting

# Install dependencies
npm install
```

#### Run Formatter

```bash
# Format all files (with backup)
npm run format

# Check formatting without modifying files
npm run format:check
```

### What Gets Formatted

- **JavaScript**: All `.js` files in `assets/js/` and `page/**/`
- **HTML**: All `.html` files in `page/**/` and root `index.html`
- **CSS**: All `.css` files in `assets/css/` and `page/**/`
- **JSON**: All `.json` files in `page/**/` and root configuration files

### Formatting Rules Applied

- **Indentation**: 2 spaces (no tabs)
- **Line Width**: 100 characters
- **Semicolons**: Always used in JavaScript
- **Quotes**: Double quotes for JavaScript and HTML attributes
- **Line Endings**: LF (Unix-style)
- **Trailing Commas**: None
- **Arrow Parens**: Always include parentheses

---

## Backup System

### Automatic Backups

Every time the formatter runs, it automatically creates a timestamped backup in `formatting/backup/`.

### Backup Structure

```
formatting/
  backup/
    2025-09-12T23-15-30-123Z/
      backup/
        assets/
        page/
        index.html
```

### Restoring from Backup

1. Navigate to `formatting/backup/`
2. Find the timestamped folder for the backup you want
3. Copy the files from `backup/` back to the project root

### Manual Backup

You can also create a backup without formatting:

```bash
cd formatting
npm run backup
```

---

## Best Practices

1. **Always run formatter before committing**: Ensures consistent code style.
2. **Review formatted changes**: Check the diff to ensure formatting didn't break anything.
3. **Use backups**: If something goes wrong, restore from the automatic backup.
4. **Follow comment guidelines**: Even after formatting, ensure all comments are present and accurate.
5. **Test after formatting**: Run the application to ensure everything still works.

---

## Troubleshooting

### Formatter Not Running

- **Check Node.js**: Run `node --version` to ensure Node.js is installed.
- **Reinstall dependencies**: Delete `node_modules` and run `npm install` again.
- **Check paths**: Ensure you're running from the `formatting` directory.

### Files Not Being Formatted

- **Check file extensions**: Only `.js`, `.html`, `.css`, and `.json` files are formatted.
- **Check file paths**: Ensure files are in the expected directories.
- **Check permissions**: Ensure you have write permissions to the files.

### Backup Not Created

- **Check disk space**: Ensure there's enough space for backups.
- **Check permissions**: Ensure write permissions to the `backup` folder.
- **Check logs**: Review any error messages in the console.

---

## Additional Resources

- [Prettier Documentation](https://prettier.io/docs/en/)
- [Gulp Documentation](https://gulpjs.com/docs/en/getting-started/quick-start)
- [JavaScript Style Guide](https://github.com/airbnb/javascript)

