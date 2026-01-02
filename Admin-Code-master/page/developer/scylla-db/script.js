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
    const { pageContent } = window.AdminShell;
    // Destructure AdminUtils spinner function
    const { spinner } = window.AdminUtils;
    // Define section name constant (full path for developer pages)
    const SECTION = "developer/scylla-db";

    /**
     * Format byte size to human-readable string
     * @param {number} byteSize - Size in bytes
     * @returns {string} Formatted size string (B, KB, MB, or GB)
     */
    function formatSize(byteSize) {
      // Return bytes if less than 1024
      if (byteSize < 1024) return byteSize + " B";
      // Return kilobytes if less than 1 MB
      if (byteSize < 1024 * 1024) return (byteSize / 1024).toFixed(2) + " KB";
      // Return megabytes if less than 1 GB
      if (byteSize < 1024 * 1024 * 1024) return (byteSize / (1024 * 1024)).toFixed(2) + " MB";
      // Return gigabytes for larger sizes
      return (byteSize / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    }

    /**
     * Format timestamp to localized date string
     * @param {number|string} timestampValue - Timestamp value
     * @returns {string} Formatted date string
     */
    function formatTimestamp(timestampValue) {
      // Create date object from timestamp
      const dateObject = new Date(timestampValue);
      // Return localized date string
      return dateObject.toLocaleString();
    }

    /**
     * Render backup table with all backups
     */
    async function render() {
      // Set page content to loading spinner
      pageContent.innerHTML = spinner();

      // Fetch backup data from API service
      const apiResponse = await window.ApiService.get(SECTION, {
        filters: {},
        pagination: { limit: 999, offset: 0 }
      });
      // Extract backups array from response
      const backupList = apiResponse.items || [];

      // Generate table rows HTML from backups
      const tableRowsHtml = backupList
        .map(
          (backupItem) => `
        <tr>
          <td>
            <button class="btn btn-sm btn-outline-primary" onclick="alert('Download backup: ${
              backupItem.filename
            }\\nEndpoint will be added later');">
              <i class="bi bi-download"></i> Download
            </button>
          </td>
          <td>
            <button class="btn btn-sm btn-outline-warning" onclick="alert('Restore backup: ${
              backupItem.filename
            }\\nEndpoint will be added later');">
              <i class="bi bi-arrow-counterclockwise"></i> Restore
            </button>
          </td>
          <td>${formatTimestamp(backupItem.timestamp)}</td>
          <td>${formatSize(backupItem.size)}</td>
          <td>${backupItem.filename || "backup-" + backupItem.id + ".tar.gz"}</td>
        </tr>
      `
        )
        .join("");

      // Generate complete table HTML with backup button
      const tableHtml = `
        <div class="mb-3">
          <button class="btn btn-primary" onclick="alert('Backup Now - Endpoint will be added later'); document.body.dispatchEvent(new CustomEvent('section:refresh'));">
            <i class="bi bi-database-add"></i> Backup Now
          </button>
        </div>
        <div class="card table-card">
          <div class="card-body p-0">
            <table class="table table-bordered mb-0">
              <thead class="table-light">
                <tr>
                  <th>Download</th>
                  <th>Restore</th>
                  <th>Timestamp</th>
                  <th>Size</th>
                  <th>Filename</th>
                </tr>
              </thead>
              <tbody>${
                tableRowsHtml ||
                '<tr><td colspan="5" class="text-center text-muted">No backups found</td></tr>'
              }</tbody>
            </table>
          </div>
        </div>`;

      // Set page content to table and notes
      pageContent.innerHTML = tableHtml;
    }

    // Initialize page
    // Render initial view
    render();
    // Listen for section refresh event
    document.body.addEventListener("section:refresh", () => {
      // Re-render table
      render();
    });
    // Listen for environment change event
    document.body.addEventListener("env:changed", () => {
      // Re-render table
      render();
    });
  });
})();
