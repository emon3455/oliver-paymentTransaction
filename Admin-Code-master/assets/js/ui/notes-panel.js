/**
 * Notes Panel Component
 * Handles rendering of page notes/info sections
 */

// Wrap in IIFE to avoid polluting global scope
(function () {
  // Get state management function
  const { getSection } = window.StateManager;

  // Expose NotesPanel on global window object
  window.NotesPanel = {
    /**
     * Render notes for the current section
     * @returns {string} HTML string for the notes panel
     */
    render() {
      // Get current section name
      const section = getSection();
      // Get notes configuration for current section
      const configuration = window.AdminConfig?.notes?.[section];

      // Return empty string if no configuration exists
      if (!configuration) return "";

      // Check if notes are text-only format
      if (configuration.text) {
        // Return HTML for text-only notes card
        return `<div class="card notes-below"><div class="card-body"><p class="mb-0">${configuration.text}</p></div></div>`;
      }

      // Generate heading HTML if heading exists
      const heading = configuration.heading
        ? `<div class="d-flex align-items-center gap-2 mb-2"><i class="bi bi-sticky"></i><strong>${configuration.heading}</strong></div>`
        : "";

      // Generate list items HTML from configuration list
      const list = (configuration.list || [])
        .map(
          (item) =>
            // Return list item for each note
            `<li class="list-group-item">${item}</li>`
        )
        .join("");

      // Return HTML for notes card with heading and list
      return `<div class="card notes-below"><div class="card-body">${heading}<ul class="list-group list-group-flush">${list}</ul></div></div>`;
    }
  };
})();
