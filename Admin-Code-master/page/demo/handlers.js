/**
 * Demo Page Handlers
 * Contains all demo-specific action handlers
 */

(function () {
  'use strict';

  const { spinner, spinnerInline, errorMessage } = window.AdminUtils;

  /**
   * Fetch all items from data.json
   */
  async function fetchAllItems() {
    const currentPathname = window.location.pathname;
    const basePath = currentPathname.substring(0, currentPathname.indexOf("/page/") + 1) || "";
    const dataFileUrl = `${basePath}page/demo/data.json`;
    
    try {
      const response = await fetch(dataFileUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.error("[Demo] Error fetching data:", error);
      return [];
    }
  }

  /**
   * Handle edit action
   */
  window.handleDemoEdit = (row) => {
    console.log("Edit item:", row);
    alert(`Edit item: ${row.name} (ID: ${row.id})`);
  };

  /**
   * Handle delete action
   */
  window.handleDemoDelete = (row) => {
    console.log("Delete item:", row);
    alert(`Delete item: ${row.name} (ID: ${row.id})`);
  };

  /**
   * Handle view all action - opens offcanvas
   */
  window.handleDemoViewAll = async (row) => {
    const offcanvas = document.getElementById("viewAllOffcanvas");
    if (!offcanvas) {
      console.error("Offcanvas element not found");
      return;
    }

    const offcanvasInstance = new bootstrap.Offcanvas(offcanvas);
    const offcanvasBody = document.getElementById("viewAllOffcanvasBody");
    if (!offcanvasBody) return;

    const itemId = row.id;
    offcanvasBody.innerHTML = spinnerInline(`Loading item #${itemId}…`);
    offcanvasInstance.show();

    try {
      const allItems = await fetchAllItems();
      const itemRecord = allItems.find((item) => item.id === itemId);
      
      if (!itemRecord) {
        offcanvasBody.innerHTML = '<div class="text-muted">Item not found.</div>';
        return;
      }

      const additionalDetailsHtml = (itemRecord.details || [])
        .map((detail) => `<tr><td>${detail.key}</td><td>${detail.value}</td></tr>`)
        .join("");
      
      const historyHtml = (itemRecord.history || [])
        .map(
          (historyEntry) =>
            `<tr><td>${new Date(historyEntry.date).toLocaleDateString()}</td><td>${
              historyEntry.action
            }</td><td>${historyEntry.user}</td></tr>`
        )
        .join("");

      offcanvasBody.innerHTML = `
        <div class="mb-3 d-flex justify-content-between align-items-center">
          <h5 class="mb-0">${itemRecord.name}</h5>
          <span class="badge text-bg-${
            itemRecord.status === "Active" ? "success" : "secondary"
          }">${itemRecord.status}</span>
        </div>
        <div class="text-muted small mb-3">ID: ${itemRecord.id} • Category: ${
        itemRecord.category || "N/A"
      } • Type: ${itemRecord.type || "N/A"}</div>
        <div class="mb-3"><h6>Basic Info</h6>
          <p><strong>SKU:</strong> ${itemRecord.sku || "N/A"}</p>
          <p><strong>Price:</strong> $${itemRecord.price?.toFixed(2) || "0.00"}</p>
          <p><strong>In Stock:</strong> ${itemRecord.inStock ? "Yes" : "No"}</p>
          <p><strong>On Promotion:</strong> ${itemRecord.promo ? "Yes" : "No"}</p>
          ${
            itemRecord.tags && itemRecord.tags.length
              ? `<p><strong>Tags:</strong> ${itemRecord.tags.join(", ")}</p>`
              : ""
          }
        </div>
        ${
          additionalDetailsHtml
            ? `<div class="mb-3"><h6>Additional Details</h6>
          <div class="table-responsive"><table class="table table-sm">
            <thead><tr><th>Key</th><th>Value</th></tr></thead>
            <tbody>${additionalDetailsHtml}</tbody>
          </table></div>
        </div>`
            : ""
        }
        ${
          historyHtml
            ? `<div class="mb-3"><h6>History</h6>
          <div class="table-responsive"><table class="table table-sm">
            <thead><tr><th>Date</th><th>Action</th><th>User</th></tr></thead>
            <tbody>${historyHtml}</tbody>
          </table></div>
        </div>`
            : ""
        }
        <div class="mb-3"><h6>Raw JSON</h6><pre class="code-json">${JSON.stringify(
          itemRecord,
          null,
          2
        )}</pre></div>`;
    } catch (loadError) {
      offcanvasBody.innerHTML = errorMessage(loadError);
    }
  };

  // Expose handlers
  window.DemoHandlers = {
    fetchAllItems
  };
})();

