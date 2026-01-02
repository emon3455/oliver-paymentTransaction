/**
 * Sidebar Component
 * Handles sidebar navigation rendering with support for nested groups
 */

// Wrap in IIFE to avoid polluting global scope
(function () {
  // Get utility functions from AdminUtils
  const { $, ensureEl, getBasePath } = window.AdminUtils;
  // Get state management function
  const { getSection } = window.StateManager;

  // Expose Sidebar on global window object
  window.Sidebar = {
    /**
     * Initialize sidebar navigation
     * @param {Element} sidebarElement - Sidebar container element
     * @param {Element} pageTitleElement - Page title element to update
     */
    init(sidebarElement, pageTitleElement) {
      // Ensure sidebar element exists
      this.sidebar = ensureEl(sidebarElement, "Sidebar element");
      // Ensure page title element exists
      this.pageTitle = ensureEl(pageTitleElement, "Page title element");
      // Render the sidebar navigation
      this.render();
    },

    /**
     * Render sidebar navigation from configuration
     */
    render() {
      // Get sidebar items from configuration or use empty array
      const sidebarItems =
        window.AdminConfig && Array.isArray(window.AdminConfig.sidebar)
          ? window.AdminConfig.sidebar
          : [];

      // Get current section name
      const currentSection = getSection();
      // Get base path for URLs
      const basePath = getBasePath();

      // Initialize HTML string
      let htmlString = "";

      // Iterate through each sidebar item
      sidebarItems.forEach((item) => {
        // Check if item is a divider
        if (item.type === "divider") {
          // Add horizontal rule for divider
          htmlString += '<hr class="my-2">';
          // Skip to next item
          return;
        }

        // Check if item is a group (expandable menu)
        if (item.type === "group") {
          // Generate unique ID for the group
          const groupId = `group-${Math.random().toString(36).substr(2, 9)}`;
          // Check if any child in group is active
          const hasActiveChild = this.hasActiveChild(item.children || [], currentSection);
          // Add group HTML with toggle button
          htmlString += `
            <div class="nav-group">
              <button class="nav-link nav-group-toggle${hasActiveChild ? " active" : ""}" 
                      data-bs-toggle="collapse" 
                      data-bs-target="#${groupId}" 
                      aria-expanded="${hasActiveChild ? "true" : "false"}">
                <i class="bi bi-chevron-right me-1"></i>${item.label}
              </button>
              <div class="collapse${hasActiveChild ? " show" : ""}" id="${groupId}">
                <div class="nav-group-children">
                  ${this.renderGroupChildren(item.children || [], currentSection, basePath)}
                </div>
              </div>
            </div>
          `;
          // Skip to next item
          return;
        }

        // Check if this item is the active section
        const isActive = item.slug === currentSection ? " active" : "";
        // Add navigation link HTML
        htmlString += `<a class="nav-link${isActive}" href="${basePath}/page/${item.slug}">${item.label}</a>`;
      });

      // Set sidebar inner HTML
      this.sidebar.innerHTML = htmlString;

      // Update chevron icons when group toggles
      this.sidebar.querySelectorAll(".nav-group-toggle").forEach((toggleButton) => {
        // Add click listener to toggle button
        toggleButton.addEventListener("click", function () {
          // Find chevron icon in button
          const chevronIcon = this.querySelector("i");
          // Update icon if found
          if (chevronIcon) {
            // Use setTimeout to update after Bootstrap collapse animation
            setTimeout(() => {
              // Check if group is expanded
              const isExpanded = this.getAttribute("aria-expanded") === "true";
              // Set icon class based on expanded state
              chevronIcon.className = isExpanded
                ? "bi bi-chevron-down me-1"
                : "bi bi-chevron-right me-1";
            }, 50);
          }
        });
      });

      // Update page title from active navigation link
      const activeNavigationLink = this.sidebar.querySelector(
        ".nav-link.active:not(.nav-group-toggle)"
      );
      // Update page title if active link found
      if (activeNavigationLink) {
        // Set page title to active link text
        this.pageTitle.textContent = activeNavigationLink.textContent;
      }
    },

    /**
     * Render children of a navigation group recursively
     * @param {Array} children - Array of child items
     * @param {string} currentSection - Current active section name
     * @param {string} basePath - Base path for URLs
     * @returns {string} HTML string for group children
     */
    renderGroupChildren(children, currentSection, basePath) {
      // Map each child to HTML string
      return children
        .map((child) => {
          // Check if child is itself a group (nested groups)
          if (child.type === "group") {
            // Generate unique ID for nested group
            const nestedGroupId = `group-${Math.random().toString(36).substr(2, 9)}`;
            // Check if any child in nested group is active
            const hasActiveNestedChild = this.hasActiveChild(child.children || [], currentSection);
            // Return nested group HTML
            return `
            <div class="nav-group">
              <button class="nav-link nav-group-toggle nav-group-nested${
                hasActiveNestedChild ? " active" : ""
              }" 
                      data-bs-toggle="collapse" 
                      data-bs-target="#${nestedGroupId}" 
                      aria-expanded="${hasActiveNestedChild ? "true" : "false"}">
                <i class="bi bi-chevron-right me-1"></i>${child.label}
              </button>
              <div class="collapse${hasActiveNestedChild ? " show" : ""}" id="${nestedGroupId}">
                <div class="nav-group-children">
                  ${this.renderGroupChildren(child.children || [], currentSection, basePath)}
                </div>
              </div>
            </div>
          `;
          }
          // Check if child link is active
          const isChildActive = child.slug === currentSection ? " active" : "";
          // Return child link HTML
          return `<a class="nav-link nav-group-child${isChildActive}" href="${basePath}/page/${child.slug}">${child.label}</a>`;
        })
        .join("");
    },

    /**
     * Check if any child in a group is the active section (recursive)
     * @param {Array} children - Array of child items to check
     * @param {string} currentSection - Current active section name
     * @returns {boolean} True if any child is active
     */
    hasActiveChild(children, currentSection) {
      // Check if any child matches current section
      return children.some((child) => {
        // Check if child slug matches current section
        if (child.slug === currentSection) return true;
        // Recursively check nested children if they exist
        if (child.children) return this.hasActiveChild(child.children, currentSection);
        // Return false if no match
        return false;
      });
    }
  };
})();
