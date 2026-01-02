/**
 * Edge Tests - Moderation Class
 * Edge testing functionality for moderation
 */

(function () {
  // Wait for AdminShell ready event
  function waitForAdminShell() {
    return new Promise((resolveFunction) => {
      // Check if AdminShell is already ready
      if (window.AdminShell && window.AdminShell.pageContent) {
        // AdminShell is already ready
        resolveFunction();
      } else {
        // Listen for AdminShell ready event
        document.body.addEventListener("adminshell:ready", resolveFunction, { once: true });
      }
    });
  }

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
    // Destructure AdminUtils functions
    const { spinner, spinnerInline, spinnerSmall, errorMessage } = window.AdminUtils;
    // Valid moderation types
    const VALID_MODERATION_TYPES = ["text", "image", "video", "audio", "gallery", "personal_tag", "global_tag"];
    // Page size for pagination - 20 per page, load 100 total
    const PAGE_SIZE = 20;
    const MAX_ITEMS = 100; // Load 100 items total (5 pages)
    // Track active status tab
    let activeStatusTab = "all";
    // Track pagination state per tab
    const tabPagination = {
      all: { nextToken: null, allItems: [], totalCount: 0 },
      pending: { nextToken: null, allItems: [], totalCount: 0 },
      approved: { nextToken: null, allItems: [], totalCount: 0 },
      declined: { nextToken: null, allItems: [], totalCount: 0 }
    };
    // Track counts for each tab
    let tabCounts = {
      all: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    };

    /**
     * Get base URL from API configuration
     * @returns {string} Base URL for API calls
     */
    function getBaseUrl() {
      // Default fallback base URL - use same as moderation page
      let baseUrl = "http://localhost:3000";
      try {
        // Get API config from page
        const configScriptElement = document.getElementById("api-config");
        if (configScriptElement) {
          // Parse page config JSON
          const pageConfig = JSON.parse(configScriptElement.textContent);
          // Get current environment
          const currentEnvironment = window.Env?.current || "dev";
          
          // Try to get moderation config (not the edge-tests-moderation config, but the actual moderation API config)
          const moderationConfig = pageConfig["moderation"];
          
          // Check if moderation config exists and has endpoint for current environment
          if (moderationConfig && moderationConfig[currentEnvironment] && moderationConfig[currentEnvironment].endpoint) {
            // Get endpoint URL
            const endpointUrl = moderationConfig[currentEnvironment].endpoint;
            // Extract base URL from endpoint (e.g., "http://localhost:3000/moderation/status/pending" -> "http://localhost:3000")
            const urlMatch = endpointUrl.match(/^(https?:\/\/[^\/]+)/);
            if (urlMatch) {
              // Use extracted base URL
              baseUrl = urlMatch[1];
            }
          } else {
            // If no moderation config, try to get from window.AdminEndpoints
            const adminEndpoints = window.AdminEndpoints;
            if (adminEndpoints && adminEndpoints.base && adminEndpoints.base[currentEnvironment]) {
              baseUrl = adminEndpoints.base[currentEnvironment];
            }
          }
        }
      } catch (configError) {
        // Use default base URL if config parsing fails
        console.warn("[Edge Tests Moderation] Could not parse API config, using default base URL:", configError);
      }
      
      console.log("[Edge Tests Moderation] Using base URL:", baseUrl);
      // Return base URL
      return baseUrl;
    }

    /**
     * Convert date string (YYYY-MM-DD) to millisecond timestamp
     * @param {string} dateString - Date string in YYYY-MM-DD format
     * @param {boolean} endOfDay - If true, set to end of day (23:59:59.999)
     * @returns {number} Timestamp in milliseconds
     */
    function dateToTimestamp(dateString, endOfDay = false) {
      // Return null if no date string provided
      if (!dateString) return null;
      // Create date object from string
      const date = new Date(dateString);
      if (endOfDay) {
        // Set to end of day
        date.setHours(23, 59, 59, 999);
      } else {
        // Set to start of day
        date.setHours(0, 0, 0, 0);
      }
      // Return timestamp in milliseconds
      return date.getTime();
    }

    /**
     * Validate moderation type
     * @param {string} type - Moderation type to validate
     * @returns {Object} Validation result with isValid and errorMessage
     */
    function validateModerationType(type) {
      // Check if type is provided
      if (!type) {
        // Return invalid result with error message
        return { isValid: false, errorMessage: "Moderation type is required" };
      }
      // Check if type is in valid types list
      if (!VALID_MODERATION_TYPES.includes(type)) {
        // Return invalid result with error message
        return { 
          isValid: false, 
          errorMessage: `Invalid moderation type. Must be one of: ${VALID_MODERATION_TYPES.join(", ")}` 
        };
      }
      // Return valid result
      return { isValid: true, errorMessage: null };
    }

    /**
     * Format date time for display
     * @param {string|number} dateValue - Date value
     * @returns {string} Formatted date string
     */
    function formatDateTime(dateValue) {
      // Return dash if no date value
      if (!dateValue) return "-";
      // Create date object
      const date = new Date(typeof dateValue === 'number' ? dateValue : dateValue);
      // Return formatted date string
      return date.toLocaleString();
    }

    /**
     * Fetch moderations by tab type with pagination
     * @param {string} tabType - Tab type (all, pending, approved, declined)
     * @param {boolean} append - If true, append to existing data
     * @returns {Promise<Object>} Object with items array and hasMore boolean
     */
    async function fetchModerationsByTab(tabType, append = false) {
      try {
        const baseUrl = getBaseUrl();
        const pagination = tabPagination[tabType] || tabPagination.all;
        
        // Reset pagination if not appending
        if (!append) {
          pagination.nextToken = null;
          pagination.allItems = [];
          pagination.totalCount = 0;
        }
        
        // Stop if we've loaded max items
        if (pagination.allItems.length >= MAX_ITEMS) {
          return { items: pagination.allItems, hasMore: false };
        }
        
        let url;
        if (tabType === "all") {
          // Fetch all moderations - get pending status as base (most records)
          url = `${baseUrl}/moderation/status/all`;
        } else if (tabType === "pending") {
          // Fetch pending status
          url = `${baseUrl}/moderation/status/pending`;
        } else if (tabType === "approved") {
          // Fetch approved status
          url = `${baseUrl}/moderation/status/approved`;
        } else if (tabType === "declined") {
          // Fetch declined status (maps to rejected in API)
          url = `${baseUrl}/moderation/status/rejected`;
        } else {
          throw new Error(`Unknown tab type: ${tabType}`);
        }
        
        // Add pagination query params
        const queryParams = [];
        const remainingItems = MAX_ITEMS - pagination.allItems.length;
        const limit = Math.min(PAGE_SIZE, remainingItems);
        if (limit > 0) {
          queryParams.push(`limit=${limit}`);
        }
        if (pagination.nextToken) {
          queryParams.push(`nextToken=${encodeURIComponent(pagination.nextToken)}`);
        }
        
        if (queryParams.length > 0) {
          url += '?' + queryParams.join('&');
        }
        
        console.log(`[Edge Tests Moderation] Fetching ${tabType} moderations from:`, url);
        
        const response = await window.ApiService._fetchWithTimeout(url, { method: "GET" });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch ${tabType} moderations: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Handle different response formats
        let items = [];
        if (Array.isArray(data)) {
          items = data;
        } else if (data.items || data.moderations) {
          items = data.items || data.moderations || [];
        } else if (data.item) {
          items = Array.isArray(data.item) ? data.item : [data.item];
        } else if (data.moderationId || data.id) {
          items = [data];
        }
        
        // Extract pagination info
        pagination.nextToken = data.nextToken || null;
        pagination.totalCount = data.total || data.count || pagination.allItems.length + items.length;
        
        // Append items to existing items
        pagination.allItems = [...pagination.allItems, ...items];
        
        // Check if there are more items to load
        const hasMore = pagination.nextToken !== null && pagination.allItems.length < MAX_ITEMS && items.length === PAGE_SIZE;
        
        return { items: pagination.allItems, hasMore };
      } catch (error) {
        console.error(`[Edge Tests Moderation] Error fetching ${tabType} moderations:`, error);
        throw error;
      }
    }


    /**
     * Render moderation table with pagination
     * @param {Array} items - Array of moderation items
     * @param {boolean} hasMore - Whether there are more items to load
     * @param {string} tabType - Current tab type
     * @returns {string} HTML string for table
     */
    function renderModerationTable(items, hasMore = false, tabType = "all") {
      if (!items || items.length === 0) {
        return `
          <div class="alert alert-info">
            No moderation records found.
          </div>
        `;
      }
      
      const pagination = tabPagination[tabType] || tabPagination.all;
      const displayedCount = items.length;
      const startIndex = displayedCount > 0 ? 1 : 0;
      const endIndex = displayedCount;
      const totalCount = pagination.totalCount || displayedCount;
      
      const tableRows = items.map((item) => {
        const moderationId = item.moderationId || item.id || "-";
        const type = item.type || "-";
        const status = item.status || "-";
        const date = formatDateTime(item.submittedAt || item.createdAt);
        
        return `
          <tr>
            <td>${moderationId}</td>
            <td>${type}</td>
            <td>${status}</td>
            <td>${date}</td>
          </tr>
        `;
      }).join("");
      
      const loadMoreButton = hasMore ? `
        <div class="text-center mt-3">
          <button id="loadMoreBtn-${tabType}" class="btn btn-primary" onclick="window.loadMoreModerations('${tabType}')">
            Load More
          </button>
        </div>
      ` : '';
      
      return `
        <div class="notice mb-2">Showing ${startIndex}-${endIndex} of ${displayedCount}${totalCount > displayedCount ? ` (${totalCount} total)` : ''}</div>
        <div class="card">
          <div class="card-body p-0">
            <table class="table table-bordered mb-0">
              <thead class="table-light">
                <tr>
                  <th>Moderation ID</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Date Submitted</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        </div>
        ${loadMoreButton}
      `;
    }
    
    /**
     * Load more items for a tab
     * @param {string} tabType - Tab type to load more for
     */
    async function loadMoreModerations(tabType) {
      const containerIdMap = {
        "all": "moderation-table-container",
        "pending": "moderation-table-container-pending",
        "approved": "moderation-table-container-approved",
        "declined": "moderation-table-container-declined"
      };
      
      const containerId = containerIdMap[tabType];
      if (!containerId) return;
      
      const tableContainer = document.getElementById(containerId);
      if (!tableContainer) return;
      
      const loadMoreBtn = document.getElementById(`loadMoreBtn-${tabType}`);
      if (loadMoreBtn) {
        // Save original text and add spinner without changing button size
        const originalText = loadMoreBtn.textContent;
        loadMoreBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Loading...';
        loadMoreBtn.disabled = true;
      }
      
      try {
        const { items, hasMore } = await fetchModerationsByTab(tabType, true);
        tableContainer.innerHTML = renderModerationTable(items, hasMore, tabType);
      } catch (error) {
        if (loadMoreBtn) {
          loadMoreBtn.innerHTML = "Load More";
          loadMoreBtn.disabled = false;
        }
        console.error(`[Edge Tests Moderation] Error loading more ${tabType} moderations:`, error);
        alert(`Failed to load more items: ${error.message}`);
      }
    }
    
    // Expose loadMoreModerations to window
    window.loadMoreModerations = loadMoreModerations;

    /**
     * Handle status tab click
     * @param {string} targetId - Target pane ID
     * @param {HTMLElement} tabButton - Tab button element
     */
    async function handleStatusTabClick(targetId, tabButton) {
      // Extract tab type from tab button ID (tab-all, tab-pending, tab-approved)
      const tabMatch = tabButton.id.match(/tab-(.+)/);
      if (!tabMatch) return;
      
      const tabType = tabMatch[1];
      activeStatusTab = tabType;
      
      // Map pane ID to container ID
      const containerIdMap = {
        "pane-all": "moderation-table-container",
        "pane-pending": "moderation-table-container-pending",
        "pane-approved": "moderation-table-container-approved",
        "pane-declined": "moderation-table-container-declined"
      };
      
      const containerId = containerIdMap[targetId];
      if (!containerId) return;
      
      // Get table container
      const tableContainer = document.getElementById(containerId);
      if (!tableContainer) return;
      
      // Show spinner
      tableContainer.innerHTML = spinnerInline("Loading moderation records...");
      
      try {
        // Fetch data for this tab type (reset pagination)
        const { items, hasMore } = await fetchModerationsByTab(tabType, false);
        
        // Render table with pagination
        tableContainer.innerHTML = renderModerationTable(items, hasMore, tabType);
      } catch (error) {
        // Show error message
        tableContainer.innerHTML = errorMessage(error, `Failed to load ${tabType} moderations`);
      }
    }

    /**
     * Create scenario section HTML
     * @param {string} scenarioId - Unique ID for scenario
     * @param {string} title - Scenario title
     * @param {string} description - Scenario description
     * @param {string} apiMethod - HTTP method (GET, POST, PUT, DELETE)
     * @param {string} apiEndpoint - API endpoint path
     * @param {Object} requestPayload - Request payload object (optional)
     * @param {Array} checklistItems - Array of checklist item strings
     * @returns {string} HTML string for scenario section
     */
    function createScenarioSection(scenarioId, title, description, apiMethod, apiEndpoint, requestPayload = null, checklistItems = []) {
      // Build checklist HTML
      let checklistHtml = "";
      if (checklistItems.length > 0) {
        // Map checklist items to HTML
        const checklistItemsHtml = checklistItems.map((item, index) => {
          // Return checkbox HTML for each item
          return `
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="checklist-${scenarioId}-${index}" />
              <label class="form-check-label" for="checklist-${scenarioId}-${index}">${item}</label>
            </div>
          `;
        }).join("");
        // Wrap checklist items in container
        checklistHtml = `
          <div class="mb-3">
            <strong>Checklist:</strong>
            <div class="mt-2">${checklistItemsHtml}</div>
          </div>
        `;
      }
      // Build request payload display HTML
      let requestPayloadHtml = "";
      if (requestPayload) {
        // Format payload as JSON string
        const payloadJson = JSON.stringify(requestPayload, null, 2);
        // Create request payload display
        requestPayloadHtml = `
          <div class="mb-3">
            <strong>Request Payload:</strong>
            <pre class="bg-light p-3 rounded mt-2" style="max-height: 300px; overflow: auto;"><code>${payloadJson}</code></pre>
          </div>
        `;
      }
      // Build API endpoint display HTML
      const apiEndpointHtml = `
        <div class="mb-3">
          <strong>API Endpoint:</strong>
          <div class="mt-2">
            <code>${apiMethod} ${apiEndpoint}</code>
          </div>
        </div>
      `;
      // Return complete scenario section HTML
      return `
        <div class="card mb-4" id="scenario-${scenarioId}">
      <div class="card-body">
            <h5 class="card-title">${title}</h5>
            <p class="card-text">${description}</p>
            <div class="mb-3">
              <a href="#TODO" class="text-decoration-none">Full Documentation</a>
            </div>
            ${checklistHtml}
            ${apiEndpointHtml}
            ${requestPayloadHtml}
            <div class="mb-3">
              <button class="btn btn-primary w-100 test-scenario-btn" data-scenario-id="${scenarioId}" data-method="${apiMethod}" data-endpoint="${apiEndpoint}" data-payload='${requestPayload ? JSON.stringify(requestPayload) : "null"}'>
                Test API Call
              </button>
            </div>
            <div id="response-${scenarioId}" class="response-container"></div>
            <div id="count-${scenarioId}" class="count-container mt-2"></div>
          </div>
        </div>
      `;
    }

    /**
     * Test API scenario
     * @param {string} scenarioId - Scenario ID
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {Object} payload - Request payload (optional)
     */
    async function testScenario(scenarioId, method, endpoint, payload) {
      // Get response container element
      const responseContainer = document.getElementById(`response-${scenarioId}`);
      // Get count container element
      const countContainer = document.getElementById(`count-${scenarioId}`);
      // Show loading spinner
      responseContainer.innerHTML = spinnerInline("Testing API call...");
      // Clear count container
      countContainer.innerHTML = "";
      try {
        // Validate moderation type if payload contains type field
        if (payload && payload.type) {
          // Validate type
          const validationResult = validateModerationType(payload.type);
          // Check if validation failed
          if (!validationResult.isValid) {
            // Display validation error
            responseContainer.innerHTML = `
              <div class="alert alert-danger">
                <strong>Validation Error:</strong> ${validationResult.errorMessage}
              </div>
            `;
            // Clear count on error
            countContainer.innerHTML = "";
            // Exit function
            return;
          }
        }
        // Get base URL
        const baseUrl = getBaseUrl();
        // Build full URL
        const fullUrl = `${baseUrl}${endpoint}`;
        // Prepare fetch options
        const fetchOptions = {
          method: method,
          headers: {}
        };
        // Add payload for POST/PUT requests
        if ((method === "POST" || method === "PUT") && payload) {
          // Set content type header
          fetchOptions.headers["Content-Type"] = "application/json";
          // Stringify payload
          fetchOptions.body = JSON.stringify(payload);
        }
        // Make API call
        const response = await window.ApiService._fetchWithTimeout(fullUrl, fetchOptions);
        // Check if response is ok
        if (!response.ok) {
          // Try to parse error response
          let errorData;
          try {
            // Parse error response JSON
            errorData = await response.json();
          } catch (parseError) {
            // Use status text if JSON parse fails
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
          }
          // Display error message
          responseContainer.innerHTML = `
            <div class="alert alert-danger">
              <strong>Error (${response.status}):</strong>
              <pre class="bg-light p-3 rounded mt-2" style="max-height: 400px; overflow: auto;"><code>${JSON.stringify(errorData, null, 2)}</code></pre>
            </div>
          `;
          // Clear count on error
          countContainer.innerHTML = "";
          // Exit function
          return;
        }
        // Parse response JSON
        const responseData = await response.json();
        // Check if response has error field
        if (responseData.error) {
          // Display error message
          responseContainer.innerHTML = `
            <div class="alert alert-danger">
              <strong>API Error:</strong>
              <pre class="bg-light p-3 rounded mt-2" style="max-height: 400px; overflow: auto;"><code>${JSON.stringify(responseData, null, 2)}</code></pre>
            </div>
          `;
          // Clear count on error
          countContainer.innerHTML = "";
          // Exit function
          return;
        }
        // Check if this is a count endpoint response
        const isCountEndpoint = endpoint.includes("/count") || endpoint.includes("/counts");
        // Check if response has count field (count endpoint)
        if (isCountEndpoint && (responseData.count !== undefined || responseData.counts !== undefined)) {
          // Format response for display
          const responseJson = JSON.stringify(responseData, null, 2);
          // Display response
          responseContainer.innerHTML = `
            <div class="alert alert-success">
              <strong>Response (${response.status}):</strong>
              <pre class="bg-light p-3 rounded mt-2" style="max-height: 400px; overflow: auto;"><code>${responseJson}</code></pre>
            </div>
          `;
          // Display count(s)
          if (responseData.counts) {
            // Aggregate counts response
            const countsHtml = Object.entries(responseData.counts).map(([key, value]) => 
              `<div><strong>${key}:</strong> ${value}</div>`
            ).join("");
            countContainer.innerHTML = `
              <div class="alert alert-info">
                <strong>Counts:</strong>
                <div class="mt-2">${countsHtml}</div>
              </div>
            `;
          } else if (responseData.count !== undefined) {
            // Single count response
            countContainer.innerHTML = `
              <div class="alert alert-info">
                <strong>Count:</strong> ${responseData.count}
              </div>
            `;
          }
        } else {
          // Regular endpoint response - extract items
          const items = extractItemsFromResponse(responseData);
          // Count items
          const itemCount = items.length;
          // Format response for display
          const responseJson = JSON.stringify(responseData, null, 2);
          // Display response
          responseContainer.innerHTML = `
            <div class="alert alert-success">
              <strong>Response (${response.status}):</strong>
              <pre class="bg-light p-3 rounded mt-2" style="max-height: 400px; overflow: auto;"><code>${responseJson}</code></pre>
            </div>
          `;
          // Display count
          countContainer.innerHTML = `
            <div class="alert alert-info">
              <strong>Total Count:</strong> ${itemCount}
            </div>
          `;
        }
        // Update tab counts if needed
        updateTabCounts();
      } catch (error) {
        // Display error message
        responseContainer.innerHTML = errorMessage(error, "API call failed");
        // Clear count on error
        countContainer.innerHTML = "";
      }
    }

    /**
     * Extract items from API response
     * @param {Object|Array} responseData - API response data
     * @returns {Array} Array of items
     */
    function extractItemsFromResponse(responseData) {
      // Initialize items array
      let items = [];
      // Check if response is array
      if (Array.isArray(responseData)) {
        // Use array directly
        items = responseData;
      } 
      // Check if response has items array
      else if (responseData.items || responseData.moderations) {
        // Use items or moderations array
        items = responseData.items || responseData.moderations || [];
      }
      // Check if response has single item wrapped
      else if (responseData.item) {
        // Extract item (could be array or single object)
        items = Array.isArray(responseData.item) ? responseData.item : [responseData.item];
      }
      // Check if response is single item
      else if (responseData.moderationId || responseData.id) {
        // Wrap single item in array
        items = [responseData];
      }
      // Return extracted items
      return items;
    }

    /**
     * Update tab counts using /moderation/counts endpoint
     */
    async function updateTabCounts() {
      try {
        const baseUrl = getBaseUrl();
        const countsUrl = `${baseUrl}/moderation/counts`;
        
        console.log("[Edge Tests Moderation] Fetching counts from:", countsUrl);
        
        const response = await window.ApiService._fetchWithTimeout(countsUrl, { method: "GET" });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch counts: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Handle response format: { success: true, counts: { pending, approved, rejected, all, ... } }
        if (data.success && data.counts) {
          const counts = data.counts;
          
          // Map counts from API response to tab counts
          tabCounts.all = counts.all || 0;
          tabCounts.pending = counts.pending || 0;
          tabCounts.approved = counts.approved || 0;
          tabCounts.rejected = counts.rejected || 0;
          
          // Log counts for debugging
          console.log("[Edge Tests Moderation] Counts updated - All:", tabCounts.all, "Pending:", tabCounts.pending, "Approved:", tabCounts.approved, "Declined:", tabCounts.rejected);
          
          // Update tab labels with counts
          updateTabLabels();
        } else {
          throw new Error("Invalid response format from counts endpoint");
        }
      } catch (error) {
        // Log error but don't block UI
        console.warn("[Edge Tests Moderation] Could not update tab counts:", error);
        // Set all counts to 0 on error
        tabCounts.all = 0;
        tabCounts.pending = 0;
        tabCounts.approved = 0;
        tabCounts.rejected = 0;
        // Update tab labels
        updateTabLabels();
      }
    }

    /**
     * Update tab labels with counts
     */
    /**
     * Update tab labels with counts using Tabs component
     */
    function updateTabLabels() {
      // Use Tabs component to update counts if available
      if (window.Tabs && typeof window.Tabs.updateCount === 'function') {
        window.Tabs.updateCount("tab-all", tabCounts.all);
        window.Tabs.updateCount("tab-pending", tabCounts.pending);
        window.Tabs.updateCount("tab-approved", tabCounts.approved);
        window.Tabs.updateCount("tab-declined", tabCounts.declined);
      } else {
        // Fallback to manual update
        const allTabButton = document.getElementById("tab-all");
        const pendingTabButton = document.getElementById("tab-pending");
        const approvedTabButton = document.getElementById("tab-approved");
        const declinedTabButton = document.getElementById("tab-declined");

        if (allTabButton) allTabButton.textContent = `All (${tabCounts.all})`;
        if (pendingTabButton) pendingTabButton.textContent = `Pending (${tabCounts.pending})`;
        if (approvedTabButton) approvedTabButton.textContent = `Approved (${tabCounts.approved})`;
        if (declinedTabButton) declinedTabButton.textContent = `Declined (${tabCounts.declined})`;
      }
    }
      // Get all tab buttons
      const allTabButton = document.getElementById("tab-all");
      // Get pending tab button
      const pendingTabButton = document.getElementById("tab-pending");
      // Get approved tab button
      const approvedTabButton = document.getElementById("tab-approved");
      // Get declined tab button
      const declinedTabButton = document.getElementById("tab-declined");
      // Log counts for debugging
      console.log("[Edge Tests Moderation] Updating tab labels - All:", tabCounts.all, "Pending:", tabCounts.pending, "Approved:", tabCounts.approved, "Declined:", tabCounts.declined);
      // Update all tab label
      if (allTabButton) {
        // Set text with count
        allTabButton.textContent = `All (${tabCounts.all})`;
        // Log update
        console.log("[Edge Tests Moderation] Updated All tab button");
      } else {
        // Log if button not found
        console.warn("[Edge Tests Moderation] All tab button not found");
      }
      // Update pending tab label
      if (pendingTabButton) {
        // Set text with count
        pendingTabButton.textContent = `Pending (${tabCounts.pending})`;
        // Log update
        console.log("[Edge Tests Moderation] Updated Pending tab button");
      } else {
        // Log if button not found
        console.warn("[Edge Tests Moderation] Pending tab button not found");
      }
      // Update approved tab label
      if (approvedTabButton) {
        // Set text with count
        approvedTabButton.textContent = `Approved (${tabCounts.approved})`;
        // Log update
        console.log("[Edge Tests Moderation] Updated Approved tab button");
      } else {
        // Log if button not found
        console.warn("[Edge Tests Moderation] Approved tab button not found");
      }
      // Update declined tab label
      if (declinedTabButton) {
        // Set text with count
        declinedTabButton.textContent = `Declined (${tabCounts.rejected})`;
        // Log update
        console.log("[Edge Tests Moderation] Updated Declined tab button");
      } else {
        // Log if button not found
        console.warn("[Edge Tests Moderation] Declined tab button not found");
      }
    }

    /**
     * Switch active tab
     * @param {string} tabName - Tab name to switch to
     */
    function switchTab(tabName) {
      // Set active tab
      activeTab = tabName;
      // Get all tab buttons
      const allTabButtons = document.querySelectorAll(".nav-tabs .nav-link");
      // Remove active class from all tabs
      allTabButtons.forEach(button => {
        // Remove active class
        button.classList.remove("active");
      });
      // Get all tab panes
      const allTabPanes = document.querySelectorAll(".tab-pane");
      // Remove active class from all panes
      allTabPanes.forEach(pane => {
        // Remove active class
        pane.classList.remove("active");
      });
      // Get active tab button
      const activeTabButton = document.getElementById(`tab-${tabName}`);
      // Get active tab pane
      const activeTabPane = document.getElementById(`pane-${tabName}`);
      // Add active class to tab button
      if (activeTabButton) {
        // Add active class
        activeTabButton.classList.add("active");
      }
      // Add active class to tab pane
      if (activeTabPane) {
        // Add active class
        activeTabPane.classList.add("active");
      }
    }

    /**
     * Render page content
     */
    async function render() {
      // Show loading spinner
      pageContent.innerHTML = spinner();
      
      // Build status tabs HTML with counts using Tabs component
      const tabsHtml = window.Tabs && typeof window.Tabs.create === 'function'
        ? window.Tabs.create({
            containerId: "status-tabs",
            marginBottom: "mb-4",
            tabs: [
              {
                id: "tab-all",
                label: "All",
                count: tabCounts.all,
                targetId: "pane-all",
                active: true,
                onClick: "handleStatusTabClick"
              },
              {
                id: "tab-pending",
                label: "Pending",
                count: tabCounts.pending,
                targetId: "pane-pending",
                active: false,
                onClick: "handleStatusTabClick"
              },
              {
                id: "tab-approved",
                label: "Approved",
                count: tabCounts.approved,
                targetId: "pane-approved",
                active: false,
                onClick: "handleStatusTabClick"
              },
              {
                id: "tab-declined",
                label: "Declined",
                count: tabCounts.declined,
                targetId: "pane-declined",
                active: false,
                onClick: "handleStatusTabClick"
              }
            ]
          })
        : `
          <ul class="nav nav-tabs mb-4" role="tablist" data-tabs-container="status-tabs">
            <li class="nav-item" role="presentation">
              <button class="nav-link active" id="tab-all" type="button" role="tab" data-tab-target="pane-all" data-tab-click="handleStatusTabClick">All (${tabCounts.all})</button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" id="tab-pending" type="button" role="tab" data-tab-target="pane-pending" data-tab-click="handleStatusTabClick">Pending (${tabCounts.pending})</button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" id="tab-approved" type="button" role="tab" data-tab-target="pane-approved" data-tab-click="handleStatusTabClick">Approved (${tabCounts.approved})</button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" id="tab-declined" type="button" role="tab" data-tab-target="pane-declined" data-tab-click="handleStatusTabClick">Declined (${tabCounts.declined})</button>
            </li>
          </ul>
        `;
      
      // Build tab panes HTML
      const tabPanesHtml = `
        <div class="tab-content">
          <div class="tab-pane fade show active" id="pane-all" role="tabpanel">
            <div id="moderation-table-container">
              ${spinnerInline("Loading all moderations...")}
            </div>
          </div>
          <div class="tab-pane fade" id="pane-pending" role="tabpanel">
            <div id="moderation-table-container-pending">
              ${spinnerInline("Click Pending tab to load data")}
            </div>
          </div>
          <div class="tab-pane fade" id="pane-approved" role="tabpanel">
            <div id="moderation-table-container-approved">
              ${spinnerInline("Click Approved tab to load data")}
            </div>
          </div>
          <div class="tab-pane fade" id="pane-declined" role="tabpanel">
            <div id="moderation-table-container-declined">
              ${spinnerInline("Click Declined tab to load data")}
            </div>
          </div>
        </div>
      `;
      
      const fullTabsHtml = tabsHtml + tabPanesHtml;
      
      // Set page content
      pageContent.innerHTML = fullTabsHtml;
      
      // Expose handleStatusTabClick to window for data-tab-click attribute
      window.handleStatusTabClick = handleStatusTabClick;
      
      // Initialize tabs - use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        // Initialize tabs using Tabs component
        if (window.Tabs && typeof window.Tabs.init === 'function') {
          window.Tabs.init();
        }
      });
      
      // Fetch and update tab counts (don't await, let it run in background)
      updateTabCounts().catch(error => {
        console.warn("[Edge Tests Moderation] Error updating tab counts:", error);
      });
      
      // Load initial data for "all" tab immediately
      const tableContainer = document.getElementById("moderation-table-container");
      if (tableContainer) {
        try {
          const { items, hasMore } = await fetchModerationsByTab("all", false);
          tableContainer.innerHTML = renderModerationTable(items, hasMore, "all");
          
          // Update counts after data is loaded (in case counts weren't ready yet)
          if (tabCounts.all === 0 && items.length > 0) {
            tabCounts.all = items.length;
            updateTabLabels();
          }
        } catch (error) {
          console.error("[Edge Tests Moderation] Error loading all moderations:", error);
          // Show user-friendly error message
          const errorMsg = error.message || "Failed to load moderations. Please check your API configuration.";
          tableContainer.innerHTML = `
            <div class="alert alert-warning">
              <strong>Unable to load data:</strong> ${errorMsg}
              <br><small>Make sure the moderation API endpoint is configured in the API config.</small>
            </div>
          `;
        }
      }
      
    }

    /**
     * Render all scenarios
     * @returns {string} HTML string for all scenarios
     */
    function renderAllScenarios() {
      // Return HTML with all scenario sections
      return `
        ${createCreateScenarios()}
        ${createUpdateScenarios()}
        ${createGetScenarios()}
        ${createCountScenarios()}
      `;
    }

    /**
     * Render unmoderated scenarios
     * @returns {string} HTML string for unmoderated scenarios
     */
    function renderUnmoderatedScenarios() {
      // Return HTML with unmoderated-specific scenarios (pending status with moderatedBy === null)
      return `
        <div class="alert alert-info mb-4">
          <strong>Unmoderated Items:</strong> These are items with "pending" status where <code>moderatedBy</code> is <code>null</code> (items that have not been reviewed by a moderator yet).
        </div>
        ${createScenarioSection(
          "get-unmoderated-pending",
          "Get Unmoderated Items (Pending Status with moderatedBy === null)",
          "Example usage to get all unmoderated items. Filter pending items where moderatedBy is null.",
          "GET",
          "/moderation/status/pending",
          null,
          ["Call API endpoint", "Filter items where moderatedBy === null", "Count unmoderated items"]
        )}
        ${createScenarioSection(
          "get-unmoderated-by-user",
          "Get Unmoderated Items for a User",
          "Example usage to get all unmoderated items for a specific user. Filter pending items where moderatedBy is null.",
          "GET",
          "/moderation/user/{userId}/status/pending",
          null,
          ["Call API with userId", "Filter items where moderatedBy === null", "Count unmoderated items"]
        )}
        ${createScenarioSection(
          "get-unmoderated-by-type",
          "Get Unmoderated Items by Type",
          "Example usage to get all unmoderated items by content type. Filter pending items where moderatedBy is null.",
          "GET",
          "/moderation/type/{type}",
          null,
          ["Call API with type filter", "Filter items where moderatedBy === null", "Count unmoderated items"]
        )}
      `;
    }

    /**
     * Render pending resubmission scenarios
     * @returns {string} HTML string for pending resubmission scenarios
     */
    function renderPendingResubmissionScenarios() {
      // Return HTML with pending resubmission-specific scenarios
      // Note: pending_resubmission is not a valid status, so we use pending and filter client-side
      return `
        <div class="alert alert-info mb-4">
          <strong>Pending Resubmission Items:</strong> These are items with "pending" status where <code>moderatedBy</code> is NOT null (were reviewed before) and have rejection/decline history in <code>meta.history</code>.
        </div>
        ${createScenarioSection(
          "get-pending-resubmission",
          "Get Pending Resubmission Items",
          "Example usage to get items that need resubmission. Filter pending items where moderatedBy is not null and have rejection history.",
          "GET",
          "/moderation/status/pending",
          null,
          ["Call API endpoint", "Filter items where moderatedBy !== null", "Filter items with rejection history in meta.history", "Count filtered items"]
        )}
        ${createScenarioSection(
          "get-pending-resubmission-by-user",
          "Get Pending Resubmission Items for a User",
          "Example usage to get pending resubmission items for a specific user. Filter pending items where moderatedBy is not null and have rejection history.",
          "GET",
          "/moderation/user/{userId}/status/pending",
          null,
          ["Call API with userId", "Filter items where moderatedBy !== null", "Filter items with rejection history", "Count items"]
        )}
      `;
    }

    /**
     * Create scenarios for create operations
     * @returns {string} HTML string for create scenarios
     */
    function createCreateScenarios() {
      // Return HTML with all create scenario sections
      return `
        <h4 class="mb-4">Create Operations</h4>
        ${createScenarioSection(
          "create-text",
          "Create Moderation for Single Text",
          "Example usage to create a moderation for single text content.",
          "POST",
          "/moderation",
          {
            userId: "user-123",
            contentId: "content-text-001",
            type: "text",
            contentType: "post",
            content: {
              body: "Sample text content for moderation",
              title: null
            }
          },
          ["Validate type is 'text'", "Create moderation with text content", "Verify response contains moderationId"]
        )}
        ${createScenarioSection(
          "create-image",
          "Create Moderation for Single Image",
          "Example usage to create a moderation for single image content.",
          "POST",
          "/moderation",
          {
            userId: "user-123",
            contentId: "content-image-001",
            type: "image",
            contentType: "post",
            content: {
              url: "https://example.com/image.jpg",
              caption: "Sample image caption"
            }
          },
          ["Validate type is 'image'", "Create moderation with image URL", "Verify response contains moderationId"]
        )}
        ${createScenarioSection(
          "create-gallery",
          "Create Moderation for Single Image Gallery",
          "Example usage to create a moderation for single image gallery content.",
          "POST",
          "/moderation",
          {
            userId: "user-123",
            contentId: "content-gallery-001",
            type: "gallery",
            contentType: "post",
            content: {
              images: [
                "https://example.com/image1.jpg",
                "https://example.com/image2.jpg",
                "https://example.com/image3.jpg"
              ]
            }
          },
          ["Validate type is 'gallery'", "Create moderation with image array", "Verify response contains moderationId"]
        )}
        ${createScenarioSection(
          "create-video",
          "Create Moderation for Single Video",
          "Example usage to create a moderation for single video content.",
          "POST",
          "/moderation",
          {
            userId: "user-123",
            contentId: "content-video-001",
            type: "video",
            contentType: "post",
            content: {
              url: "https://example.com/video.mp4",
              thumbnail: "https://example.com/thumbnail.jpg"
            }
          },
          ["Validate type is 'video'", "Create moderation with video URL", "Verify response contains moderationId"]
        )}
        ${createScenarioSection(
          "create-audio",
          "Create Moderation for Audio",
          "Example usage to create a moderation for audio content.",
          "POST",
          "/moderation",
          {
            userId: "user-123",
            contentId: "content-audio-001",
            type: "audio",
            contentType: "post",
            content: {
              url: "https://example.com/audio.mp3",
              duration: 180
            }
          },
          ["Validate type is 'audio'", "Create moderation with audio URL", "Verify response contains moderationId"]
        )}
        ${createScenarioSection(
          "create-personal-tag",
          "Create Moderation for Personal Tag",
          "Example usage to create a moderation for personal tag content.",
          "POST",
          "/moderation",
          {
            userId: "user-123",
            contentId: "content-personal-tag-001",
            type: "personal_tag",
            contentType: "tag",
            content: {
              tagName: "My Personal Tag",
              description: "Tag description"
            }
          },
          ["Validate type is 'personal-tag'", "Create moderation with tag data", "Verify response contains moderationId"]
        )}
        ${createScenarioSection(
          "create-global-tag",
          "Create Moderation for Global Tag",
          "Example usage to create a moderation for global tag content.",
          "POST",
          "/moderation",
          {
            userId: "user-123",
            contentId: "content-global-tag-001",
            type: "global_tag",
            contentType: "tag",
            content: {
              tagName: "Global Tag",
              description: "Global tag description"
            }
          },
          ["Validate type is 'global-tag'", "Create moderation with tag data", "Verify response contains moderationId"]
        )}
      `;
    }

    /**
     * Create scenarios for update operations
     * @returns {string} HTML string for update scenarios
     */
    function createUpdateScenarios() {
      // Return HTML with all update scenario sections
      return `
        <h4 class="mb-4 mt-5">Update Operations</h4>
        ${createScenarioSection(
          "delete-moderation",
          "Delete a Moderation",
          "Example usage to delete a moderation.",
          "DELETE",
          "/moderation/{moderationId}",
          null,
          ["Verify moderation exists", "Delete moderation", "Verify deletion response"]
        )}
        ${createScenarioSection(
          "update-status",
          "Update Moderation Status",
          "Example usage to update moderation status.",
          "POST",
          "/moderation/{moderationId}/action",
          {
            userId: "user-123",
            action: "approve",
            reason: "Content approved",
            moderatedBy: "Allen"
          },
          ["Verify moderation exists", "Update status to approved", "Verify status update"]
        )}
        ${createScenarioSection(
          "decline-with-notes",
          "Decline Moderation with Private and Public Notes",
          "Example usage to decline a moderation with both private note (internal) and public note (emailed to user).",
          "POST",
          "/moderation/{moderationId}/action",
          {
            userId: "user-123",
            action: "reject",
            reason: "VIOLENCE",
            reasonCode: "VIOLENCE",
            moderatedBy: "Allen",
            note: "Private note for internal team review",
            publicNote: "Your content has been declined due to violation of our community guidelines regarding violence."
          },
          ["Verify moderation exists", "Add private note", "Add public note", "Decline moderation", "Verify decline response"]
        )}
        ${createScenarioSection(
          "update-user-id",
          "Update Moderation User ID",
          "Example usage to update moderation user ID.",
          "PUT",
          "/moderation/{moderationId}",
          {
            userId: "user-456",
            meta:{

            }
          },
          ["Verify moderation exists", "Update user ID", "Verify user ID update"]
        )}
        ${createScenarioSection(
          "update-content",
          "Update Moderation Content",
          "Example usage to update moderation content.",
          "PUT",
          "/moderation/69cc3b77-e7d5-4ee5-b3ea-28df14a8f6bd",
          {
            content: {
              body: "Updated content body"
            }, meta:{}
          },
          ["Verify moderation exists", "Update content", "Verify content update"]
        )}
        ${createScenarioSection(
          "update-notes",
          "Update Moderation Notes",
          "Example usage to update moderation notes with private note and public note.",
          "POST",
          "/moderation/{moderationId}/notes",
          {
            userId: "user-123",
            note: "Private note for internal use",
            publicNote: "Public note that will be emailed to user"
          },
          ["Verify moderation exists", "Add private note", "Add public note", "Verify notes update"]
        )}
      `;
    }

    /**
     * Create scenarios for get operations
     * @returns {string} HTML string for get scenarios
     */
    function createGetScenarios() {
      // Get base URL for examples
      const baseUrl = getBaseUrl();
      // Return HTML with all get scenario sections
      return `
        <h4 class="mb-4 mt-5">Get Operations</h4>
        ${createScenarioSection(
          "get-all",
          "Get All Moderation Data",
          "Example usage to get all moderation data.",
          "GET",
          "/moderation/status/pending",
          null,
          ["Call API endpoint", "Verify response contains items array", "Count total items"]
        )}
        ${createScenarioSection(
          "get-by-user",
          "Get All Moderations for a User",
          "Example usage to get all moderations for a user.",
          "GET",
          "/moderation/user/{userId}/status/pending",
          null,
          ["Call API with userId", "Verify response contains user's moderations", "Count items"]
        )}
        ${createScenarioSection(
          "get-by-user-date-range",
          "Get All Moderations for a User in Date Range",
          "Example usage to get all moderations for a user in date range.",
          "GET",
          `/moderation/user/{userId}/status/pending?start=${dateToTimestamp("2024-01-01")}&end=${dateToTimestamp("2024-12-31", true)}`,
          null,
          ["Call API with userId and date range", "Verify response filtered by date", "Count items"]
        )}
        ${createScenarioSection(
          "get-by-user-status",
          "Get All Moderations for a User with Status",
          "Example usage to get all moderations for a user with specific status.",
          "GET",
          "/moderation/user/{userId}/status/approved",
          null,
          ["Call API with userId and status", "Verify response filtered by status", "Count items"]
        )}
        ${createScenarioSection(
          "get-by-user-status-date-range",
          "Get All Moderations for a User with Status in Date Range",
          "Example usage to get all moderations for a user with status in date range.",
          "GET",
          `/moderation/user/{userId}/status/approved?start=${dateToTimestamp("2024-01-01")}&end=${dateToTimestamp("2024-12-31", true)}`,
          null,
          ["Call API with userId, status, and date range", "Verify response filtered", "Count items"]
        )}
        ${createScenarioSection(
          "get-by-user-type",
          "Get All Moderations for a User by Type",
          "Example usage to get all moderations for a user by type.",
          "GET",
          "/moderation/type/text",
          null,
          ["Call API with type filter", "Verify response filtered by type", "Count items"]
        )}
        ${createScenarioSection(
          "get-by-user-type-date-range",
          "Get All Moderations for a User by Type in Date Range",
          "Example usage to get all moderations for a user by type in date range.",
          "GET",
          `/moderation/type/text?start=${dateToTimestamp("2024-01-01")}&end=${dateToTimestamp("2024-12-31", true)}`,
          null,
          ["Call API with type and date range", "Verify response filtered", "Count items"]
        )}
        ${createScenarioSection(
          "get-by-user-type-status-date-range",
          "Get All Moderations for a User by Type and Status in Date Range",
          "Example usage to get all moderations for a user by type and status in date range.",
          "GET",
          `/moderation/type/text?status=approved&start=${dateToTimestamp("2024-01-01")}&end=${dateToTimestamp("2024-12-31", true)}`,
          null,
          ["Call API with type, status, and date range", "Verify response filtered", "Count items"]
        )}
        ${createScenarioSection(
          "get-approved-by-name",
          "Get All Moderations Approved by Name",
          "Example usage to get all moderations approved by a specific moderator name.",
          "GET",
          "/moderation/status/approved",
          null,
          ["Call API for approved status", "Filter by moderatedBy field", "Count items"]
        )}
        ${createScenarioSection(
          "get-by-status",
          "Get All Moderations for Any Status",
          "Example usage to get all moderations for any status.",
          "GET",
          "/moderation/status/{status}",
          null,
          ["Call API with status parameter", "Verify response contains items", "Count items"]
        )}
      `;
    }

    /**
     * Create scenarios for count operations
     * @returns {string} HTML string for count scenarios
     */
    function createCountScenarios() {
      // Get base URL for examples
      const baseUrl = getBaseUrl();
      // Return HTML with all count scenario sections
      return `
        <h4 class="mb-4 mt-5">Count Operations</h4>
        ${createScenarioSection(
          "count-all",
          "Get All Counts (Aggregate)",
          "Example usage to get all counts in one API call using the aggregate count endpoint.",
          "GET",
          "/moderation/counts",
          null,
          ["Call aggregate count endpoint", "Verify response contains all counts", "Display counts for each category"]
        )}
        ${createScenarioSection(
          "count-by-status",
          "Get Count by Status",
          "Example usage to get count for a specific status.",
          "GET",
          "/moderation/count?status=pending",
          null,
          ["Call count endpoint with status", "Verify response contains count", "Display count"]
        )}
        ${createScenarioSection(
          "count-all-status",
          "Get Count for All Statuses",
          "Example usage to get total count across all statuses.",
          "GET",
          "/moderation/count?status=all",
          null,
          ["Call count endpoint with status=all", "Verify response contains total count", "Display count"]
        )}
        ${createScenarioSection(
          "count-by-user",
          "Get Count for User",
          "Example usage to get count of moderations for a specific user.",
          "GET",
          "/moderation/count?status=pending&userId=note-user-1",
          null,
          ["Call count endpoint with userId", "Verify response contains count", "Display count"]
        )}
        ${createScenarioSection(
          "count-unmoderated",
          "Get Unmoderated Count",
          "Example usage to get count of unmoderated items (moderatedBy=null).",
          "GET",
          "/moderation/count?status=pending&moderatedBy=null",
          null,
          ["Call count endpoint with moderatedBy=null", "Verify response contains unmoderated count", "Display count"]
        )}
        ${createScenarioSection(
          "count-pending-resubmission",
          "Get Pending Resubmission Count",
          "Example usage to get count of items with rejection history.",
          "GET",
          "/moderation/count?status=pending&hasRejectionHistory=true",
          null,
          ["Call count endpoint with hasRejectionHistory=true", "Verify response contains count", "Display count"]
        )}
        ${createScenarioSection(
          "count-date-range",
          "Get Count with Date Range",
          "Example usage to get count with date range filter.",
          "GET",
          `/moderation/count?status=pending&start=${dateToTimestamp("2024-01-01")}&end=${dateToTimestamp("2024-12-31", true)}`,
          null,
          ["Call count endpoint with date range", "Verify response contains filtered count", "Display count"]
        )}
        ${createScenarioSection(
          "count-combined-filters",
          "Get Count with Combined Filters",
          "Example usage to get count with multiple filters combined.",
          "GET",
          "/moderation/count?status=pending&userId=note-user-1&moderatedBy=null",
          null,
          ["Call count endpoint with multiple filters", "Verify response contains filtered count", "Display count"]
        )}
      `;
    }

    // Track if event listeners are attached
    let eventListenersAttached = false;

    /**
     * Attach event listeners for test scenario buttons
     */
    function attachTestScenarioHandlers() {
      // Check if listeners are already attached
      if (eventListenersAttached) {
        // Exit early if already attached
        return;
      }
      // Mark as attached
      eventListenersAttached = true;
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
              console.error("[Edge Tests Moderation] Could not parse payload:", parseError);
            }
          }
          // Call test scenario function
          testScenario(scenarioId, method, endpoint, payload);
        }
        // Check if clicked element is a tab button
        if (event.target.classList.contains("nav-link") && event.target.id) {
          // Extract tab name from ID
          const tabId = event.target.id;
          // Check if it's a tab button
          if (tabId.startsWith("tab-")) {
            // Get tab name from ID
            const tabName = tabId.replace("tab-", "");
            // Switch to tab
            switchTab(tabName);
          }
        }
      });
    }

    // Expose functions to global scope
    window.EdgeTestsModeration = {
      testScenario: testScenario,
      switchTab: switchTab
    };

    // Initialize page - call the async render function
    render();
  });
})();
