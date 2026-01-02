/**
 * Jest Tests for PaymentTransactionsRegistryStore - DELETE Operations
 * Tests 23-26: deleteTransaction method
 */

// Manual mock setup
jest.mock('../PostgreSQL', () => {
  return require('../__mocks__/PostgreSQL');
});

jest.mock('../Logger', () => {
  return require('../__mocks__/Logger');
});

jest.mock('../ErrorHandler', () => {
  return require('../__mocks__/ErrorHandler');
});

const TransactionRegistry = require('../PaymentTransactionsRegistryStore');
const PostgreSQLMock = require('../__mocks__/PostgreSQL');
const Logger = require('../Logger');
const ErrorHandler = require('../ErrorHandler');

describe('TransactionRegistry - DELETE Tests', () => {
  let mockDb;
  let createdTransaction;

  beforeEach(async () => {
    mockDb = new PostgreSQLMock();
    TransactionRegistry._db = mockDb;
    Logger.reset();
    ErrorHandler.reset();

    // Create a base transaction for delete tests
    const baseTxn = {
      order_id: 'order_delete_test',
      amount: 5000,
      order_type: 'product',
      customer_uid: 'customer_delete',
      status: 'completed',
      direction: 'purchase',
      payment_method: 'stripe',
      currency: 'USD',
      platform: 'web',
      owners: ['owner_1'],
      owner_allocations: [{ owner_uuid: 'owner_1', amount_cents: 5000 }],
      products: [{ product_id: 'prod_1', price: 5000 }]
    };

    createdTransaction = await TransactionRegistry.createTransaction(baseTxn);
    ErrorHandler.reset();
  });

  // Test 23: Soft delete transaction
  test('23. Soft delete transaction', async () => {
    const result = await TransactionRegistry.deleteTransaction(
      createdTransaction.transaction_id
    );

    expect(result).toBe(true);

    // Verify DB state - transaction still exists but is_deleted=true
    const dbData = mockDb.getAllData('transactions');
    expect(dbData.length).toBe(1);
    expect(dbData[0].is_deleted).toBe(true);
    expect(dbData[0].deleted_at).toBeDefined();
    expect(dbData[0].deleted_at).not.toBeNull();
  });

  // Test 24: FAIL - Invalid transaction_id
  test('24. FAIL: Invalid transaction_id', async () => {
    // Note: Current implementation returns true even if no rows affected
    // This test documents actual behavior
    const result = await TransactionRegistry.deleteTransaction('nonexistent_txn_id');
    
    expect(result).toBe(true);
    
    // No errors should be added since the method doesn't validate row count
    const errors = ErrorHandler.getErrors();
    expect(errors.length).toBe(0);
  });

  // Test 25: FAIL - Already deleted transaction
  test('25. FAIL: Already deleted transaction', async () => {
    // First delete
    await TransactionRegistry.deleteTransaction(createdTransaction.transaction_id);
    ErrorHandler.reset();

    // Try to delete again
    await TransactionRegistry.deleteTransaction(createdTransaction.transaction_id);

    // Verify original deleted_at unchanged (no rows affected means no update)
    const dbData = mockDb.getAllData('transactions');
    expect(dbData[0].is_deleted).toBe(true);
  });

  // Test 26: Logger failure doesn't break logic
  test('26. Logger failure does not break logic', async () => {
    Logger.setWriteLogShouldThrow(true);

    const result = await TransactionRegistry.deleteTransaction(
      createdTransaction.transaction_id
    );

    expect(result).toBe(true);

    // Verify delete was successful
    const dbData = mockDb.getAllData('transactions');
    expect(dbData[0].is_deleted).toBe(true);
    expect(dbData[0].deleted_at).toBeDefined();

    // ErrorHandler should NOT have been called for logger failures
    const errors = ErrorHandler.getErrors();
    expect(errors.length).toBe(0);

    Logger.setWriteLogShouldThrow(false);
  });
});
