const TransactionRegistry = require('../PaymentTransactionsRegistryStore');
const PostgreSQL = require('../__mocks__/PostgreSQL');
const Logger = require('../__mocks__/Logger');
const ErrorHandler = require('../__mocks__/ErrorHandler');

jest.mock('../PostgreSQL');
jest.mock('../Logger');
jest.mock('../ErrorHandler');

describe('TransactionRegistry - query - COMPREHENSIVE', () => {
  let mockDb;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = new PostgreSQL();
    TransactionRegistry._db = mockDb;
    Logger.reset();
    ErrorHandler.reset();

    // Add test data
    for (let i = 1; i <= 50; i++) {
      mockDb.data.transactions.push({
        transaction_id: `txn-${i}`,
        order_id: `order-${i}`,
        customer_uid: i <= 25 ? 'cust-A' : 'cust-B',
        amount: i * 100,
        status: i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'pending' : 'refunded',
        direction: 'purchase',
        order_type: i % 2 === 0 ? 'product' : 'subscription',
        is_deleted: false,
        created_at: new Date(2026, 0, i).toISOString(),
        owners: JSON.stringify([`owner-${i % 5}`])
      });
    }
  });

  afterEach(() => {
    TransactionRegistry._db = null;
  });

  describe('PASS Scenarios', () => {
    test('PASS_query_1: No filters, default pagination', async () => {
      const result = await TransactionRegistry.query();

      expect(result).toBeDefined();
      expect(result.rows).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(Array.isArray(result.rows)).toBe(true);
    });

    test('PASS_query_2: Filter by transaction_id', async () => {
      const result = await TransactionRegistry.query({ transaction_id: 'txn-10' });

      expect(result).toBeDefined();
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].transaction_id).toBe('txn-10');
    });

    test('PASS_query_3: Filter by customer_uid', async () => {
      const result = await TransactionRegistry.query({ customer_uid: 'cust-A' });

      expect(result).toBeDefined();
      expect(result.rows.length).toBeGreaterThan(0);
      result.rows.forEach(row => {
        expect(row.customer_uid).toBe('cust-A');
      });
    });

    test('PASS_query_4: Filter by ownerIds array', async () => {
      const result = await TransactionRegistry.query({ ownerIds: ['owner-1', 'owner-2'] });

      expect(result).toBeDefined();
      expect(result.rows).toBeDefined();
      expect(Array.isArray(result.rows)).toBe(true);
    });

    test('PASS_query_5: Filter by order_type', async () => {
      const result = await TransactionRegistry.query({ order_type: 'product' });

      expect(result).toBeDefined();
      result.rows.forEach(row => {
        expect(row.order_type).toBe('product');
      });
    });

    test('PASS_query_6: Filter by status', async () => {
      const result = await TransactionRegistry.query({ status: 'completed' });

      expect(result).toBeDefined();
      result.rows.forEach(row => {
        expect(row.status).toBe('completed');
      });
    });

    test('PASS_query_7: Filter by dateStart only', async () => {
      const result = await TransactionRegistry.query({ dateStart: '2026-01-15' });

      expect(result).toBeDefined();
      expect(result.rows).toBeDefined();
      result.rows.forEach(row => {
        expect(new Date(row.created_at) >= new Date('2026-01-15')).toBe(true);
      });
    });

    test('PASS_query_8: Filter by dateEnd only', async () => {
      const result = await TransactionRegistry.query({ dateEnd: '2026-01-20' });

      expect(result).toBeDefined();
      expect(result.rows).toBeDefined();
      result.rows.forEach(row => {
        expect(new Date(row.created_at) <= new Date('2026-01-20')).toBe(true);
      });
    });

    test('PASS_query_9: Filter by date range', async () => {
      const result = await TransactionRegistry.query({
        dateStart: '2026-01-10',
        dateEnd: '2026-01-20'
      });

      expect(result).toBeDefined();
      result.rows.forEach(row => {
        const date = new Date(row.created_at);
        expect(date >= new Date('2026-01-10')).toBe(true);
        expect(date <= new Date('2026-01-20')).toBe(true);
      });
    });

    test('PASS_query_10: Pagination limit capped at MAX_LIMIT', async () => {
      const result = await TransactionRegistry.query({}, { limit: 1000 });

      expect(result).toBeDefined();
      expect(result.rows.length).toBeLessThanOrEqual(TransactionRegistry.MAX_LIMIT);
    });

    test('PASS_query_11: Offset below zero normalized to DEFAULT_OFFSET', async () => {
      const result = await TransactionRegistry.query({}, { offset: -10 });

      expect(result).toBeDefined();
      expect(result.rows).toBeDefined();
      // Should not throw, should normalize to 0
    });

    test('PASS_query_12: Empty result set returns { rows: [], total }', async () => {
      const result = await TransactionRegistry.query({ customer_uid: 'non-existent-customer' });

      expect(result).toBeDefined();
      expect(result.rows).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('FAIL Scenarios', () => {
    test('FAIL_query_1: Invalid dateStart format', async () => {
      await expect(TransactionRegistry.query({ dateStart: 'not-a-date' }))
        .rejects.toThrow();
      expect(ErrorHandler.getErrors().length).toBeGreaterThan(0);
    });

    test('FAIL_query_2: Invalid dateEnd format', async () => {
      await expect(TransactionRegistry.query({ dateEnd: 'invalid-date-format' }))
        .rejects.toThrow();
      expect(ErrorHandler.getErrors().length).toBeGreaterThan(0);
    });

    test('FAIL_query_3: dateStart after dateEnd', async () => {
      await expect(TransactionRegistry.query({
        dateStart: '2026-01-20',
        dateEnd: '2026-01-10'
      })).rejects.toThrow();
      expect(ErrorHandler.getErrors().length).toBeGreaterThan(0);
    });

    test('FAIL_query_4: OwnerIds not serializable', async () => {
      const circular = {};
      circular.self = circular;

      await expect(TransactionRegistry.query({ ownerIds: circular }))
        .rejects.toThrow();
    });

    test('FAIL_query_5: Invalid WHERE clause generation', async () => {
      // Test with malicious SQL injection attempt
      await expect(TransactionRegistry.query({ 
        transaction_id: "'; DROP TABLE transactions; --" 
      })).rejects.toThrow();
    });

    test('FAIL_query_6: Count query throws error', async () => {
      mockDb.getRow = jest.fn().mockRejectedValue(new Error('Count query failed'));

      await expect(TransactionRegistry.query())
        .rejects.toThrow('Count query failed');
    });

    test('FAIL_query_7: Data query throws error', async () => {
      mockDb.getRow = jest.fn().mockResolvedValue({ total: 10 });
      mockDb.query = jest.fn().mockRejectedValue(new Error('Data query failed'));

      await expect(TransactionRegistry.query())
        .rejects.toThrow('Data query failed');
    });
  });
});
