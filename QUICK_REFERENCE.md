# Quick Reference - Payment Transactions Registry Store

## Database Connection

**Docker Container:**
```bash
docker ps | grep oliver-postgres
# Container: oliver-postgres (postgres:15-alpine)
```

**Database Access:**
```bash
# Via psql in container
docker exec -it oliver-postgres psql -U emon -d oliver_db

# Via Node.js
node -e "const pg = require('pg'); const pool = new pg.Pool({user:'emon',password:'emon@12',host:'127.0.0.1',port:5432,database:'oliver_db'}); pool.query('SELECT NOW()', (err,res)=>{console.log(err?err:res.rows);pool.end()});"
```

## Common Commands

**Run Tests:**
```bash
npm test
```

**Check Database Status:**
```bash
docker ps | grep postgres
```

**Stop/Start PostgreSQL:**
```bash
docker stop oliver-postgres
docker start oliver-postgres
```

**View Database Schema:**
```sql
\d transactions
```

**Count Transactions:**
```sql
SELECT COUNT(*) FROM transactions WHERE is_deleted = false;
```

## Test Transaction Example

```javascript
const TransactionRegistry = require('./PaymentTransactionsRegistryStore');

// Create transaction
const result = await TransactionRegistry.createTransaction({
  order_id: "ORD-123",
  amount: 99.99,
  order_type: "purchase",
  customer_uid: "CUST-456",
  status: "completed",
  direction: "purchase",
  payment_method: "credit_card",
  currency: "USD",
  platform: "web",
  owners: ["owner1"],
  owner_allocations: [{ owner_uuid: "owner1", amount_cents: 9999 }],
  products: [{ product_id: "PROD1", quantity: 1, price: 99.99 }]
});

// Get transaction
const tx = await TransactionRegistry.getTransaction(result.transaction_id);

// Update transaction
await TransactionRegistry.updateTransaction(result.transaction_id, {
  status: "refunded",
  refund_amount: 99.99,
  refund_reason: "Customer request"
});

// Delete transaction (soft delete)
await TransactionRegistry.deleteTransaction(result.transaction_id);
```

## Troubleshooting

**Connection Refused:**
```bash
# Check if Docker container is running
docker ps | grep oliver-postgres

# If not running, start it
docker start oliver-postgres
```

**Authentication Failed:**
```bash
# Verify credentials in .env file
cat .env | grep PG
```

**Port Conflict:**
```bash
# Check if Windows PostgreSQL is running
net stop postgresql-x64-17
```

**Test Failures:**
```bash
# Run tests with full output
npm test 2>&1 | less
```

## Key Files

- `PaymentTransactionsRegistryStore.js` - Main registry class
- `PostgreSQL.js` - Database connection layer
- `test/crud-test.js` - Test suite
- `.env` - Configuration
- `scripts/init-db.sql` - Schema definition

## Test Statistics

- Total Tests: 22
- Passing: 22 ✓
- Success Rate: 100%
- Coverage: CREATE, READ, UPDATE, DELETE, BATCH operations
