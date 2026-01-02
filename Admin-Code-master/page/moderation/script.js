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

    const SECTION = "moderation";

    // Table configuration
    const MODERATION_TABLE_CONFIG = {
      id: "moderation-table",
      columns: [
        { 
          field: "moderationId", 
          label: "Moderation ID", 
          sortable: true,
          formatter: (value, row) => {
            const moderationId = value || row.id;
            const itemMeta = row.meta || {};
            const isContentDeleted = itemMeta.contentDeleted === true;
            return `${moderationId}${isContentDeleted ? ' <span class="badge bg-danger" title="Content Deleted">Deleted</span>' : ''}`;
          }
        },
        { 
          field: "userId", 
          label: "User ID",
          formatter: (value) => `<a href="#" class="text-decoration-none text-primary" data-lookup-user="${value}" title="Lookup user details">${value}</a>`
        },
        { 
          field: "type", 
          label: "Type", 
          sortable: true,
          formatter: (value) => {
            if (!value) return "-";
            // Remove underscores and capitalize each word
            return value.split("_").map(word => 
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(" ");
          }
        },
        { 
          field: "status", 
          label: "Status", 
          sortable: true,
          formatter: (value) => {
            if (!value) return "-";
            // Map "pending" to "Pending Resubmission", capitalize others
            const status = value.toLowerCase();
            if (status === "pending") {
              return "Pending Resubmission";
            }
            return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
          }
        },
        { 
          field: "moderatedBy", 
          label: "Moderated By"
        },
        { 
          field: "submittedAt", 
          label: "Date Submitted", 
          formatter: (value, row) => window.ModerationUtils.formatDateTime(value || row.createdAt),
          sortable: true
        },
        { 
          field: "moderatedAt", 
          label: "Date Moderated",
          formatter: (value, row) => window.ModerationUtils.getDateModerated(row)
        },
        { 
          field: "actions", 
          label: "Actions",
          formatter: (value, row) => {
            const moderationId = row.moderationId || row.id;
            const userId = row.userId;
            const statusLower = (row.status || "").toLowerCase();
            const isApproved = statusLower === "approved";
            const isRejected = statusLower === "rejected";
            
            // Store full row data for both buttons
            const rowDataEncoded = encodeURIComponent(JSON.stringify(row));
            
            return `
              <div class="d-flex gap-1">
                <button class="btn btn-sm btn-primary" data-reveal-content="${moderationId}" data-user-id="${userId}" data-row-data='${rowDataEncoded}'>Preview</button>
                <button class="btn btn-sm btn-primary" data-view-all="${moderationId}" data-user-id="${userId}" data-row-data='${rowDataEncoded}'>Data</button>
              </div>
            `;
          }
        }
      ]
    };

    // Page configuration for PageRenderer
    const PAGE_CONFIG = {
      section: SECTION,
      tableConfig: MODERATION_TABLE_CONFIG,
      pagination: {
        enabled: true,
        pageSize: 20
      },
      tabs: [
        { id: "all", label: "All", statusFilter: null },
        { id: "pending", label: "Pending Resubmission", statusFilter: "pending" },
        { id: "approved", label: "Approved", statusFilter: "approved" },
        { id: "rejected", label: "Rejected", statusFilter: "rejected" }
      ]
    };

    // Initialize page with PageRenderer
    window.PageRenderer.init(PAGE_CONFIG);

    // Attach moderation-specific event handlers from handlers.js
    if (window.ModerationHandlers) {
      window.ModerationHandlers.init();
    }
  });
})();

