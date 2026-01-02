/**
 * Modal Viewer Component
 * Handles viewing JSON/HTML content in a modal dialog
 */

// Wrap in IIFE to avoid polluting global scope
(function () {
  // Get utility function for querying DOM
  const { $ } = window.AdminUtils;

  // Expose ModalViewer on global window object
  window.ModalViewer = {
    // Bootstrap modal instance (initialized later)
    modal: null,
    // Modal body element (initialized later)
    body: null,

    /**
     * Initialize modal viewer component
     */
    init() {
      // Ensure modal element exists in DOM
      this.ensureModal();
      // Create Bootstrap modal instance
      this.modal = new bootstrap.Modal("#viewModal");
      // Get reference to modal body element
      this.body = $("#viewModalBody");
      // Attach event listeners
      this.attachEvents();
    },

    /**
     * Ensure modal element exists in the DOM, create if missing
     */
    ensureModal() {
      // Check if modal already exists
      if (document.querySelector("#viewModal")) return;

      // Create wrapper div for modal HTML
      const wrapper = document.createElement("div");
      // Set inner HTML with modal structure
      wrapper.innerHTML = `
        <div class="modal fade" id="viewModal" tabindex="-1">
          <div class="modal-dialog modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Preview</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body" id="viewModalBody"></div>
            </div>
          </div>
        </div>
      `;
      // Append modal to document body
      document.body.appendChild(wrapper.firstElementChild);
    },

    /**
     * Show HTML content in the modal
     * @param {string} htmlContent - HTML content string to display
     */
    showHtml(htmlContent) {
      // Set modal body content or show default message
      this.body.innerHTML = htmlContent || '<div class="text-muted">No content</div>';
      // Show the modal
      this.modal.show();
    },

    /**
     * Show JSON content in the modal
     * @param {string} jsonString - JSON string to parse and display
     */
    showJson(jsonString) {
      // Try to parse and display JSON
      try {
        // Parse JSON string to object
        const parsedObject = JSON.parse(jsonString);
        // Format JSON with indentation and set as modal content
        this.body.innerHTML = `<pre class="code-json">${JSON.stringify(
          parsedObject,
          null,
          2
        )}</pre>`;
        // Show the modal
        this.modal.show();
      } catch (parseError) {
        // Show error message if JSON parsing fails
        this.body.innerHTML = `<div class="text-danger small">Failed to parse content.</div>`;
        // Show the modal with error
        this.modal.show();
      }
    },

    /**
     * Attach click event listeners for view buttons
     */
    attachEvents() {
      // Listen for clicks on document
      document.addEventListener("click", (clickEvent) => {
        // Find closest element with data-view-html or data-view-json attribute
        const targetElement = clickEvent.target.closest("[data-view-html], [data-view-json]");
        // Return early if no matching element found
        if (!targetElement) return;

        // Check if element has data-view-html attribute
        if (targetElement.hasAttribute("data-view-html")) {
          // Get HTML content from attribute
          const htmlContent = targetElement.getAttribute("data-view-html");
          // Show HTML in modal
          this.showHtml(htmlContent);
        } else if (targetElement.hasAttribute("data-view-json")) {
          // Get encoded JSON string from attribute
          const encodedJson = targetElement.getAttribute("data-view-json");
          // Decode the JSON string
          const decodedJson = decodeURIComponent(encodedJson);
          // Show JSON in modal
          this.showJson(decodedJson);
        }
      });
    }
  };
})();
