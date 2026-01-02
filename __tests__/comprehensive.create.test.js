const TransactionRegistry = require('../PaymentTransactionsRegistryStore');
const PostgreSQL = require('../__mocks__/PostgreSQL');
const Logger = require('../__mocks__/Logger');
const ErrorHandler = require('../__mocks__/ErrorHandler');

jest.mock('../PostgreSQL');
jest.mock('../Logger');
jest.mock('../ErrorHandler');

describe('TransactionRegistry - createTransaction - COMPREHENSIVE', () => {
  let mockDb;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = new PostgreSQL();
    TransactionRegistry._db = mockDb;
    Logger.reset();
    ErrorHandler.reset();
  });

  afterEach(() => {
    TransactionRegistry._db = null;
  });

  // ==================== PASS SCENARIOS ====================

  describe('PASS Scenarios', () => {
    test('PASS_createTransaction_1: Valid transaction with all required fields, minimal meta, single owner allocation', async () => {
      const txn = {
        order_id: 'order-001',
        amount: 1000,
        order_type: 'product_purchase',
        customer_uid: 'cust-123',
        status: 'pending',
        direction: 'purchase',
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web',
        meta: { key1: 'value1' },
        owner_allocations: [{ owner_uuid: 'owner-1', amount_cents: 1000 }]
      };

      const result = await TransactionRegistry.createTransaction(txn);

      expect(result).toBeDefined();
      expect(result.transaction_id).toBeDefined();
      expect(mockDb.data.transactions.length).toBe(1);
      expect(mockDb.data.transactions[0].order_id).toBe('order-001');
      expect(mockDb.data.transactions[0].direction).toBe('purchase');
    });

    test('PASS_createTransaction_2: Multiple owners and owner_allocations, valid amounts', async () => {
      const txn = {
        order_id: 'order-002',
        amount: 3000,
        order_type: 'subscription',
        customer_uid: 'cust-456',
        status: 'completed',
        direction: 'purchase',
        payment_method: 'paypal',
        currency: 'EUR',
        platform: 'mobile',
        owners: ['owner-1', 'owner-2', 'owner-3'],
        owner_allocations: [
          { owner_uuid: 'owner-1', amount_cents: 1000 },
          { owner_uuid: 'owner-2', amount_cents: 1000 },
          { owner_uuid: 'owner-3', amount_cents: 1000 }
        ]
      };

      const result = await TransactionRegistry.createTransaction(txn);

      expect(result).toBeDefined();
      expect(result.transaction_id).toBeDefined();
      const inserted = mockDb.data.transactions[0];
      expect(JSON.parse(inserted.owners).length).toBe(3);
      expect(JSON.parse(inserted.owner_allocations).length).toBe(3);
    });

    test('PASS_createTransaction_3: Valid meta object with nested objects and arrays', async () => {
      const txn = {
        order_id: 'order-003',
        amount: 5000,
        order_type: 'bundle',
        customer_uid: 'cust-789',
        status: 'pending',
        direction: 'purchase',
        payment_method: 'credit_card',
        currency: 'GBP',
        platform: 'desktop',
        meta: {
          user_info: { name: 'John', age: 30 },
          items: ['item1', 'item2'],
          nested: { level2: { level3: 'deep' } }
        }
      };

      const result = await TransactionRegistry.createTransaction(txn);

      expect(result).toBeDefined();
      const inserted = mockDb.data.transactions[0];
      const parsedMeta = JSON.parse(inserted.meta);
      expect(parsedMeta.user_info.name).toBe('John');
      expect(parsedMeta.items).toEqual(['item1', 'item2']);
    });

    test('PASS_createTransaction_4: Meta exactly at MAX_META_BLOB_LENGTH', async () => {
      const largeString = 'x'.repeat(TransactionRegistry.MAX_META_BLOB_LENGTH - 20); // Leave room for JSON structure
      const txn = {
        order_id: 'order-004',
        amount: 1000,
        order_type: 'test',
        customer_uid: 'cust-limit',
        status: 'pending',
        direction: 'purchase',
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web',
        meta: { data: largeString }
      };

      const result = await TransactionRegistry.createTransaction(txn);

      expect(result).toBeDefined();
      const inserted = mockDb.data.transactions[0];
      expect(inserted.meta).toBeDefined();
      expect(inserted.meta.length).toBeLessThanOrEqual(TransactionRegistry.MAX_META_BLOB_LENGTH);
    });

    test('PASS_createTransaction_5: Products payload exactly at MAX_PRODUCTS_BLOB_LENGTH', async () => {
      const productCount = Math.floor(TransactionRegistry.MAX_PRODUCTS_BLOB_LENGTH / 100);
      const products = Array(productCount).fill(null).map((_, i) => ({ id: `p${i}`, name: `Product ${i}` }));
      const txn = {
        order_id: 'order-005',
        amount: 10000,
        order_type: 'bulk',
        customer_uid: 'cust-bulk',
        status: 'pending',
        direction: 'purchase',
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web',
        products
      };

      const result = await TransactionRegistry.createTransaction(txn);

      expect(result).toBeDefined();
      const inserted = mockDb.data.transactions[0];
      expect(inserted.products).toBeDefined();
      expect(inserted.products.length).toBeLessThanOrEqual(TransactionRegistry.MAX_PRODUCTS_BLOB_LENGTH);
    });

    test('PASS_createTransaction_6: Optional fields omitted (ip_address, refund_reason, dispute_id)', async () => {
      const txn = {
        order_id: 'order-006',
        amount: 2000,
        order_type: 'simple',
        customer_uid: 'cust-simple',
        status: 'pending',
        direction: 'purchase',
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web'
        // No ip_address, refund_reason, dispute_id
      };

      const result = await TransactionRegistry.createTransaction(txn);

      expect(result).toBeDefined();
      const inserted = mockDb.data.transactions[0];
      expect(inserted.ip_address).toBeUndefined();
      expect(inserted.refund_reason).toBeUndefined();
      expect(inserted.dispute_id).toBeUndefined();
    });

    test('PASS_createTransaction_7: Direction provided via transaction_kind', async () => {
      const txn = {
        order_id: 'order-007',
        amount: 1500,
        order_type: 'test',
        customer_uid: 'cust-test',
        status: 'pending',
        transaction_kind: 'refund', // Using transaction_kind instead of direction
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web'
      };

      const result = await TransactionRegistry.createTransaction(txn);

      expect(result).toBeDefined();
      const inserted = mockDb.data.transactions[0];
      expect(inserted.direction).toBe('refund');
    });

    test('PASS_createTransaction_8: Direction provided via transactionKind (camelCase)', async () => {
      const txn = {
        order_id: 'order-008',
        amount: 2500,
        order_type: 'test',
        customer_uid: 'cust-test',
        status: 'pending',
        transactionKind: 'chargeback', // Using transactionKind camelCase
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web'
      };

      const result = await TransactionRegistry.createTransaction(txn);

      expect(result).toBeDefined();
      const inserted = mockDb.data.transactions[0];
      expect(inserted.direction).toBe('chargeback');
    });

    test('PASS_createTransaction_9: Status normalized to lowercase', async () => {
      const txn = {
        order_id: 'order-009',
        amount: 1000,
        order_type: 'test',
        customer_uid: 'cust-test',
        status: 'PENDING', // Uppercase
        direction: 'purchase',
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web'
      };

      const result = await TransactionRegistry.createTransaction(txn);

      expect(result).toBeDefined();
      const inserted = mockDb.data.transactions[0];
      expect(inserted.status).toBe('pending'); // Should be lowercase
    });

    test('PASS_createTransaction_10: Logger.writeLog fails but transaction still succeeds', async () => {
      Logger.setWriteLogShouldThrow(true);

      const txn = {
        order_id: 'order-010',
        amount: 1000,
        order_type: 'test',
        customer_uid: 'cust-test',
        status: 'pending',
        direction: 'purchase',
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web'
      };

      const result = await TransactionRegistry.createTransaction(txn);

      // Transaction should still succeed even if logging fails
      expect(result).toBeDefined();
      expect(result.transaction_id).toBeDefined();
      expect(mockDb.data.transactions.length).toBe(1);
    });

    test('PASS_createTransaction_11: Owner allocation logging partially fails but continues', async () => {
      Logger.setWriteLogShouldThrow(true);

      const txn = {
        order_id: 'order-011',
        amount: 3000,
        order_type: 'test',
        customer_uid: 'cust-test',
        status: 'pending',
        direction: 'purchase',
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web',
        owner_allocations: [
          { owner_uuid: 'owner-1', amount_cents: 1500 },
          { owner_uuid: 'owner-2', amount_cents: 1500 }
        ]
      };

      const result = await TransactionRegistry.createTransaction(txn);

      // Transaction should succeed despite logging failures
      expect(result).toBeDefined();
      expect(result.transaction_id).toBeDefined();
    });

    test('PASS_createTransaction_12: Meta contains null values that are preserved', async () => {
      const txn = {
        order_id: 'order-012',
        amount: 1000,
        order_type: 'test',
        customer_uid: 'cust-test',
        status: 'pending',
        direction: 'purchase',
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web',
        meta: {
          field1: 'value',
          field2: null,
          field3: 'another'
        }
      };

      const result = await TransactionRegistry.createTransaction(txn);

      expect(result).toBeDefined();
      const inserted = mockDb.data.transactions[0];
      const parsedMeta = JSON.parse(inserted.meta);
      expect(parsedMeta.field2).toBeNull();
    });
  });

  // ==================== FAIL SCENARIOS ====================

  describe('FAIL Scenarios', () => {
    test('FAIL_createTransaction_1: Missing required field order_id', async () => {
      const txn = {
        // order_id missing
        amount: 1000,
        order_type: 'test',
        customer_uid: 'cust-test',
        status: 'pending',
        direction: 'purchase',
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web'
      };

      await expect(TransactionRegistry.createTransaction(txn)).rejects.toThrow();
      expect(ErrorHandler.getErrors().length).toBeGreaterThan(0);
    });

    test('FAIL_createTransaction_2: Missing required field amount', async () => {
      const txn = {
        order_id: 'order-fail-002',
        // amount missing
        order_type: 'test',
        customer_uid: 'cust-test',
        status: 'pending',
        direction: 'purchase',
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web'
      };

      await expect(TransactionRegistry.createTransaction(txn)).rejects.toThrow();
      expect(ErrorHandler.getErrors().length).toBeGreaterThan(0);
    });

    test('FAIL_createTransaction_3: Invalid direction not in allowed list', async () => {
      const txn = {
        order_id: 'order-fail-003',
        amount: 1000,
        order_type: 'test',
        customer_uid: 'cust-test',
        status: 'pending',
        direction: 'invalid_direction', // Invalid
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web'
      };

      await expect(TransactionRegistry.createTransaction(txn)).rejects.toThrow();
      expect(ErrorHandler.hasError('direction')).toBe(true);
    });

    test('FAIL_createTransaction_4: Direction is empty string', async () => {
      const txn = {
        order_id: 'order-fail-004',
        amount: 1000,
        order_type: 'test',
        customer_uid: 'cust-test',
        status: 'pending',
        direction: '', // Empty string
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web'
      };

      await expect(TransactionRegistry.createTransaction(txn)).rejects.toThrow();
    });

    test('FAIL_createTransaction_5: Owner allocations not an array', async () => {
      const txn = {
        order_id: 'order-fail-005',
        amount: 1000,
        order_type: 'test',
        customer_uid: 'cust-test',
        status: 'pending',
        direction: 'purchase',
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web',
        owner_allocations: 'not-an-array' // Invalid type
      };

      await expect(TransactionRegistry.createTransaction(txn)).rejects.toThrow();
    });

    test('FAIL_createTransaction_6: Owner allocation missing owner_uuid', async () => {
      const txn = {
        order_id: 'order-fail-006',
        amount: 1000,
        order_type: 'test',
        customer_uid: 'cust-test',
        status: 'pending',
        direction: 'purchase',
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web',
        owner_allocations: [{ amount_cents: 1000 }] // Missing owner_uuid
      };

      await expect(TransactionRegistry.createTransaction(txn)).rejects.toThrow();
    });

    test('FAIL_createTransaction_7: Owner allocation missing amount_cents', async () => {
      const txn = {
        order_id: 'order-fail-007',
        amount: 1000,
        order_type: 'test',
        customer_uid: 'cust-test',
        status: 'pending',
        direction: 'purchase',
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web',
        owner_allocations: [{ owner_uuid: 'owner-1' }] // Missing amount_cents
      };

      await expect(TransactionRegistry.createTransaction(txn)).rejects.toThrow();
    });

    test('FAIL_createTransaction_8: Meta key violates META_KEY_PATTERN', async () => {
      const txn = {
        order_id: 'order-fail-008',
        amount: 1000,
        order_type: 'test',
        customer_uid: 'cust-test',
        status: 'pending',
        direction: 'purchase',
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web',
        meta: { 'invalid key!': 'value' } // Space and special char not allowed
      };

      await expect(TransactionRegistry.createTransaction(txn)).rejects.toThrow();
      expect(ErrorHandler.hasError('meta')).toBe(true);
    });

    test('FAIL_createTransaction_9: Meta exceeds MAX_META_BLOB_LENGTH', async () => {
      const largeString = 'x'.repeat(TransactionRegistry.MAX_META_BLOB_LENGTH + 1000);
      const txn = {
        order_id: 'order-fail-009',
        amount: 1000,
        order_type: 'test',
        customer_uid: 'cust-test',
        status: 'pending',
        direction: 'purchase',
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web',
        meta: { data: largeString }
      };

      await expect(TransactionRegistry.createTransaction(txn)).rejects.toThrow();
      expect(ErrorHandler.hasError('meta')).toBe(true);
    });

    test('FAIL_createTransaction_10: Owner allocations exceed MAX_OWNER_ALLOCATIONS_BLOB_LENGTH', async () => {
      const largeAllocations = Array(1000).fill(null).map((_, i) => ({
        owner_uuid: `owner-${i}`,
        amount_cents: 100
      }));
      const txn = {
        order_id: 'order-fail-010',
        amount: 1000,
        order_type: 'test',
        customer_uid: 'cust-test',
        status: 'pending',
        direction: 'purchase',
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web',
        owner_allocations: largeAllocations
      };

      await expect(TransactionRegistry.createTransaction(txn)).rejects.toThrow();
      expect(ErrorHandler.hasError('owner_allocations')).toBe(true);
    });

    test('FAIL_createTransaction_11: Products exceed MAX_PRODUCTS_BLOB_LENGTH', async () => {
      const largeProducts = Array(2000).fill(null).map((_, i) => ({
        id: `prod-${i}`,
        name: `Product ${i}`,
        description: 'x'.repeat(100)
      }));
      const txn = {
        order_id: 'order-fail-011',
        amount: 1000,
        order_type: 'test',
        customer_uid: 'cust-test',
        status: 'pending',
        direction: 'purchase',
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web',
        products: largeProducts
      };

      await expect(TransactionRegistry.createTransaction(txn)).rejects.toThrow();
      expect(ErrorHandler.hasError('products')).toBe(true);
    });

    test('FAIL_createTransaction_12: Meta contains circular reference (JSON serialization failure)', async () => {
      const circular = { a: 'value' };
      circular.self = circular; // Circular reference

      const txn = {
        order_id: 'order-fail-012',
        amount: 1000,
        order_type: 'test',
        customer_uid: 'cust-test',
        status: 'pending',
        direction: 'purchase',
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web',
        meta: circular
      };

      await expect(TransactionRegistry.createTransaction(txn)).rejects.toThrow();
    });

    test('FAIL_createTransaction_13: DB insert returns no transaction_id', async () => {
      // Mock DB to return result without transaction_id
      mockDb.insert = jest.fn().mockResolvedValue({});

      const txn = {
        order_id: 'order-fail-013',
        amount: 1000,
        order_type: 'test',
        customer_uid: 'cust-test',
        status: 'pending',
        direction: 'purchase',
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web'
      };

      await expect(TransactionRegistry.createTransaction(txn)).rejects.toThrow('Transaction insert failed to return an ID');
    });

    test('FAIL_createTransaction_14: DB insert throws exception', async () => {
      mockDb.insert = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const txn = {
        order_id: 'order-fail-014',
        amount: 1000,
        order_type: 'test',
        customer_uid: 'cust-test',
        status: 'pending',
        direction: 'purchase',
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web'
      };

      await expect(TransactionRegistry.createTransaction(txn)).rejects.toThrow('Database connection failed');
      expect(ErrorHandler.getErrors().length).toBeGreaterThan(0);
    });

    test('FAIL_createTransaction_15: Sanitization throws TypeError', async () => {
      const txn = {
        order_id: 'order-fail-015',
        amount: 'not-a-number', // Invalid type that might cause sanitization error
        order_type: 'test',
        customer_uid: 'cust-test',
        status: 'pending',
        direction: 'purchase',
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web'
      };

      await expect(TransactionRegistry.createTransaction(txn)).rejects.toThrow();
    });
  });
});
