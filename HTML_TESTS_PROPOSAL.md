# HTML Edge Tests Proposal

## Proposed Test Structure

Following the `developer/edge-tests-demo` structure, I propose creating the following HTML test pages in:
`Admin-Code-master/page/developer/edge-tests-transactions/`

---

## 1. **CRUD Operations Test Page**
**File**: `edge-tests-transactions/crud.html`

### Test Scenarios:
#### CREATE Tests
- ✅ Create minimal transaction (required fields only)
- ✅ Create transaction with full metadata
- ✅ Create transaction with multiple owners and allocations
- ✅ Create transaction with products array
- ✅ Create refund transaction
- ❌ FAIL: Missing required field (order_id)
- ❌ FAIL: Missing required field (amount)
- ❌ FAIL: Invalid direction value
- ❌ FAIL: Invalid status value
- ❌ FAIL: Meta exceeds size limit (>1MB)
- ❌ FAIL: Owner allocations exceed size limit
- ❌ FAIL: Products exceed size limit

#### READ Tests
- ✅ Get transaction by ID
- ✅ Get transaction with all relations (owners, allocations, products)
- ✅ Get transaction returns null for soft-deleted
- ❌ FAIL: Get with invalid transaction_id
- ❌ FAIL: Get with missing transaction_id
- ❌ FAIL: Get non-existent transaction

#### UPDATE Tests
- ✅ Update status field
- ✅ Update refund_amount and refund_reason
- ✅ Update meta (merge new fields)
- ✅ Update products array
- ✅ Update owner allocations
- ✅ Update multiple fields simultaneously
- ✅ Unset meta with { unset: true }
- ❌ FAIL: Update with invalid transaction_id
- ❌ FAIL: Update non-existent transaction
- ❌ FAIL: Update with no fields provided
- ❌ FAIL: Meta exceeds size limit on update
- ❌ FAIL: Attempt to update non-allowed field (created_at)

#### DELETE Tests
- ✅ Soft delete transaction (sets is_deleted=true, deleted_at)
- ✅ Delete already deleted transaction (no error)
- ❌ FAIL: Delete with invalid transaction_id
- ❌ FAIL: Delete with missing transaction_id
- ❌ FAIL: Delete non-existent transaction

**Features:**
- Live API calls with visual feedback
- Success/failure indicators (✅/❌)
- JSON response display
- Database verification checklist
- Cleanup function to remove test data

---

## 2. **Query & Filtering Test Page**
**File**: `edge-tests-transactions/query-filters.html`

### Test Scenarios:
#### Basic Queries
- ✅ Query all transactions (no filters)
- ✅ Query with pagination (limit, offset)
- ✅ Query returns correct total count
- ✅ Empty result set returns { rows: [], total: 0 }

#### Single Filter Tests
- ✅ Filter by transaction_id (exact match)
- ✅ Filter by customer_uid
- ✅ Filter by order_type (product, subscription, etc.)
- ✅ Filter by status (pending, completed, failed, refunded)
- ✅ Filter by direction (purchase, refund, payout)
- ✅ Filter by ownerIds array (JSON contains @>)
- ✅ Filter by dateStart only (created_at >= date)
- ✅ Filter by dateEnd only (created_at <= date)
- ✅ Filter by date range (dateStart AND dateEnd)

#### Multiple Filter Combinations
- ✅ Customer + Status
- ✅ Customer + Date Range
- ✅ Order Type + Status + Date Range
- ✅ Owner + Status + Date Range
- ✅ All filters combined

#### Pagination Tests
- ✅ Limit capped at MAX_LIMIT (100)
- ✅ Offset below zero normalized to 0
- ✅ Large offset returns empty results
- ✅ Navigate through pages (offset 0, 20, 40, etc.)

#### Edge Cases
- ❌ FAIL: Invalid dateStart format
- ❌ FAIL: Invalid dateEnd format  
- ❌ FAIL: dateStart > dateEnd
- ❌ FAIL: Invalid ownerIds format
- ❌ FAIL: SQL injection attempt in transaction_id

**Features:**
- Interactive filter form with all parameters
- Real-time result count display
- Pagination controls
- Result table with sorting
- Export results as JSON
- Clear all filters button

---

## 3. **Count Operations Test Page**
**File**: `edge-tests-transactions/count-operations.html`

### Test Scenarios:
#### getAllCount Tests
- ✅ Get total count of all transactions
- ✅ Count excludes soft-deleted transactions
- ✅ Count returns 0 when no transactions exist
- ❌ FAIL: Database query error handling

#### getAllCountByStatus Tests
- ✅ Count by status: "pending"
- ✅ Count by status: "completed"
- ✅ Count by status: "failed"
- ✅ Count by status: "refunded"
- ✅ Status normalized to lowercase
- ✅ Count returns 0 for status with no matches
- ❌ FAIL: Missing status parameter
- ❌ FAIL: Invalid status type (not string)
- ❌ FAIL: Database query error handling

**Features:**
- Count summary dashboard
- Status breakdown pie chart
- Refresh counts button
- Historical count comparison
- Visual indicators for counts

---

## 4. **Advanced Scenarios Test Page**
**File**: `edge-tests-transactions/advanced-scenarios.html`

### Test Scenarios:
#### Complex Transactions
- ✅ Transaction with max-length meta (near 1MB limit)
- ✅ Transaction with 10+ owner allocations
- ✅ Transaction with 20+ products
- ✅ Transaction with deeply nested meta objects
- ✅ Transaction with special characters in fields
- ✅ Transaction with null values in optional fields

#### Bulk Operations
- ✅ Create 100 transactions in sequence
- ✅ Query large result set (>100 records)
- ✅ Update multiple transactions in sequence
- ✅ Delete multiple transactions in sequence

#### Error Scenarios
- ❌ Network timeout simulation
- ❌ Database connection failure
- ❌ Invalid JSON in request
- ❌ Malformed API response
- ❌ Circular reference in meta object

#### Performance Tests
- ⏱️ Measure create transaction latency
- ⏱️ Measure query with filters latency
- ⏱️ Measure update transaction latency
- ⏱️ Measure bulk operation throughput

**Features:**
- Performance metrics display
- Progress indicators for bulk operations
- Error log viewer
- Load testing controls
- Response time graph

---

## 5. **Connection & Lifecycle Test Page**
**File**: `edge-tests-transactions/connection-lifecycle.html`

### Test Scenarios:
#### Connection Management
- ✅ Initialize connection pool
- ✅ Close all connections
- ✅ Reconnect after close
- ❌ FAIL: Close connections when already closed
- ❌ FAIL: Operation after connections closed

#### Transaction Lifecycle
- ✅ Create → Read → Update → Delete cycle
- ✅ Transaction state transitions (pending → completed)
- ✅ Refund flow (completed → refunded with amount)
- ✅ Dispute flow (add dispute_id to completed transaction)

#### Cleanup Operations
- ✅ Delete all test transactions
- ✅ Reset database state
- ✅ Verify cleanup completed
- ✅ Re-initialize test data

**Features:**
- Connection status indicator
- Lifecycle flow diagram
- State transition visualizer
- Cleanup confirmation dialog
- Test data reset button

---

## File Structure

```
Admin-Code-master/
└── page/
    └── developer/
        └── edge-tests-transactions/
            ├── index.html                    (Navigation page - lists all tests)
            ├── crud.html                     (CRUD operations)
            ├── query-filters.html            (Query & filtering)
            ├── count-operations.html         (Count methods)
            ├── advanced-scenarios.html       (Complex scenarios)
            ├── connection-lifecycle.html     (Connection & lifecycle)
            ├── script.js                     (Shared utilities)
            └── style.css                     (Shared styles)
```

---

## Common Features Across All Pages

### Header Section
- Page title and description
- Environment selector (dev/stage/prod)
- API endpoint configuration
- Global error display

### Test Execution
- Run all tests button
- Run individual test button
- Pause/resume execution
- Stop all tests button

### Results Display
- Pass/fail indicators (✅/❌)
- Test duration timing
- Request/response viewer
- Error details expansion
- JSON pretty-print

### Utilities
- Copy request as cURL
- Download results as JSON
- Share test results (URL with params)
- Export to CSV
- Print test report

### Verification
- Database query examples
- Expected vs actual comparison
- Manual verification checklist
- SQL queries for validation

---

## API Configuration Template

Each page will include:
```javascript
{
  "developer/edge-tests-transactions": {
    "dev": {
      "endpoint": "http://localhost:3000/api/transactions",
      "apiKey": "test_key_12345"
    },
    "stage": {
      "endpoint": "https://stage-api.example.com/api/transactions",
      "apiKey": ""
    },
    "prod": {
      "endpoint": "https://api.example.com/api/transactions",
      "apiKey": ""
    }
  }
}
```

---

## Mock Data Integration

Each test page will include:
- `mockData.js` - Sample transactions for testing
- `mockResponses.js` - Expected API responses
- `validationRules.js` - Field validation rules
- `testHelpers.js` - Utility functions

---

## Total Test Count Summary

| Page | Pass Tests | Fail Tests | Total |
|------|------------|------------|-------|
| CRUD Operations | 18 | 17 | 35 |
| Query & Filtering | 21 | 5 | 26 |
| Count Operations | 10 | 4 | 14 |
| Advanced Scenarios | 12 | 5 | 17 |
| Connection & Lifecycle | 11 | 2 | 13 |
| **TOTAL** | **72** | **33** | **105** |

---

## Next Steps

1. **Approval** - Review and approve test scenarios
2. **Prioritization** - Decide which pages to build first
3. **Mock Data** - Provide sample API responses
4. **Implementation** - Build HTML/CSS/JS files
5. **Integration** - Connect to actual API endpoints
6. **Documentation** - Add usage instructions

**Please review and let me know:**
- ✅ Approve all test pages
- 🔄 Modify specific scenarios
- ➕ Add additional test cases
- ➖ Remove unnecessary tests
- 🎯 Prioritize certain pages first
