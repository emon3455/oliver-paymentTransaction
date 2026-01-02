/**
 * Filter Panel Component
 * Handles filter UI and logic for filtering data tables
 */

// Wrap in IIFE to avoid polluting global scope
(function () {
  // Get utility function for querying DOM elements
  const { $ } = window.AdminUtils;
  // Get state management functions for filters
  const { getSection, getFilters, setFilters } = window.StateManager;

  // Expose FilterPanel on global window object
  window.FilterPanel = {
    // Bootstrap offcanvas instance (initialized later)
    offcanvas: null,
    // Form body element container (initialized later)
    formBody: null,

    /**
     * Initialize filter panel component
     * @param {Element} filterButton - Filter button element that triggers the panel
     */
    init(filterButton) {
      // Store reference to filter button
      this.filterBtn = filterButton;
      // Create the offcanvas element if it doesn't exist
      this.createOffcanvas();
      // Attach event listeners
      this.attachEvents();
    },

    /**
     * Create filter offcanvas element in the DOM
     */
    createOffcanvas() {
      // Return early if offcanvas already exists
      if (document.querySelector("#filterOffcanvas")) return;

      // Create wrapper div for offcanvas HTML
      const offcanvasElement = document.createElement("div");
      // Set inner HTML with offcanvas structure
      offcanvasElement.innerHTML = `
        <div class="offcanvas offcanvas-end offcanvas-filter" tabindex="-1" id="filterOffcanvas">
          <div class="offcanvas-header">
            <h5 class="offcanvas-title">Filters</h5>
            <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
          </div>
          <div class="offcanvas-body">
            <form id="filterForm">
              <div id="filterBody"></div>
              <div class="d-flex gap-2 mt-3">
                <button type="button" id="applyFiltersBtn" class="btn btn-primary">Apply Filters</button>
                <button type="button" id="resetFiltersBtn" class="btn btn-outline-secondary">Reset</button>
              </div>
            </form>
          </div>
        </div>
      `;

      // Append offcanvas to document body
      document.body.appendChild(offcanvasElement.firstElementChild);
      // Create Bootstrap offcanvas instance
      this.offcanvas = new bootstrap.Offcanvas("#filterOffcanvas");
      // Get reference to form body container
      this.formBody = $("#filterBody");
    },

    /**
     * Generate HTML string for a filter field based on its type
     * @param {Object} fieldConfiguration - Field configuration object with type, name, label, etc.
     * @returns {string} HTML string for the filter field
     */
    fieldHtml(fieldConfiguration) {
      // Switch based on field type
      switch (fieldConfiguration.type) {
        // Text input field
        case "text":
          // Return text input HTML with placeholder
          return `<input class="form-control" name="${fieldConfiguration.name}" placeholder="${
            fieldConfiguration.placeholder || ""
          }">`;

        // Number input field
        case "number":
          // Return number input HTML
          return `<input type="number" class="form-control" name="${fieldConfiguration.name}" placeholder="0">`;

        // Select dropdown field
        case "select":
          // Return select HTML with options
          return (
            `<select class="form-select" name="${fieldConfiguration.name}">` +
            // Map each option to option element
            (fieldConfiguration.options || [])
              .map((option) => {
                // Support both string options and object options with value/label
                if (typeof option === "object" && option.value !== undefined) {
                  return `<option value="${option.value}">${option.label || option.value}</option>`;
                }
                // Handle "Any" or empty string as special case for "All"
                const optionValue = option === "Any" || option === "" ? "" : option;
                const optionLabel = option === "Any" ? "All Statuses" : option;
                return `<option value="${optionValue}">${optionLabel}</option>`;
              })
              .join("") +
            `</select>`
          );

        // Radio button group
        case "radio":
          // Return div containing radio buttons
          return (
            `<div>` +
            (fieldConfiguration.options || [])
              .map(
                (option) => `
            <div class="form-check">
              <input class="form-check-input" type="radio" name="${fieldConfiguration.name}" id="${fieldConfiguration.name}-${option}" value="${option}">
              <label class="form-check-label" for="${fieldConfiguration.name}-${option}">${option}</label>
            </div>
          `
              )
              .join("") +
            `</div>`
          );

        // Checkbox or toggle switch
        case "check":
        case "toggle":
          // Return checkbox/toggle HTML with switch styling
          return `<div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" role="switch" name="${fieldConfiguration.name}" id="${fieldConfiguration.name}">
            <label class="form-check-label" for="${fieldConfiguration.name}">${fieldConfiguration.label}</label>
          </div>`;

        // Date input field
        case "date":
          // Return date input HTML
          return `<input type="date" class="form-control" name="${fieldConfiguration.name}">`;

        // Range slider input
        case "range":
          // Return range input HTML with min, max, step attributes
          return `<input type="range" class="form-range" name="${fieldConfiguration.name}" min="${
            fieldConfiguration.min || 0
          }" max="${fieldConfiguration.max || 100}" step="${fieldConfiguration.step || 1}">`;

        // Multiple checkboxes (checks)
        case "checks":
          // Return div containing multiple checkboxes
          return (
            `<div>` +
            (fieldConfiguration.options || [])
              .map(
                (option) => `
            <div class="form-check">
              <input class="form-check-input" type="checkbox" name="${fieldConfiguration.name}[]" id="${fieldConfiguration.name}-${option}" value="${option}">
              <label class="form-check-label" for="${fieldConfiguration.name}-${option}">${option}</label>
            </div>
          `
              )
              .join("") +
            `</div>`
          );

        // Default to text input
        default:
          // Return generic text input HTML
          return `<input class="form-control" name="${fieldConfiguration.name}">`;
      }
    },

    /**
     * Render filter form with all configured fields
     */
    render() {
      // Get current section name
      const currentSection = getSection();
      // Get filter field configurations for current section
      const filterFields =
        window.AdminConfig.filters && window.AdminConfig.filters[currentSection]
          ? window.AdminConfig.filters[currentSection]
          : [];

      // Generate HTML for all filter fields
      this.formBody.innerHTML = filterFields
        .map((fieldConfiguration) => {
          // Check if field is checkbox or toggle type
          if (fieldConfiguration.type === "check" || fieldConfiguration.type === "toggle") {
            // Return field HTML with minimal margin for toggle fields
            return `<div class="mb-2">${this.fieldHtml(fieldConfiguration)}</div>`;
          }
          // Return field HTML with label and standard margin
          return `<div class="mb-3"><label class="form-label">${
            fieldConfiguration.label
          }</label>${this.fieldHtml(fieldConfiguration)}</div>`;
        })
        .join("");

      // Restore previously saved filter values
      this.restoreValues();
    },

    /**
     * Restore saved filter values from state into form fields
     */
    restoreValues() {
      // Get current section name
      const currentSection = getSection();
      // Get saved filter values from state
      const savedFilterValues = getFilters(currentSection);

      // Iterate through each saved filter value
      Object.entries(savedFilterValues).forEach(([filterKey, filterValue]) => {
        // Check if value is an array (for multi-select checkboxes)
        if (Array.isArray(filterValue)) {
          // For each value in array, find and check corresponding checkbox
          filterValue.forEach((arrayValue) => {
            // Find checkbox element matching the key and value
            const checkboxElement = $(
              `#filterOffcanvas [name="${filterKey}[]"][value="${arrayValue}"]`
            );
            // Check the checkbox if element exists
            if (checkboxElement) checkboxElement.checked = true;
          });
          // Skip to next filter
          return;
        }

        // Find form element by name attribute
        const formElement = $(`#filterOffcanvas [name="${filterKey}"]`);
        // Skip if element not found
        if (!formElement) return;

        // Check if element is checkbox type
        if (formElement.type === "checkbox") {
          // Set checkbox checked state based on value
          formElement.checked = !!filterValue;
        } else if (formElement.type === "radio") {
          // Find radio button matching the value
          const radioButton = $(
            `#filterOffcanvas input[name="${filterKey}"][value="${filterValue}"]`
          );
          // Check the radio button if found
          if (radioButton) radioButton.checked = true;
        } else {
          // Set value for text, number, date, select inputs
          formElement.value = filterValue;
        }
      });
    },

    /**
     * Get filter values from form fields
     * @returns {Object} Object containing filter key-value pairs
     */
    getValues() {
      // Get current section name
      const currentSection = getSection();
      // Get filter field configurations for current section
      const filterFields =
        window.AdminConfig.filters && window.AdminConfig.filters[currentSection]
          ? window.AdminConfig.filters[currentSection]
          : [];

      // Initialize empty object for filter values
      const filterValues = {};

      // Iterate through each filter field
      filterFields.forEach((fieldConfiguration) => {
        // Check if field is multiple checkboxes type
        if (fieldConfiguration.type === "checks") {
          // Get all checked checkboxes
          const checkedCheckboxes = Array.from(
            document.querySelectorAll(
              `#filterOffcanvas [name="${fieldConfiguration.name}[]"]:checked`
            )
          );
          // Add to values if any are checked
          if (checkedCheckboxes.length) {
            // Map checked checkboxes to their values
            filterValues[fieldConfiguration.name] = checkedCheckboxes.map(
              (checkboxElement) => checkboxElement.value
            );
          }
          // Skip to next field
          return;
        }

        // Find form element by name attribute
        const formElement = $(`#filterOffcanvas [name="${fieldConfiguration.name}"]`);
        // Skip if element not found
        if (!formElement) return;

        // Check if field is checkbox or toggle type
        if (fieldConfiguration.type === "check" || fieldConfiguration.type === "toggle") {
          // Add to values only if checked
          if (formElement.checked) filterValues[fieldConfiguration.name] = true;
          // Skip to next field
          return;
        }

        // Check if field is radio button type
        if (fieldConfiguration.type === "radio") {
          // Find checked radio button
          const checkedRadioButton = $(
            `#filterOffcanvas input[name="${fieldConfiguration.name}"]:checked`
          );
          // Add to values if checked and value is not 'Any'
          if (
            checkedRadioButton &&
            checkedRadioButton.value &&
            checkedRadioButton.value !== "Any"
          ) {
            // Set filter value to radio button value
            filterValues[fieldConfiguration.name] = checkedRadioButton.value;
          }
          // Skip to next field
          return;
        }

        // Get element value
        let elementValue = formElement.value;
        // Check if field is number type
        if (fieldConfiguration.type === "number") {
          // Skip if value is empty
          if (elementValue === "") return;
          // Convert to number
          elementValue = Number(elementValue);
          // Skip if conversion resulted in NaN
          if (Number.isNaN(elementValue)) return;
        }

        // Skip if value is empty or default values
        if (elementValue === "" || elementValue === "All" || elementValue === "Any") return;
        // Add filter value to object
        filterValues[fieldConfiguration.name] = elementValue;
      });

      // Return collected filter values
      return filterValues;
    },

    /**
     * Reset all filter form fields to default/empty state
     */
    reset() {
      // Find all input and select elements in offcanvas
      document
        .querySelectorAll("#filterOffcanvas input, #filterOffcanvas select")
        .forEach((formElement) => {
          // Check if element is checkbox or radio type
          if (formElement.type === "checkbox" || formElement.type === "radio") {
            // Uncheck checkbox/radio
            formElement.checked = false;
          } else {
            // Clear value for text, number, date, select inputs
            formElement.value = "";
          }
        });
    },

    /**
     * Attach event listeners to filter panel elements
     */
    attachEvents() {
      // Add click listener to filter button
      this.filterBtn.addEventListener("click", () => {
        // Render filter form when button clicked
        this.render();
        // Show the offcanvas
        this.offcanvas.show();
      });

      // Add click listener to apply filters button
      $("#applyFiltersBtn").addEventListener("click", () => {
        // Get current section name
        const currentSection = getSection();
        // Get filter values from form
        const filterValues = this.getValues();
        // Save filters to state
        setFilters(currentSection, filterValues);

        // Dispatch custom event to notify other components of filter change
        document.body.dispatchEvent(new CustomEvent("filters:changed"));

        // Get page content element
        const pageContentElement = $("#pageContent");
        // Show loading spinner if page content exists
        if (pageContentElement) {
          // Set page content to loading spinner
          pageContentElement.innerHTML = `<div class="text-center py-5"><div class="spinner-border spinner-large"></div><div class="mt-3">Loading…</div></div>`;
        }

        // Hide the offcanvas
        this.offcanvas.hide();
        // Dispatch refresh event to reload data
        document.body.dispatchEvent(new CustomEvent("section:refresh"));
      });

      // Add click listener to reset filters button (in offcanvas)
      $("#resetFiltersBtn").addEventListener("click", () => {
        // Reset all form fields
        this.reset();
      });
    }
  };
})();
