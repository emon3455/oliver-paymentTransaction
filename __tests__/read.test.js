/**
 * Jest Tests for PaymentTransactionsRegistryStore - READ Operations
 * Tests 27-30: getTransaction method
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

describe('TransactionRegistry - READ Tests', () => {
  let mockDb;
  let createdTransaction;

  beforeEach(async () => {
    mockDb = new PostgreSQLMock();
    TransactionRegistry._db = mockDb;
    Logger.reset();
    ErrorHandler.reset();

    // Create a transaction with complex data for read tests
    const baseTxn = {
      order_id: 'order_read_test',
      amount: 15000,
      order_type: 'product',
      customer_uid: 'customer_read',
      status: 'completed',
      direction: 'purchase',
      payment_method: 'stripe',
      currency: 'USD',
      platform: 'web',
      meta: {
        subscription_id: 'sub_789',
        promo_code: 'DISCOUNT10'
      },
      owners: ['owner_1', 'owner_2'],
      owner_allocations: [
        { owner_uuid: 'owner_1', amount_cents: 9000 },
        { owner_uuid: 'owner_2', amount_cents: 6000 }
      ],
      products: [
        { product_id: 'prod_1', name: 'Product One', price: 10000 },
        { product_id: 'prod_2', name: 'Product Two', price: 5000 }
      ]
    };

    createdTransaction = await TransactionRegistry.createTransaction(baseTxn);
    ErrorHandler.reset();
  });

  // Test 27: Get transaction by ID
  test('27. Get transaction by ID', async () => {
    const result = await TransactionRegistry.getTransaction(
      createdTransaction.transaction_id
    );

    expect(result).toBeDefined();
    expect(result.transaction_id).toBe(createdTransaction.transaction_id);
    expect(result.order_id).toBe('order_read_test');
    expect(result.customer_uid).toBe('customer_read');
    expect(result.amount).toBe(15000);
    expect(result.status).toBe('completed');
    expect(result.direction).toBe('purchase');
  });

  // Test 28: Get with expanded relations
  test('28. Get with expanded relations', async () => {
    const result = await TransactionRegistry.getTransaction(
      createdTransaction.transaction_id
    );

    expect(result).toBeDefined();

    // Verify owner_allocations deserialization
    expect(Array.isArray(result.owner_allocations)).toBe(true);
    expect(result.owner_allocations.length).toBe(2);
    expect(result.owner_allocations[0].owner_uuid).toBe('owner_1');
    expect(result.owner_allocations[0].amount_cents).toBe(9000);

    // Verify products deserialization
    expect(Array.isArray(result.products)).toBe(true);
    expect(result.products.length).toBe(2);
    expect(result.products[0].product_id).toBe('prod_1');
    expect(result.products[0].name).toBe('Product One');

    // Verify meta deserialization
    expect(result.meta).toBeDefined();
    expect(result.meta.subscription_id).toBe('sub_789');
    expect(result.meta.promo_code).toBe('DISCOUNT10');

    // Verify owners array
    expect(Array.isArray(result.owners)).toBe(true);
    expect(result.owners.length).toBe(2);
  });

  // Test 29: FAIL - Invalid transaction_id
  test('29. FAIL: Invalid transaction_id', async () => {
    const result = await TransactionRegistry.getTransaction('nonexistent_id');

    // Returns null for not found
    expect(result).toBeNull();

    // No error added for not found (this is normal behavior)
    const errors = ErrorHandler.getErrors();
    expect(errors.length).toBe(0);
  });

  // Test 30: FAIL - Attempt to get deleted transaction
  test('30. FAIL: Attempt to get deleted transaction', async () => {
    // First delete the transaction
    await TransactionRegistry.deleteTransaction(createdTransaction.transaction_id);

    // Try to get it
    const result = await TransactionRegistry.getTransaction(
      createdTransaction.transaction_id
    );

    // Should return null (excluded by is_deleted=false filter)
    expect(result).toBeNull();

    // No error added
    const errors = ErrorHandler.getErrors();
    expect(errors.length).toBe(0);
  });
});
