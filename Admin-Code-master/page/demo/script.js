// Wrap in IIFE to avoid polluting global scope
(function () {
  // Wait for AdminShell ready event
  function waitForAdminShell() {
    return new Promise((resolveFunction) => {
      if (window.AdminShell && window.AdminShell.pageContent) {
        resolveFunction();
      } else {
        document.body.addEventListener("adminshell:ready", resolveFunction, { once: true });
      }
    });
  }

  // Wait for AdminShell to be available before proceeding
  waitForAdminShell().then(() => {
    if (!window.AdminShell || !window.AdminShell.pageContent) {
      console.error("AdminShell.pageContent is still null after ready event");
      return;
    }

    const SECTION = "demo";

    // Table configuration
    const DEMO_TABLE_CONFIG = {
      id: "demo-table",
      columns: [
        { field: "id", label: "ID", sortable: true },
        { field: "name", label: "Name", sortable: true },
        { field: "category", label: "Category", sortable: true },
        { field: "status", label: "Status", sortable: true },
        { field: "type", label: "Type" },
        { field: "inStock", label: "In Stock", formatter: "boolean" },
        { field: "promo", label: "Promo", formatter: "boolean" },
        { field: "price", label: "Price", formatter: "currency", sortable: true }
      ],
      actions: [
        { label: "Edit", className: "btn btn-sm btn-primary me-1", onClick: "handleDemoEdit" },
        { label: "Delete", className: "btn btn-sm btn-primary me-1", onClick: "handleDemoDelete", confirm: "Delete this item?" },
        { label: "View All", className: "btn btn-sm btn-outline-primary", onClick: "handleDemoViewAll" }
      ]
    };

    // Page configuration for PageRenderer
    const PAGE_CONFIG = {
      section: SECTION,
      tableConfig: DEMO_TABLE_CONFIG,
      pagination: {
        enabled: true,
        pageSize: 20
      },
      tabs: [
        { id: "all", label: "All", statusFilter: null },
        { id: "active", label: "Active", statusFilter: "active" },
        { id: "draft", label: "Draft", statusFilter: "draft" },
        { id: "archived", label: "Archived", statusFilter: "archived" }
      ]
    };

    // Initialize page with PageRenderer
    window.PageRenderer.init(PAGE_CONFIG);
  });
})();

