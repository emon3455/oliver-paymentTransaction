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
    const SECTION = "orders";

    // Table configuration
    const ORDERS_TABLE_CONFIG = {
      id: "orders-table",
      columns: [
        { field: "orderId", label: "Order ID", sortable: true },
        { field: "customer", label: "Customer", formatter: (value, row) => row.customer?.name || "-", sortable: true },
        { field: "status", label: "Status", formatter: (value) => value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "-", sortable: true }
      ],
      actions: [
        { label: "Edit", className: "btn btn-sm btn-primary me-1", onClick: "handleOrderEdit" },
        { label: "Delete", className: "btn btn-sm btn-primary me-1", onClick: "handleOrderDelete", confirm: "Delete this order?" },
        { label: "View All", className: "btn btn-sm btn-outline-primary", onClick: "handleOrderViewAll" }
      ]
    };

    // Action handlers
    window.handleOrderEdit = (row) => {
      console.log("Edit order:", row);
    };

    window.handleOrderDelete = (row) => {
      console.log("Delete order:", row);
    };

    window.handleOrderViewAll = (row) => {
      // Try View All first (offcanvas), fallback to View (modal)
      const viewAllButton = document.querySelector(`[data-view-all="${row.orderId}"]`);
      if (viewAllButton) {
        viewAllButton.click();
      } else {
        // Fallback to View modal
        const viewButton = document.querySelector(`[data-view-json='${encodeURIComponent(JSON.stringify(row))}']`);
        if (viewButton) viewButton.click();
      }
    };
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
          <thead class="table-light"><tr><th>Order ID</th><th>Customer</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div></div>`;
    }

    /**
     * Ensure offcanvas element exists in DOM, create if missing
     * @returns {Object} Object with canvas element, body element, and Bootstrap API instance
     */
    function ensureOffcanvas() {
      // Query for existing offcanvas element
      let offcanvasElement = document.querySelector("#detailsOffcanvas");
      // Check if offcanvas doesn't exist
      if (!offcanvasElement) {
        // Create wrapper div for offcanvas HTML
        const wrapperElement = document.createElement("div");
        // Set inner HTML with offcanvas structure
        wrapperElement.innerHTML = `<div class="offcanvas offcanvas-end offcanvas-details" tabindex="-1" id="detailsOffcanvas">
          <div class="offcanvas-header"><h5 class="offcanvas-title">Details</h5><button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button></div>
          <div class="offcanvas-body" id="detailsBody"></div></div>`;
        // Append offcanvas to document body
        document.body.appendChild(wrapperElement.firstElementChild);
        // Query for offcanvas element again after creation
        offcanvasElement = document.querySelector("#detailsOffcanvas");
      }
      // Return object with canvas, body, and Bootstrap API instance
      return {
        canvas: offcanvasElement,
        body: document.querySelector("#detailsBody"),
        api: new bootstrap.Offcanvas(offcanvasElement)
      };
    }

    /**
     * Fetch all orders from local data file
     * @returns {Promise<Array>} Array of order records
     */
    async function fetchAllOrders() {
      // Construct URL to data file
      const dataFileUrl = `./data.json`;
      // Fetch data file with no cache
      const fetchResponse = await window.ApiService._fetchWithTimeout(dataFileUrl, {
        cache: "no-store"
      });
      // Check if response is not OK
      if (!fetchResponse.ok) throw new Error("Failed to load all orders");
      // Parse and return JSON data
      return fetchResponse.json();
    }

    // Delegated "View All" click handler
    // Add click event listener to document body
    document.body.addEventListener("click", async (clickEvent) => {
      // Find closest button with data-view-all attribute
      const viewAllButton = clickEvent.target.closest("[data-view-all]");
      // Return early if button not found
      if (!viewAllButton) return;
      // Ensure offcanvas exists and get references
      const { canvas, body, api } = ensureOffcanvas();
      // Get order ID from button attribute and convert to number
      const orderId = Number(viewAllButton.getAttribute("data-view-all"));
      // Set offcanvas body to loading spinner
      body.innerHTML = spinnerInline(`Loading order #${orderId}…`);
      // Show the offcanvas
      api.show();
      // Try to load and display order details
      try {
        // Fetch all orders
        const allOrders = await fetchAllOrders();
        // Find order matching order ID
        const orderRecord = allOrders.find((order) => order.orderId === orderId);
        // Check if order was found
        if (!orderRecord) {
          // Display not found message
          body.innerHTML = '<div class="text-muted">Order not found.</div>';
          // Exit function
          return;
        }
        // Generate HTML for order items table rows
        const orderItemsHtml = (orderRecord.items || [])
          .map(
            (orderItem) =>
              `<tr><td>${orderItem.sku}</td><td>${orderItem.name}</td><td>${
                orderItem.qty
              }</td><td>$${orderItem.price.toFixed(2)}</td></tr>`
          )
          .join("");
        // Generate HTML for payments table rows
        const paymentsHtml = (orderRecord.payments || [])
          .map(
            (payment) =>
              `<tr><td>${payment.method}</td><td>$${payment.amount.toFixed(2)}</td><td>${
                payment.id
              }</td></tr>`
          )
          .join("");
        // Set offcanvas body to order details HTML
        body.innerHTML = `
          <div class="mb-3 d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Order #${orderRecord.orderId}</h5>
            <span class="badge text-bg-secondary">${orderRecord.status}</span>
          </div>
          <div class="text-muted small mb-3">Channel: ${orderRecord.channel} • Total: $${
          orderRecord.total?.toFixed ? orderRecord.total.toFixed(2) : orderRecord.total
        } • ${new Date(orderRecord.createdAt).toLocaleString()}</div>
          <div class="mb-3"><h6>Customer</h6>${orderRecord.customer.name} &lt;${
          orderRecord.customer.email
        }&gt;</div>
          <div class="mb-3"><h6>Shipping</h6>Method: ${
            orderRecord.shipping?.method || "-"
          } • Cost: $${(orderRecord.shipping?.cost || 0).toFixed(
          2
        )}<br><span class="text-muted small">${orderRecord.shipping?.address || ""}</span></div>
          <div class="mb-3"><h6>Items</h6>
            <div class="table-responsive"><table class="table table-sm">
              <thead><tr><th>SKU</th><th>Name</th><th>Qty</th><th>Price</th></tr></thead>
              <tbody>${
                orderItemsHtml || '<tr><td colspan="4" class="text-muted">No items</td></tr>'
              }</tbody>
            </table></div>
          </div>
          <div class="mb-3"><h6>Payments</h6>
            <div class="table-responsive"><table class="table table-sm">
              <thead><tr><th>Method</th><th>Amount</th><th>Txn</th></tr></thead>
              <tbody>${
                paymentsHtml || '<tr><td colspan="3" class="text-muted">No payments</td></tr>'
              }</tbody>
            </table></div>
          </div>
          <div class="mb-3"><h6>Raw JSON</h6><pre class="code-json">${JSON.stringify(
            orderRecord,
            null,
            2
          )}</pre></div>`;
      } catch (loadError) {
        // Display error message in offcanvas body
        body.innerHTML = errorMessage(loadError);
      }
    });

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
          window.DataService.get(SECTION, {
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
        const tableHtml = window.Table.create(ORDERS_TABLE_CONFIG, dataItems);
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
        const chipsWrapperElement = document.querySelector("#chipsWrap");
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
        console.error("[Orders] Error loading data:", loadError);
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
    // Listen for environment change event
    document.body.addEventListener("env:changed", () => {
      // Reset state
      reset();
      // Reload chunk
      loadChunk(false);
    });
  });
})();
