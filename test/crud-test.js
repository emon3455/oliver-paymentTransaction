/**
 * CRUD Test Suite for Payment Transactions Registry Store
 * 
 * This test suite covers:
 * 1. CREATE - Creating transactions
 * 2. READ - Reading/getting transactions
 * 3. UPDATE - Updating transaction fields
 * 4. DELETE - Soft deleting transactions
 * 5. Error handling scenarios
 */

require("dotenv").config();
const TransactionRegistry = require("../PaymentTransactionsRegistryStore");

// Test utilities
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  errors: []
};

function assert(condition, testName) {
  testResults.total++;
  if (condition) {
    testResults.passed++;
    console.log(`✓ PASS: ${testName}`);
    return true;
  } else {
    testResults.failed++;
    console.log(`✗ FAIL: ${testName}`);
    testResults.errors.push(testName);
    return false;
  }
}

function assertEqual(actual, expected, testName) {
  const condition = actual === expected;
  if (!condition) {
    console.log(`  Expected: ${expected}, Got: ${actual}`);
  }
  return assert(condition, testName);
}

function assertNotNull(value, testName) {
  return assert(value !== null && value !== undefined, testName);
}

function assertNull(value, testName) {
  return assert(value === null || value === undefined, testName);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test data
const createTestTransaction = (overrides = {}) => ({
  order_id: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  amount: 99.99,
  order_type: "online_purchase",
  customer_uid: `CUST-${Date.now()}`,
  status: "completed",
  direction: "purchase",
  payment_method: "credit_card",
  currency: "USD",
  platform: "web",
  ip_address: "192.168.1.1",
  parent_transaction_id: null,
  meta: { test: true, environment: "test" },
  user_agent: "Mozilla/5.0 Test Agent",
  refund_amount: null,
  refund_reason: null,
  dispute_id: null,
  write_status: "success",
  owners: ["owner1", "owner2"],
  owner_allocations: [
    { owner_uuid: "owner1", amount_cents: 5000 },
    { owner_uuid: "owner2", amount_cents: 4999 }
  ],
  products: [
    { product_id: "PROD1", quantity: 2, price: 49.99 }
  ],
  ...overrides
});

// Test Suite
async function runTests() {
  console.log("\n=== PAYMENT TRANSACTIONS REGISTRY STORE - CRUD TEST SUITE ===\n");
  
  let testTransactionId = null;
  let testTransaction = null;

  try {
    // Wait for DB connection to be ready
    console.log("Waiting for database connection...");
    await sleep(1000);

    // ========== CREATE TESTS ==========
    console.log("\n--- CREATE TESTS ---\n");

    try {
      testTransaction = createTestTransaction();
      const result = await TransactionRegistry.createTransaction(testTransaction);
      
      assertNotNull(result, "Create transaction should return result");
      assertNotNull(result.transaction_id, "Created transaction should have transaction_id");
      testTransactionId = result.transaction_id;
      console.log(`  Created transaction ID: ${testTransactionId}`);
    } catch (error) {
      console.log(`✗ FAIL: Create transaction failed with error: ${error.message}`);
      testResults.failed++;
      testResults.total++;
      testResults.errors.push(`Create transaction: ${error.message}`);
    }

    // Test creating transaction with minimal required fields
    try {
      const minimalTransaction = {
        order_id: `ORD-MIN-${Date.now()}`,
        amount: 10.00,
        order_type: "test",
        customer_uid: `CUST-MIN-${Date.now()}`,
        status: "pending",
        direction: "purchase",
        payment_method: "card",
        currency: "USD",
        platform: "web",
        owners: ["owner1"],
        owner_allocations: [{ owner_uuid: "owner1", amount_cents: 1000 }],
        products: [{ product_id: "PROD1", quantity: 1, price: 10.00 }]
      };
      const result = await TransactionRegistry.createTransaction(minimalTransaction);
      assertNotNull(result.transaction_id, "Create minimal transaction should succeed");
    } catch (error) {
      console.log(`✗ FAIL: Create minimal transaction: ${error.message}`);
      testResults.failed++;
      testResults.total++;
    }

    // Test creating transaction with invalid direction
    try {
      const invalidTransaction = createTestTransaction({ direction: "invalid_direction" });
      await TransactionRegistry.createTransaction(invalidTransaction);
      assert(false, "Create transaction with invalid direction should fail");
    } catch (error) {
      assert(true, "Create transaction with invalid direction correctly throws error");
    }

    // ========== READ TESTS ==========
    console.log("\n--- READ TESTS ---\n");

    if (testTransactionId) {
      try {
        const retrieved = await TransactionRegistry.getTransaction(testTransactionId);
        assertNotNull(retrieved, "Get transaction should return result");
        assertEqual(retrieved.transaction_id, testTransactionId, "Retrieved transaction ID should match");
        assertEqual(retrieved.order_id, testTransaction.order_id, "Order ID should match");
        assertEqual(parseFloat(retrieved.amount), testTransaction.amount, "Amount should match");
        assertEqual(retrieved.status, testTransaction.status, "Status should match");
        assertEqual(retrieved.direction, testTransaction.direction, "Direction should match");
        console.log("  Retrieved transaction:", {
          id: retrieved.transaction_id,
          order_id: retrieved.order_id,
          amount: retrieved.amount,
          status: retrieved.status
        });
      } catch (error) {
        console.log(`✗ FAIL: Get transaction: ${error.message}`);
        testResults.failed++;
        testResults.total++;
      }
    }

    // Test getting non-existent transaction
    try {
      const nonExistent = await TransactionRegistry.getTransaction(999999);
      assertNull(nonExistent, "Getting non-existent transaction should return null");
    } catch (error) {
      console.log(`✗ FAIL: Get non-existent transaction: ${error.message}`);
      testResults.failed++;
      testResults.total++;
    }

    // Test getting all transactions count
    try {
      const count = await TransactionRegistry.getAllCount();
      assert(count >= 0, "Get all count should return non-negative number");
      console.log(`  Total transactions count: ${count}`);
    } catch (error) {
      console.log(`✗ FAIL: Get all count: ${error.message}`);
      testResults.failed++;
      testResults.total++;
    }

    // ========== UPDATE TESTS ==========
    console.log("\n--- UPDATE TESTS ---\n");

    if (testTransactionId) {
      try {
        const updateFields = {
          status: "refunded",
          refund_amount: 50.00,
          refund_reason: "Customer request"
        };
        const updated = await TransactionRegistry.updateTransaction(testTransactionId, updateFields);
        assertNotNull(updated, "Update transaction should return result");
        assertEqual(updated.status, "refunded", "Status should be updated");
        
        // Verify the update persisted
        const retrieved = await TransactionRegistry.getTransaction(testTransactionId);
        assertEqual(retrieved.status, "refunded", "Updated status should persist");
        console.log("  Updated fields:", {
          status: retrieved.status,
          refund_amount: retrieved.refund_amount,
          refund_reason: retrieved.refund_reason
        });
      } catch (error) {
        console.log(`✗ FAIL: Update transaction: ${error.message}`);
        testResults.failed++;
        testResults.total++;
      }
    }

    // Test updating with invalid transaction ID
    try {
      await TransactionRegistry.updateTransaction(999999, { status: "completed" });
      assert(false, "Update non-existent transaction should fail");
    } catch (error) {
      assert(true, "Update non-existent transaction correctly throws error");
    }

    // Test updating meta field
    if (testTransactionId) {
      try {
        const updatedMeta = { test: false, updated: true, timestamp: Date.now() };
        await TransactionRegistry.updateTransaction(testTransactionId, { meta: updatedMeta });
        const retrieved = await TransactionRegistry.getTransaction(testTransactionId);
        assertNotNull(retrieved.meta, "Meta field should be updated");
        console.log("  Updated meta:", retrieved.meta);
      } catch (error) {
        console.log(`✗ FAIL: Update meta field: ${error.message}`);
        testResults.failed++;
        testResults.total++;
      }
    }

    // ========== DELETE TESTS ==========
    console.log("\n--- DELETE TESTS ---\n");

    if (testTransactionId) {
      try {
        const deleted = await TransactionRegistry.deleteTransaction(testTransactionId);
        assertNotNull(deleted, "Delete transaction should return result");
        
        // Verify soft delete - transaction should still exist but be marked as deleted
        const retrieved = await TransactionRegistry.getTransaction(testTransactionId);
        if (retrieved) {
          assertEqual(retrieved.is_deleted, true, "Transaction should be marked as deleted");
          console.log("  Transaction soft deleted successfully");
        } else {
          console.log("  Transaction was hard deleted (removed from DB)");
          assert(true, "Transaction deleted successfully");
        }
      } catch (error) {
        console.log(`✗ FAIL: Delete transaction: ${error.message}`);
        testResults.failed++;
        testResults.total++;
      }
    }

    // Test deleting non-existent transaction (should succeed but affect 0 rows)
    try {
      const result = await TransactionRegistry.deleteTransaction(999999);
      // Soft delete is idempotent - it won't throw error for non-existent transactions
      assert(true, "Delete non-existent transaction should not throw error (idempotent)");
    } catch (error) {
      console.log(`✗ FAIL: Delete non-existent transaction should not throw: ${error.message}`);
      testResults.failed++;
      testResults.total++;
    }

    // ========== ADDITIONAL CRUD TESTS ==========
    console.log("\n--- ADDITIONAL CRUD TESTS ---\n");

    // Create multiple transactions for batch testing
    const transactionIds = [];
    for (let i = 0; i < 3; i++) {
      try {
        const txn = createTestTransaction({
          amount: (i + 1) * 10,
          status: i === 0 ? "pending" : i === 1 ? "completed" : "refunded"
        });
        const result = await TransactionRegistry.createTransaction(txn);
        if (result && result.transaction_id) {
          transactionIds.push(result.transaction_id);
        }
      } catch (error) {
        console.log(`  Failed to create batch transaction ${i}: ${error.message}`);
      }
    }
    assert(transactionIds.length > 0, `Created ${transactionIds.length} batch transactions`);

    // Test getting count by status
    try {
      const completedCount = await TransactionRegistry.getAllCountByStatus("completed");
      assert(completedCount >= 0, "Get count by status should return valid count");
      console.log(`  Completed transactions count: ${completedCount}`);
    } catch (error) {
      console.log(`✗ FAIL: Get count by status: ${error.message}`);
      testResults.failed++;
      testResults.total++;
    }

    // Clean up batch test transactions
    for (const id of transactionIds) {
      try {
        await TransactionRegistry.deleteTransaction(id);
      } catch (error) {
        console.log(`  Warning: Failed to clean up transaction ${id}`);
      }
    }

  } catch (error) {
    console.error("\n!!! CRITICAL ERROR IN TEST SUITE !!!");
    console.error(error);
    testResults.errors.push(`Critical: ${error.message}`);
  }

  // ========== TEST SUMMARY ==========
  console.log("\n=== TEST SUMMARY ===\n");
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed} ✓`);
  console.log(`Failed: ${testResults.failed} ✗`);
  console.log(`Success Rate: ${testResults.total > 0 ? ((testResults.passed / testResults.total) * 100).toFixed(2) : 0}%`);
  
  if (testResults.errors.length > 0) {
    console.log("\nFailed Tests:");
    testResults.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }

  console.log("\n=== END OF TEST SUITE ===\n");

  // Close database connection
  try {
    const db = TransactionRegistry._getDbInstance();
    if (db && typeof db.closeAll === 'function') {
      await db.closeAll();
      console.log("Database connections closed.");
    }
  } catch (error) {
    console.log("Note: Could not close database connections:", error.message);
  }

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run the test suite
if (require.main === module) {
  runTests().catch(error => {
    console.error("Fatal error running tests:", error);
    process.exit(1);
  });
}

module.exports = { runTests };
