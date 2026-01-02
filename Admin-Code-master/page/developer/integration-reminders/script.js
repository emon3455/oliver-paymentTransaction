/**
 * Integration Reminders Page
 * Displays integration reminders for moderation and other features
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
    const { spinner, errorMessage } = window.AdminUtils;

    /**
     * Load reminders from JSON file
     * @returns {Promise<Array>} Array of reminder objects
     */
    async function loadReminders() {
      try {
        // Fetch reminders from JSON file
        const response = await fetch("./data.json");
        // Parse JSON response
        const reminders = await response.json();
        // Return reminders array
        return reminders;
      } catch (error) {
        // Log error
        console.error("[Integration Reminders] Could not load reminders:", error);
        // Return empty array on error
        return [];
      }
    }

    /**
     * Get status badge class
     * @param {string} status - Reminder status
     * @returns {string} Bootstrap badge class
     */
    function getStatusBadgeClass(status) {
      // Map status to badge class
      const statusMap = {
        pending: "bg-warning",
        "in-progress": "bg-info",
        completed: "bg-success"
      };
      // Return badge class or default
      return statusMap[status] || "bg-secondary";
    }

    /**
     * Get priority badge class
     * @param {string} priority - Reminder priority
     * @returns {string} Bootstrap badge class
     */
    function getPriorityBadgeClass(priority) {
      // Map priority to badge class
      const priorityMap = {
        high: "bg-danger",
        medium: "bg-warning",
        low: "bg-secondary"
      };
      // Return badge class or default
      return priorityMap[priority] || "bg-secondary";
    }

    /**
     * Group reminders by category
     * @param {Array} reminders - Array of reminder objects
     * @returns {Object} Object with categories as keys and arrays of reminders as values
     */
    function groupRemindersByCategory(reminders) {
      // Initialize grouped object
      const grouped = {};
      // Iterate through reminders
      reminders.forEach(reminder => {
        // Get category from reminder
        const category = reminder.category || "Other";
        // Initialize category array if not exists
        if (!grouped[category]) {
          // Create empty array for category
          grouped[category] = [];
        }
        // Add reminder to category array
        grouped[category].push(reminder);
      });
      // Return grouped object
      return grouped;
    }

    /**
     * Render reminders page
     */
    async function render() {
      // Show loading spinner
      pageContent.innerHTML = spinner();
      try {
        // Load reminders from JSON file
        const reminders = await loadReminders();
        // Group reminders by category
        const groupedReminders = groupRemindersByCategory(reminders);
        // Get category names
        const categories = Object.keys(groupedReminders);
        // Build HTML for each category
        const categoriesHtml = categories.map(category => {
          // Get reminders for this category
          const categoryReminders = groupedReminders[category];
          // Build HTML for reminders in this category
          const remindersHtml = categoryReminders.map(reminder => {
            // Get status badge class
            const statusBadgeClass = getStatusBadgeClass(reminder.status);
            // Get priority badge class
            const priorityBadgeClass = getPriorityBadgeClass(reminder.priority);
            // Return reminder card HTML
            return `
              <div class="card mb-3">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="card-title mb-0">${reminder.title}</h6>
                    <div class="d-flex gap-2">
                      <span class="badge ${statusBadgeClass}">${reminder.status}</span>
                      <span class="badge ${priorityBadgeClass}">${reminder.priority}</span>
                    </div>
                  </div>
                  <p class="card-text mb-0">${reminder.description}</p>
                </div>
              </div>
            `;
          }).join("");
          // Return category section HTML
          return `
            <div class="mb-4">
              <h4 class="mb-3">${category}</h4>
              ${remindersHtml}
            </div>
          `;
        }).join("");
        // Build complete page HTML
        const pageHtml = `
          <div class="mb-4">
            <p>Integration reminders for moderation and other features. Track frontend integration tasks and requirements.</p>
          </div>
          ${categoriesHtml}
        `;
        // Set page content
        pageContent.innerHTML = pageHtml;
      } catch (error) {
        // Display error message
        pageContent.innerHTML = errorMessage(error, "Failed to load integration reminders");
        // Log error
        console.error("[Integration Reminders] Render error:", error);
      }
    }

    // Initialize page
    render();
  });
})();







