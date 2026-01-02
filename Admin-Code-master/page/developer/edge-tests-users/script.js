/**
 * Edge Tests - Users Class
 * Edge testing functionality for users
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
    // Get page content container element
    const pageContent = window.AdminShell.pageContent;
    // Set initial content
    pageContent.innerHTML = `
    <div class="card">
      <div class="card-body">
        <h5 class="card-title">Users Class Edge Tests</h5>
        <p class="card-text">Edge tests for users functionality will be added here.</p>
      </div>
    </div>
  `;
  });
})();
