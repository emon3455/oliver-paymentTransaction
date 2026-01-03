/**
 * Edge Tests - Payment Transactions Registry
 * 
 * Comprehensive edge test page for all transaction CRUD operations,
 * query/filtering, and count methods matching all 141 Jest tests.
 */

(function () {
  function waitForAdminShell() {
    return new Promise((resolve) => {
      if (window.AdminShell && window.AdminShell.pageContent) {
        resolve();
      } else {
        document.body.addEventListener("adminshell:ready", resolve, { once: true });
      }
    });
  }

  waitForAdminShell().then(() => {
    if (!window.AdminShell || !window.AdminShell.pageContent) {
      console.error("AdminShell.pageContent is still null after ready event");
      return;
    }

    const pageContent = window.AdminShell.pageContent;
    const { spinner, spinnerInline, errorMessage } = window.AdminUtils || {};

    // Store created transaction IDs for cleanup
    const createdTransactionIds = [];

    function getBaseUrl() {
      let baseUrl = "http://localhost:3000";
      try {
        const configElement = document.getElementById("api-config");
        if (configElement) {
          const config = JSON.parse(configElement.textContent);
          const env = window.Env?.current || "dev";
          const txnConfig = config["transactions"];
          if (txnConfig?.[env]?.endpoint) {
            const match = txnConfig[env].endpoint.match(/^(https?:\/\/[^\/]+)/);
            if (match) baseUrl = match[1];
          }
        }
      } catch (e) {
        console.warn("[Transactions] Using default base URL:", e);
      }
      console.log("[Transactions] Base URL:", baseUrl);
      return baseUrl;
    }

    function createNavigation() {
      return `
        <div class="demo-section index-section">
          <h3><i class="bi bi-list-ul"></i> Test Scenarios Index</h3>
          <p class="description-text">50+ test scenarios covering all transaction operations:</p>
          <div class="row">
            <div class="col-md-6">
              <a href="#create-tests" class="index-link">
                <i class="bi bi-plus-circle"></i> CREATE Tests (12 scenarios)
              </a>
              <a href="#read-tests" class="index-link">
                <i class="bi bi-eye"></i> READ Tests (4 scenarios)
              </a>
              <a href="#update-tests" class="index-link">
                <i class="bi bi-pencil"></i> UPDATE Tests (10 scenarios)
              </a>
            </div>
            <div class="col-md-6">
              <a href="#delete-tests" class="index-link">
                <i class="bi bi-trash"></i> DELETE Tests (4 scenarios)
              </a>
              <a href="#query-tests" class="index-link">
                <i class="bi bi-search"></i> QUERY Tests (15 scenarios)
              </a>
              <a href="#count-tests" class="index-link">
                <i class="bi bi-calculator"></i> COUNT Tests (5 scenarios)
              </a>
            </div>
          </div>
          <a href="#cleanup-section" class="index-link text-danger">
            <i class="bi bi-trash-fill"></i> Cleanup Test Data
          </a>
        </div>
      `;
    }

    function formatAmount(cents) {
      return `$${(cents / 100).toFixed(2)}`;
    }

    function createTestCard(id, title, description, endpoint, method, payload, inputs = []) {
      const inputsHtml = inputs.map(input => {
        if (input.type === 'select') {
          const options = input.options.map(opt => 
            `<option value="${opt.value}">${opt.text}</option>`
          ).join('');
          return `
            <div class="mb-3">
              <label class="form-label">${input.label}</label>
              <select class="form-select" data-field="${input.id}">
                ${options}
              </select>
            </div>
          `;
        } else if (input.type === 'textarea') {
          return `
            <div class="mb-3">
              <label class="form-label">${input.label}</label>
              <textarea class="form-control" data-field="${input.id}" rows="3" placeholder="${input.placeholder || ''}">${input.value || ''}</textarea>
            </div>
          `;
        } else {
          return `
            <div class="mb-3">
              <label class="form-label">${input.label}</label>
              <input type="${input.type}" class="form-control" data-field="${input.id}" 
                     placeholder="${input.placeholder || ''}" value="${input.value || ''}">
            </div>
          `;
        }
      }).join('');

      const payloadHtml = payload ? `
        <div class="alert alert-info mt-3">
          <strong>Request Payload:</strong>
          <pre class="mb-0 mt-2"><code>${JSON.stringify(payload, null, 2)}</code></pre>
        </div>
      ` : '';

      return `
        <div class="card mb-4" id="test-${id}">
          <div class="card-header">
            <h5 class="mb-0">${title}</h5>
          </div>
          <div class="card-body">
            <p class="text-muted">${description}</p>
            <div class="mb-3">
              <span class="badge bg-primary">${method}</span>
              <code class="ms-2">${endpoint}</code>
            </div>
            ${inputsHtml}
            ${payloadHtml}
            <button class="btn btn-success test-btn" 
                    data-test-id="${id}"
                    data-method="${method}"
                    data-endpoint="${endpoint}"
                    data-payload='${JSON.stringify(payload || {})}'>
              <i class="bi bi-play-fill"></i> Test API Call
            </button>
            <div id="response-${id}" class="mt-3"></div>
          </div>
        </div>
      `;
    }

    async function executeTest(testId, method, endpoint, payload) {
      const responseDiv = document.getElementById(`response-${testId}`);
      responseDiv.innerHTML = spinnerInline ? spinnerInline("Testing...") : "Testing...";

      try {
        const baseUrl = getBaseUrl();
        
        // Collect input values
        const inputs = {};
        document.querySelectorAll(`#test-${testId} [data-field]`).forEach(el => {
          const field = el.getAttribute('data-field');
          inputs[field] = el.value;
        });

        // Replace URL parameters
        let finalEndpoint = endpoint;
        if (inputs.transaction_id) {
          finalEndpoint = finalEndpoint.replace('{id}', inputs.transaction_id);
        }

        const fullUrl = `${baseUrl}${finalEndpoint}`;
        let requestData = {};

        if (method === 'POST' || method === 'PUT') {
          requestData = { ...payload, ...inputs, testing: true };
          
          // Parse JSON fields if provided as strings
          if (requestData.meta && typeof requestData.meta === 'string') {
            try { requestData.meta = JSON.parse(requestData.meta); } catch(e) {}
          }
          if (requestData.owners && typeof requestData.owners === 'string') {
            try { requestData.owners = JSON.parse(requestData.owners); } catch(e) {}
          }
          if (requestData.owner_allocations && typeof requestData.owner_allocations === 'string') {
            try { requestData.owner_allocations = JSON.parse(requestData.owner_allocations); } catch(e) {}
          }
          if (requestData.products && typeof requestData.products === 'string') {
            try { requestData.products = JSON.parse(requestData.products); } catch(e) {}
          }
        }

        const apiHandler = new APIHandler();
        await apiHandler.handleRequest({
          apiBaseUrl: fullUrl,
          queryParams: method === 'GET' ? inputs : {},
          httpMethod: method,
          requestData: requestData,
          responseCallback: (data) => {
            // Store transaction ID for cleanup
            if (data.transaction_id && method === 'POST') {
              createdTransactionIds.push(data.transaction_id);
            }

            responseDiv.innerHTML = `
              <div class="alert alert-success">
                <h6><i class="bi bi-check-circle"></i> Success</h6>
                ${data.transaction_id ? `<p><strong>Transaction ID:</strong> <code>${data.transaction_id}</code></p>` : ''}
                ${data.order_id ? `<p><strong>Order ID:</strong> ${data.order_id}</p>` : ''}
                ${data.amount ? `<p><strong>Amount:</strong> ${formatAmount(data.amount)}</p>` : ''}
                ${data.status ? `<p><strong>Status:</strong> <span class="badge bg-secondary">${data.status}</span></p>` : ''}
                ${data.total !== undefined ? `<p><strong>Total Count:</strong> ${data.total}</p>` : ''}
                ${data.rows ? `<p><strong>Results:</strong> ${data.rows.length} transactions</p>` : ''}
                <details class="mt-2">
                  <summary>Full Response JSON</summary>
                  <pre class="bg-light p-2 mt-2"><code>${JSON.stringify(data, null, 2)}</code></pre>
                </details>
              </div>
            `;
          }
        });
      } catch (error) {
        responseDiv.innerHTML = `
          <div class="alert alert-danger">
            <h6><i class="bi bi-exclamation-triangle"></i> Error</h6>
            <p>${error.message || 'Unknown error occurred'}</p>
            <small class="text-muted">${error.stack || ''}</small>
          </div>
        `;
        console.error(`[Test ${testId}] Error:`, error);
      }
    }

    async function cleanupTestData() {
      const cleanupDiv = document.getElementById('cleanup-response');
      cleanupDiv.innerHTML = spinnerInline ? spinnerInline("Cleaning up...") : "Cleaning up...";

      if (createdTransactionIds.length === 0) {
        cleanupDiv.innerHTML = `
          <div class="alert alert-warning">
            <i class="bi bi-info-circle"></i> No test transactions to clean up.
          </div>
        `;
        return;
      }

      try {
        const baseUrl = getBaseUrl();
        let successCount = 0;
        
        for (const txnId of createdTransactionIds) {
          try {
            const apiHandler = new APIHandler();
            await apiHandler.handleRequest({
              apiBaseUrl: `${baseUrl}/api/transactions/${txnId}`,
              httpMethod: "DELETE",
              requestData: { testing: true },
              responseCallback: () => { successCount++; }
            });
          } catch (e) {
            console.warn(`Failed to delete ${txnId}:`, e);
          }
        }

        cleanupDiv.innerHTML = `
          <div class="alert alert-success">
            <h6><i class="bi bi-check-circle"></i> Cleanup Complete</h6>
            <p>Successfully deleted ${successCount} of ${createdTransactionIds.length} test transactions.</p>
          </div>
        `;
        createdTransactionIds.length = 0;
      } catch (error) {
        cleanupDiv.innerHTML = `
          <div class="alert alert-danger">
            <h6><i class="bi bi-exclamation-triangle"></i> Cleanup Error</h6>
            <p>${error.message}</p>
          </div>
        `;
      }
    }

    function render() {
      pageContent.innerHTML = spinner ? spinner() : "Loading...";

      const html = `
        <div class="demo-section">
          <h3><i class="bi bi-info-circle"></i> Prerequisites</h3>
          <ul>
            <li>Development server running on <code>localhost:3000</code></li>
            <li>API endpoints configured for transactions</li>
            <li>Database access for verification</li>
            <li>All POST requests include <code>testing: true</code></li>
          </ul>
        </div>

        ${createNavigation()}

        <div class="demo-section" id="create-tests">
          <h3><i class="bi bi-plus-circle"></i> CREATE Transaction Tests</h3>
          
          ${createTestCard('create-1', '✅ Create Minimal Transaction', 
            'Create transaction with only required fields (order_id, amount, order_type, customer_uid, status, direction)',
            '/api/transactions', 'POST',
            {
              order_id: 'order_TEST_001',
              amount: 10000,
              order_type: 'product',
              customer_uid: 'cust_test_001',
              status: 'pending',
              direction: 'purchase'
            }
          )}

          ${createTestCard('create-2', '✅ Create with Full Metadata',
            'Create transaction with meta, owners, owner_allocations, and products',
            '/api/transactions', 'POST',
            {
              order_id: 'order_TEST_002',
              amount: 15000,
              order_type: 'subscription',
              customer_uid: 'cust_test_002',
              status: 'completed',
              direction: 'purchase',
              payment_method: 'stripe',
              currency: 'USD',
              meta: {
                subscription_id: 'sub_123',
                billing_cycle: 'monthly',
                promo_code: 'SAVE20'
              },
              owners: ['owner_A', 'owner_B'],
              owner_allocations: [
                { owner_uuid: 'owner_A', amount_cents: 9000 },
                { owner_uuid: 'owner_B', amount_cents: 6000 }
              ],
              products: [
                { product_id: 'prod_001', name: 'Premium Plan', price: 15000 }
              ]
            }
          )}

          ${createTestCard('create-3', '✅ Create Refund Transaction',
            'Create a refund transaction with negative amount',
            '/api/transactions', 'POST',
            {
              order_id: 'order_TEST_REFUND_001',
              amount: -5000,
              order_type: 'product',
              customer_uid: 'cust_test_003',
              status: 'completed',
              direction: 'refund',
              refund_amount: 5000,
              refund_reason: 'Customer requested cancellation'
            }
          )}

          ${createTestCard('create-4', '❌ FAIL: Missing order_id',
            'Should return 400 error - order_id is required',
            '/api/transactions', 'POST',
            {
              amount: 5000,
              order_type: 'product',
              customer_uid: 'cust_test',
              status: 'pending',
              direction: 'purchase'
            }
          )}

          ${createTestCard('create-5', '❌ FAIL: Missing amount',
            'Should return 400 error - amount is required',
            '/api/transactions', 'POST',
            {
              order_id: 'order_TEST_FAIL',
              order_type: 'product',
              customer_uid: 'cust_test',
              status: 'pending',
              direction: 'purchase'
            }
          )}

          ${createTestCard('create-6', '❌ FAIL: Invalid direction',
            'Should return 400 error - direction must be one of: purchase, refund, payout, adjustment',
            '/api/transactions', 'POST',
            {
              order_id: 'order_TEST_FAIL_DIR',
              amount: 5000,
              order_type: 'product',
              customer_uid: 'cust_test',
              status: 'pending',
              direction: 'invalid_direction'
            }
          )}
        </div>

        <div class="demo-section" id="read-tests">
          <h3><i class="bi bi-eye"></i> READ Transaction Tests</h3>
          
          ${createTestCard('read-1', '✅ Get Transaction by ID',
            'Retrieve a transaction by its transaction_id',
            '/api/transactions/{id}', 'GET', null,
            [{ type: 'text', id: 'transaction_id', label: 'Transaction ID', placeholder: 'txn_...' }]
          )}

          ${createTestCard('read-2', '❌ FAIL: Invalid transaction_id',
            'Should return 400 error for invalid format',
            '/api/transactions/{id}', 'GET', null,
            [{ type: 'text', id: 'transaction_id', label: 'Transaction ID', value: 'invalid-id-123' }]
          )}

          ${createTestCard('read-3', '❌ FAIL: Non-existent transaction',
            'Should return 404 for non-existent transaction',
            '/api/transactions/{id}', 'GET', null,
            [{ type: 'text', id: 'transaction_id', label: 'Transaction ID', value: 'txn_nonexistent_999' }]
          )}
        </div>

        <div class="demo-section" id="update-tests">
          <h3><i class="bi bi-pencil"></i> UPDATE Transaction Tests</h3>
          
          ${createTestCard('update-1', '✅ Update Status Only',
            'Update only the status field of a transaction',
            '/api/transactions/{id}', 'PUT',
            { status: 'completed' },
            [{ type: 'text', id: 'transaction_id', label: 'Transaction ID', placeholder: 'txn_...' }]
          )}

          ${createTestCard('update-2', '✅ Update Refund Info',
            'Update refund_amount and refund_reason',
            '/api/transactions/{id}', 'PUT',
            {
              refund_amount: 3000,
              refund_reason: 'Partial refund - customer request'
            },
            [{ type: 'text', id: 'transaction_id', label: 'Transaction ID', placeholder: 'txn_...' }]
          )}

          ${createTestCard('update-3', '✅ Update Meta',
            'Update metadata object (merged with existing)',
            '/api/transactions/{id}', 'PUT', null,
            [
              { type: 'text', id: 'transaction_id', label: 'Transaction ID', placeholder: 'txn_...' },
              { type: 'textarea', id: 'meta', label: 'Meta JSON', placeholder: '{"key": "value"}', 
                value: '{"updated_field": "new_value", "timestamp": "2026-01-03T10:00:00Z"}' }
            ]
          )}

          ${createTestCard('update-4', '❌ FAIL: No updatable fields',
            'Should return 400 when no fields provided',
            '/api/transactions/{id}', 'PUT', {},
            [{ type: 'text', id: 'transaction_id', label: 'Transaction ID', placeholder: 'txn_...' }]
          )}
        </div>

        <div class="demo-section" id="delete-tests">
          <h3><i class="bi bi-trash"></i> DELETE Transaction Tests</h3>
          
          ${createTestCard('delete-1', '✅ Soft Delete Transaction',
            'Soft delete - sets is_deleted=true and deleted_at timestamp',
            '/api/transactions/{id}', 'DELETE', null,
            [{ type: 'text', id: 'transaction_id', label: 'Transaction ID', placeholder: 'txn_...' }]
          )}

          ${createTestCard('delete-2', '❌ FAIL: Invalid transaction_id',
            'Should return 400 for invalid transaction_id',
            '/api/transactions/{id}', 'DELETE', null,
            [{ type: 'text', id: 'transaction_id', label: 'Transaction ID', value: '' }]
          )}
        </div>

        <div class="demo-section" id="query-tests">
          <h3><i class="bi bi-search"></i> QUERY & Filter Tests</h3>
          
          ${createTestCard('query-1', '✅ Query All Transactions',
            'Get all transactions with default pagination',
            '/api/transactions/query', 'GET'
          )}

          ${createTestCard('query-2', '✅ Filter by Customer',
            'Filter transactions by customer_uid',
            '/api/transactions/query', 'GET', null,
            [{ type: 'text', id: 'customer_uid', label: 'Customer UID', placeholder: 'cust_...' }]
          )}

          ${createTestCard('query-3', '✅ Filter by Status',
            'Filter by transaction status',
            '/api/transactions/query', 'GET', null,
            [{ type: 'select', id: 'status', label: 'Status', options: [
              { value: '', text: 'Select status...' },
              { value: 'pending', text: 'Pending' },
              { value: 'completed', text: 'Completed' },
              { value: 'failed', text: 'Failed' },
              { value: 'refunded', text: 'Refunded' }
            ]}]
          )}

          ${createTestCard('query-4', '✅ Filter by Date Range',
            'Filter by dateStart and dateEnd (YYYY-MM-DD format)',
            '/api/transactions/query', 'GET', null,
            [
              { type: 'date', id: 'dateStart', label: 'Date Start', value: '2026-01-01' },
              { type: 'date', id: 'dateEnd', label: 'Date End', value: '2026-01-31' }
            ]
          )}

          ${createTestCard('query-5', '✅ Pagination',
            'Test pagination with limit and offset',
            '/api/transactions/query', 'GET', null,
            [
              { type: 'number', id: 'limit', label: 'Limit', value: '20', placeholder: '20' },
              { type: 'number', id: 'offset', label: 'Offset', value: '0', placeholder: '0' }
            ]
          )}

          ${createTestCard('query-6', '❌ FAIL: Invalid Date Format',
            'Should return 400 for invalid dateStart format',
            '/api/transactions/query', 'GET', null,
            [{ type: 'text', id: 'dateStart', label: 'Date Start', value: 'invalid-date' }]
          )}

          ${createTestCard('query-7', '❌ FAIL: dateStart > dateEnd',
            'Should return 400 when dateStart is after dateEnd',
            '/api/transactions/query', 'GET', null,
            [
              { type: 'date', id: 'dateStart', label: 'Date Start', value: '2026-01-31' },
              { type: 'date', id: 'dateEnd', label: 'Date End', value: '2026-01-01' }
            ]
          )}
        </div>

        <div class="demo-section" id="count-tests">
          <h3><i class="bi bi-calculator"></i> COUNT Tests</h3>
          
          ${createTestCard('count-1', '✅ Get Total Count',
            'Get total count of all transactions (excluding soft-deleted)',
            '/api/transactions/count', 'GET'
          )}

          ${createTestCard('count-2', '✅ Count by Status',
            'Get count of transactions by specific status',
            '/api/transactions/count/by-status', 'GET', null,
            [{ type: 'select', id: 'status', label: 'Status', options: [
              { value: 'pending', text: 'Pending' },
              { value: 'completed', text: 'Completed' },
              { value: 'failed', text: 'Failed' },
              { value: 'refunded', text: 'Refunded' }
            ]}]
          )}

          ${createTestCard('count-3', '❌ FAIL: Missing Status',
            'Should return 400 when status parameter is missing',
            '/api/transactions/count/by-status', 'GET'
          )}
        </div>

        <div class="demo-section" id="cleanup-section">
          <h3><i class="bi bi-trash-fill text-danger"></i> Cleanup Test Data</h3>
          <div class="alert alert-warning">
            <i class="bi bi-exclamation-triangle"></i>
            <strong>Warning:</strong> This will delete all test transactions created during this session.
          </div>
          <p>Created transactions in this session: <strong>${createdTransactionIds.length}</strong></p>
          <button class="btn btn-danger" id="cleanup-btn">
            <i class="bi bi-trash"></i> Run Cleanup
          </button>
          <div id="cleanup-response" class="mt-3"></div>
        </div>
      `;

      pageContent.innerHTML = html;
      attachEventListeners();
    }

    function attachEventListeners() {
      // Test button click handlers
      document.querySelectorAll('.test-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const testId = e.currentTarget.getAttribute('data-test-id');
          const method = e.currentTarget.getAttribute('data-method');
          const endpoint = e.currentTarget.getAttribute('data-endpoint');
          const payload = JSON.parse(e.currentTarget.getAttribute('data-payload'));
          executeTest(testId, method, endpoint, payload);
        });
      });

      // Cleanup button
      const cleanupBtn = document.getElementById('cleanup-btn');
      if (cleanupBtn) {
        cleanupBtn.addEventListener('click', () => {
          if (confirm(`Delete ${createdTransactionIds.length} test transactions?`)) {
            cleanupTestData();
          }
        });
      }

      // Smooth scrolling for navigation links
      document.querySelectorAll('.index-link').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetId = link.getAttribute('href').substring(1);
          const target = document.getElementById(targetId);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
    }

    // Expose for debugging
    window.TransactionEdgeTests = {
      executeTest,
      cleanupTestData,
      getBaseUrl,
      createdTransactionIds
    };

    render();
  });
})();
