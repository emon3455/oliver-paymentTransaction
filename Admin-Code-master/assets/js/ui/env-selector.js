/**
 * Environment Selector Component
 * Handles environment selection (prod/stage/dev)
 */

// Wrap in IIFE to avoid polluting global scope
(function () {
  // Get utility functions from AdminUtils
  const { ensureEl } = window.AdminUtils;
  // Get state management functions
  const { getEnv, setEnv } = window.StateManager;

  // Expose EnvSelector on global window object
  window.EnvSelector = {
    /**
     * Initialize environment selector dropdown
     * @param {Element} selectElement - Select element to initialize
     */
    init(selectElement) {
      // Ensure select element exists, throw error if missing
      this.select = ensureEl(selectElement, "Environment select element");
      // Render the environment options
      this.render();
      // Attach event listeners
      this.attachEvents();
    },

    /**
     * Render environment options in the select dropdown
     */
    render() {
      // Get list of available environments or use default
      const environmentList = window.Env.list || ["prod", "stage", "dev"];
      // Get current active environment
      const currentEnvironment = getEnv();

      // Generate HTML options for each environment
      this.select.innerHTML = environmentList
        .map((environment) => {
          // Mark current environment as selected
          const selected = environment === currentEnvironment ? "selected" : "";
          // Return option element with uppercase label
          return `<option value="${environment}" ${selected}>${environment.toUpperCase()}</option>`;
        })
        .join("");
    },

    /**
     * Attach change event listener to select element
     */
    attachEvents() {
      // Listen for change event on select element
      this.select.addEventListener("change", () => {
        // Get the newly selected environment value
        const newEnvironment = this.select.value;
        // Update the environment in state
        setEnv(newEnvironment);

        // Dispatch event to notify other components of environment change
        document.body.dispatchEvent(new CustomEvent("env:changed"));
        // Dispatch event to refresh the current section
        document.body.dispatchEvent(new CustomEvent("section:refresh"));
      });
    }
  };
})();
