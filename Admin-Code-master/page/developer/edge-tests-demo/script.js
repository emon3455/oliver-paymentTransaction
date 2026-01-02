/**
 * Edge Tests - Demo Class (Template)
 * 
 * This is a comprehensive demo/template for building edge test pages.
 * Use this as a reference when creating new edge test pages for other classes.
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
  /**
   * ============================================================================
   * PREREQUISITES SECTION
   * ============================================================================
   * 
   * Before using this edge test page, ensure the following prerequisites are met:
   * 
   * 1. Environment Setup:
   *    - Development server running (e.g., XAMPP, localhost:3000)
   *    - API endpoints configured in api-config script tag
   *    - Database access for manual verification
   * 
   * 2. Dependencies:
   *    - Bootstrap 5.3.3 (loaded from CDN)
   *    - Bootstrap Icons (loaded from CDN)
   *    - AdminShell framework (from assets/js/admin.js)
   *    - APIHandler class (from apiHandler.js)
   *    - Core utilities (utils.js, state.js, config.js)
   *    - UI components (sidebar.js, tabs.js)
   * 
   * 3. API Configuration:
   *    - Configure endpoints in the api-config script tag in index.html
   *    - Set appropriate endpoints for dev/stage/prod environments
   *    - Ensure API endpoints accept testing: true parameter
   * 
   * 4. Database Access:
   *    - Access to database for manual verification
   *    - Understanding of table structure
   *    - Ability to query and verify test data
   */

  /**
   * Wait for AdminShell ready event
   * This ensures all core components are loaded before we start
   * 
   * @returns {Promise} Promise that resolves when AdminShell is ready
   */
  function waitForAdminShell() {
    return new Promise((resolveFunction) => {
      // Check if AdminShell is already ready
      if (window.AdminShell && window.AdminShell.pageContent) {
        // AdminShell is already ready, resolve immediately
        resolveFunction();
      } else {
        // Listen for AdminShell ready event
        document.body.addEventListener("adminshell:ready", resolveFunction, { once: true });
      }
    });
  }

  /**
   * ============================================================================
   * TERMINOLOGY SECTION
   * ============================================================================
   * 
   * Key terms and definitions used in edge testing:
   * 
   * - Edge Test: A test that verifies the behavior at the boundaries or limits
   *   of a system, including edge cases and boundary conditions.
   * 
   * - APIHandler: A JavaScript class that manages API requests, handles responses,
   *   and manages loading states. Located in apiHandler.js.
   * 
   * - Testing Parameter: A special parameter (testing: true) that must be included
   *   in all POST requests to indicate this is a test request.
   * 
   * - Query Parameters: Parameters passed in the URL for GET requests
   *   (e.g., ?per_page=10&page=1)
   * 
   * - Request Data: Data sent in the request body for POST/PUT requests
   *   (must include testing: true for POST requests)
   * 
   * - Response Callback: A function that handles the API response after a
   *   successful request.
   * 
   * - Verification Checklist: Manual steps to verify test results in the database.
   * 
   * - Cleanup Method: A function that resets test data after testing is complete.
   */

  // Wait for AdminShell to be available before proceeding
  waitForAdminShell().then(() => {
    // Verify AdminShell and pageContent are actually ready
    if (!window.AdminShell || !window.AdminShell.pageContent) {
      // Log error if AdminShell is not ready
      console.error("AdminShell.pageContent is still null after ready event");
      return;
    }

    // Get page content container element
    const pageContent = window.AdminShell.pageContent;

    // Destructure AdminUtils functions if available
    const { spinner, spinnerInline, spinnerSmall, errorMessage } = window.AdminUtils || {};

    /**
     * ============================================================================
     * HELPER FUNCTIONS
     * ============================================================================
     */

    /**
     * Get base URL from API configuration
     * 
     * This function reads the API configuration from the page and extracts
     * the base URL for the current environment (dev/stage/prod).
     * 
     * @returns {string} Base URL for API calls
     */
    function getBaseUrl() {
      // Default fallback base URL
      let baseUrl = "http://localhost:3000";
      
      try {
        // Get API config from page
        const configScriptElement = document.getElementById("api-config");
        if (configScriptElement) {
          // Parse page config JSON
          const pageConfig = JSON.parse(configScriptElement.textContent);
          // Get current environment
          const currentEnvironment = window.Env?.current || "dev";
          
          // Try to get demo config
          const demoConfig = pageConfig["demo"];
          
          // Check if demo config exists and has endpoint for current environment
          if (demoConfig && demoConfig[currentEnvironment] && demoConfig[currentEnvironment].endpoint) {
            // Get endpoint URL
            const endpointUrl = demoConfig[currentEnvironment].endpoint;
            // Extract base URL from endpoint (e.g., "http://localhost:3000/demo" -> "http://localhost:3000")
            const urlMatch = endpointUrl.match(/^(https?:\/\/[^\/]+)/);
            if (urlMatch) {
              // Use extracted base URL
              baseUrl = urlMatch[1];
            }
          } else {
            // If no demo config, try to get from window.AdminEndpoints
            const adminEndpoints = window.AdminEndpoints;
            if (adminEndpoints && adminEndpoints.base && adminEndpoints.base[currentEnvironment]) {
              baseUrl = adminEndpoints.base[currentEnvironment];
            }
          }
        }
      } catch (configError) {
        // Use default base URL if config parsing fails
        console.warn("[Edge Tests Demo] Could not parse API config, using default base URL:", configError);
      }
      
      console.log("[Edge Tests Demo] Using base URL:", baseUrl);
      // Return base URL
      return baseUrl;
    }

    /**
     * ============================================================================
     * INDEX / NAVIGATION SECTION
     * ============================================================================
     * 
     * This section provides navigation links to different test scenarios.
     * Each link scrolls to the corresponding test section on the page.
     */

    /**
     * Create index/navigation HTML
     * 
     * This creates a navigation menu with links to all test sections.
     * 
     * @returns {string} HTML string for index navigation
     */
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
            <i class="bi bi-play-circle"></i> Test Scenario 1: Create Demo Item
          </a>
          <a href="#test-scenario-2" class="index-link">
            <i class="bi bi-play-circle"></i> Test Scenario 2: Get Demo Items by User ID (with Input)
          </a>
          <a href="#test-scenario-3" class="index-link">
            <i class="bi bi-play-circle"></i> Test Scenario 3: Get Demo Items by Status (with Select)
          </a>
          <a href="#test-scenario-4" class="index-link">
            <i class="bi bi-play-circle"></i> Test Scenario 4: Update Demo Item (with Inputs)
          </a>
          <a href="#cleanup-section" class="index-link">
            <i class="bi bi-trash"></i> Cleanup Method
          </a>
        </div>
      `;
    }

    /**
     * ============================================================================
     * HEADINGS AND DESCRIPTIONS SECTION
     * ============================================================================
     * 
     * Each test scenario has:
     * - A heading (h4 or h5) with a unique ID for navigation
     * - A description explaining what the test does
     * - Code usage examples with detailed parameter explanations
     */

    /**
     * ============================================================================
     * CODE USAGE SECTION
     * ============================================================================
     * 
     * This section demonstrates how to use the APIHandler class with detailed
     * parameter explanations. Each example includes:
     * 
     * 1. Block comment explaining all parameters
     * 2. Code example showing the actual usage
     * 3. Parameter breakdown with types and descriptions
     */

    /**
     * Create test scenario section HTML
     * 
     * This function creates a complete test scenario card with:
     * - Heading and description
     * - Input fields (user ID, select dropdown, etc.) if needed
     * - Code usage example with parameter explanations
     * - API endpoint information
     * - Request payload (if applicable)
     * - Test button
     * - Response container
     * - Verification checklist
     * 
     * @param {string} scenarioId - Unique ID for the scenario (used in HTML IDs)
     * @param {string} title - Title of the test scenario
     * @param {string} description - Description of what this test does
     * @param {string} apiMethod - HTTP method (GET, POST, PUT, DELETE)
     * @param {string} apiEndpoint - API endpoint path (relative to base URL)
     * @param {Object} requestPayload - Request payload object (optional, for POST/PUT)
     * @param {Array} checklistItems - Array of checklist item strings for manual verification
     * @param {Array} inputFields - Array of input field configurations (optional)
     *   Example: [{ type: 'text', id: 'userId', label: 'User ID', placeholder: 'Enter user ID' },
     *             { type: 'select', id: 'status', label: 'Status', options: [{value: 'active', text: 'Active'}, {value: 'inactive', text: 'Inactive'}] }]
     * @returns {string} HTML string for complete scenario section
     */
    function createTestScenarioSection(scenarioId, title, description, apiMethod, apiEndpoint, requestPayload = null, checklistItems = [], inputFields = []) {
      // Build checklist HTML
      let checklistHtml = "";
      if (checklistItems.length > 0) {
        // Map checklist items to HTML checkboxes
        const checklistItemsHtml = checklistItems.map((item, index) => {
          // Return checkbox HTML for each item
          return `
            <div class="checklist-item">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="checklist-${scenarioId}-${index}" />
                <label class="form-check-label" for="checklist-${scenarioId}-${index}">${item}</label>
              </div>
            </div>
          `;
        }).join("");
        // Wrap checklist items in container
        checklistHtml = `
          <div class="checklist-container">
            <strong><i class="bi bi-check2-square"></i> Manual Verification Checklist:</strong>
            <div class="mt-2">${checklistItemsHtml}</div>
          </div>
        `;
      }

      // Build request payload display HTML
      let requestPayloadHtml = "";
      if (requestPayload) {
        // Format payload as JSON string with proper indentation
        const payloadJson = JSON.stringify(requestPayload, null, 2);
        // Create request payload display
        requestPayloadHtml = `
          <div class="api-params-block">
            <strong>Request Payload:</strong>
            <pre class="code-example mt-2"><code>${payloadJson}</code></pre>
          </div>
        `;
      }

      // Build API endpoint display HTML
      const apiEndpointHtml = `
        <div class="api-params-block">
          <strong>API Endpoint:</strong>
          <div class="mt-2">
            <code>${apiMethod} ${apiEndpoint}</code>
          </div>
        </div>
      `;

      // Build input fields HTML if provided
      let inputFieldsHtml = "";
      if (inputFields && inputFields.length > 0) {
        const inputFieldsHtmlContent = inputFields.map(field => {
          if (field.type === 'select') {
            // Build select dropdown
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
            // Build text input
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

      // Build code usage example with parameter explanations
      const codeExampleHtml = buildCodeUsageExample(scenarioId, apiMethod, apiEndpoint, requestPayload);

      // Return complete scenario section HTML
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

    /**
     * Build code usage example with detailed parameter explanations
     * 
     * This creates a comprehensive code example showing how to use APIHandler
     * with detailed comments explaining each parameter.
     * 
     * @param {string} scenarioId - Scenario ID for reference
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {Object} payload - Request payload (optional)
     * @returns {string} HTML string for code usage example
     */
    function buildCodeUsageExample(scenarioId, method, endpoint, payload) {
      const baseUrl = getBaseUrl();
      const fullUrl = `${baseUrl}${endpoint}`;

      // Build parameter explanations
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

      // Build code example
      let codeExample = '';
      if (method === 'GET') {
        codeExample = `
// Example: GET request using APIHandler
const apiHandler = new APIHandler();

// Prepare API parameters
const apiParams = {
  // Base URL for the API endpoint
  apiBaseUrl: "${fullUrl}",
  
  // Query parameters (for GET requests, these are added to the URL)
  queryParams: {
    per_page: 10,
    page: 1
  },
  
  // HTTP method
  httpMethod: "GET",
  
  // Request data (not used for GET requests)
  requestData: {},
  
  // Optional: Callback function to handle the response
  responseCallback: (data) => {
    console.log("API Response:", data);
    // Process the response data here
  }
};

// Execute the API request
apiHandler.handleRequest(apiParams);
        `;
      } else {
        // Ensure testing: true is included in payload
        const payloadWithTesting = payload ? { ...payload, testing: true } : { testing: true };
        const payloadJson = JSON.stringify(payloadWithTesting, null, 2);
        
        codeExample = `
// Example: ${method} request using APIHandler
const apiHandler = new APIHandler();

// Prepare API parameters
const apiParams = {
  // Base URL for the API endpoint
  apiBaseUrl: "${fullUrl}",
  
  // Query parameters (optional, usually not needed for POST/PUT)
  queryParams: {},
  
  // HTTP method
  httpMethod: "${method}",
  
  // Request data - MUST include testing: true for POST requests
  requestData: ${payloadJson},
  
  // Optional: Callback function to handle the response
  responseCallback: (data) => {
    console.log("API Response:", data);
    // Process the response data here
  }
};

// Execute the API request
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

    /**
     * ============================================================================
     * API INTEGRATION SECTION
     * ============================================================================
     * 
     * This section demonstrates how to use the APIHandler class to make API requests.
     * The APIHandler class handles:
     * - Request construction
     * - Response processing
     * - Error handling
     * - Loading states
     * - Popup management (if needed)
     */

    /**
     * Test API scenario using APIHandler
     * 
     * This function demonstrates how to use the APIHandler class to make API requests.
     * It shows the complete flow:
     * 1. Prepare API parameters
     * 2. Create APIHandler instance
     * 3. Call handleRequest method
     * 4. Handle response or errors
     * 
     * @param {string} scenarioId - Scenario ID
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint path (relative to base URL)
     * @param {Object} payload - Request payload (optional)
     */
    async function testScenario(scenarioId, method, endpoint, payload) {
      // Get response container element
      const responseContainer = document.getElementById(`response-${scenarioId}`);
      if (!responseContainer) {
        console.error(`Response container not found for scenario: ${scenarioId}`);
        return;
      }

      // Show loading spinner
      responseContainer.innerHTML = spinnerInline ? spinnerInline("Testing API call...") : '<div class="loading-state">Testing API call...</div>';

      try {
        // Get base URL
        const baseUrl = getBaseUrl();
        
        // Check if this scenario has input fields and collect their values
        const inputFields = document.querySelectorAll(`#test-scenario-${scenarioId} input[data-field-id], #test-scenario-${scenarioId} select[data-field-id]`);
        const inputValues = {};
        inputFields.forEach(field => {
          const fieldId = field.getAttribute('data-field-id');
          inputValues[fieldId] = field.value;
        });

        // Build full URL - replace placeholders with input values
        let finalEndpoint = endpoint;
        if (inputValues.userId) {
          finalEndpoint = finalEndpoint.replace('{userId}', inputValues.userId);
          finalEndpoint = finalEndpoint.replace('userId', inputValues.userId);
        }
        if (inputValues.id) {
          finalEndpoint = finalEndpoint.replace('{id}', inputValues.id);
        }
        const fullUrl = `${baseUrl}${finalEndpoint}`;

        // IMPORTANT: For POST/PUT requests, ensure testing: true is included
        let requestData = {};
        if ((method === 'POST' || method === 'PUT') && payload) {
          // Merge payload with testing parameter and input values
          requestData = { ...payload, ...inputValues, testing: true };
        } else if (method === 'POST' || method === 'PUT') {
          // If no payload, include input values and testing: true
          requestData = { ...inputValues, testing: true };
        } else if (method === 'GET') {
          // For GET requests, merge input values into query params
          // This will be handled in queryParams below
        }

        // Create APIHandler instance
        const apiHandler = new APIHandler();

        // Prepare API parameters
        const apiParams = {
          // Base URL for the API endpoint
          apiBaseUrl: fullUrl,
          
          // Query parameters (for GET requests, include input values)
          queryParams: method === 'GET' ? { per_page: 10, ...inputValues } : {},
          
          // HTTP method
          httpMethod: method,
          
          // Request data (for POST/PUT requests, includes testing: true)
          requestData: requestData,
          
          // Response callback function
          responseCallback: (data) => {
            // Format response for display
            const responseJson = JSON.stringify(data, null, 2);
            
            // Display success response
            responseContainer.innerHTML = `
              <div class="alert alert-success">
                <strong><i class="bi bi-check-circle"></i> Success (200):</strong>
                <pre class="bg-light p-3 rounded mt-2" style="max-height: 400px; overflow: auto;"><code>${responseJson}</code></pre>
              </div>
            `;
          }
        };

        // Execute the API request using APIHandler
        await apiHandler.handleRequest(apiParams);

      } catch (error) {
        // Display error message
        const errorHtml = errorMessage 
          ? errorMessage(error, "API call failed")
          : `
            <div class="alert alert-danger">
              <strong><i class="bi bi-exclamation-triangle"></i> Error:</strong>
              <p>${error.message || 'Unknown error occurred'}</p>
            </div>
          `;
        responseContainer.innerHTML = errorHtml;
        console.error(`[Edge Tests Demo] Error in scenario ${scenarioId}:`, error);
      }
    }

    /**
     * ============================================================================
     * VERIFICATION CHECKLIST SECTION
     * ============================================================================
     * 
     * After running a test, manually verify the results in the database.
     * Each test scenario includes a checklist of verification steps.
     * 
     * Verification steps typically include:
     * 1. Check database for created/updated records
     * 2. Verify data matches expected values
     * 3. Check timestamps and status fields
     * 4. Verify relationships and foreign keys
     * 5. Check for any side effects or related records
     */

    /**
     * ============================================================================
     * CLEANUP METHOD SECTION
     * ============================================================================
     * 
     * After testing is complete, use the cleanup method to reset test data.
     * This ensures the database is in a clean state for the next test run.
     */

    /**
     * Cleanup test data
     * 
     * This function demonstrates how to clean up test data after testing.
     * It should delete or reset any test records created during testing.
     * 
     * IMPORTANT: Always include testing: true in cleanup requests to ensure
     * the server knows this is a test cleanup operation.
     * 
     * @returns {Promise<void>}
     */
    async function cleanupTestData() {
      const cleanupContainer = document.getElementById('cleanup-response');
      if (!cleanupContainer) {
        console.error('Cleanup container not found');
        return;
      }

      // Show loading state
      cleanupContainer.innerHTML = spinnerInline ? spinnerInline("Cleaning up test data...") : '<div class="loading-state">Cleaning up test data...</div>';

      try {
        // Get base URL
        const baseUrl = getBaseUrl();
        // Cleanup endpoint (adjust based on your API)
        const cleanupUrl = `${baseUrl}/demo/cleanup`;

        // Create APIHandler instance
        const apiHandler = new APIHandler();

        // Prepare cleanup API parameters
        const cleanupParams = {
          // Base URL for cleanup endpoint
          apiBaseUrl: cleanupUrl,
          
          // No query parameters needed for cleanup
          queryParams: {},
          
          // HTTP method (POST for cleanup)
          httpMethod: "POST",
          
          // Request data - MUST include testing: true
          requestData: {
            testing: true,
            // Add any other cleanup parameters here
            deleteAll: true  // Example: delete all test records
          },
          
          // Response callback
          responseCallback: (data) => {
            // Display cleanup success
            cleanupContainer.innerHTML = `
              <div class="alert alert-success">
                <strong><i class="bi bi-check-circle"></i> Cleanup Successful:</strong>
                <pre class="bg-light p-3 rounded mt-2"><code>${JSON.stringify(data, null, 2)}</code></pre>
                <p class="mt-2">Test data has been cleaned up. Database is ready for next test run.</p>
              </div>
            `;
          }
        };

        // Execute cleanup request
        await apiHandler.handleRequest(cleanupParams);

      } catch (error) {
        // Display cleanup error
        cleanupContainer.innerHTML = `
          <div class="alert alert-danger">
            <strong><i class="bi bi-exclamation-triangle"></i> Cleanup Error:</strong>
            <p>${error.message || 'Unknown error occurred during cleanup'}</p>
            <p class="mt-2"><small>You may need to manually clean up test data in the database.</small></p>
          </div>
        `;
        console.error('[Edge Tests Demo] Cleanup error:', error);
      }
    }

    /**
     * ============================================================================
     * PAGE RENDERING
     * ============================================================================
     */

    /**
     * Render the complete page content
     * 
     * This function builds and displays all sections of the edge test page:
     * - Prerequisites
     * - Terminology
     * - Index navigation
     * - Test scenarios
     * - Cleanup section
     */
    async function render() {
      // Show loading spinner
      pageContent.innerHTML = spinner ? spinner() : '<div class="loading-state">Loading...</div>';

      // Build page content HTML
      const pageHtml = `
        <!-- Prerequisites Section -->
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

        <!-- Terminology Section -->
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

        <!-- Index Navigation -->
        ${createIndexNavigation()}

        <!-- Test Scenarios -->
        <div class="demo-section">
          <h3><i class="bi bi-play-circle"></i> Test Scenarios</h3>
          <p class="description-text">
            Click "Test API Call" on any scenario below to execute the test. 
            Results will be displayed in the response container.
          </p>

          ${createTestScenarioSection(
            "1",
            "Test Scenario 1: Create Demo Item",
            "This test demonstrates how to create a new demo item using a POST request. The request includes testing: true to indicate this is a test request.",
            "POST",
            "/demo/create",
            {
              name: "Test Demo Item",
              description: "This is a test item created by the edge test page",
              status: "active"
            },
            [
              "Go to database and verify new record was created",
              "Check that 'name' field matches 'Test Demo Item'",
              "Check that 'status' field is 'active'",
              "Verify 'testing' flag was set to true in the request",
              "Check timestamp fields (createdAt, updatedAt)"
            ]
          )}

          ${createTestScenarioSection(
            "2",
            "Test Scenario 2: Get Demo Items by User ID",
            "This test demonstrates how to retrieve demo items for a specific user using a GET request with user ID input field.",
            "GET",
            "/demo/user/{userId}/list",
            null,
            [
              "Enter a user ID in the input field above",
              "Click 'Test API Call' to execute the request",
              "Verify API response contains items for the specified user",
              "Check that response includes correct user ID",
              "Verify item count matches database count for that user"
            ],
            [
              {
                type: 'text',
                id: 'userId',
                label: 'User ID',
                placeholder: 'Enter user ID (e.g., user-123)',
                value: ''
              }
            ]
          )}

          ${createTestScenarioSection(
            "3",
            "Test Scenario 3: Get Demo Items by Status",
            "This test demonstrates how to retrieve demo items filtered by status using a GET request with select dropdown.",
            "GET",
            "/demo/list",
            null,
            [
              "Select a status from the dropdown above",
              "Click 'Test API Call' to execute the request",
              "Verify API response contains only items with selected status",
              "Check that all returned items have the correct status",
              "Verify item count matches database count for that status"
            ],
            [
              {
                type: 'select',
                id: 'status',
                label: 'Status',
                options: [
                  { value: '', text: 'Select status...' },
                  { value: 'active', text: 'Active' },
                  { value: 'inactive', text: 'Inactive' },
                  { value: 'pending', text: 'Pending' },
                  { value: 'completed', text: 'Completed' }
                ]
              }
            ]
          )}

          ${createTestScenarioSection(
            "4",
            "Test Scenario 4: Update Demo Item with Inputs",
            "This test demonstrates how to update an existing demo item using a PUT request with user ID input and status select dropdown.",
            "PUT",
            "/demo/update/{userId}",
            {
              name: "Updated Demo Item"
            },
            [
              "Enter a user ID in the input field",
              "Select a status from the dropdown",
              "Click 'Test API Call' to execute the request",
              "Go to database and find the updated record",
              "Verify 'status' field was updated to selected value",
              "Check that 'updatedAt' timestamp was updated",
              "Verify 'testing' flag was included in the request"
            ],
            [
              {
                type: 'text',
                id: 'userId',
                label: 'User ID',
                placeholder: 'Enter user ID (e.g., user-123)',
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
                  { value: 'pending', text: 'Pending' }
                ]
              }
            ]
          )}
        </div>

        <!-- Cleanup Section -->
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

      // Set page content
      pageContent.innerHTML = pageHtml;

      // Attach event listeners
      attachEventListeners();
    }

    /**
     * Attach event listeners for test scenario buttons and cleanup button
     */
    function attachEventListeners() {
      // Use event delegation for test scenario buttons
      document.addEventListener("click", (event) => {
        // Check if clicked element is a test scenario button
        if (event.target.classList.contains("test-scenario-btn")) {
          // Get scenario ID from data attribute
          const scenarioId = event.target.getAttribute("data-scenario-id");
          // Get method from data attribute
          const method = event.target.getAttribute("data-method");
          // Get endpoint from data attribute
          const endpoint = event.target.getAttribute("data-endpoint");
          // Get payload from data attribute
          const payloadString = event.target.getAttribute("data-payload");
          // Parse payload if not null
          let payload = null;
          if (payloadString && payloadString !== "null") {
            try {
              // Parse JSON payload
              payload = JSON.parse(payloadString);
            } catch (parseError) {
              // Log parse error
              console.error("[Edge Tests Demo] Could not parse payload:", parseError);
            }
          }
          // Call test scenario function
          testScenario(scenarioId, method, endpoint, payload);
        }

        // Check if clicked element is cleanup button
        if (event.target.id === "cleanup-btn" || event.target.closest("#cleanup-btn")) {
          // Confirm before cleanup
          if (confirm("Are you sure you want to clean up test data? This action cannot be undone.")) {
            // Run cleanup
            cleanupTestData();
          }
        }
      });

      // Smooth scroll for index links
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

    // Expose functions to global scope for debugging
    window.EdgeTestsDemo = {
      testScenario: testScenario,
      cleanupTestData: cleanupTestData,
      getBaseUrl: getBaseUrl
    };

    // Initialize page - call the async render function
    render();
  });
})();

