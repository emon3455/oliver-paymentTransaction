const TransactionRegistry = require('../PaymentTransactionsRegistryStore');
const PostgreSQL = require('../__mocks__/PostgreSQL');
const Logger = require('../__mocks__/Logger');
const ErrorHandler = require('../__mocks__/ErrorHandler');

jest.mock('../PostgreSQL');
jest.mock('../Logger');
jest.mock('../ErrorHandler');

describe('TransactionRegistry - getTransaction - COMPREHENSIVE', () => {
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
    test('PASS_getTransaction_1: Existing transaction returned', async () => {
      const txnData = {
        transaction_id: 'txn-get-001',
        order_id: 'order-001',
        amount: 1000,
        status: 'completed',
        direction: 'purchase',
        is_deleted: false,
        meta: JSON.stringify({ key: 'value' }),
        owner_allocations: JSON.stringify([{ owner_uuid: 'owner-1', amount_cents: 1000 }]),
        products: JSON.stringify([{ id: 'p1', name: 'Product 1' }])
      };
      mockDb.data.transactions.push(txnData);

      const result = await TransactionRegistry.getTransaction('txn-get-001');

      expect(result).toBeDefined();
      expect(result.transaction_id).toBe('txn-get-001');
      expect(result.order_id).toBe('order-001');
    });

    test('PASS_getTransaction_2: Soft-deleted transaction returns null', async () => {
      const txnData = {
        transaction_id: 'txn-get-002',
        order_id: 'order-002',
        amount: 2000,
        status: 'completed',
        direction: 'purchase',
        is_deleted: true,
        deleted_at: new Date().toISOString()
      };
      mockDb.data.transactions.push(txnData);

      const result = await TransactionRegistry.getTransaction('txn-get-002');

      expect(result).toBeNull();
    });

    test('PASS_getTransaction_3: Logger debug only, no writeLog required', async () => {
      const txnData = {
        transaction_id: 'txn-get-003',
        order_id: 'order-003',
        amount: 1500,
        status: 'pending',
        direction: 'purchase',
        is_deleted: false
      };
      mockDb.data.transactions.push(txnData);

      const result = await TransactionRegistry.getTransaction('txn-get-003');

      expect(result).toBeDefined();
      // Only debug logs should be present, not writeLog
      expect(Logger.getDebugLogs().length).toBeGreaterThan(0);
      expect(Logger.getLogs().length).toBe(0);
    });
  });

  describe('FAIL Scenarios', () => {
    test('FAIL_getTransaction_1: Missing transaction_id', async () => {
      await expect(TransactionRegistry.getTransaction(null))
        .rejects.toThrow();
    });

    test('FAIL_getTransaction_2: Invalid transaction_id', async () => {
      await expect(TransactionRegistry.getTransaction(''))
        .rejects.toThrow();
    });

    test('FAIL_getTransaction_3: DB query throws error', async () => {
      mockDb.getRow = jest.fn().mockRejectedValue(new Error('Database timeout'));

      await expect(TransactionRegistry.getTransaction('txn-fail-003'))
        .rejects.toThrow('Database timeout');
    });
  });
});
