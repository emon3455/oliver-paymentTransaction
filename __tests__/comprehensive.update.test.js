const TransactionRegistry = require('../PaymentTransactionsRegistryStore');
const PostgreSQL = require('../__mocks__/PostgreSQL');
const Logger = require('../__mocks__/Logger');
const ErrorHandler = require('../__mocks__/ErrorHandler');

jest.mock('../PostgreSQL');
jest.mock('../Logger');
jest.mock('../ErrorHandler');

describe('TransactionRegistry - updateTransaction - COMPREHENSIVE', () => {
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

  describe('PASS Scenarios', () => {
    test('PASS_updateTransaction_1: Update status only', async () => {
      const txnData = {
        transaction_id: 'txn-001',
        order_id: 'order-001',
        amount: 1000,
        status: 'pending',
        direction: 'purchase',
        owners: [],
        owner_allocations: [],
        products: []
      };
      mockDb.data.transactions.push(txnData);

      const result = await TransactionRegistry.updateTransaction('txn-001', { status: 'completed' });

      expect(result).toBeDefined();
      expect(mockDb.data.transactions[0].status).toBe('completed');
    });

    test('PASS_updateTransaction_2: Update refund_amount and refund_reason', async () => {
      const txnData = {
        transaction_id: 'txn-002',
        order_id: 'order-002',
        amount: 5000,
        status: 'completed',
        direction: 'purchase',
        owners: [],
        owner_allocations: [],
        products: []
      };
      mockDb.data.transactions.push(txnData);

      const result = await TransactionRegistry.updateTransaction('txn-002', {
        refund_amount: 2500,
        refund_reason: 'Partial refund requested by customer'
      });

      expect(result).toBeDefined();
      expect(mockDb.data.transactions[0].refund_amount).toBe(2500);
      expect(mockDb.data.transactions[0].refund_reason).toBe('Partial refund requested by customer');
    });

    test('PASS_updateTransaction_3: Meta update with valid keys', async () => {
      const txnData = {
        transaction_id: 'txn-003',
        order_id: 'order-003',
        amount: 3000,
        status: 'pending',
        direction: 'purchase',
        meta: JSON.stringify({ key1: 'value1' }),
        owners: [],
        owner_allocations: [],
        products: []
      };
      mockDb.data.transactions.push(txnData);

      const result = await TransactionRegistry.updateTransaction('txn-003', {
        meta: { key2: 'value2', key3: 'value3' }
      });

      expect(result).toBeDefined();
      const updatedMeta = JSON.parse(mockDb.data.transactions[0].meta);
      expect(updatedMeta.key2).toBe('value2');
    });

    test('PASS_updateTransaction_4: Meta unset using { unset: true }', async () => {
      const txnData = {
        transaction_id: 'txn-004',
        order_id: 'order-004',
        amount: 2000,
        status: 'completed',
        direction: 'purchase',
        meta: JSON.stringify({ key1: 'value1', key2: 'value2' }),
        owners: [],
        owner_allocations: [],
        products: []
      };
      mockDb.data.transactions.push(txnData);

      const result = await TransactionRegistry.updateTransaction('txn-004', {
        meta: { unset: true }
      });

      expect(result).toBeDefined();
      expect(mockDb.data.transactions[0].meta).toBeNull();
    });

    test('PASS_updateTransaction_5: Products updated with valid payload', async () => {
      const txnData = {
        transaction_id: 'txn-005',
        order_id: 'order-005',
        amount: 10000,
        status: 'pending',
        direction: 'purchase',
        products: JSON.stringify([]),
        owners: [],
        owner_allocations: []
      };
      mockDb.data.transactions.push(txnData);

      const newProducts = [
        { id: 'p1', name: 'Product 1', price: 5000 },
        { id: 'p2', name: 'Product 2', price: 5000 }
      ];

      const result = await TransactionRegistry.updateTransaction('txn-005', {
        products: newProducts
      });

      expect(result).toBeDefined();
      const updatedProducts = JSON.parse(mockDb.data.transactions[0].products);
      expect(updatedProducts.length).toBe(2);
    });

    test('PASS_updateTransaction_6: Multiple fields updated at once', async () => {
      const txnData = {
        transaction_id: 'txn-006',
        order_id: 'order-006',
        amount: 7500,
        status: 'pending',
        direction: 'purchase',
        refund_amount: 0,
        owners: [],
        owner_allocations: [],
        products: []
      };
      mockDb.data.transactions.push(txnData);

      const result = await TransactionRegistry.updateTransaction('txn-006', {
        status: 'refunded',
        refund_amount: 7500,
        refund_reason: 'Customer not satisfied'
      });

      expect(result).toBeDefined();
      expect(mockDb.data.transactions[0].status).toBe('refunded');
      expect(mockDb.data.transactions[0].refund_amount).toBe(7500);
      expect(mockDb.data.transactions[0].refund_reason).toBe('Customer not satisfied');
    });

    test('PASS_updateTransaction_7: Existing owner allocations parsed from JSON string', async () => {
      const txnData = {
        transaction_id: 'txn-007',
        order_id: 'order-007',
        amount: 5000,
        status: 'pending',
        direction: 'purchase',
        owner_allocations: JSON.stringify([{ owner_uuid: 'owner-1', amount_cents: 5000 }]),
        owners: [],
        products: []
      };
      mockDb.data.transactions.push(txnData);

      const result = await TransactionRegistry.updateTransaction('txn-007', {
        status: 'completed'
      });

      expect(result).toBeDefined();
      const allocations = result.owner_allocations;
      expect(Array.isArray(allocations)).toBe(true);
    });

    test('PASS_updateTransaction_8: Logger.writeLog fails but update still succeeds', async () => {
      Logger.setWriteLogShouldThrow(true);

      const txnData = {
        transaction_id: 'txn-008',
        order_id: 'order-008',
        amount: 1000,
        status: 'pending',
        direction: 'purchase',
        owners: [],
        owner_allocations: [],
        products: []
      };
      mockDb.data.transactions.push(txnData);

      const result = await TransactionRegistry.updateTransaction('txn-008', { status: 'completed' });

      expect(result).toBeDefined();
      expect(mockDb.data.transactions[0].status).toBe('completed');
    });

    test('PASS_updateTransaction_9: Field preview truncation respected', async () => {
      const txnData = {
        transaction_id: 'txn-009',
        order_id: 'order-009',
        amount: 1000,
        status: 'pending',
        direction: 'purchase',
        meta: JSON.stringify({ data: 'x'.repeat(2000) }),
        owners: [],
        owner_allocations: [],
        products: []
      };
      mockDb.data.transactions.push(txnData);

      const result = await TransactionRegistry.updateTransaction('txn-009', { status: 'completed' });

      expect(result).toBeDefined();
      // Verify that logging doesn't crash with large fields
      expect(Logger.getDebugLogs().length).toBeGreaterThan(0);
    });
  });

  describe('FAIL Scenarios', () => {
    test('FAIL_updateTransaction_1: Missing transaction_id', async () => {
      await expect(TransactionRegistry.updateTransaction(null, { status: 'completed' }))
        .rejects.toThrow();
    });

    test('FAIL_updateTransaction_2: Fields argument is not an object', async () => {
      await expect(TransactionRegistry.updateTransaction('txn-001', 'not-an-object'))
        .rejects.toThrow();
    });

    test('FAIL_updateTransaction_3: No updatable fields provided', async () => {
      await expect(TransactionRegistry.updateTransaction('txn-001', {}))
        .rejects.toThrow();
    });

    test('FAIL_updateTransaction_4: Attempt to update non-allowed field', async () => {
      const txnData = {
        transaction_id: 'txn-fail-004',
        order_id: 'order-004',
        amount: 1000,
        status: 'pending',
        direction: 'purchase',
        owners: [],
        owner_allocations: [],
        products: []
      };
      mockDb.data.transactions.push(txnData);

      await expect(TransactionRegistry.updateTransaction('txn-fail-004', {
        order_id: 'new-order-id' // order_id should not be updatable
      })).rejects.toThrow();
    });

    test('FAIL_updateTransaction_5: Meta key fails pattern validation', async () => {
      const txnData = {
        transaction_id: 'txn-fail-005',
        order_id: 'order-005',
        amount: 1000,
        status: 'pending',
        direction: 'purchase',
        meta: JSON.stringify({}),
        owners: [],
        owner_allocations: [],
        products: []
      };
      mockDb.data.transactions.push(txnData);

      await expect(TransactionRegistry.updateTransaction('txn-fail-005', {
        meta: { 'invalid key!': 'value' }
      })).rejects.toThrow();
    });

    test('FAIL_updateTransaction_6: Meta exceeds MAX_META_BLOB_LENGTH', async () => {
      const txnData = {
        transaction_id: 'txn-fail-006',
        order_id: 'order-006',
        amount: 1000,
        status: 'pending',
        direction: 'purchase',
        meta: JSON.stringify({}),
        owners: [],
        owner_allocations: [],
        products: []
      };
      mockDb.data.transactions.push(txnData);

      const largeString = 'x'.repeat(TransactionRegistry.MAX_META_BLOB_LENGTH + 1000);
      await expect(TransactionRegistry.updateTransaction('txn-fail-006', {
        meta: { data: largeString }
      })).rejects.toThrow();
    });

    test('FAIL_updateTransaction_7: Products exceeds MAX_PRODUCTS_BLOB_LENGTH', async () => {
      const txnData = {
        transaction_id: 'txn-fail-007',
        order_id: 'order-007',
        amount: 1000,
        status: 'pending',
        direction: 'purchase',
        products: JSON.stringify([]),
        owners: [],
        owner_allocations: []
      };
      mockDb.data.transactions.push(txnData);

      const largeProducts = Array(2000).fill(null).map((_, i) => ({
        id: `prod-${i}`,
        name: `Product ${i}`,
        description: 'x'.repeat(100)
      }));

      await expect(TransactionRegistry.updateTransaction('txn-fail-007', {
        products: largeProducts
      })).rejects.toThrow();
    });

    test('FAIL_updateTransaction_8: Invalid update column name (regex fail)', async () => {
      const txnData = {
        transaction_id: 'txn-fail-008',
        order_id: 'order-008',
        amount: 1000,
        status: 'pending',
        direction: 'purchase',
        owners: [],
        owner_allocations: [],
        products: []
      };
      mockDb.data.transactions.push(txnData);

      await expect(TransactionRegistry.updateTransaction('txn-fail-008', {
        'invalid-column-name!@#': 'value'
      })).rejects.toThrow();
    });

    test('FAIL_updateTransaction_9: Transaction not found or soft-deleted', async () => {
      await expect(TransactionRegistry.updateTransaction('non-existent-txn', { status: 'completed' }))
        .rejects.toThrow();
    });

    test('FAIL_updateTransaction_10: DB update returns no row', async () => {
      mockDb.update = jest.fn().mockResolvedValue(null);

      const txnData = {
        transaction_id: 'txn-fail-010',
        order_id: 'order-010',
        amount: 1000,
        status: 'pending',
        direction: 'purchase',
        owners: [],
        owner_allocations: [],
        products: []
      };
      mockDb.data.transactions.push(txnData);

      await expect(TransactionRegistry.updateTransaction('txn-fail-010', { status: 'completed' }))
        .rejects.toThrow();
    });

    test('FAIL_updateTransaction_11: Transaction SELECT FOR UPDATE throws error', async () => {
      mockDb.transaction = jest.fn().mockRejectedValue(new Error('Lock timeout'));

      await expect(TransactionRegistry.updateTransaction('txn-fail-011', { status: 'completed' }))
        .rejects.toThrow('Lock timeout');
    });

    test('FAIL_updateTransaction_12: JSON stringify fails on preview', async () => {
      const circular = { a: 'value' };
      circular.self = circular;

      const txnData = {
        transaction_id: 'txn-fail-012',
        order_id: 'order-012',
        amount: 1000,
        status: 'pending',
        direction: 'purchase',
        owners: [],
        owner_allocations: [],
        products: []
      };
      mockDb.data.transactions.push(txnData);

      // This should fail or handle gracefully
      await expect(TransactionRegistry.updateTransaction('txn-fail-012', {
        meta: circular
      })).rejects.toThrow();
    });
  });
});
