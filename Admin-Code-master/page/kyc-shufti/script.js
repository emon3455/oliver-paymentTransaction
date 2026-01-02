// Wrap in IIFE to avoid polluting global scope
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
      console.error("AdminShell.pageContent is still null after ready event");
      return;
    }
    // Destructure AdminShell API functions
    const { pageContent, renderChips } = window.AdminShell;
    // Destructure AdminUtils spinner functions
    const { spinner, spinnerInline, spinnerSmall, errorMessage } = window.AdminUtils;
    // Define section name constant
    const SECTION = "kyc-shufti";

    // Table configuration
    const KYC_TABLE_CONFIG = {
      id: "kyc-table",
      columns: [
        { 
          field: "userId", 
          label: "User ID",
          formatter: (value, row) => {
            return `<a href="#" class="text-decoration-none text-primary" data-lookup-user="${value}" title="Lookup user details">${value}</a>`;
          }
        },
        { field: "referenceId", label: "Reference ID", sortable: true },
        { field: "email", label: "Email", formatter: (value, row) => value || row.data?.email || "-" },
        { field: "country", label: "Country", formatter: (value, row) => value || row.data?.country || "-" },
        { field: "createdAt", label: "Created At", formatter: "datetime", sortable: true },
        { 
          field: "status", 
          label: "Status",
          formatter: (value, row) => {
            const statusClass = getStatusBadgeClass(value);
            return `<span class="badge text-bg-${statusClass}">${value}</span>`;
          },
          sortable: true
        },
        { 
          field: "actions", 
          label: "Actions",
          formatter: (value, row) => {
            return `<button class="btn btn-sm btn-primary" data-view-kyc-all="${row.referenceId}" data-kyc-record='${encodeURIComponent(JSON.stringify(row))}'>View All</button>`;
          }
        }
      ]
    };

    /**
     * Ensure offcanvas element exists in DOM, create if missing
     * @returns {Object} Object with canvas element, body element, and Bootstrap API instance
     */
    function ensureOffcanvas() {
      // Query for existing offcanvas element
      let offcanvasElement = document.querySelector("#kycDetailsOffcanvas");
      // Check if offcanvas doesn't exist
      if (!offcanvasElement) {
        // Create wrapper div for offcanvas HTML
        const wrapperElement = document.createElement("div");
        // Set inner HTML with offcanvas structure
        wrapperElement.innerHTML = `<div class="offcanvas offcanvas-end offcanvas-details" tabindex="-1" id="kycDetailsOffcanvas">
          <div class="offcanvas-header"><h5 class="offcanvas-title">KYC Record</h5><button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button></div>
          <div class="offcanvas-body" id="kycDetailsBody"></div></div>`;
        // Append offcanvas to document body
        document.body.appendChild(wrapperElement.firstElementChild);
        // Query for offcanvas element again after creation
        offcanvasElement = document.querySelector("#kycDetailsOffcanvas");
      }
      // Return object with canvas, body, and Bootstrap API instance
      return {
        canvas: offcanvasElement,
        body: document.querySelector("#kycDetailsBody"),
        api: new bootstrap.Offcanvas(offcanvasElement)
      };
    }

    /**
     * Fetch all KYC records using API service
     * @returns {Promise<Array>} Array of KYC records
     */
    async function fetchAllKYC() {
      // Try to fetch data using API service
      try {
        // Fetch data from API service with no filters and large limit
        const apiResponse = await window.ApiService.get(SECTION, {
          filters: {},
          pagination: { limit: 1000, offset: 0 }
        });
        // Return items array from response
        return apiResponse.items || [];
      } catch (fetchError) {
        // Check if error is HTTP 404
        if (fetchError.isHttpError && fetchError.status === 404) {
          // Set custom error message for missing endpoint
          fetchError.message = `KYC endpoint not found`;
        } else if (fetchError.isTimeout) {
          // Set custom error message for timeout
          fetchError.message = `Request timed out after ${
            fetchError.timeout / 1000
          } seconds while loading KYC records`;
        }
        // Re-throw enhanced error
        throw fetchError;
      }
    }

    /**
     * Generate mock webhook payloads for a reference
     * @param {string} referenceId - Reference ID
     * @param {Object} kycRecord - KYC record data
     * @returns {Array<Object>} Array of webhook payload objects
     */
    function generateWebhookPayloads(referenceId, kycRecord) {
      // Generate 3-5 mock webhook payloads
      const eventTypes = [
        "verification.started",
        "document.uploaded",
        "verification.processing",
        "verification.completed"
      ];
      const webhooks = [];
      // Create base timestamp from record creation
      const baseTimestamp = new Date(kycRecord.createdAt);

      // Generate 4 webhook events (consistent number)
      const webhookCount = 4;
      for (let i = 0; i < webhookCount; i++) {
        // Create timestamp for this webhook (incrementing from base)
        const webhookTimestamp = new Date(baseTimestamp.getTime() + i * 60000 * (i + 1));
        // Get event type (use last one as the final status)
        const eventType =
          i === eventTypes.length - 1 ? `verification.${kycRecord.status}` : eventTypes[i];

        // Create webhook payload
        webhooks.push({
          event: eventType,
          reference: referenceId,
          timestamp: webhookTimestamp.toISOString(),
          data: {
            reference_id: referenceId,
            event: eventType,
            verification_result: i === eventTypes.length - 1 ? kycRecord.status : "processing",
            timestamp: webhookTimestamp.toISOString(),
            user_id: kycRecord.userId,
            country: kycRecord.country || kycRecord.data?.country,
            locale: kycRecord.locale,
            mode: kycRecord.mode
          }
        });
      }

      // Return webhooks array
      return webhooks;
    }

    /**
     * Get base URL from API configuration
     * @returns {string} Base URL for API calls
     */
    function getBaseUrl() {
      // Default fallback
      let baseUrl = "http://localhost:3000";
      
      // Try to get base URL from API config
      try {
        // Get API config from page
        const configScriptElement = document.getElementById("api-config");
        if (configScriptElement) {
          const pageConfig = JSON.parse(configScriptElement.textContent);
          const currentEnvironment = window.Env?.current || "dev";
          const kycConfig = pageConfig["kyc-shufti"];
          
          if (kycConfig && kycConfig[currentEnvironment] && kycConfig[currentEnvironment].endpoint) {
            const endpointUrl = kycConfig[currentEnvironment].endpoint;
            // Extract base URL from endpoint (e.g., "http://localhost:3000/kyc/shufti/sessions" -> "http://localhost:3000")
            const urlMatch = endpointUrl.match(/^(https?:\/\/[^\/]+)/);
            if (urlMatch) {
              baseUrl = urlMatch[1];
            }
          }
        }
      } catch (configError) {
        // Use default base URL if config parsing fails
        console.warn("[KYC] Could not parse API config, using default base URL:", configError);
      }
      
      return baseUrl;
    }

    /**
     * Fetch data from backend API for ShuftiPro status
     * @param {string} referenceId - Reference ID for the KYC record
     * @returns {Promise<Object>} ShuftiPro API response from backend
     */
    async function fetchShuftiAPI(referenceId) {
      // Get base URL from API configuration
      const baseUrl = getBaseUrl();
      // Construct API URL for single record status with from_api=true parameter
      // URL encode the reference ID to handle special characters
      const encodedReferenceId = encodeURIComponent(referenceId);
      const apiUrl = `${baseUrl}/kyc/shufti/status/${encodedReferenceId}?from_api=true`;
      
      // Log the URL being called for debugging
      console.log("[KYC] Fetching ShuftiPro API data from:", apiUrl);
      
      // Try to fetch from backend API
      try {
        // Fetch data from backend endpoint
        const apiResponse = await window.ApiService._fetchWithTimeout(apiUrl, { 
          method: "GET" 
        });
        // Parse and return JSON response
        const responseData = await apiResponse.json();
        // Log response source for debugging
        console.log("[KYC] ShuftiPro API response source:", responseData.source || "unknown");
        return responseData;
      } catch (fetchError) {
        // Log error to console
        console.error("[KYC] Error fetching ShuftiPro data:", fetchError);
        // Re-throw error to be handled by caller
        throw fetchError;
      }
    }

    /**
     * Simulate fetching user details from API
     * @param {string} userId - User ID to fetch details for
     * @returns {Promise<Object>} User details object
     */
    async function fetchUserDetails(userId) {
      // Simulate API call - replace with actual endpoint later
      // Add delay to simulate network request
      await new Promise((resolveFunction) => setTimeout(resolveFunction, 800));
      // Generate dummy user data based on userId
      // Define available user roles
      const availableRoles = ["fan", "vendor", "agent", "creator"];
      // Select random role from available roles
      const userRole = availableRoles[Math.floor(Math.random() * availableRoles.length)];
      // Extract number from userId or generate random number
      const userIdNumber = userId.replace("user_", "") || Math.floor(Math.random() * 10000);

      // Return user details object
      return {
        // Include original user ID
        userId: userId,
        // Generate public user ID
        publicUserId: `pub_${userIdNumber}`,
        // Generate email address
        email: `user${userIdNumber}@example.com`,
        // Generate display name
        displayName: `User ${userIdNumber}`,
        // Generate username
        username: `user${userIdNumber}`,
        // Include selected role
        role: userRole
      };
    }

    /**
     * Show user details in modal dialog
     * @param {string} userId - User ID to display details for
     */
    function showUserDetailsModal(userId) {
      // Get modal viewer instance
      const modalViewer = window.ModalViewer;
      // Return early if modal doesn't exist
      if (!modalViewer || !modalViewer.body) return;

      // Update modal title
      // Find modal title element
      const modalTitleElement = document.querySelector("#viewModal .modal-title");
      // Set title text if element exists
      if (modalTitleElement) modalTitleElement.textContent = "User Details";

      // Set modal body to loading spinner
      modalViewer.body.innerHTML = spinnerInline("Loading user details...");
      // Show the modal
      modalViewer.modal.show();

      // Fetch user details and display
      fetchUserDetails(userId)
        .then((userDetails) => {
          // Set modal body to user details HTML
          modalViewer.body.innerHTML = `
          <div class="mb-3">
            <div class="row g-3">
              <div class="col-12">
                <div class="border-bottom pb-2">
                  <small class="text-muted d-block">User ID</small>
                  <strong>${userDetails.userId}</strong>
                </div>
              </div>
              <div class="col-12">
                <div class="border-bottom pb-2">
                  <small class="text-muted d-block">Public User ID</small>
                  <strong>${userDetails.publicUserId}</strong>
                </div>
              </div>
              <div class="col-12">
                <div class="border-bottom pb-2">
                  <small class="text-muted d-block">Email Address</small>
                  <strong>${userDetails.email}</strong>
                </div>
              </div>
              <div class="col-12">
                <div class="border-bottom pb-2">
                  <small class="text-muted d-block">Display Name</small>
                  <strong>${userDetails.displayName}</strong>
                </div>
              </div>
              <div class="col-12">
                <div class="border-bottom pb-2">
                  <small class="text-muted d-block">Username</small>
                  <strong>${userDetails.username}</strong>
                </div>
              </div>
              <div class="col-12">
                <div>
                  <small class="text-muted d-block">Role</small>
                  <strong>${userDetails.role}</strong>
                </div>
              </div>
            </div>
          </div>
        `;
        })
        .catch((fetchError) => {
          // Display error message in modal body
          modalViewer.body.innerHTML = `<div class="text-danger">Failed to load user details: ${fetchError.message}</div>`;
        });
    }

    // Delegated "View All" click handler - slides in from right
    // Add click event listener to document body
    document.body.addEventListener("click", async (clickEvent) => {
      // Find closest button with data-view-kyc-all attribute
      const viewAllButton = clickEvent.target.closest("[data-view-kyc-all]");
      // Return early if button not found
      if (!viewAllButton) return;
      // Ensure offcanvas exists and get references
      const { canvas, body, api } = ensureOffcanvas();
      // Get reference ID from button attribute
      const referenceId = viewAllButton.getAttribute("data-view-kyc-all");
      // Try to get record data from button attribute (if available, avoids refetching)
      let kycRecord = null;
      const recordDataAttr = viewAllButton.getAttribute("data-kyc-record");
      if (recordDataAttr) {
        try {
          kycRecord = JSON.parse(decodeURIComponent(recordDataAttr));
        } catch (parseError) {
          console.warn("[KYC] Could not parse record data from button, will fetch from API:", parseError);
        }
      }
      
      // Set offcanvas body to loading spinner
      body.innerHTML = spinnerInline(`Loading KYC record...`);
      // Show the offcanvas
      api.show();
      // Try to load and display KYC record
      try {
        // Step 1: Get database record data
        // If we don't have the record from button, fetch it
        if (!kycRecord) {
          // Fetch all KYC records to find the matching one
          const allKycRecords = await fetchAllKYC();
          // Find record matching reference ID
          kycRecord = allKycRecords.find((record) => record.referenceId === referenceId);
          // Check if record was found
          if (!kycRecord) {
            // Display not found message
            body.innerHTML = '<div class="text-muted">KYC record not found.</div>';
            // Exit function
            return;
          }
        }

        // Render database data first
        // Set offcanvas body to database record HTML
        body.innerHTML = `
          <div class="mb-3 d-flex justify-content-between align-items-center">
            <h5 class="mb-0">KYC Record</h5>
            <span class="badge text-bg-${getStatusBadgeClass(kycRecord.status)}">${kycRecord.status}</span>
          </div>
          <div class="mb-3"><h6>Reference</h6><div>${kycRecord.referenceId}</div></div>
          <div class="mb-3"><h6>User ID</h6><div>${kycRecord.userId}</div></div>
          <div class="mb-3"><h6>Email</h6><div>${kycRecord.email || "-"}</div></div>
          <div class="mb-3"><h6>Created</h6><div>${new Date(
            kycRecord.createdAt
          ).toLocaleString()}</div></div>
          <div class="mb-3"><h6>Last Event</h6><div><span class="badge text-bg-${getStatusBadgeClass(
            kycRecord.lastEvent || kycRecord.status
          )}">${kycRecord.lastEvent || kycRecord.status}</span></div></div>
          <div class="mb-3"><h6>Country</h6><div>${
            kycRecord.country || kycRecord.data?.country || "-"
          }</div></div>
          <div class="mb-3"><h6>Locale</h6><div>${kycRecord.locale || "-"}</div></div>
          <div class="mb-3"><h6>Mode</h6><div>${kycRecord.mode || "-"}</div></div>
          <div class="mb-3"><h6>Verification URL</h6><div><a href="${
            kycRecord.verificationUrl || "#"
          }" target="_blank" class="text-break">${kycRecord.verificationUrl || "-"}</a></div></div>
          <div class="mb-3 mt-4 border-top pt-3"><h6>Data from Database</h6>
            <pre class="code-json bg-light p-3 rounded">${JSON.stringify(kycRecord, null, 2)}</pre>
          </div>
          <div class="mt-4 border-top pt-4" id="shuftiSection">
            <h6>Full Session Data (ShuftiPro API)</h6>
          </div>
          <div class="mt-4 border-top pt-4" id="webhookSection">
            <h6>Webhook Payloads</h6>
          </div>
        `;

        // Step 2: Fetch from Shufti API
        // Find shufti section element
        const shuftiSectionElement = document.querySelector("#shuftiSection");
        // Set section to loading spinner
        shuftiSectionElement.innerHTML = `
          <h6>Full Session Data (ShuftiPro API)</h6>
          ${spinnerInline("Fetching record from Shuftipro")}
        `;

        // Try to fetch ShuftiPro API data
        try {
          // Fetch data from ShuftiPro API
          const shuftiApiData = await fetchShuftiAPI(referenceId);
          // Determine response source for display
          const responseSource = shuftiApiData.source || "unknown";
          const isFromAPI = responseSource === "shuftipro_api";
          const sourceBadge = isFromAPI 
            ? '<span class="badge text-bg-success">ShuftiPro API</span>' 
            : `<span class="badge text-bg-secondary">${responseSource}</span>`;
          
          // Set section to display API data
          shuftiSectionElement.innerHTML = `
            <h6>Full Session Data (ShuftiPro API)</h6>
            <div class="small mb-2">
              <i class="bi bi-check-circle text-success"></i> 
              Fetched from backend API 
              ${sourceBadge}
              ${shuftiApiData.timestamp ? `<span class="text-muted ms-2">(${new Date(shuftiApiData.timestamp).toLocaleString()})</span>` : ''}
            </div>
            <pre class="code-json bg-light p-3 rounded">${JSON.stringify(
              shuftiApiData,
              null,
              2
            )}</pre>
          `;
        } catch (shuftiError) {
          // Display error message in section
          shuftiSectionElement.innerHTML = `
            <h6>Full Session Data (ShuftiPro API)</h6>
            ${errorMessage(shuftiError)}
          `;
        }

        // Step 3: Fetch and Display Webhook Payloads
        // Find webhook section element
        const webhookSectionElement = document.querySelector("#webhookSection");
        // Set section to loading spinner
        webhookSectionElement.innerHTML = `
          <h6>Webhook Payloads</h6>
          ${spinnerInline("Fetching webhook payloads...")}
        `;

        // Try to fetch webhook payloads from backend API
        try {
          // Get base URL
          const baseUrl = getBaseUrl();
          // URL encode the reference ID
          const encodedReferenceId = encodeURIComponent(referenceId);
          // Construct API URL for webhook payloads
          const webhookApiUrl = `${baseUrl}/kyc/shufti/webhook/payloads/${encodedReferenceId}`;
          
          // Log the URL being called for debugging
          console.log("[KYC] Fetching webhook payloads from:", webhookApiUrl);
          
          // Fetch webhook payloads from backend endpoint
          const webhookApiResponse = await window.ApiService._fetchWithTimeout(webhookApiUrl, { 
            method: "GET" 
          });
          // Parse JSON response
          const webhookData = await webhookApiResponse.json();
          
          // Log the raw response for debugging
          console.log("[KYC] Webhook API raw response:", webhookData);
          console.log("[KYC] Webhook API response type:", typeof webhookData);
          console.log("[KYC] Webhook API response is array:", Array.isArray(webhookData));
          
          // Handle different response formats
          // Backend might return: { payloads: [...] } or just an array
          let webhookPayloads = [];
          if (Array.isArray(webhookData)) {
            webhookPayloads = webhookData;
          } else if (webhookData && typeof webhookData === "object") {
            // Try various possible property names
            webhookPayloads = webhookData.payloads || 
                            webhookData.items || 
                            webhookData.data || 
                            webhookData.webhooks ||
                            webhookData.events ||
                            [];
          }
          
          // Log the extracted payloads for debugging
          console.log("[KYC] Extracted webhook payloads:", webhookPayloads);
          console.log("[KYC] Webhook payloads count:", webhookPayloads ? webhookPayloads.length : 0);
          
          // Check if webhook payloads exist
          if (webhookPayloads && Array.isArray(webhookPayloads) && webhookPayloads.length > 0) {
            // Set section to display webhook payloads
            webhookSectionElement.innerHTML = `
              <h6>Webhook Payloads</h6>
              <div class="small text-muted mb-3">
                <i class="bi bi-check-circle text-success"></i> 
                Fetched ${webhookPayloads.length} webhook event${webhookPayloads.length !== 1 ? 's' : ''} from backend API
              </div>
              ${webhookPayloads
                .map(
                  (payload, index) => {
                    // Extract event name and timestamp
                    const eventName = payload.event || payload.data?.event || payload.type || "N/A";
                    const eventTimestamp = payload.timestamp || payload.created_at || payload.data?.timestamp || null;
                    
                    return `
                      <div class="mb-3 border-bottom pb-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                          <strong>Event ${index + 1}: ${eventName}</strong>
                          ${eventTimestamp ? `<span class="badge text-bg-secondary">${new Date(eventTimestamp).toLocaleString()}</span>` : ''}
                        </div>
                        <pre class="code-json bg-light p-3 rounded small" style="max-height: 400px; overflow-y: auto;">${JSON.stringify(
                          payload,
                          null,
                          2
                        )}</pre>
                      </div>
                    `;
                  }
                )
                .join("")}
            `;
          } else {
            // Display message when no webhook payloads are available
            // Show the raw response in debug mode
            const debugInfo = webhookData ? `
              <div class="mt-2 small text-muted">
                <details>
                  <summary class="cursor-pointer">Debug: View API Response</summary>
                  <pre class="mt-2 p-2 bg-light rounded small" style="max-height: 200px; overflow-y: auto;">${JSON.stringify(webhookData, null, 2)}</pre>
                </details>
              </div>
            ` : '';
            
            webhookSectionElement.innerHTML = `
              <h6>Webhook Payloads</h6>
              <div class="text-muted">
                <i class="bi bi-info-circle"></i> 
                No webhook events recorded for this reference.
              </div>
              ${debugInfo}
            `;
          }
        } catch (webhookError) {
          // Display error message in section
          console.error("[KYC] Error fetching webhook payloads:", webhookError);
          console.error("[KYC] Error details:", {
            message: webhookError.message,
            status: webhookError.status,
            isHttpError: webhookError.isHttpError,
            isTimeout: webhookError.isTimeout,
            isNetworkError: webhookError.isNetworkError
          });
          
          // Show more detailed error information
          let errorDetails = "";
          if (webhookError.isHttpError) {
            errorDetails = `<div class="small text-muted mt-2">HTTP ${webhookError.status}: ${webhookError.statusText || "Unknown error"}</div>`;
          } else if (webhookError.isTimeout) {
            errorDetails = `<div class="small text-muted mt-2">Request timed out after ${webhookError.timeout / 1000} seconds</div>`;
          } else if (webhookError.isNetworkError) {
            errorDetails = `<div class="small text-muted mt-2">Network error: Unable to connect to server</div>`;
          }
          
          webhookSectionElement.innerHTML = `
            <h6>Webhook Payloads</h6>
            ${errorMessage(webhookError, "Failed to load webhook payloads")}
            ${errorDetails}
          `;
        }
      } catch (loadError) {
        // Display error message in offcanvas body
        body.innerHTML = errorMessage(loadError);
      }
    });

    /**
     * Get Bootstrap badge class name based on status
     * @param {string} statusValue - Status value (backend format: verification.accepted, verification.declined, etc.)
     * @returns {string} Bootstrap badge class name
     */
    function getStatusBadgeClass(statusValue) {
      // Normalize status value to lowercase for comparison
      const normalizedStatus = statusValue?.toLowerCase() || "";
      
      // Return success class for accepted/approved status
      if (normalizedStatus === "verification.accepted" || normalizedStatus === "approved") return "success";
      
      // Return danger class for declined/denied status
      if (normalizedStatus === "verification.declined" || 
          normalizedStatus === "verification.denied" || 
          normalizedStatus === "declined") return "danger";
      
      // Return warning class for pending, timeout, or cancelled status
      if (normalizedStatus === "request.pending" || 
          normalizedStatus === "verification.pending" || 
          normalizedStatus === "request.timeout" || 
          normalizedStatus === "verification.cancelled" ||
          normalizedStatus === "pending" ||
          normalizedStatus === "timeout" ||
          normalizedStatus.includes("pending") ||
          normalizedStatus.includes("timeout")) return "warning";
      
      // Return secondary class as default
      return "secondary";
    }

    /**
     * Format date string to localized string
     * @param {string} dateString - Date string to format
     * @returns {string} Formatted date string
     */
    function formatDateTime(dateString) {
      // Create date object from string
      const dateObject = new Date(dateString);
      // Return localized date string
      return dateObject.toLocaleString();
    }

    // Define page size constant for pagination
    const PAGE_SIZE = 20;
    // Initialize pagination cursor
    let cursor = 0;
    // Initialize total count
    let total = 0;
    // Initialize container element reference
    let container;
    // Initialize notes element reference
    let notesEl;

    /**
     * Generate pagination notice HTML
     * @param {number} startIndex - Starting index of current page
     * @param {number} endIndex - Ending index of current page
     * @param {number} pageNumber - Current page number
     * @returns {string} HTML string for pagination notice
     */
    function notice(startIndex, endIndex, pageNumber) {
      // Return notice HTML with pagination info
      return `<div class="notice">Showing: ${startIndex}–${endIndex} of ${total} (Page ${pageNumber})</div>`;
    }

    /**
     * Generate table HTML with rows
     * @param {string} tableRows - HTML string for table rows
     * @returns {string} HTML string for complete table
     */
    function tableHtml(tableRows) {
      // Return table HTML wrapped in card
      return `<div class="card table-card"><div class="card-body p-0">
        <table class="table table-bordered mb-0">
          <thead class="table-light"><tr>
            <th>User ID</th><th>Reference ID</th><th>Email</th><th>Country</th><th>Created At</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div></div>`;
    }

    /**
     * Load a chunk of data and render table
     * @param {boolean} shouldAppend - Whether to append to existing content or replace
     */
    async function loadChunk(shouldAppend = false) {
      // Check if this is initial load (not appending)
      if (!shouldAppend) {
        // Set page content to loading spinner
        pageContent.innerHTML = spinner();
        // Create new container element
        container = document.createElement("div");
      } else {
        // Find load more wrapper element
        const loadMoreWrapper = document.querySelector("#loadMoreWrap");
        // Set wrapper to small spinner if it exists
        if (loadMoreWrapper) {
          loadMoreWrapper.innerHTML = spinnerSmall();
        }
      }

      // Try to load and render data
      try {
        // Get active filters for section
        const activeFilters = window.AdminState.activeFilters[SECTION] || {};
        // Fetch data and total count separately
        const [apiResponse, totalCount] = await Promise.all([
          window.ApiService.get(SECTION, {
            filters: activeFilters,
            pagination: { limit: PAGE_SIZE, offset: cursor }
          }),
          window.ApiService.getTotalCount(SECTION, activeFilters)
        ]);
        // Extract items array from response
        const dataItems = apiResponse.items || [];
        // Use total from separate endpoint, fallback to response total or items length
        total = totalCount !== null ? totalCount : (apiResponse.total || dataItems.length);
        // Calculate pagination values
        const startIndex = cursor + 1;
        const endIndex = Math.min(cursor + dataItems.length, total);
        const currentPageNumber = Math.floor(cursor / PAGE_SIZE) + 1;

        // Check if this is initial load
        if (!shouldAppend) {
          // Clear page content
          pageContent.innerHTML = "";
          // Append container to page content
          pageContent.appendChild(container);
          // Add chips wrapper only on first load
          const chipsWrapper = document.createElement("div");
          chipsWrapper.id = "chipsWrap";
          chipsWrapper.className = "filter-chips";
          chipsWrapper.innerHTML = renderChips(SECTION);
          container.appendChild(chipsWrapper);
        }
        
        // Always create a NEW table for each page (with gap between tables)
        const tableHtml = window.Table.create(KYC_TABLE_CONFIG, dataItems);
        const countNotice = window.Table.createCountNotice(startIndex, endIndex, total, currentPageNumber);
        // Create new block element for this chunk with gap
        const contentBlock = document.createElement("div");
        contentBlock.className = "mb-4"; // 1rem gap (mb-4 = margin-bottom: 1.5rem, close to 1rem)
        // Set block inner HTML with notice and table
        contentBlock.innerHTML = countNotice + tableHtml;
        // Append block to container
        container.appendChild(contentBlock);
        // Initialize table handlers
        window.Table.init();

        // Find or create load more controls
        let loadMoreControls = pageContent.querySelector("#loadMoreWrap");
        // Create controls element if it doesn't exist
        if (!loadMoreControls) {
          // Create div element with id and class
          loadMoreControls = Object.assign(document.createElement("div"), {
            id: "loadMoreWrap",
            className: "d-grid my-3"
          });
          // Append controls to page content
          pageContent.appendChild(loadMoreControls);
        }
        // Set controls inner HTML with load more button using Table component
        const loadMoreBtnHtml = window.Table.createLoadMoreControls({
          disabled: apiResponse.nextCursor === null
        });
        loadMoreControls.innerHTML = loadMoreBtnHtml;
        // Find load more button element
        const loadMoreButton = loadMoreControls.querySelector("#loadMoreBtn");
        // Set button onclick handler
        loadMoreButton.onclick = () => {
          // Check if there's no next cursor
          if (apiResponse.nextCursor === null) {
            // Disable button
            loadMoreButton.disabled = true;
            // Exit function
            return;
          }
          // Update cursor to next position
          cursor = apiResponse.nextCursor;
          // Load next chunk (creates new table)
          loadChunk(true);
        };
        // Update button state
        if (apiResponse.nextCursor === null) {
          loadMoreButton.textContent = "No more results";
          loadMoreButton.disabled = true;
        } else {
          loadMoreButton.disabled = false;
          loadMoreButton.textContent = "Load more";
        }

        // Notes are now static HTML - no need to append
        // Check if notes element doesn't exist
        if (!notesEl) {
          // Get static notes element from page
          notesEl = document.querySelector(".notes-below");
          // Append notes to page content if element exists
          if (notesEl) pageContent.appendChild(notesEl);
        }

        // Chip removal: reset to first page then refresh
        // Find chips wrapper element
        const chipsWrapperElement = contentBlock.querySelector("#chipsWrap");
        // Check if chips wrapper exists
        if (chipsWrapperElement) {
          // Find all close buttons in filter chips
          chipsWrapperElement.querySelectorAll(".filter-chip .btn-close").forEach((closeButton) => {
            // Add click listener to close button
            closeButton.addEventListener("click", () => {
              // Get filter key from chip data attribute
              const filterKey = closeButton.closest(".filter-chip")?.getAttribute("data-chip");
              // Return early if no key found
              if (!filterKey) return;
              // Set page content to loading spinner
              pageContent.innerHTML = spinner();
              // Get active filters object
              const activeFiltersStore = window.AdminState.activeFilters[SECTION] || {};
              // Delete filter key from store
              delete activeFiltersStore[filterKey];
              // Update active filters in state
              window.AdminState.activeFilters[SECTION] = activeFiltersStore;
              // Reset cursor to beginning
              cursor = 0;
              // Reload chunk from beginning
              loadChunk(false);
            });
          });
        }
      } catch (loadError) {
        // Show error message
        // Check if this is initial load
        if (!shouldAppend) {
          // Display error in page content
          pageContent.innerHTML = errorMessage(loadError);
        } else {
          // Find load more wrapper
          const loadMoreWrapper = document.querySelector("#loadMoreWrap");
          // Display error in wrapper if it exists
          if (loadMoreWrapper) {
            // Set wrapper to error message
            loadMoreWrapper.innerHTML = errorMessage(loadError, "Failed to load more");
          }
        }
        // Log error to console
        console.error("[KYC] Error loading data:", loadError);
      }
    }

    /**
     * Reset pagination and content state
     */
    function reset() {
      // Reset cursor to beginning
      cursor = 0;
      // Reset total count
      total = 0;
      // Clear container reference
      container = null;
      // Clear notes element reference
      notesEl = null;
    }

    // Delegated click handler for user lookup
    // Add click event listener to document body
    document.body.addEventListener("click", (clickEvent) => {
      // Find closest element with data-lookup-user attribute (user ID link)
      const lookupButton = clickEvent.target.closest("[data-lookup-user]");
      // Return early if button not found
      if (!lookupButton) return;
      // Prevent default link behavior
      clickEvent.preventDefault();
      // Get user ID from button attribute
      const userId = lookupButton.getAttribute("data-lookup-user");
      // Show user details modal
      showUserDetailsModal(userId);
    });

    // Initialize page
    // Reset state
    reset();
    // Load initial chunk
    loadChunk(false);
    // Listen for section refresh event
    document.body.addEventListener("section:refresh", () => {
      // Reset state
      reset();
      // Reload chunk
      loadChunk(false);
    });
  });
})();
