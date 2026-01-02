# Tabs Implementation Audit

## Current Status

### ✅ Reusable Component Exists
- **Location**: `assets/js/ui/tabs.js`
- **API**: `window.Tabs` with methods:
  - `Tabs.init()` - Auto-initializes tabs with data attributes
  - `Tabs.create(config)` - Generates tab HTML from config object
  - `Tabs.activate(tabId)` - Programmatically activate a tab

### ❌ Component Not Being Used
- **Only 1 page loads it**: `page/developer/edge-tests-moderation/index.html`
- **All other pages**: Implement tabs manually with duplicated code

## Implementation Patterns Found

### 1. Moderation Page (`page/moderation/script.js`)
**Pattern**: Manual HTML generation + Manual event handlers

```javascript
// Manual HTML generation (lines 227-261)
function renderTabsHtml() {
  return `
    <ul class="nav nav-tabs mb-3" role="tablist" data-tabs-container="status-tabs">
      <li class="nav-item" role="presentation">
        <button class="nav-link ${isActive("all")}" id="tab-all">All (${tabCounts.all})</button>
      </li>
      // ... more tabs
    </ul>
  `;
}

// Manual event handlers (lines 266-308)
function attachTabHandlers() {
  const allBtn = document.getElementById("tab-all");
  allBtn.addEventListener("click", () => setStatusAndRender("all"));
  // ... more handlers
}
```

**Issues**:
- ❌ Duplicates tab HTML structure
- ❌ Manual event handler attachment
- ❌ Not using reusable component
- ✅ Uses `data-tabs-container` attribute (compatible with tabs.js)

### 2. Edge Tests Moderation (`page/developer/edge-tests-moderation/script.js`)
**Pattern**: Uses tabs.js BUT also has manual fallback handlers

```javascript
// Uses tabs.js (lines 911-912)
if (window.Tabs && typeof window.Tabs.init === 'function') {
  window.Tabs.init();
}

// BUT ALSO has manual handlers (lines 916-948)
const tabButtons = document.querySelectorAll('[data-tab-target]');
tabButtons.forEach((button) => {
  // Manual click handler logic
});
```

**Issues**:
- ⚠️ Redundant - both tabs.js AND manual handlers
- ❌ Duplicates tab switching logic
- ✅ Loads tabs.js component

### 3. Other Pages
- Most pages don't use tabs at all
- No consistent pattern for pages that might need tabs

## Problems Identified

### 1. **Component Not Loaded**
- `tabs.js` exists but is only loaded in 1 page
- Should be loaded in all pages (like other UI components)

### 2. **Code Duplication**
- Tab HTML generation duplicated across pages
- Event handler logic duplicated
- Active state management duplicated

### 3. **Inconsistent Implementation**
- Some pages use `data-tabs-container` (compatible)
- Some pages don't use tabs.js at all
- No standard way to create tabs

### 4. **Missing Features**
- Tab counts (e.g., "All (5)") need manual implementation
- Dynamic tab updates require manual DOM manipulation
- No standard way to refresh tab labels

## Recommendations

### ✅ Option 1: Use Existing Component (Recommended)
1. **Load tabs.js in all pages** (add to standard HTML template)
2. **Use `Tabs.create()` for HTML generation** instead of manual HTML
3. **Use data attributes** (`data-tab-target`, `data-tab-click`) for handlers
4. **Enhance tabs.js** to support:
   - Dynamic counts in labels
   - Tab label updates
   - Custom active state logic

### ✅ Option 2: Enhance Component
Add to `tabs.js`:
```javascript
// Support for counts in labels
Tabs.create({
  containerId: "status-tabs",
  tabs: [
    { 
      id: "tab-all", 
      label: "All", 
      count: 5,  // ← Add count support
      targetId: "pane-all",
      onClick: "handleTabClick"
    }
  ]
});

// Support for updating counts
Tabs.updateCount("tab-all", 10); // Updates "All (10)"
```

### ✅ Option 3: Standardize Pattern
Create a helper in moderation script:
```javascript
function createStatusTabs(tabCounts) {
  return window.Tabs.create({
    containerId: "status-tabs",
    tabs: [
      { id: "tab-all", label: "All", count: tabCounts.all, targetId: "pane-all", onClick: "handleStatusTabClick" },
      { id: "tab-pending", label: "Pending", count: tabCounts.pending, targetId: "pane-pending", onClick: "handleStatusTabClick" },
      // ...
    ]
  });
}
```

## Action Items

1. **Add tabs.js to standard page template** (all pages should load it)
2. **Refactor moderation page** to use `Tabs.create()` instead of manual HTML
3. **Enhance tabs.js** to support:
   - Counts in labels: `{ label: "All", count: 5 }` → "All (5)"
   - Label updates: `Tabs.updateLabel(tabId, newLabel)`
   - Count updates: `Tabs.updateCount(tabId, newCount)`
4. **Remove duplicate code** from edge-tests-moderation (use tabs.js only)
5. **Document usage** in component or guide

## Benefits of Standardization

- ✅ **Consistency**: All pages use same tab implementation
- ✅ **Maintainability**: Fix bugs in one place
- ✅ **Features**: Easy to add new tab features (animations, keyboard nav, etc.)
- ✅ **Less Code**: Remove ~50-100 lines per page
- ✅ **Reusability**: Easy to add tabs to new pages

