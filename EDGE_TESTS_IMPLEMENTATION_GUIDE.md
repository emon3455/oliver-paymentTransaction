# Transaction Edge Tests - Implementation Guide

## Status

✅ **HTML Structure Already Exists** at:
`Admin-Code-master/page/developer/edge-tests-transactions/`

Files present:
- `index.html` - Main HTML page with Bootstrap and Admin framework
- `script.js` - JavaScript logic (currently has products template)
- `style.css` - Custom styles

## What Needs to Be Done

### 1. Update `script.js` with Transaction-Specific Tests

Replace the products scenarios with transaction scenarios matching all 141 Jest tests:

#### CREATE Transaction Tests (12 scenarios)
```javascript
// Minimal transaction (required fields only)
{
  order_id: "order_TEST_001",
  amount: 10000,
  order_type: "product",
  customer_uid: "cust_test_001",
  status: "pending",
  direction: "purchase"
}

// Transaction with full metadata
{
  order_id: "order_TEST_002",
  amount: 15000,
  meta: {
    subscription_id: "sub_123",
    billing_cycle: "monthly",
    promo_code: "SAVE20"
  },
  owners: ["owner_A", "owner_B"],
  owner_allocations: [
    { owner_uuid: "owner_A", amount_cents: 9000 },
    { owner_uuid: "owner_B", amount_cents: 6000 }
  ],
  products: [
    { product_id: "prod_001", name: "Widget", price: 15000 }
  ]
}

// FAIL scenarios:
- Missing order_id (should return 400)
- Missing amount (should return 400)
- Invalid direction value (should return 400)
- Meta exceeds 1MB limit (should return 400)
- Invalid meta key pattern (should return 400)
```

#### READ Transaction Tests (4 scenarios)
```javascript
// Get by transaction_id
GET /transactions/{transaction_id}

// FAIL scenarios:
- Missing transaction_id (should return 400)
- Invalid transaction_id format (should return 400)
- Non-existent transaction (should return 404)
```

#### UPDATE Transaction Tests (10 scenarios)
```javascript
// Update status only
PUT /transactions/{transaction_id}
{
  status: "completed"
}

// Update with metadata
{
  meta: { updated_field: "new_value" },
  refund_amount: 5000,
  refund_reason: "Customer request"
}

// FAIL scenarios:
- Missing transaction_id (should return 400)
- No updatable fields provided (should return 400)
- Meta exceeds size limit (should return 400)
- Attempt to update non-allowed field (should return 400)
```

#### DELETE Transaction Tests (4 scenarios)
```javascript
// Soft delete
DELETE /transactions/{transaction_id}

// Should set:
// - is_deleted = true
// - deleted_at = current timestamp

// FAIL scenarios:
- Missing transaction_id (should return 400)
- Invalid transaction_id (should return 400)
```

#### QUERY/Filter Tests (15 scenarios)
```javascript
// All transactions (no filters)
GET /transactions/query

// Filter by customer_uid
GET /transactions/query?customer_uid=cust_001

// Filter by status
GET /transactions/query?status=completed

// Filter by date range
GET /transactions/query?dateStart=2026-01-01&dateEnd=2026-01-31

// Filter by ownerIds
GET /transactions/query?ownerIds[]=owner_A&ownerIds[]=owner_B

// Multiple filters combined
GET /transactions/query?customer_uid=cust_001&status=completed&dateStart=2026-01-01

// Pagination
GET /transactions/query?limit=20&offset=40

// FAIL scenarios:
- Invalid dateStart format (should return 400)
- dateStart > dateEnd (should return 400)
- SQL injection attempt (should return 400)
```

#### COUNT Tests (5 scenarios)
```javascript
// Get total count
GET /transactions/count

// Get count by status
GET /transactions/count/by-status?status=completed

// FAIL scenarios:
- Missing status parameter (should return 400)
- Invalid status type (should return 400)
```

### 2. Update Index Navigation

Replace products links with transaction test sections:

```javascript
function createIndexNavigation() {
  return `
    <div class="demo-section index-section">
      <h3><i class="bi bi-list-ul"></i> Test Scenarios Index</h3>
      <a href="#create-tests">CREATE Tests (12)</a>
      <a href="#read-tests">READ Tests (4)</a>
      <a href="#update-tests">UPDATE Tests (10)</a>
      <a href="#delete-tests">DELETE Tests (4)</a>
      <a href="#query-tests">QUERY Tests (15)</a>
      <a href="#count-tests">COUNT Tests (5)</a>
      <a href="#cleanup-section">Cleanup</a>
    </div>
  `;
}
```

### 3. API Endpoint Mapping

Map to actual transaction API endpoints:

```javascript
const ENDPOINTS = {
  create: "/api/transactions",                    // POST
  getById: "/api/transactions/{id}",              // GET
  update: "/api/transactions/{id}",               // PUT
  delete: "/api/transactions/{id}",               // DELETE
  query: "/api/transactions/query",               // GET
  count: "/api/transactions/count",               // GET
  countByStatus: "/api/transactions/count/by-status" // GET
};
```

### 4. Test Execution Function

Update `testScenario()` to handle transaction-specific fields:

```javascript
async function testScenario(scenarioId, method, endpoint, payload) {
  // Get input values
  const inputFields = document.querySelectorAll(`#test-scenario-${scenarioId} input, select`);
  const inputValues = {};
  
  // Handle transaction_id in URL
  if (inputValues.transaction_id) {
    endpoint = endpoint.replace('{id}', inputValues.transaction_id);
  }
  
  // Add testing: true for POST/PUT
  if ((method === 'POST' || method === 'PUT') && payload) {
    requestData = { ...payload, ...inputValues, testing: true };
  }
  
  // Execute API call
  const apiHandler = new APIHandler();
  await apiHandler.handleRequest({
    apiBaseUrl: `${baseUrl}${endpoint}`,
    httpMethod: method,
    requestData: requestData,
    responseCallback: (data) => {
      // Display response
      displayResponse(scenarioId, data);
    }
  });
}
```

### 5. Response Display

Show transaction-specific fields:

```javascript
function displayResponse(scenarioId, data) {
  const responseHtml = `
    <div class="alert alert-success">
      <strong>✅ Success</strong>
      <div class="mt-3">
        <strong>Transaction ID:</strong> ${data.transaction_id}<br>
        <strong>Order ID:</strong> ${data.order_id}<br>
        <strong>Amount:</strong> $${(data.amount / 100).toFixed(2)}<br>
        <strong>Status:</strong> ${data.status}<br>
        <strong>Direction:</strong> ${data.direction}<br>
        ${data.meta ? `<strong>Metadata:</strong> <pre>${JSON.stringify(data.meta, null, 2)}</pre>` : ''}
        ${data.owners ? `<strong>Owners:</strong> ${data.owners.join(', ')}<br>` : ''}
      </div>
      <details class="mt-2">
        <summary>Full Response JSON</summary>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      </details>
    </div>
  `;
  document.getElementById(`response-${scenarioId}`).innerHTML = responseHtml;
}
```

### 6. Verification Checklists

Add transaction-specific verification steps:

```javascript
const CREATE_CHECKLIST = [
  "✓ Go to database and verify new transaction record was created",
  "✓ Check that 'order_id' matches input value",
  "✓ Check that 'amount' is stored in cents (multiply by 100)",
  "✓ Verify 'status' field matches input",
  "✓ Check that 'direction' is one of: purchase, refund, payout, adjustment",
  "✓ If meta provided, verify it's stored as JSONB",
  "✓ If owners provided, verify JSON array format",
  "✓ If owner_allocations provided, verify JSON array with owner_uuid and amount_cents",
  "✓ Check timestamp fields (created_at, updated_at)",
  "✓ Verify is_deleted = false",
  "✓ Verify deleted_at is null"
];
```

### 7. Cleanup Function

Update cleanup to delete test transactions:

```javascript
async function cleanupTestData() {
  const cleanupUrl = `${baseUrl}/api/transactions/cleanup`;
  const apiHandler = new APIHandler();
  await apiHandler.handleRequest({
    apiBaseUrl: cleanupUrl,
    httpMethod: "POST",
    requestData: {
      testing: true,
      deleteTestTransactions: true,
      testPrefix: "order_TEST_"
    },
    responseCallback: (data) => {
      console.log("Cleanup successful:", data);
    }
  });
}
```

### 8. Style Updates

Update `style.css` for transaction-specific styling:

```css
/* Transaction status badges */
.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-completed { background-color: #d4edda; color: #155724; }
.status-pending { background-color: #fff3cd; color: #856404; }
.status-failed { background-color: #f8d7da; color: #721c24; }
.status-refunded { background-color: #d1ecf1; color: #0c5460; }

/* Direction badges */
.direction-purchase { color: #28a745; }
.direction-refund { color: #dc3545; }
.direction-payout { color: #007bff; }
.direction-adjustment { color: #6c757d; }

/* Amount display */
.amount-display {
  font-family: 'Courier New', monospace;
  font-weight: bold;
  font-size: 1.1em;
}

/* JSON display */
.json-display {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 12px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  overflow-x: auto;
}
```

## Implementation Priority

1. **Phase 1** - Basic CRUD (Start Here)
   - Create transaction (minimal + full)
   - Get transaction by ID
   - Update transaction
   - Delete transaction (soft delete)

2. **Phase 2** - Query & Filtering
   - Query all transactions
   - Filter by customer_uid
   - Filter by status
   - Filter by date range
   - Pagination

3. **Phase 3** - Advanced Features
   - Count operations
   - Multi-owner transactions
   - Error scenarios (FAIL tests)
   - Cleanup functionality

4. **Phase 4** - Polish
   - Styling improvements
   - Verification checklists
   - Documentation
   - Error handling

## Testing the Page

1. Open in browser: `http://localhost/Admin-Code-master/page/developer/edge-tests-transactions/`
2. Check browser console for errors
3. Verify API config is loaded
4. Test each scenario button
5. Check database after each test
6. Verify cleanup function works

## Current File Status

- ✅ `index.html` - Ready (no changes needed)
- ⚠️ `script.js` - Needs transaction updates (currently has products template)
- ✅ `style.css` - Can add transaction-specific styles

## Next Steps

Would you like me to:
1. **Update the full `script.js`** with all transaction scenarios?
2. **Create specific test scenarios** you want to prioritize?
3. **Add the transaction-specific styles** to `style.css`?
4. **Create mock data file** for testing without backend?

Let me know which approach you prefer!
