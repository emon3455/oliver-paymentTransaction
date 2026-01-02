/**
 * Admin Panel Main
 * Initializes and orchestrates all admin panel components
 */

// Expose AdminShell API immediately (before DOM operations) to ensure it's available to page scripts even if DOM isn't ready yet
window.AdminShell = window.AdminShell || {
  // Placeholder values - will be updated in init()
  pageTitle: null,
  pageContent: null,
  renderChips: () => ""
};

// Wrap in IIFE to avoid polluting global scope
(function () {
  // Get utility functions from AdminUtils
  const { $, ensureEl } = window.AdminUtils;
  // Get state management function
  const { getSection } = window.StateManager;

  /**
   * Render filter chips HTML for active filters
   * @param {string} sectionName - Section name to get filters for
   * @returns {string} HTML string for filter chips
   */
  function renderChips(sectionName) {
    // Get active filters for the section
    const activeFilters = window.StateManager.getFilters(sectionName);
    // Convert filters object to array of entries
    const filterEntries = Object.entries(activeFilters);
    // Return empty string if no filters
    if (!filterEntries.length) return "";

    // Map each filter entry to a chip HTML element
    return filterEntries
      .map(([filterKey, filterValue]) => {
        // Create label from value (handle arrays by joining with comma)
        const chipLabel = Array.isArray(filterValue) ? filterValue.join(", ") : String(filterValue);
        // Return chip HTML with remove button
        return `<span class="filter-chip" data-chip="${filterKey}"><span>${filterKey}: ${chipLabel}</span><button type="button" class="btn-close" aria-label="Remove"></button></span>`;
      })
      .join("");
  }

  /**
   * Check if current section has any active filters
   * @returns {boolean} True if filters are active, false otherwise
   */
  function hasActiveFilters() {
    // Get current section name
    const currentSection = window.StateManager.getSection();
    // Get active filters for the section
    const activeFilters = window.StateManager.getFilters(currentSection);
    // Return true if filters object has any keys
    return Object.keys(activeFilters).length > 0;
  }

  /**
   * Reset all filters for current section and refresh page
   */
  function resetFilters() {
    // Get current section name
    const currentSection = window.StateManager.getSection();
    // Clear all filters for the section
    window.StateManager.clearFilters(currentSection);
    // Dispatch event to notify components of filter change
    document.body.dispatchEvent(new CustomEvent("filters:changed"));
    // Dispatch event to refresh the page content
    document.body.dispatchEvent(new CustomEvent("section:refresh"));
  }

  /**
   * Update reset button visibility based on active filters
   */
  function updateResetButton() {
    // Get reset button element
    let resetButtonElement = $("#resetFiltersBtn");
    // Check if filters are active
    const hasActiveFiltersValue = hasActiveFilters();

    // Create button if it doesn't exist and filter button exists
    if (!resetButtonElement && $("#filterBtn")) {
      // Initialize reset button
      initResetButton();
      // Get reset button again after initialization
      resetButtonElement = $("#resetFiltersBtn");
    }

    // Update visibility if button exists
    if (resetButtonElement) {
      // Show button if filters are active
      if (hasActiveFiltersValue) {
        // Show the button
        resetButtonElement.style.display = "";
      } else {
        // Hide the button
        resetButtonElement.style.display = "none";
      }
    }
  }

  /**
   * Initialize reset button by attaching click handler
   */
  function initResetButton() {
    // Get reset button element
    const resetButtonElement = $("#resetFiltersBtn");
    // Attach handler if button exists
    if (resetButtonElement) {
      // Set onclick handler to reset filters function
      resetButtonElement.onclick = resetFilters;
      // Update initial visibility state
      updateResetButton();
    }
  }

  /**
   * Initialize all admin panel components
   */
  function init() {
    // Get required DOM elements using ensureEl to throw error if missing
    const pageTitleElement = ensureEl($("#pageTitle"), "#pageTitle");
    // Get page content container element
    const pageContentElement = ensureEl($("#pageContent"), "#pageContent");
    // Get sidebar navigation element
    const sidebarElement = ensureEl($("#sidebarNav"), "#sidebarNav");
    // Get environment selector element (optional - some pages don't have it)
    const environmentSelectElement = $("#envSelect");
    // Get filter button element (optional - some pages don't have it)
    const filterButtonElement = $("#filterBtn");

    // Update AdminShell API with actual DOM elements
    // This replaces the placeholder created earlier
    window.AdminShell.pageTitle = pageTitleElement;
    window.AdminShell.pageContent = pageContentElement;
    // Notes are now static HTML - no JavaScript rendering needed
    window.AdminShell.renderChips = renderChips;

    // Dispatch event to notify that AdminShell is ready
    document.body.dispatchEvent(new CustomEvent("adminshell:ready"));

    // Initialize sidebar navigation
    window.Sidebar.init(sidebarElement, pageTitleElement);

    // Initialize environment selector if element exists
    if (environmentSelectElement) {
      // Initialize environment selector component
      window.EnvSelector.init(environmentSelectElement);
    }

    // Initialize filter panel if filter button exists
    if (filterButtonElement) {
      // Initialize filter panel component
      window.FilterPanel.init(filterButtonElement);
    }

    // Initialize reset button (attach click handler and set visibility)
    initResetButton();

    // Initialize modal viewer component (if available)
    if (window.ModalViewer && typeof window.ModalViewer.init === "function") {
      window.ModalViewer.init();
    }

    // Add event listener for section refresh events
    document.body.addEventListener("section:refresh", updateResetButton);

    // Add event listener for filter change events
    document.body.addEventListener("filters:changed", updateResetButton);

    // Add click listener for filter chip removal
    document.addEventListener("click", (clickEvent) => {
      // Check if clicked element is a filter chip close button
      if (clickEvent.target.closest(".filter-chip .btn-close")) {
        // Dispatch filter change event to update UI
        document.body.dispatchEvent(new CustomEvent("filters:changed"));
      }
    });
  }

  // Check if DOM is already loaded
  if (document.readyState === "loading") {
    // Wait for DOM content to load before initializing
    document.addEventListener("DOMContentLoaded", init);
  } else {
    // Initialize immediately if DOM is already loaded
    init();
  }
})();
