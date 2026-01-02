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
    // Destructure AdminUtils spinner function
    const { spinner } = window.AdminUtils;
    // Define section name constant
    const SECTION = "subscriptions";

    // Table configuration
    const SUBSCRIPTIONS_TABLE_CONFIG = {
      id: "subscriptions-table",
      columns: [
        { field: "id", label: "ID", sortable: true },
        { field: "plan", label: "Plan", sortable: true },
        { field: "expires", label: "Expires", formatter: "date", sortable: true }
      ],
      actions: [
        { label: "Edit", className: "btn btn-sm btn-primary me-1", onClick: "handleSubscriptionEdit" },
        { label: "Delete", className: "btn btn-sm btn-primary me-1", onClick: "handleSubscriptionDelete", confirm: "Delete this subscription?" },
        { label: "View", className: "btn btn-sm btn-outline-primary", onClick: "handleSubscriptionView" }
      ]
    };

    // Action handlers
    window.handleSubscriptionEdit = (row) => {
      console.log("Edit subscription:", row);
    };

    window.handleSubscriptionDelete = (row) => {
      console.log("Delete subscription:", row);
    };

    window.handleSubscriptionView = (row) => {
      const viewButton = document.querySelector(`[data-view-json='${encodeURIComponent(JSON.stringify(row))}']`);
      if (viewButton) viewButton.click();
    };

    // Store current data for sorting
    let currentData = [];

    /**
     * Attach click handlers to filter chip close buttons
     * @param {Element} containerElement - Container element containing filter chips
     */
    function attachChipRemovalHandlers(containerElement) {
      // Find all close buttons in filter chips
      containerElement.querySelectorAll(".filter-chip .btn-close").forEach((closeButton) => {
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
          // Re-render page with offset 0
          render(0);
        });
      });
    }

    /**
     * Render subscriptions table with filters and pagination
     * @param {number} paginationOffset - Offset for pagination (default: 0)
     */
    async function render(paginationOffset = 0) {
      // Set page content to loading spinner
      pageContent.innerHTML = spinner();
      // Get active filters for section
      const activeFilters = window.AdminState.activeFilters[SECTION] || {};
      // Fetch data and total count separately
      const [apiResponse, totalCount] = await Promise.all([
        window.DataService.get("subscriptions", {
          filters: activeFilters,
          pagination: { limit: 999, offset: paginationOffset }
        }),
        window.ApiService.getTotalCount("subscriptions", activeFilters)
      ]);
      // Store current data for sorting
      currentData = apiResponse.items || [];
      // Generate table HTML using Table component
      const tableHtml = window.Table.create(SUBSCRIPTIONS_TABLE_CONFIG, currentData);
      // Generate complete HTML with filter chips
      const fullHtml = `
        <div id="chipsWrap" class="filter-chips">${renderChips(SECTION)}</div>
        ${tableHtml}
      `;
      // Set page content
      pageContent.innerHTML = fullHtml;
      // Initialize table handlers
      window.Table.init();
      // Attach chip removal handlers to chips wrapper
      attachChipRemovalHandlers(document.getElementById("chipsWrap"));
    }

    // Handle table sorting
    document.body.addEventListener("table:sort", (e) => {
      const { tableId, column, direction } = e.detail;
      if (tableId !== SUBSCRIPTIONS_TABLE_CONFIG.id) return;
      const sortedData = window.Table.sortData(currentData, column, direction);
      const tbody = document.querySelector(`#${tableId} tbody`);
      if (tbody) {
        const rowsHtml = window.Table.createRows(SUBSCRIPTIONS_TABLE_CONFIG, sortedData);
        tbody.innerHTML = rowsHtml;
        window.Table.init();
      }
    });

    // Initialize page
    // Render initial view
    render();
    // Listen for section refresh event
    document.body.addEventListener("section:refresh", () => {
      // Re-render with offset 0
      render(0);
    });
    // Listen for environment change event
    document.body.addEventListener("env:changed", () => {
      // Re-render with offset 0
      render(0);
    });
  });
})();
