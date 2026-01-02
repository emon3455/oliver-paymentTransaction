const TransactionRegistry = require('../PaymentTransactionsRegistryStore');
const PostgreSQL = require('../__mocks__/PostgreSQL');
const Logger = require('../__mocks__/Logger');
const ErrorHandler = require('../__mocks__/ErrorHandler');

jest.mock('../PostgreSQL');
jest.mock('../Logger');
jest.mock('../ErrorHandler');

describe('TransactionRegistry - closeConnections - COMPREHENSIVE', () => {
  let mockDb;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = new PostgreSQL();
    Logger.reset();
    ErrorHandler.reset();
  });

  afterEach(() => {
    TransactionRegistry._db = null;
  });

  describe('PASS Scenarios', () => {
    test('PASS_closeConnections_1: No db instance present', async () => {
      TransactionRegistry._db = null;

      await expect(TransactionRegistry.closeConnections()).resolves.not.toThrow();
    });

    test('PASS_closeConnections_2: Active connections closed successfully', async () => {
      TransactionRegistry._db = mockDb;
      mockDb.closeAllConnections = jest.fn().mockResolvedValue();

      await TransactionRegistry.closeConnections();

      expect(mockDb.closeAllConnections).toHaveBeenCalled();
      expect(TransactionRegistry._db).toBeNull();
    });
  });

  describe('FAIL Scenarios', () => {
    test('FAIL_closeConnections_1: closeAllConnections throws error but db reset still occurs', async () => {
      TransactionRegistry._db = mockDb;
      mockDb.closeAllConnections = jest.fn().mockRejectedValue(new Error('Close failed'));

      await TransactionRegistry.closeConnections();

      // Should not throw, should handle gracefully
      expect(mockDb.closeAllConnections).toHaveBeenCalled();
      expect(TransactionRegistry._db).toBeNull(); // db should still be reset
    });
  });
});
