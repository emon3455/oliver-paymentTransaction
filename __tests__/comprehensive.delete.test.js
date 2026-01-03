const TransactionRegistry = require('../PaymentTransactionsRegistryStore');
const PostgreSQL = require('../__mocks__/PostgreSQL');
const Logger = require('../__mocks__/Logger');
const ErrorHandler = require('../__mocks__/ErrorHandler');

jest.mock('../PostgreSQL', () => {
  return require('../__mocks__/PostgreSQL');
});

jest.mock('../Logger', () => {
  return require('../__mocks__/Logger');
});

jest.mock('../ErrorHandler', () => {
  return require('../__mocks__/ErrorHandler');
});

describe('TransactionRegistry - deleteTransaction - COMPREHENSIVE', () => {
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
    test('PASS_deleteTransaction_1: Valid transaction deleted (soft delete)', async () => {
      const txnData = {
        transaction_id: 'txn-del-001',
        order_id: 'order-001',
        amount: 1000,
        status: 'pending',
        direction: 'purchase',
        is_deleted: false,
        owners: [],
        owner_allocations: [],
        products: []
      };
      mockDb.data.transactions.push(txnData);

      const result = await TransactionRegistry.deleteTransaction('txn-del-001');

      expect(result).toBe(true);
      expect(mockDb.data.transactions[0].is_deleted).toBe(true);
      expect(mockDb.data.transactions[0].deleted_at).toBeDefined();
    });

    test('PASS_deleteTransaction_2: Delete called on already deleted transaction (no rows affected)', async () => {
      const txnData = {
        transaction_id: 'txn-del-002',
        order_id: 'order-002',
        amount: 2000,
        status: 'completed',
        direction: 'purchase',
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        owners: [],
        owner_allocations: [],
        products: []
      };
      mockDb.data.transactions.push(txnData);

      const result = await TransactionRegistry.deleteTransaction('txn-del-002');

      // Should still return true even if no rows affected
      expect(result).toBe(true);
    });

    test('PASS_deleteTransaction_3: Logger.writeLog failure tolerated', async () => {
      Logger.setWriteLogShouldThrow(true);

      const txnData = {
        transaction_id: 'txn-del-003',
        order_id: 'order-003',
        amount: 1500,
        status: 'pending',
        direction: 'purchase',
        is_deleted: false,
        owners: [],
        owner_allocations: [],
        products: []
      };
      mockDb.data.transactions.push(txnData);

      const result = await TransactionRegistry.deleteTransaction('txn-del-003');

      expect(result).toBe(true);
      expect(mockDb.data.transactions[0].is_deleted).toBe(true);
    });
  });

  describe('FAIL Scenarios', () => {
    test('FAIL_deleteTransaction_1: Missing transaction_id', async () => {
      await expect(TransactionRegistry.deleteTransaction(null))
        .rejects.toThrow();
    });

    test('FAIL_deleteTransaction_2: Invalid transaction_id type', async () => {
      await expect(TransactionRegistry.deleteTransaction(12345)) // Number instead of string
        .rejects.toThrow();
    });

    test('FAIL_deleteTransaction_3: DB update throws error', async () => {
      mockDb.update = jest.fn().mockRejectedValue(new Error('Database connection lost'));

      await expect(TransactionRegistry.deleteTransaction('txn-fail-003'))
        .rejects.toThrow('Database connection lost');
    });

    test('FAIL_deleteTransaction_4: Sanitization failure', async () => {
      const maliciousInput = { toString: () => { throw new Error('Attack'); } };

      await expect(TransactionRegistry.deleteTransaction(maliciousInput))
        .rejects.toThrow();
    });
  });
});
