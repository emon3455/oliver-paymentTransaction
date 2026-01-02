# Fansocial Admin Panel

Admin panel for managing the Fansocial platform with modular page structure, API integration, and comprehensive filtering capabilities.

## Important: For AI Assistants

**When working on this project, you MUST:**

1. **Read and follow the formatting guides** - See [Code Formatting Guide](./formatting/FORMATTING_INSTRUCTIONS.md) for:
   - Descriptive variable/constant names (no abbreviations)
   - Comments before every line of code
   - HTML commenting standards
   - NO double or triple comments (single comment per line only)
   - Industry-standard line breaks and spacing

2. **Understand the project architecture** - Read these guides before making changes:
   - [How to Add a New Page](./GUIDE_ADDING_NEW_PAGE.md) - Project structure and patterns
   - [API Configuration Guide](./API_CONFIG_QUICK_REFERENCE.md) - API integration approach
   - [JavaScript Architecture](./assets/js/README.md) - Code organization and patterns

3. **Match existing code style** - When coding:
   - Use the same patterns as existing code (see examples in `page/*/script.js`)
   - Follow the `waitForAdminShell()` pattern for page scripts
   - Use `window.AdminUtils.spinner()` instead of custom spinners
   - Use `window.ApiService` (not `window.DataService`)
   - Include API config script tag in all page HTML files

4. **Maintain consistency** - Ensure all code follows:
   - The same commenting style (one comment per line, descriptive)
   - The same variable naming conventions (descriptive, no abbreviations)
   - The same file structure (index.html, script.js, style.css, data.json)
   - The same event-driven patterns (custom events, not polling)

## Documentation Index

### Getting Started
- **[How to Add a New Page](./GUIDE_ADDING_NEW_PAGE.md)** - Complete guide for creating new pages with templates and examples

### API Integration
- **[API Configuration Quick Reference](./API_CONFIG_QUICK_REFERENCE.md)** - How to configure API endpoints per page and environment

### Code Standards
- **[Code Formatting Instructions](./formatting/FORMATTING_INSTRUCTIONS.md)** - Complete coding standards, commenting rules, and formatting guidelines
- **[Formatter Quick Start](./formatting/README.md)** - How to run the code formatter

### Architecture
- **[JavaScript Architecture](./assets/js/README.md)** - Module structure, loading order, and component documentation

## Project Structure

```
fansocial-admin/
├── assets/
│   ├── css/
│   │   └── main.css              # Global styles
│   └── js/
│       ├── core/                 # Core functionality
│       │   ├── utils.js          # Utility functions
│       │   ├── state.js          # State management
│       │   └── config.js         # Configuration
│       ├── services/
│       │   └── api-service.js   # API/data fetching
│       ├── ui/                   # UI components
│       │   ├── sidebar.js
│       │   ├── env-selector.js
│       │   ├── filter-panel.js
│       │   ├── modal-viewer.js
│       │   └── notes-panel.js
│       ├── admin.js              # Main orchestrator
│       └── README.md             # JS architecture docs
│
├── page/                          # Page-specific files
│   ├── {slug}/
│   │   ├── index.html            # Page HTML (with API config)
│   │   ├── script.js             # Page logic (waitForAdminShell pattern)
│   │   ├── style.css             # Page styles
│   │   └── data.json             # Dummy data (when no API)
│   └── developer/                # Developer tools pages
│
├── formatting/                    # Code formatting tools
│   ├── format.bat                # One-click formatter
│   ├── FORMATTING_INSTRUCTIONS.md
│   └── README.md
│
├── GUIDE_ADDING_NEW_PAGE.md      # Page creation guide
├── API_CONFIG_QUICK_REFERENCE.md # API integration guide
└── index.html                     # Root redirect
```

## Key Patterns

### Page Script Pattern
All page scripts use the `waitForAdminShell()` pattern:
```javascript
(function () {
  function waitForAdminShell() {
    return new Promise((resolve) => {
      if (window.AdminShell && window.AdminShell.pageContent) {
        resolve();
      } else {
        document.body.addEventListener("adminshell:ready", resolve, { once: true });
      }
    });
  }

  waitForAdminShell().then(() => {
    const { pageContent, renderChips } = window.AdminShell;
    const { spinner } = window.AdminUtils;
    // Your code here
  });
})();
```

### API Configuration
Every page HTML must include:
```html
<script type="application/json" id="api-config">
{
  "section-name": {
    "prod": { "endpoint": "" },
    "stage": { "endpoint": "" },
    "dev": { "endpoint": "" }
  }
}
</script>
```

### Filtering
- **With real endpoints**: Filters sent in POST payload, backend handles filtering
- **With dummy data**: Client-side filtering after loading all data
- Reset button appears automatically when filters are active

## Development Workflow

1. **Create new page**: Follow [GUIDE_ADDING_NEW_PAGE.md](./GUIDE_ADDING_NEW_PAGE.md)
2. **Format code**: Run `formatting/format.bat` or `npm run format` in formatting folder
3. **Test**: Ensure page loads, filters work, API config is present
4. **Review**: Check code follows formatting standards

## Notes

- All pages require the API config script tag (no fallback)
- Notes are static HTML in `index.html`, not JavaScript-rendered
- Developer pages are under `page/developer/` with adjusted asset paths (`../../../assets/`)
- Data files are single `data.json` per page (not environment-specific files)
- Server-side filtering is automatic when endpoints are configured

