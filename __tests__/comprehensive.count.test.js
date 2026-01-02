const TransactionRegistry = require('../PaymentTransactionsRegistryStore');
const PostgreSQL = require('../__mocks__/PostgreSQL');
const Logger = require('../__mocks__/Logger');
const ErrorHandler = require('../__mocks__/ErrorHandler');

jest.mock('../PostgreSQL');
jest.mock('../Logger');
jest.mock('../ErrorHandler');

describe('TransactionRegistry - Count Methods - COMPREHENSIVE', () => {
  let mockDb;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = new PostgreSQL();
    TransactionRegistry._db = mockDb;
    Logger.reset();
    ErrorHandler.reset();

    // Add test data
    for (let i = 1; i <= 30; i++) {
      mockDb.data.transactions.push({
        transaction_id: `txn-${i}`,
        order_id: `order-${i}`,
        amount: i * 100,
        status: i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'pending' : 'refunded',
        direction: 'purchase',
        is_deleted: i > 25 // Last 5 are soft-deleted
      });
    }
  });

  afterEach(() => {
    TransactionRegistry._db = null;
  });

  describe('getAllCount', () => {
    describe('PASS Scenarios', () => {
      test('PASS_getAllCount_1: Returns correct count', async () => {
        const count = await TransactionRegistry.getAllCount();

        expect(count).toBe(25); // 30 total, 5 deleted
        expect(typeof count).toBe('number');
      });

      test('PASS_getAllCount_2: No rows returns 0', async () => {
        mockDb.data.transactions = mockDb.data.transactions.map(t => ({ ...t, is_deleted: true }));

        const count = await TransactionRegistry.getAllCount();

        expect(count).toBe(0);
      });
    });

    describe('FAIL Scenarios', () => {
      test('FAIL_getAllCount_1: DB query throws error', async () => {
        mockDb.getRow = jest.fn().mockRejectedValue(new Error('Database unavailable'));

        const count = await TransactionRegistry.getAllCount();

        // Should return 0 and log error
        expect(count).toBe(0);
        expect(ErrorHandler.getErrors().length).toBeGreaterThan(0);
      });
    });
  });

  describe('getAllCountByStatus', () => {
    describe('PASS Scenarios', () => {
      test('PASS_getAllCountByStatus_1: Valid status normalized and counted', async () => {
        const count = await TransactionRegistry.getAllCountByStatus('COMPLETED');

        expect(count).toBeGreaterThan(0);
        expect(typeof count).toBe('number');
      });

      test('PASS_getAllCountByStatus_2: No matching rows returns 0', async () => {
        const count = await TransactionRegistry.getAllCountByStatus('cancelled');

        expect(count).toBe(0);
      });
    });

    describe('FAIL Scenarios', () => {
      test('FAIL_getAllCountByStatus_1: Missing status', async () => {
        const count = await TransactionRegistry.getAllCountByStatus(null);

        // Should return 0 and log error
        expect(count).toBe(0);
        expect(ErrorHandler.getErrors().length).toBeGreaterThan(0);
      });

      test('FAIL_getAllCountByStatus_2: Invalid status type', async () => {
        const count = await TransactionRegistry.getAllCountByStatus(12345);

        // Should handle gracefully
        expect(typeof count).toBe('number');
      });

      test('FAIL_getAllCountByStatus_3: DB query failure', async () => {
        mockDb.getRow = jest.fn().mockRejectedValue(new Error('Query timeout'));

        const count = await TransactionRegistry.getAllCountByStatus('pending');

        expect(count).toBe(0);
        expect(ErrorHandler.getErrors().length).toBeGreaterThan(0);
      });
    });
  });
});
