/**
 * State Management
 * Manages global application state including environment and active filters
 */

// Wrap in IIFE to avoid polluting global scope
(function () {
  // Initialize environment object if not already set
  if (!window.Env) {
    // Create environment configuration object
    window.Env = {
      // Current active environment (default: production)
      current: "prod",
      // List of available environments
      list: ["prod", "stage", "dev"]
    };
  }

  // Initialize admin state object if not already set
  window.AdminState = window.AdminState || {
    // Object to store active filters per section
    activeFilters: {},
    // Current environment from Env object
    env: window.Env.current || "prod"
  };

  // Get current section name from body data attribute
  window.AdminState.section = document.body.getAttribute("data-section") || "";

  /**
   * State Manager API
   * Provides methods to interact with application state
   */
  window.StateManager = {
    /**
     * Get current section name
     * @returns {string} Current section name
     */
    getSection() {
      // Return the current section from AdminState
      return window.AdminState.section;
    },

    /**
     * Get active filters for a specific section
     * @param {string} section - Section name to get filters for
     * @returns {Object} Object containing filter key-value pairs
     */
    getFilters(section) {
      // Return filters for section or empty object if none exist
      return window.AdminState.activeFilters[section] || {};
    },

    /**
     * Set active filters for a specific section
     * @param {string} section - Section name to set filters for
     * @param {Object} filters - Filter values object with key-value pairs
     */
    setFilters(section, filters) {
      // Store filters in AdminState for the specified section
      window.AdminState.activeFilters[section] = filters;
    },

    /**
     * Clear all filters for a specific section
     * @param {string} section - Section name to clear filters for
     */
    clearFilters(section) {
      // Delete the filters object for the specified section
      delete window.AdminState.activeFilters[section];
    },

    /**
     * Get current environment name
     * @returns {string} Current environment (prod, stage, or dev)
     */
    getEnv() {
      // Return the current environment from Env object
      return window.Env.current;
    },

    /**
     * Set current environment
     * @param {string} environment - Environment name to set (prod, stage, or dev)
     */
    setEnv(environment) {
      // Update current environment in Env object
      window.Env.current = environment;
      // Update environment in AdminState as well
      window.AdminState.env = environment;
    }
  };
})();
