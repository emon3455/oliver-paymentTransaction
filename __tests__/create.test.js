/**
 * Jest Tests for PaymentTransactionsRegistryStore - CREATE Operations
 * Tests 1-12: createTransaction method
 */

// Manual mock setup - must be before require
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

describe('TransactionRegistry - CREATE Tests', () => {
  let mockDb;

  beforeEach(() => {
    // Reset mocks before each test
    mockDb = new PostgreSQLMock();
    TransactionRegistry._db = mockDb;
    Logger.reset();
    ErrorHandler.reset();
  });

  // Test 1: Create valid purchase transaction
  test('1. Create valid purchase transaction', async () => {
    const txn = {
      order_id: 'order_001',
      amount: 10000,
      order_type: 'product',
      customer_uid: 'customer_123',
      status: 'completed',
      direction: 'purchase',
      payment_method: 'stripe',
      currency: 'USD',
      platform: 'web',
      ip_address: '192.168.1.1',
      owners: ['owner_1'],
      owner_allocations: [{ owner_uuid: 'owner_1', amount_cents: 10000 }],
      products: [{ product_id: 'prod_1', name: 'Product 1', price: 10000 }]
    };

    const result = await TransactionRegistry.createTransaction(txn);

    expect(result).toBeDefined();
    expect(result.transaction_id).toBeDefined();
    expect(result.order_id).toBe('order_001');
    expect(result.direction).toBe('purchase');
    expect(result.status).toBe('completed');

    // Verify DB state
    const dbData = mockDb.getAllData('transactions');
    expect(dbData.length).toBe(1);
    expect(dbData[0].order_id).toBe('order_001');
    expect(dbData[0].customer_uid).toBe('customer_123');
  });

  // Test 2: Create refund transaction
  test('2. Create refund transaction', async () => {
    const txn = {
      order_id: 'order_002',
      amount: 5000,
      order_type: 'product',
      customer_uid: 'customer_456',
      status: 'completed',
      direction: 'refund',
      payment_method: 'stripe',
      currency: 'USD',
      platform: 'web',
      parent_transaction_id: 'txn_parent_123',
      refund_amount: 5000,
      refund_reason: 'Customer requested refund',
      owners: ['owner_1'],
      owner_allocations: [{ owner_uuid: 'owner_1', amount_cents: 5000 }],
      products: [{ product_id: 'prod_1', price: 5000 }]
    };

    const result = await TransactionRegistry.createTransaction(txn);

    expect(result).toBeDefined();
    expect(result.direction).toBe('refund');
    expect(result.parent_transaction_id).toBe('txn_parent_123');
    expect(result.refund_amount).toBe(5000);
    expect(result.refund_reason).toBe('Customer requested refund');
  });

  // Test 3: Create with meta payload
  test('3. Create with meta payload', async () => {
    const txn = {
      order_id: 'order_003',
      amount: 7500,
      order_type: 'subscription',
      customer_uid: 'customer_789',
      status: 'completed',
      direction: 'purchase',
      payment_method: 'paypal',
      currency: 'USD',
      platform: 'mobile',
      meta: {
        subscription_id: 'sub_123',
        billing_cycle: 'monthly',
        promo_code: 'SAVE20'
      },
      owners: ['owner_1'],
      owner_allocations: [{ owner_uuid: 'owner_1', amount_cents: 7500 }],
      products: [{ product_id: 'sub_prod', price: 7500 }]
    };

    const result = await TransactionRegistry.createTransaction(txn);

    expect(result).toBeDefined();
    expect(result.meta).toBeDefined();
    expect(result.meta.subscription_id).toBe('sub_123');
    expect(result.meta.billing_cycle).toBe('monthly');

    // Verify meta serialization size
    const metaString = JSON.stringify(result.meta);
    expect(metaString.length).toBeLessThanOrEqual(
      TransactionRegistry.MAX_META_BLOB_LENGTH
    );
  });

  // Test 4: Create with owner_allocations
  test('4. Create with owner_allocations', async () => {
    const txn = {
      order_id: 'order_004',
      amount: 10000,
      order_type: 'marketplace',
      customer_uid: 'customer_999',
      status: 'completed',
      direction: 'purchase',
      payment_method: 'stripe',
      currency: 'USD',
      platform: 'web',
      owners: ['owner_a', 'owner_b'],
      owner_allocations: [
        { owner_uuid: 'owner_a', amount_cents: 6000 },
        { owner_uuid: 'owner_b', amount_cents: 4000 }
      ],
      products: [{ product_id: 'prod_1', price: 10000 }]
    };

    const result = await TransactionRegistry.createTransaction(txn);

    expect(result).toBeDefined();
    expect(Array.isArray(result.owner_allocations)).toBe(true);
    expect(result.owner_allocations.length).toBe(2);
    expect(result.owner_allocations[0].owner_uuid).toBe('owner_a');
    expect(result.owner_allocations[0].amount_cents).toBe(6000);

    // Verify serialization size
    const allocationsString = JSON.stringify(result.owner_allocations);
    expect(allocationsString.length).toBeLessThanOrEqual(
      TransactionRegistry.MAX_OWNER_ALLOCATIONS_BLOB_LENGTH
    );
  });

  // Test 5: Create with products array
  test('5. Create with products array', async () => {
    const txn = {
      order_id: 'order_005',
      amount: 15000,
      order_type: 'product',
      customer_uid: 'customer_111',
      status: 'completed',
      direction: 'purchase',
      payment_method: 'stripe',
      currency: 'USD',
      platform: 'web',
      owners: ['owner_1'],
      owner_allocations: [{ owner_uuid: 'owner_1', amount_cents: 15000 }],
      products: [
        { product_id: 'prod_1', name: 'Widget A', price: 5000, quantity: 2 },
        { product_id: 'prod_2', name: 'Widget B', price: 5000, quantity: 1 }
      ]
    };

    const result = await TransactionRegistry.createTransaction(txn);

    expect(result).toBeDefined();
    expect(Array.isArray(result.products)).toBe(true);
    expect(result.products.length).toBe(2);
    expect(result.products[0].product_id).toBe('prod_1');

    // Verify serialization size
    const productsString = JSON.stringify(result.products);
    expect(productsString.length).toBeLessThanOrEqual(
      TransactionRegistry.MAX_PRODUCTS_BLOB_LENGTH
    );
  });

  // Test 6: FAIL - Invalid direction
  test('6. FAIL: Invalid direction', async () => {
    const txn = {
      order_id: 'order_006',
      amount: 1000,
      order_type: 'product',
      customer_uid: 'customer_222',
      status: 'completed',
      direction: 'invalid_direction',
      payment_method: 'stripe',
      currency: 'USD',
      platform: 'web',
      owners: ['owner_1'],
      owner_allocations: [{ owner_uuid: 'owner_1', amount_cents: 1000 }],
      products: [{ product_id: 'prod_1', price: 1000 }]
    };

    await expect(TransactionRegistry.createTransaction(txn)).rejects.toThrow();

    // Verify ErrorHandler.addError was called
    const errors = ErrorHandler.getErrors();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('Failed to create transaction');

    // Verify transaction was NOT created
    const dbData = mockDb.getAllData('transactions');
    expect(dbData.length).toBe(0);
  });

  // Test 7: FAIL - Missing required field (order_id)
  test('7. FAIL: Missing required field (order_id)', async () => {
    const txn = {
      amount: 1000,
      order_type: 'product',
      customer_uid: 'customer_333',
      status: 'completed',
      direction: 'purchase',
      payment_method: 'stripe',
      currency: 'USD',
      platform: 'web',
      owners: ['owner_1'],
      owner_allocations: [{ owner_uuid: 'owner_1', amount_cents: 1000 }],
      products: [{ product_id: 'prod_1', price: 1000 }]
    };

    await expect(TransactionRegistry.createTransaction(txn)).rejects.toThrow();

    const errors = ErrorHandler.getErrors();
    expect(errors.length).toBeGreaterThan(0);

    const dbData = mockDb.getAllData('transactions');
    expect(dbData.length).toBe(0);
  });

  // Test 8: FAIL - Meta exceeds size limit
  test('8. FAIL: Meta exceeds size limit', async () => {
    // Create a large meta object that exceeds MAX_META_BLOB_LENGTH (4096)
    const largeMeta = {};
    for (let i = 0; i < 500; i++) {
      largeMeta[`key_${i}`] = 'x'.repeat(50);
    }

    const txn = {
      order_id: 'order_008',
      amount: 1000,
      order_type: 'product',
      customer_uid: 'customer_444',
      status: 'completed',
      direction: 'purchase',
      payment_method: 'stripe',
      currency: 'USD',
      platform: 'web',
      meta: largeMeta,
      owners: ['owner_1'],
      owner_allocations: [{ owner_uuid: 'owner_1', amount_cents: 1000 }],
      products: [{ product_id: 'prod_1', price: 1000 }]
    };

    await expect(TransactionRegistry.createTransaction(txn)).rejects.toThrow();

    const errors = ErrorHandler.getErrors();
    expect(errors.length).toBeGreaterThan(0);

    const dbData = mockDb.getAllData('transactions');
    expect(dbData.length).toBe(0);
  });

  // Test 9: FAIL - Owner_allocations exceeds size limit
  test('9. FAIL: Owner_allocations exceeds size limit', async () => {
    // Create large owner_allocations that exceed MAX_OWNER_ALLOCATIONS_BLOB_LENGTH (8192)
    const largeAllocations = [];
    for (let i = 0; i < 500; i++) {
      largeAllocations.push({
        owner_uuid: `owner_${'x'.repeat(50)}_${i}`,
        amount_cents: 100
      });
    }

    const txn = {
      order_id: 'order_009',
      amount: 1000,
      order_type: 'product',
      customer_uid: 'customer_555',
      status: 'completed',
      direction: 'purchase',
      payment_method: 'stripe',
      currency: 'USD',
      platform: 'web',
      owners: ['owner_1'],
      owner_allocations: largeAllocations,
      products: [{ product_id: 'prod_1', price: 1000 }]
    };

    await expect(TransactionRegistry.createTransaction(txn)).rejects.toThrow();

    const errors = ErrorHandler.getErrors();
    expect(errors.length).toBeGreaterThan(0);

    const dbData = mockDb.getAllData('transactions');
    expect(dbData.length).toBe(0);
  });

  // Test 10: FAIL - Products exceeds size limit
  test('10. FAIL: Products exceeds size limit', async () => {
    // Create large products array that exceeds MAX_PRODUCTS_BLOB_LENGTH (16384)
    const largeProducts = [];
    for (let i = 0; i < 500; i++) {
      largeProducts.push({
        product_id: `prod_${i}`,
        name: 'x'.repeat(100),
        description: 'x'.repeat(200),
        price: 1000
      });
    }

    const txn = {
      order_id: 'order_010',
      amount: 1000,
      order_type: 'product',
      customer_uid: 'customer_666',
      status: 'completed',
      direction: 'purchase',
      payment_method: 'stripe',
      currency: 'USD',
      platform: 'web',
      owners: ['owner_1'],
      owner_allocations: [{ owner_uuid: 'owner_1', amount_cents: 1000 }],
      products: largeProducts
    };

    await expect(TransactionRegistry.createTransaction(txn)).rejects.toThrow();

    const errors = ErrorHandler.getErrors();
    expect(errors.length).toBeGreaterThan(0);

    const dbData = mockDb.getAllData('transactions');
    expect(dbData.length).toBe(0);
  });

  // Test 11: FAIL - Invalid meta key pattern
  test('11. FAIL: Invalid meta key pattern', async () => {
    const txn = {
      order_id: 'order_011',
      amount: 1000,
      order_type: 'product',
      customer_uid: 'customer_777',
      status: 'completed',
      direction: 'purchase',
      payment_method: 'stripe',
      currency: 'USD',
      platform: 'web',
      meta: {
        'valid_key': 'value1',
        'invalid key!': 'value2', // Space and special char
        'another@key': 'value3' // @ symbol
      },
      owners: ['owner_1'],
      owner_allocations: [{ owner_uuid: 'owner_1', amount_cents: 1000 }],
      products: [{ product_id: 'prod_1', price: 1000 }]
    };

    await expect(TransactionRegistry.createTransaction(txn)).rejects.toThrow();

    const errors = ErrorHandler.getErrors();
    expect(errors.length).toBeGreaterThan(0);

    const dbData = mockDb.getAllData('transactions');
    expect(dbData.length).toBe(0);
  });

  // Test 12: Logger failure doesn't break logic
  test('12. Logger failure does not break logic', async () => {
    // Make Logger.writeLog throw errors (but not debugLog)
    Logger.setWriteLogShouldThrow(true);

    const txn = {
      order_id: 'order_012',
      amount: 2000,
      order_type: 'product',
      customer_uid: 'customer_888',
      status: 'completed',
      direction: 'purchase',
      payment_method: 'stripe',
      currency: 'USD',
      platform: 'web',
      owners: ['owner_1'],
      owner_allocations: [{ owner_uuid: 'owner_1', amount_cents: 2000 }],
      products: [{ product_id: 'prod_1', price: 2000 }]
    };

    // Should NOT throw despite Logger failures
    const result = await TransactionRegistry.createTransaction(txn);

    expect(result).toBeDefined();
    expect(result.transaction_id).toBeDefined();
    expect(result.order_id).toBe('order_012');

    // Verify transaction was created in DB
    const dbData = mockDb.getAllData('transactions');
    expect(dbData.length).toBe(1);
    expect(dbData[0].order_id).toBe('order_012');

    // ErrorHandler should NOT have been called for logger failures
    const errors = ErrorHandler.getErrors();
    expect(errors.length).toBe(0);

    // Reset logger
    Logger.setWriteLogShouldThrow(false);
  });
});
