/**
 * Jest Tests for PaymentTransactionsRegistryStore - VALIDATION & Edge Cases
 * Tests 46-50: Field validation and sanitization
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

describe('TransactionRegistry - VALIDATION Tests', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = new PostgreSQLMock();
    TransactionRegistry._db = mockDb;
    Logger.reset();
    ErrorHandler.reset();
  });

  // Test 46: Currency validation
  test('46. Currency validation', async () => {
    const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD'];
    
    for (const currency of validCurrencies) {
      const txn = {
        order_id: `order_currency_${currency}`,
        amount: 10000,
        order_type: 'product',
        customer_uid: 'customer_test',
        status: 'completed',
        direction: 'purchase',
        payment_method: 'stripe',
        currency: currency,
        platform: 'web',
        owners: ['owner_1'],
        owner_allocations: [{ owner_uuid: 'owner_1', amount_cents: 10000 }],
        products: [{ product_id: 'prod_1', price: 10000 }]
      };

      const result = await TransactionRegistry.createTransaction(txn);
      expect(result).toBeDefined();
      expect(result.currency).toBe(currency);
    }

    const dbData = mockDb.getAllData('transactions');
    expect(dbData.length).toBe(validCurrencies.length);
  });

  // Test 47: IP address sanitization
  test('47. IP address sanitization', async () => {
    const testCases = [
      { ip: '192.168.1.1', expected: '192.168.1.1' },
      { ip: '10.0.0.1', expected: '10.0.0.1' },
      { ip: '2001:0db8:85a3:0000:0000:8a2e:0370:7334', expected: '2001:0db8:85a3:0000:0000:8a2e:0370:7334' },
      { ip: '  127.0.0.1  ', expected: '127.0.0.1' }, // Should be trimmed
    ];

    for (const testCase of testCases) {
      const txn = {
        order_id: `order_ip_${testCase.ip.replace(/[^0-9]/g, '')}`,
        amount: 5000,
        order_type: 'product',
        customer_uid: 'customer_ip_test',
        status: 'completed',
        direction: 'purchase',
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web',
        ip_address: testCase.ip,
        owners: ['owner_1'],
        owner_allocations: [{ owner_uuid: 'owner_1', amount_cents: 5000 }],
        products: [{ product_id: 'prod_1', price: 5000 }]
      };

      const result = await TransactionRegistry.createTransaction(txn);
      expect(result).toBeDefined();
      expect(result.ip_address).toBeDefined();
      // Verify IP is sanitized (trimmed at minimum)
      expect(result.ip_address.trim()).toBe(result.ip_address);
    }
  });

  // Test 48: Platform field handling
  test('48. Platform field handling', async () => {
    const platforms = ['web', 'mobile', 'ios', 'android', 'desktop'];

    for (const platform of platforms) {
      const txn = {
        order_id: `order_platform_${platform}`,
        amount: 6000,
        order_type: 'product',
        customer_uid: 'customer_platform',
        status: 'completed',
        direction: 'purchase',
        payment_method: 'stripe',
        currency: 'USD',
        platform: platform,
        owners: ['owner_1'],
        owner_allocations: [{ owner_uuid: 'owner_1', amount_cents: 6000 }],
        products: [{ product_id: 'prod_1', price: 6000 }]
      };

      const result = await TransactionRegistry.createTransaction(txn);
      expect(result).toBeDefined();
      expect(result.platform).toBe(platform);
    }

    const dbData = mockDb.getAllData('transactions');
    const platformTxns = dbData.filter(t => t.customer_uid === 'customer_platform');
    expect(platformTxns.length).toBe(platforms.length);
  });

  // Test 49: Payment method handling
  test('49. Payment method handling', async () => {
    const paymentMethods = ['stripe', 'paypal', 'credit_card', 'bank_transfer', 'crypto'];

    for (const method of paymentMethods) {
      const txn = {
        order_id: `order_payment_${method}`,
        amount: 7000,
        order_type: 'product',
        customer_uid: 'customer_payment',
        status: 'completed',
        direction: 'purchase',
        payment_method: method,
        currency: 'USD',
        platform: 'web',
        owners: ['owner_1'],
        owner_allocations: [{ owner_uuid: 'owner_1', amount_cents: 7000 }],
        products: [{ product_id: 'prod_1', price: 7000 }]
      };

      const result = await TransactionRegistry.createTransaction(txn);
      expect(result).toBeDefined();
      expect(result.payment_method).toBe(method);
    }

    const dbData = mockDb.getAllData('transactions');
    const paymentTxns = dbData.filter(t => t.customer_uid === 'customer_payment');
    expect(paymentTxns.length).toBe(paymentMethods.length);
  });

  // Test 50: User agent handling
  test('50. User agent handling', async () => {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      'PostmanRuntime/7.26.8',
      'curl/7.68.0',
      ''  // Empty user agent should be handled
    ];

    for (let i = 0; i < userAgents.length; i++) {
      const userAgent = userAgents[i];
      const txn = {
        order_id: `order_ua_${i}`,
        amount: 8000,
        order_type: 'product',
        customer_uid: 'customer_ua',
        status: 'completed',
        direction: 'purchase',
        payment_method: 'stripe',
        currency: 'USD',
        platform: 'web',
        user_agent: userAgent,
        owners: ['owner_1'],
        owner_allocations: [{ owner_uuid: 'owner_1', amount_cents: 8000 }],
        products: [{ product_id: 'prod_1', price: 8000 }]
      };

      const result = await TransactionRegistry.createTransaction(txn);
      expect(result).toBeDefined();
      
      // user_agent is optional, so it may be null or sanitized string
      if (userAgent) {
        expect(result.user_agent).toBeDefined();
      }
    }

    const dbData = mockDb.getAllData('transactions');
    const uaTxns = dbData.filter(t => t.customer_uid === 'customer_ua');
    expect(uaTxns.length).toBe(userAgents.length);
  });
});
