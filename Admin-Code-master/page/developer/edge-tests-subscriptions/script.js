/**
 * Edge Tests - Products Class
 * 
 * This is a comprehensive edge test page for products functionality.
 * 
 * STRUCTURE:
 * ==========
 * 1. Prerequisites - Setup requirements and dependencies
 * 2. Terminology - Key terms and definitions
 * 3. Index - Navigation for different test scenarios
 * 4. Headings - Section headers with descriptions
 * 5. Code Usage - Examples with detailed parameter explanations
 * 6. API Integration - Demonstrates APIHandler usage
 * 7. Verification Checklist - Manual database verification steps
 * 8. Cleanup Method - Function to reset test data
 * 
 * IMPORTANT NOTES:
 * - All POST requests MUST include testing: true in the request data
 * - We use APIHandler class (apiHandler.js) for all API requests
 * - This template uses a pale blue theme for visual consistency
 */

(function () {
  function waitForAdminShell() {
    return new Promise((resolveFunction) => {
      if (window.AdminShell && window.AdminShell.pageContent) {
        resolveFunction();
      } else {
        document.body.addEventListener("adminshell:ready", resolveFunction, { once: true });
      }
    });
  }

  waitForAdminShell().then(() => {
    if (!window.AdminShell || !window.AdminShell.pageContent) {
      console.error("AdminShell.pageContent is still null after ready event");
      return;
    }

    const pageContent = window.AdminShell.pageContent;
    const { spinner, spinnerInline, spinnerSmall, errorMessage } = window.AdminUtils || {};

    function getBaseUrl() {
      let baseUrl = "http://localhost:3000";
      try {
        const configScriptElement = document.getElementById("api-config");
        if (configScriptElement) {
          const pageConfig = JSON.parse(configScriptElement.textContent);
          const currentEnvironment = window.Env?.current || "dev";
          const productsConfig = pageConfig["products"];
          if (productsConfig && productsConfig[currentEnvironment] && productsConfig[currentEnvironment].endpoint) {
            const endpointUrl = productsConfig[currentEnvironment].endpoint;
            const urlMatch = endpointUrl.match(/^(https?:\/\/[^\/]+)/);
            if (urlMatch) {
              baseUrl = urlMatch[1];
            }
          } else {
            const adminEndpoints = window.AdminEndpoints;
            if (adminEndpoints && adminEndpoints.base && adminEndpoints.base[currentEnvironment]) {
              baseUrl = adminEndpoints.base[currentEnvironment];
            }
          }
        }
      } catch (configError) {
        console.warn("[Edge Tests Products] Could not parse API config, using default base URL:", configError);
      }
      console.log("[Edge Tests Products] Using base URL:", baseUrl);
      return baseUrl;
    }

    function createIndexNavigation() {
      return `
        <div class="demo-section index-section">
          <h3><i class="bi bi-list-ul"></i> Test Scenarios Index</h3>
          <p class="description-text">Navigate to different test scenarios:</p>
          <a href="#prerequisites-section" class="index-link">
            <i class="bi bi-check-circle"></i> Prerequisites
          </a>
          <a href="#terminology-section" class="index-link">
            <i class="bi bi-book"></i> Terminology
          </a>
          <a href="#test-scenario-1" class="index-link">
            <i class="bi bi-play-circle"></i> Test Scenario 1: Create Product
          </a>
          <a href="#test-scenario-2" class="index-link">
            <i class="bi bi-play-circle"></i> Test Scenario 2: Get Products by Category (with Select)
          </a>
          <a href="#test-scenario-3" class="index-link">
            <i class="bi bi-play-circle"></i> Test Scenario 3: Get Product by ID (with Input)
          </a>
          <a href="#test-scenario-4" class="index-link">
            <i class="bi bi-play-circle"></i> Test Scenario 4: Update Product (with Inputs)
          </a>
          <a href="#cleanup-section" class="index-link">
            <i class="bi bi-trash"></i> Cleanup Method
          </a>
        </div>
      `;
    }

    function createTestScenarioSection(scenarioId, title, description, apiMethod, apiEndpoint, requestPayload = null, checklistItems = [], inputFields = []) {
      let checklistHtml = "";
      if (checklistItems.length > 0) {
        const checklistItemsHtml = checklistItems.map((item, index) => {
          return `
            <div class="checklist-item">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="checklist-${scenarioId}-${index}" />
                <label class="form-check-label" for="checklist-${scenarioId}-${index}">${item}</label>
              </div>
            </div>
          `;
        }).join("");
        checklistHtml = `
          <div class="checklist-container">
            <strong><i class="bi bi-check2-square"></i> Manual Verification Checklist:</strong>
            <div class="mt-2">${checklistItemsHtml}</div>
          </div>
        `;
      }

      let requestPayloadHtml = "";
      if (requestPayload) {
        const payloadJson = JSON.stringify(requestPayload, null, 2);
        requestPayloadHtml = `
          <div class="api-params-block">
            <strong>Request Payload:</strong>
            <pre class="code-example mt-2"><code>${payloadJson}</code></pre>
          </div>
        `;
      }

      const apiEndpointHtml = `
        <div class="api-params-block">
          <strong>API Endpoint:</strong>
          <div class="mt-2">
            <code>${apiMethod} ${apiEndpoint}</code>
          </div>
        </div>
      `;

      let inputFieldsHtml = "";
      if (inputFields && inputFields.length > 0) {
        const inputFieldsHtmlContent = inputFields.map(field => {
          if (field.type === 'select') {
            const optionsHtml = field.options.map(option => 
              `<option value="${option.value}">${option.text}</option>`
            ).join("");
            return `
              <div class="test-input-group">
                <label for="input-${scenarioId}-${field.id}">${field.label}:</label>
                <select id="input-${scenarioId}-${field.id}" class="form-control" data-field-id="${field.id}">
                  ${optionsHtml}
                </select>
              </div>
            `;
          } else {
            return `
              <div class="test-input-group">
                <label for="input-${scenarioId}-${field.id}">${field.label}:</label>
                <input type="${field.type || 'text'}" 
                       id="input-${scenarioId}-${field.id}" 
                       class="form-control" 
                       data-field-id="${field.id}"
                       placeholder="${field.placeholder || ''}"
                       value="${field.value || ''}">
              </div>
            `;
          }
        }).join("");
        inputFieldsHtml = `
          <div class="mb-3">
            <strong>Test Parameters:</strong>
            ${inputFieldsHtmlContent}
          </div>
        `;
      }

      const codeExampleHtml = buildCodeUsageExample(scenarioId, apiMethod, apiEndpoint, requestPayload);

      return `
        <div class="test-scenario-card card" id="test-scenario-${scenarioId}">
          <div class="card-header">
            <h5 class="card-title">${title}</h5>
          </div>
          <div class="card-body">
            <p class="description-text">${description}</p>
            ${apiEndpointHtml}
            ${requestPayloadHtml}
            ${inputFieldsHtml}
            ${codeExampleHtml}
            <div class="important-note">
              <strong><i class="bi bi-exclamation-triangle"></i> Important:</strong>
              ${apiMethod === 'POST' || apiMethod === 'PUT' 
                ? 'This request includes <code>testing: true</code> parameter to indicate this is a test request.' 
                : 'This is a GET request, so no request body is sent.'}
            </div>
            <div class="mt-3">
              <button class="btn btn-primary w-100 test-scenario-btn" 
                      data-scenario-id="${scenarioId}" 
                      data-method="${apiMethod}" 
                      data-endpoint="${apiEndpoint}" 
                      data-payload='${requestPayload ? JSON.stringify(requestPayload) : "null"}'
                      data-has-inputs="${inputFields.length > 0}">
                <i class="bi bi-play-fill"></i> Test API Call
              </button>
            </div>
            <div id="response-${scenarioId}" class="response-container mt-3"></div>
            ${checklistHtml}
          </div>
        </div>
      `;
    }

    function buildCodeUsageExample(scenarioId, method, endpoint, payload) {
      const baseUrl = getBaseUrl();
      const fullUrl = `${baseUrl}${endpoint}`;

      let paramExplanations = `
        <div class="api-params-block">
          <strong>Parameter Explanations:</strong>
          <div class="param-item">
            <span class="param-name">apiBaseUrl</span>
            <span class="param-type">(string)</span>
            <div class="param-desc">The base URL for the API endpoint. Example: "${baseUrl}"</div>
          </div>
          <div class="param-item">
            <span class="param-name">queryParams</span>
            <span class="param-type">(Object)</span>
            <div class="param-desc">Query parameters for GET requests (added to URL as ?key=value&key2=value2)</div>
          </div>
          <div class="param-item">
            <span class="param-name">httpMethod</span>
            <span class="param-type">(string)</span>
            <div class="param-desc">HTTP method: 'GET', 'POST', 'PUT', 'DELETE'. Current: "${method}"</div>
          </div>
      `;

      if (method === 'POST' || method === 'PUT') {
        paramExplanations += `
          <div class="param-item">
            <span class="param-name">requestData</span>
            <span class="param-type">(Object)</span>
            <div class="param-desc">Request body data. <strong>MUST include testing: true for POST requests.</strong></div>
          </div>
        `;
      }

      paramExplanations += `
          <div class="param-item">
            <span class="param-name">responseCallback</span>
            <span class="param-type">(Function)</span>
            <div class="param-desc">Optional callback function to handle the response data</div>
          </div>
        </div>
      `;

      let codeExample = '';
      if (method === 'GET') {
        codeExample = `
// Example: GET request using APIHandler
const apiHandler = new APIHandler();

const apiParams = {
  apiBaseUrl: "${fullUrl}",
  queryParams: { per_page: 10, page: 1 },
  httpMethod: "GET",
  requestData: {},
  responseCallback: (data) => {
    console.log("API Response:", data);
  }
};

apiHandler.handleRequest(apiParams);
        `;
      } else {
        const payloadWithTesting = payload ? { ...payload, testing: true } : { testing: true };
        const payloadJson = JSON.stringify(payloadWithTesting, null, 2);
        codeExample = `
// Example: ${method} request using APIHandler
const apiHandler = new APIHandler();

const apiParams = {
  apiBaseUrl: "${fullUrl}",
  queryParams: {},
  httpMethod: "${method}",
  requestData: ${payloadJson},
  responseCallback: (data) => {
    console.log("API Response:", data);
  }
};

apiHandler.handleRequest(apiParams);
        `;
      }

      return `
        <div class="api-params-block">
          <strong>Code Usage Example:</strong>
          <div class="code-example mt-2">
            <pre><code>${codeExample}</code></pre>
          </div>
        </div>
        ${paramExplanations}
      `;
    }

    async function testScenario(scenarioId, method, endpoint, payload) {
      const responseContainer = document.getElementById(`response-${scenarioId}`);
      if (!responseContainer) {
        console.error(`Response container not found for scenario: ${scenarioId}`);
        return;
      }

      responseContainer.innerHTML = spinnerInline ? spinnerInline("Testing API call...") : '<div class="loading-state">Testing API call...</div>';

      try {
        const baseUrl = getBaseUrl();
        const inputFields = document.querySelectorAll(`#test-scenario-${scenarioId} input[data-field-id], #test-scenario-${scenarioId} select[data-field-id]`);
        const inputValues = {};
        inputFields.forEach(field => {
          const fieldId = field.getAttribute('data-field-id');
          inputValues[fieldId] = field.value;
        });

        let finalEndpoint = endpoint;
        if (inputValues.productId) {
          finalEndpoint = finalEndpoint.replace('{productId}', inputValues.productId);
          finalEndpoint = finalEndpoint.replace('{id}', inputValues.productId);
        }
        if (inputValues.id) {
          finalEndpoint = finalEndpoint.replace('{id}', inputValues.id);
        }
        const fullUrl = `${baseUrl}${finalEndpoint}`;

        let requestData = {};
        if ((method === 'POST' || method === 'PUT') && payload) {
          requestData = { ...payload, ...inputValues, testing: true };
        } else if (method === 'POST' || method === 'PUT') {
          requestData = { ...inputValues, testing: true };
        }

        const apiHandler = new APIHandler();
        const apiParams = {
          apiBaseUrl: fullUrl,
          queryParams: method === 'GET' ? { per_page: 10, ...inputValues } : {},
          httpMethod: method,
          requestData: requestData,
          responseCallback: (data) => {
            const responseJson = JSON.stringify(data, null, 2);
            responseContainer.innerHTML = `
              <div class="alert alert-success">
                <strong><i class="bi bi-check-circle"></i> Success (200):</strong>
                <pre class="bg-light p-3 rounded mt-2" style="max-height: 400px; overflow: auto;"><code>${responseJson}</code></pre>
              </div>
            `;
          }
        };

        await apiHandler.handleRequest(apiParams);

      } catch (error) {
        const errorHtml = errorMessage 
          ? errorMessage(error, "API call failed")
          : `
            <div class="alert alert-danger">
              <strong><i class="bi bi-exclamation-triangle"></i> Error:</strong>
              <p>${error.message || 'Unknown error occurred'}</p>
            </div>
          `;
        responseContainer.innerHTML = errorHtml;
        console.error(`[Edge Tests Products] Error in scenario ${scenarioId}:`, error);
      }
    }

    async function cleanupTestData() {
      const cleanupContainer = document.getElementById('cleanup-response');
      if (!cleanupContainer) {
        console.error('Cleanup container not found');
        return;
      }

      cleanupContainer.innerHTML = spinnerInline ? spinnerInline("Cleaning up test data...") : '<div class="loading-state">Cleaning up test data...</div>';

      try {
        const baseUrl = getBaseUrl();
        const cleanupUrl = `${baseUrl}/products/cleanup`;
        const apiHandler = new APIHandler();
        const cleanupParams = {
          apiBaseUrl: cleanupUrl,
          queryParams: {},
          httpMethod: "POST",
          requestData: {
            testing: true,
            deleteAll: true
          },
          responseCallback: (data) => {
            cleanupContainer.innerHTML = `
              <div class="alert alert-success">
                <strong><i class="bi bi-check-circle"></i> Cleanup Successful:</strong>
                <pre class="bg-light p-3 rounded mt-2"><code>${JSON.stringify(data, null, 2)}</code></pre>
                <p class="mt-2">Test data has been cleaned up. Database is ready for next test run.</p>
              </div>
            `;
          }
        };
        await apiHandler.handleRequest(cleanupParams);
      } catch (error) {
        cleanupContainer.innerHTML = `
          <div class="alert alert-danger">
            <strong><i class="bi bi-exclamation-triangle"></i> Cleanup Error:</strong>
            <p>${error.message || 'Unknown error occurred during cleanup'}</p>
            <p class="mt-2"><small>You may need to manually clean up test data in the database.</small></p>
          </div>
        `;
        console.error('[Edge Tests Products] Cleanup error:', error);
      }
    }

    async function render() {
      pageContent.innerHTML = spinner ? spinner() : '<div class="loading-state">Loading...</div>';

      const pageHtml = `
        <div class="demo-section prerequisites-section" id="prerequisites-section">
          <h3><i class="bi bi-gear"></i> Prerequisites</h3>
          <p class="description-text">
            Before using this edge test page, ensure the following prerequisites are met:
          </p>
          <ul>
            <li><strong>Environment Setup:</strong> Development server running (e.g., XAMPP, localhost:3000)</li>
            <li><strong>API Configuration:</strong> API endpoints configured in api-config script tag</li>
            <li><strong>Database Access:</strong> Access to database for manual verification</li>
            <li><strong>Dependencies:</strong> All required JavaScript files loaded (APIHandler, AdminShell, etc.)</li>
          </ul>
          <div class="important-note">
            <strong>Note:</strong> All POST requests automatically include <code>testing: true</code> parameter.
          </div>
        </div>

        <div class="demo-section terminology-section" id="terminology-section">
          <h3><i class="bi bi-book"></i> Terminology</h3>
          <div class="terminology-item">
            <strong>Edge Test:</strong> A test that verifies behavior at system boundaries and limits.
          </div>
          <div class="terminology-item">
            <strong>APIHandler:</strong> JavaScript class that manages API requests, responses, and loading states.
          </div>
          <div class="terminology-item">
            <strong>Testing Parameter:</strong> Special parameter (testing: true) required in all POST requests.
          </div>
          <div class="terminology-item">
            <strong>Query Parameters:</strong> Parameters passed in URL for GET requests (e.g., ?per_page=10).
          </div>
          <div class="terminology-item">
            <strong>Request Data:</strong> Data sent in request body for POST/PUT requests.
          </div>
          <div class="terminology-item">
            <strong>Response Callback:</strong> Function that handles API response after successful request.
          </div>
          <div class="terminology-item">
            <strong>Verification Checklist:</strong> Manual steps to verify test results in database.
          </div>
          <div class="terminology-item">
            <strong>Cleanup Method:</strong> Function that resets test data after testing is complete.
          </div>
        </div>

        ${createIndexNavigation()}

        <div class="demo-section">
          <h3><i class="bi bi-play-circle"></i> Test Scenarios</h3>
          <p class="description-text">
            Click "Test API Call" on any scenario below to execute the test. 
            Results will be displayed in the response container.
          </p>

          ${createTestScenarioSection(
            "1",
            "Test Scenario 1: Create Product",
            "This test demonstrates how to create a new product using a POST request. The request includes testing: true to indicate this is a test request.",
            "POST",
            "/products/create",
            {
              name: "Test Product",
              description: "This is a test product created by the edge test page",
              price: 99.99,
              category: "electronics",
              status: "active"
            },
            [
              "Go to database and verify new product record was created",
              "Check that 'name' field matches 'Test Product'",
              "Check that 'price' field is 99.99",
              "Check that 'status' field is 'active'",
              "Verify 'testing' flag was set to true in the request",
              "Check timestamp fields (createdAt, updatedAt)"
            ]
          )}

          ${createTestScenarioSection(
            "2",
            "Test Scenario 2: Get Products by Category",
            "This test demonstrates how to retrieve products filtered by category using a GET request with select dropdown.",
            "GET",
            "/products/list",
            null,
            [
              "Select a category from the dropdown above",
              "Click 'Test API Call' to execute the request",
              "Verify API response contains only products with selected category",
              "Check that all returned products have the correct category",
              "Verify product count matches database count for that category"
            ],
            [
              {
                type: 'select',
                id: 'category',
                label: 'Category',
                options: [
                  { value: '', text: 'Select category...' },
                  { value: 'electronics', text: 'Electronics' },
                  { value: 'clothing', text: 'Clothing' },
                  { value: 'books', text: 'Books' },
                  { value: 'food', text: 'Food' }
                ]
              }
            ]
          )}

          ${createTestScenarioSection(
            "3",
            "Test Scenario 3: Get Product by ID",
            "This test demonstrates how to retrieve a specific product by ID using a GET request with product ID input field.",
            "GET",
            "/products/{productId}",
            null,
            [
              "Enter a product ID in the input field above",
              "Click 'Test API Call' to execute the request",
              "Verify API response contains the product with specified ID",
              "Check that response includes correct product ID",
              "Verify all product fields are present in response"
            ],
            [
              {
                type: 'text',
                id: 'productId',
                label: 'Product ID',
                placeholder: 'Enter product ID (e.g., prod-123)',
                value: ''
              }
            ]
          )}

          ${createTestScenarioSection(
            "4",
            "Test Scenario 4: Update Product with Inputs",
            "This test demonstrates how to update an existing product using a PUT request with product ID input and status select dropdown.",
            "PUT",
            "/products/update/{productId}",
            {
              name: "Updated Product Name",
              price: 149.99
            },
            [
              "Enter a product ID in the input field",
              "Select a status from the dropdown",
              "Click 'Test API Call' to execute the request",
              "Go to database and find the updated product",
              "Verify 'status' field was updated to selected value",
              "Check that 'price' field was updated",
              "Check that 'updatedAt' timestamp was updated",
              "Verify 'testing' flag was included in the request"
            ],
            [
              {
                type: 'text',
                id: 'productId',
                label: 'Product ID',
                placeholder: 'Enter product ID (e.g., prod-123)',
                value: ''
              },
              {
                type: 'select',
                id: 'status',
                label: 'Status',
                options: [
                  { value: '', text: 'Select status...' },
                  { value: 'active', text: 'Active' },
                  { value: 'inactive', text: 'Inactive' },
                  { value: 'draft', text: 'Draft' }
                ]
              }
            ]
          )}
        </div>

        <div class="demo-section cleanup-section" id="cleanup-section">
          <h3><i class="bi bi-trash"></i> Cleanup Method</h3>
          <p class="description-text">
            After testing is complete, use the cleanup method to reset test data.
            This ensures the database is in a clean state for the next test run.
          </p>
          <div class="important-note">
            <strong>Warning:</strong> This will delete test data. Make sure you're in a test environment.
          </div>
          <div class="mt-3">
            <button class="btn btn-danger" id="cleanup-btn">
              <i class="bi bi-trash"></i> Run Cleanup
            </button>
          </div>
          <div id="cleanup-response" class="response-container mt-3"></div>
        </div>
      `;

      pageContent.innerHTML = pageHtml;
      attachEventListeners();
    }

    function attachEventListeners() {
      document.addEventListener("click", (event) => {
        if (event.target.classList.contains("test-scenario-btn")) {
          const scenarioId = event.target.getAttribute("data-scenario-id");
          const method = event.target.getAttribute("data-method");
          const endpoint = event.target.getAttribute("data-endpoint");
          const payloadString = event.target.getAttribute("data-payload");
          let payload = null;
          if (payloadString && payloadString !== "null") {
            try {
              payload = JSON.parse(payloadString);
            } catch (parseError) {
              console.error("[Edge Tests Products] Could not parse payload:", parseError);
            }
          }
          testScenario(scenarioId, method, endpoint, payload);
        }

        if (event.target.id === "cleanup-btn" || event.target.closest("#cleanup-btn")) {
          if (confirm("Are you sure you want to clean up test data? This action cannot be undone.")) {
            cleanupTestData();
          }
        }
      });

      document.querySelectorAll('.index-link').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetId = link.getAttribute('href').substring(1);
          const targetElement = document.getElementById(targetId);
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
    }

    window.EdgeTestsProducts = {
      testScenario: testScenario,
      cleanupTestData: cleanupTestData,
      getBaseUrl: getBaseUrl
    };

    render();
  });
})();

