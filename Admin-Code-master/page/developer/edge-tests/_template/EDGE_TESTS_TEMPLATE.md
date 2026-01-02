# Edge Tests Template - AI Documentation

## Overview
This document explains how to create and wire up edge test pages for different classes in the Admin Code system.

## File Structure
Each edge test page consists of three files in its own folder:
- `index.html` - HTML structure and API configuration
- `style.css` - Page-specific styles (can be minimal, uses shared styles)
- `script.js` - Test scenarios and API integration logic

## Shared Resources
- **Shared CSS**: `page/developer/edge-tests/_shared/edge-tests-shared.css` - Contains all common styles
- **Base Template**: `page/developer/edge-tests-demo/` - Reference implementation

## Key Components

### 1. HTML Structure (index.html)
- Standard Bootstrap 5.3.3 setup
- API configuration in `<script type="application/json" id="api-config">`
- Links to shared CSS: `../../../edge-tests/_shared/edge-tests-shared.css`
- Links to page-specific CSS: `./style.css`
- Includes `apiHandler.js` for all API requests

### 2. API Configuration
Each page needs API config for:
- `developer/edge-tests-{classname}` - Page route config
- `{classname}` - Actual API endpoint config

Example:
```json
{
  "developer/edge-tests-products": {
    "dev": { "endpoint": "" }
  },
  "products": {
    "dev": { "endpoint": "http://localhost:3000/products" }
  }
}
```

### 3. JavaScript Structure (script.js)
- Wait for AdminShell ready
- Get base URL from API config
- Create test scenario sections with:
  - Input fields (user ID, select dropdowns, etc.)
  - API endpoint information
  - Code usage examples
  - Verification checklists
- Use APIHandler for all API requests
- **CRITICAL**: All POST/PUT requests MUST include `testing: true`

### 4. Test Scenario Function
```javascript
createTestScenarioSection(
  scenarioId,        // Unique ID
  title,            // Scenario title
  description,      // What this test does
  apiMethod,        // GET, POST, PUT, DELETE
  apiEndpoint,      // API path (e.g., "/products/create")
  requestPayload,   // Request body (null for GET)
  checklistItems,   // Array of verification steps
  inputFields       // Array of input field configs
)
```

### 5. Input Fields
Input fields are defined as:
```javascript
[
  {
    type: 'text',
    id: 'userId',
    label: 'User ID',
    placeholder: 'Enter user ID',
    value: ''
  },
  {
    type: 'select',
    id: 'status',
    label: 'Status',
    options: [
      { value: '', text: 'Select...' },
      { value: 'active', text: 'Active' }
    ]
  }
]
```

## Creating a New Edge Test Page

### Step 1: Create Folder
Create folder: `page/developer/edge-tests-{classname}/`

### Step 2: Copy Template Files
1. Copy `index.html` from demo, update:
   - Title: `Edge Tests - {ClassName} Class`
   - `data-section`: `developer/edge-tests-{classname}`
   - API config keys: `developer/edge-tests-{classname}` and `{classname}`

2. Copy `style.css` from demo (or leave minimal if using shared styles)

3. Copy `script.js` from demo, update:
   - Class name in comments
   - API endpoint paths
   - Test scenarios specific to the class
   - getBaseUrl() to read correct config key

### Step 3: Customize Test Scenarios
Update the `render()` function to include class-specific scenarios:
- Create operations
- Read/Get operations
- Update operations
- Delete operations
- Count operations
- Custom operations specific to the class

### Step 4: Add Input Fields
For scenarios that need user input:
- Add inputFields array to createTestScenarioSection()
- Input values are automatically collected and included in API requests
- For GET: added to queryParams
- For POST/PUT: merged into requestData

## Important Rules

1. **Testing Parameter**: Always include `testing: true` in POST/PUT requests
2. **APIHandler**: Use APIHandler class for all API requests
3. **Font Consistency**: All fonts use `inherit` (no monospace)
4. **Border Radius**: All border-radius set to `0`
5. **Shared Styles**: Use shared CSS file to avoid duplication

## API Handler Usage

```javascript
const apiHandler = new APIHandler();

const apiParams = {
  apiBaseUrl: fullUrl,
  queryParams: {}, // For GET requests
  httpMethod: 'POST',
  requestData: { ...payload, testing: true }, // MUST include testing: true
  responseCallback: (data) => {
    // Handle response
  }
};

await apiHandler.handleRequest(apiParams);
```

## Checklist for New Page

- [ ] Folder created: `edge-tests-{classname}/`
- [ ] `index.html` created with correct title and API config
- [ ] `style.css` created (can be minimal)
- [ ] `script.js` created with class-specific scenarios
- [ ] API endpoints configured in api-config
- [ ] Test scenarios include appropriate input fields
- [ ] All POST/PUT requests include `testing: true`
- [ ] Verification checklists added
- [ ] Cleanup method implemented (if needed)

## Classes to Create

1. products
2. orders
3. cart
4. wishlist
5. coupon
6. subscriptions
7. transactions
8. gateway-1 (or gateway1)
9. gateway-2 (or gateway2)
10. moderations
11. referrals
12. users
13. media

