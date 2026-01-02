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
          sortable: true
        },
        { 
          field: "content", 
          label: "Content",
          formatter: (value, row) => {
            const moderationId = row.moderationId || row.id;
            const userId = row.userId;
            return `<button class="btn btn-sm btn-primary" data-reveal-content="${moderationId}" data-user-id="${userId}">Reveal</button>`;
          }
        },
        { 
          field: "status", 
          label: "Status", 
          sortable: true
        },
        { 
          field: "moderatedBy", 
          label: "Moderated By"
        },
        { 
          field: "submittedAt", 
          label: "Date Submitted", 
          formatter: (value, row) => window.ModerationHandlers.formatDateTime(value || row.createdAt),
          sortable: true
        },
        { 
          field: "moderatedAt", 
          label: "Date Moderated",
          formatter: (value, row) => window.ModerationHandlers.getDateModerated(row)
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
            
            return `
              <div class="dropdown">
                <button class="btn btn-sm btn-primary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                  Actions
                </button>
                <ul class="dropdown-menu">
                  ${isApproved ? `
                    <li><span class="dropdown-item disabled text-warning">Pending Resubmission</span></li>
                  ` : `
                    <li><a class="dropdown-item text-success" href="#" data-action="approve" data-moderation-id="${moderationId}" data-user-id="${userId}">Approve</a></li>
                  `}
                  ${isRejected ? `
                    <li><span class="dropdown-item disabled text-warning">Pending Resubmission</span></li>
                  ` : `
                    <li><a class="dropdown-item text-danger" href="#" data-action="reject" data-moderation-id="${moderationId}" data-user-id="${userId}">Decline</a></li>
                  `}
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item" href="#" data-view-all="${moderationId}" data-user-id="${userId}">View</a></li>
                </ul>
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
        { id: "pending", label: "Pending", statusFilter: "pending" },
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

