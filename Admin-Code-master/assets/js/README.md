# Admin Panel JavaScript Structure

## Directory Structure

```
assets/js/
├── core/                    # Core functionality
│   ├── utils.js            # Utility functions (querySelector, base path, etc.)
│   ├── state.js            # State management (filters, environment)
│   └── config.js           # Configuration data (sidebar, filters, notes)
│
├── services/                # Data services
│   └── api-service.js      # API/data fetching service
│
├── ui/                      # UI components
│   ├── sidebar.js          # Sidebar navigation
│   ├── env-selector.js     # Environment selector (prod/stage/dev)
│   ├── filter-panel.js     # Filter UI and logic
│   ├── modal-viewer.js     # JSON/HTML viewer modal
│   └── notes-panel.js      # Page notes/info panel
│
└── admin.js                # Main orchestrator (initializes everything)
```

## Loading Order

Scripts must be loaded in this order:

1. **core/utils.js** - Utility functions
2. **core/state.js** - State management
3. **core/config.js** - Configuration
4. **services/api-service.js** - Data service
5. **ui/** components (any order)
6. **admin.js** - Main initializer

## Module Descriptions

### Core Modules

#### `core/utils.js`
- `AdminUtils.$()` - Query selector shorthand
- `AdminUtils.ensureEl()` - Element validation
- `AdminUtils.getBasePath()` - URL base path detection
- `AdminUtils.spinner()` - Full-page loading spinner
- `AdminUtils.spinnerInline()` - Inline loading spinner
- `AdminUtils.spinnerSmall()` - Small loading spinner
- `AdminUtils.errorMessage()` - Display error messages

#### `core/state.js`
- `StateManager.getSection()` - Get current section
- `StateManager.getFilters()` - Get filters for section
- `StateManager.setFilters()` - Set filters for section
- `StateManager.getEnv()` / `setEnv()` - Environment management

#### `core/config.js`
- `window.AdminConfig` - Central configuration object
  - `sidebar` - Navigation items
  - `filters` - Filter definitions per section
  - `notes` - Page notes/info

### Services

#### `services/api-service.js`
- `ApiService.get(section, options)` - Main data fetching method
- `PayloadBuilders` - Builds request payloads per section
- Supports local JSON files or remote API endpoints

### UI Components

#### `ui/sidebar.js`
- `Sidebar.init()` - Initialize sidebar
- `Sidebar.render()` - Render navigation links

#### `ui/env-selector.js`
- `EnvSelector.init()` - Initialize environment selector
- Handles environment switching

#### `ui/filter-panel.js`
- `FilterPanel.init()` - Initialize filter panel
- `FilterPanel.render()` - Render filter form
- `FilterPanel.getValues()` - Get filter values
- `FilterPanel.reset()` - Reset filters

#### `ui/modal-viewer.js`
- `ModalViewer.init()` - Initialize modal
- Handles `[data-view-json]` and `[data-view-html]` attributes

#### `ui/notes-panel.js`
- `NotesPanel.render()` - Render page notes (DEPRECATED - use static HTML instead)

### Main

#### `admin.js`
- Initializes all components
- Exposes `window.AdminShell` API for page-specific scripts
- Provides `renderChips()` helper function
- Dispatches `adminshell:ready` event when fully initialized
- Manages reset filters button visibility

## Usage in HTML

```html
<!-- Core -->
<script src="../../assets/js/core/utils.js"></script>
<script src="../../assets/js/core/state.js"></script>
<script src="../../assets/js/core/config.js"></script>

<!-- Services -->
<script src="../../assets/js/services/api-service.js"></script>

<!-- UI Components -->
<script src="../../assets/js/ui/sidebar.js"></script>
<script src="../../assets/js/ui/env-selector.js"></script>
<script src="../../assets/js/ui/filter-panel.js"></script>
<script src="../../assets/js/ui/modal-viewer.js"></script>
<script src="../../assets/js/ui/notes-panel.js"></script>

<!-- Main -->
<script src="../../assets/js/admin.js"></script>

<!-- Page-specific -->
<script src="./script.js"></script>
```

## Page Script Pattern

All page-specific scripts should use the `waitForAdminShell()` pattern:

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
    // Your page logic here
    const { pageContent, renderChips } = window.AdminShell;
    const { spinner } = window.AdminUtils;
    // ...
  });
})();
```

## Backward Compatibility

- `window.DataService` is aliased to `window.ApiService` for backward compatibility
- All existing page scripts should continue to work, but new pages should use the `waitForAdminShell()` pattern

