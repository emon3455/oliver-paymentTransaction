/**
 * Jest Tests for PaymentTransactionsRegistryStore - UPDATE Operations
 * Tests 13-22: updateTransaction method
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

describe('TransactionRegistry - UPDATE Tests', () => {
  let mockDb;
  let createdTransaction;

  beforeEach(async () => {
    mockDb = new PostgreSQLMock();
    TransactionRegistry._db = mockDb;
    Logger.reset();
    ErrorHandler.reset();

    // Create a base transaction for update tests
    const baseTxn = {
      order_id: 'order_base',
      amount: 5000,
      order_type: 'product',
      customer_uid: 'customer_base',
      status: 'pending',
      direction: 'purchase',
      payment_method: 'stripe',
      currency: 'USD',
      platform: 'web',
      owners: ['owner_1'],
      owner_allocations: [{ owner_uuid: 'owner_1', amount_cents: 5000 }],
      products: [{ product_id: 'prod_1', price: 5000 }]
    };

    createdTransaction = await TransactionRegistry.createTransaction(baseTxn);
    ErrorHandler.reset(); // Reset after creation
  });

  // Test 13: Update status field
  test('13. Update status field', async () => {
    const result = await TransactionRegistry.updateTransaction(
      createdTransaction.transaction_id,
      { status: 'completed' }
    );

    expect(result).toBeDefined();
    expect(result.status).toBe('completed');
    expect(result.updated_at).toBeDefined();

    // Verify DB state
    const dbData = mockDb.getAllData('transactions');
    expect(dbData.length).toBe(1);
    expect(dbData[0].status).toBe('completed');
    expect(dbData[0].updated_at).toBeDefined();
  });

  // Test 14: Update refund_amount and refund_reason
  test('14. Update refund_amount and refund_reason', async () => {
    const result = await TransactionRegistry.updateTransaction(
      createdTransaction.transaction_id,
      { 
        refund_amount: 2500,
        refund_reason: 'Partial refund requested'
      }
    );

    expect(result).toBeDefined();
    expect(result.refund_amount).toBe(2500);
    expect(result.refund_reason).toBe('Partial refund requested');

    const dbData = mockDb.getAllData('transactions');
    expect(dbData[0].refund_amount).toBe(2500);
    expect(dbData[0].refund_reason).toBe('Partial refund requested');
  });

  // Test 15: Update meta
  test('15. Update meta', async () => {
    const newMeta = {
      updated_field: 'new_value',
      timestamp: '2026-01-03T00:00:00Z'
    };

    const result = await TransactionRegistry.updateTransaction(
      createdTransaction.transaction_id,
      { meta: newMeta }
    );

    expect(result).toBeDefined();
    expect(result.meta).toBeDefined();
    expect(result.meta.updated_field).toBe('new_value');

    // Check DB storage (meta stored as JSON string)
    const dbData = mockDb.getAllData('transactions');
    expect(dbData[0].meta).toBeDefined();
    const parsedMeta = typeof dbData[0].meta === 'string' ? JSON.parse(dbData[0].meta) : dbData[0].meta;
    expect(parsedMeta.updated_field).toBe('new_value');
  });

  // Test 16: Update products
  test('16. Update products', async () => {
    const newProducts = [
      { product_id: 'prod_2', name: 'Updated Product', price: 6000 }
    ];

    const result = await TransactionRegistry.updateTransaction(
      createdTransaction.transaction_id,
      { products: newProducts }
    );

    expect(result).toBeDefined();
    expect(Array.isArray(result.products)).toBe(true);
    expect(result.products.length).toBe(1);
    expect(result.products[0].product_id).toBe('prod_2');

    // Check DB storage (products stored as JSON string)
    const dbData = mockDb.getAllData('transactions');
    expect(dbData[0].products).toBeDefined();
    const parsedProducts = typeof dbData[0].products === 'string' ? JSON.parse(dbData[0].products) : dbData[0].products;
    expect(Array.isArray(parsedProducts)).toBe(true);
    expect(parsedProducts.length).toBe(1);
    expect(parsedProducts[0].product_id).toBe('prod_2');
  });

  // Test 17: Update with explicit null (unset)
  test('17. Update with explicit null (unset)', async () => {
    const result = await TransactionRegistry.updateTransaction(
      createdTransaction.transaction_id,
      { refund_reason: { unset: true } }
    );

    expect(result).toBeDefined();
    expect(result.refund_reason).toBeNull();

    const dbData = mockDb.getAllData('transactions');
    expect(dbData[0].refund_reason).toBeNull();
  });

  // Test 18: FAIL - Invalid transaction_id
  test('18. FAIL: Invalid transaction_id', async () => {
    await expect(
      TransactionRegistry.updateTransaction('invalid_txn_id', { status: 'completed' })
    ).rejects.toThrow();

    const errors = ErrorHandler.getErrors();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('Failed to update transaction');
  });

  // Test 19: FAIL - No updatable fields
  test('19. FAIL: No updatable fields', async () => {
    await expect(
      TransactionRegistry.updateTransaction(
        createdTransaction.transaction_id,
        {}
      )
    ).rejects.toThrow();

    const errors = ErrorHandler.getErrors();
    expect(errors.length).toBeGreaterThan(0);
  });

  // Test 20: FAIL - Meta exceeds size limit on update
  test('20. FAIL: Meta exceeds size limit on update', async () => {
    const largeMeta = {};
    for (let i = 0; i < 500; i++) {
      largeMeta[`key_${i}`] = 'x'.repeat(50);
    }

    await expect(
      TransactionRegistry.updateTransaction(
        createdTransaction.transaction_id,
        { meta: largeMeta }
      )
    ).rejects.toThrow();

    const errors = ErrorHandler.getErrors();
    expect(errors.length).toBeGreaterThan(0);

    // Verify original value unchanged
    const dbData = mockDb.getAllData('transactions');
    expect(JSON.stringify(dbData[0].meta || {}).length).toBeLessThan(1000);
  });

  // Test 21: FAIL - Invalid field type
  test('21. FAIL: Invalid field type', async () => {
    await expect(
      TransactionRegistry.updateTransaction(
        createdTransaction.transaction_id,
        { refund_amount: 'not_a_number' }
      )
    ).rejects.toThrow();

    const errors = ErrorHandler.getErrors();
    expect(errors.length).toBeGreaterThan(0);
  });

  // Test 22: Logger failure doesn't break logic
  test('22. Logger failure does not break logic', async () => {
    Logger.setWriteLogShouldThrow(true);

    const result = await TransactionRegistry.updateTransaction(
      createdTransaction.transaction_id,
      { status: 'completed' }
    );

    expect(result).toBeDefined();
    expect(result.status).toBe('completed');

    // Verify update was successful
    const dbData = mockDb.getAllData('transactions');
    expect(dbData[0].status).toBe('completed');

    // ErrorHandler should NOT have been called for logger failures
    const errors = ErrorHandler.getErrors();
    expect(errors.length).toBe(0);

    Logger.setWriteLogShouldThrow(false);
  });
});
