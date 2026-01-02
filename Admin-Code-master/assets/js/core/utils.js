/**
 * Utility Functions
 * Helper functions used throughout the admin panel
 */

// Expose utility functions on the global window object
window.AdminUtils = {
  /**
   * Shorthand for querySelector - finds a single element in the DOM
   * @param {string} selector - CSS selector string to find element
   * @param {Element} rootElement - Root element to search from (default: document)
   * @returns {Element|null} - Found element or null if not found
   */
  $(selector, rootElement = document) {
    // Return the first element matching the selector
    return rootElement.querySelector(selector);
  },

  /**
   * Ensures an element exists, throws error if missing
   * @param {Element|null} element - Element to check for existence
   * @param {string} description - Description for error message if element is missing
   * @returns {Element} - The element if it exists
   */
  ensureEl(element, description = "Element") {
    // Throw error if element is null or undefined
    if (!element) throw new Error(`${description} missing`);
    // Return the element if it exists
    return element;
  },

  /**
   * Gets the base path from current URL
   * Extracts everything before /page/ in the pathname
   * @returns {string} Base path (e.g., '/fansocial-admin' or '')
   */
  getBasePath() {
    // Get the current pathname from the URL
    const pathname = window.location.pathname;
    // Find the index of '/page/' in the pathname
    const pageIndex = pathname.indexOf("/page/");
    // Return empty string if '/page/' is not found
    if (pageIndex === -1) return "";
    // Return the substring from start to the '/page/' index
    return pathname.substring(0, pageIndex);
  },

  /**
   * Renders a full-page loading spinner
   * @param {string} message - Optional loading message (default: "Loading…")
   * @returns {string} HTML string for the spinner
   */
  spinner(message = "Loading…") {
    // Return HTML string with centered spinner and message
    return `<div class="text-center py-5"><div class="spinner-border spinner-large"></div><div class="mt-3">${message}</div></div>`;
  },

  /**
   * Renders a compact inline spinner
   * @param {string} message - Optional loading message
   * @returns {string} HTML string for the spinner
   */
  spinnerInline(message = "") {
    // If message is provided, return spinner with message
    if (message) {
      // Return HTML string with spinner and message below it
      return `<div class="text-center py-4"><div class="spinner-border"></div><div class="mt-2 small text-muted">${message}</div></div>`;
    }
    // Return HTML string with just the spinner (no message)
    return `<div class="text-center my-3"><div class="spinner-border spinner-large"></div></div>`;
  },

  /**
   * Renders a small compact spinner (no message)
   * @returns {string} HTML string for the spinner
   */
  spinnerSmall() {
    // Return HTML string with small centered spinner
    return `<div class="text-center my-3"><div class="spinner-border spinner-large"></div></div>`;
  },

  /**
   * Renders an error message with appropriate icon and styling
   * @param {Error|string} error - Error object or error message string
   * @param {string} title - Optional title (default: "Error")
   * @returns {string} HTML string for the error alert
   */
  errorMessage(error, title = "Error") {
    // Extract error message from error object or use string directly
    let message = typeof error === "string" ? error : error.message || "An unknown error occurred";
    // Default icon for general errors
    let icon = "bi-exclamation-triangle";

    // Customize icon and title based on error type
    if (error && typeof error === "object") {
      // Check if error is a timeout error
      if (error.isTimeout) {
        // Set icon to clock for timeout errors
        icon = "bi-clock-history";
        // Set title to indicate timeout
        title = "Request Timeout";
      } else if (error.isHttpError) {
        // Set icon to X circle for HTTP errors
        icon = "bi-x-circle";
        // Check for specific HTTP status codes
        if (error.status === 404) {
          // Set title for not found errors
          title = "Not Found";
        } else if (error.status >= 500) {
          // Set title for server errors
          title = "Server Error";
        } else {
          // Set title for other HTTP errors
          title = "Request Failed";
        }
      } else if (error.isNetworkError) {
        // Set icon to wifi off for network errors
        icon = "bi-wifi-off";
        // Set title for network errors
        title = "Network Error";
      }
    }

    // Return HTML string for Bootstrap alert with error message
    return `
      <div class="alert alert-danger d-flex align-items-start" role="alert">
        <i class="bi ${icon} me-2 fs-5"></i>
        <div class="flex-grow-1">
          <strong>${title}</strong>
          <div class="mt-1">${message}</div>
        </div>
      </div>
    `;
  }
};
