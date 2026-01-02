/**
 * Dynamic Table Generator
 * Reusable table component with sorting, formatting, actions, and pagination support
 */

(function () {
  'use strict';

  // Store sort state per table
  const sortStates = new Map(); // tableId -> { column, direction }

  /**
   * Built-in formatters
   */
  const formatters = {
    date: (value) => {
      if (!value) return '-';
      try {
        return new Date(value).toLocaleDateString();
      } catch (e) {
        return value;
      }
    },
    datetime: (value) => {
      if (!value) return '-';
      try {
        return new Date(value).toLocaleString();
      } catch (e) {
        return value;
      }
    },
    currency: (value) => {
      if (value == null) return '-';
      return `$${Number(value).toFixed(2)}`;
    },
    boolean: (value) => {
      if (value == null) return '-';
      return value ? 'Yes' : 'No';
    },
    badge: (value, colorMap) => {
      if (!value) return '-';
      const colors = colorMap || {
        pending: 'warning',
        approved: 'success',
        rejected: 'danger',
        active: 'success',
        inactive: 'secondary'
      };
      const color = colors[value.toLowerCase()] || 'secondary';
      return `<span class="badge bg-${color}">${value}</span>`;
    }
  };

  /**
   * Get sort state for a table
   * @param {string} tableId - Table ID
   * @returns {Object} Sort state { column, direction }
   */
  function getSortState(tableId) {
    return sortStates.get(tableId) || { column: null, direction: null };
  }

  /**
   * Set sort state for a table
   * @param {string} tableId - Table ID
   * @param {string|null} column - Column field name
   * @param {string|null} direction - Sort direction ('asc', 'desc', or null)
   */
  function setSortState(tableId, column, direction) {
    sortStates.set(tableId, { column, direction });
  }

  /**
   * Sort data array client-side
   * @param {Array} data - Data array to sort
   * @param {string} column - Column field name
   * @param {string} direction - Sort direction ('asc' or 'desc')
   * @returns {Array} Sorted data array
   */
  function sortData(data, column, direction) {
    if (!column || !direction || !data || !Array.isArray(data)) return data;

    const sorted = [...data].sort((a, b) => {
      let aVal = a[column];
      let bVal = b[column];

      // Handle null/undefined
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Number comparison
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Date comparison
      if (aVal instanceof Date || bVal instanceof Date || 
          (typeof aVal === 'string' && !isNaN(Date.parse(aVal))) ||
          (typeof bVal === 'string' && !isNaN(Date.parse(bVal)))) {
        const aDate = new Date(aVal);
        const bDate = new Date(bVal);
        return direction === 'asc' ? aDate - bDate : bDate - aDate;
      }

      // String comparison (case-insensitive)
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (direction === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });

    return sorted;
  }

  /**
   * Format cell value using formatter
   * @param {*} value - Cell value
   * @param {Object} row - Full row data
   * @param {Object} column - Column config
   * @returns {string} Formatted HTML
   */
  function formatCell(value, row, column) {
    if (column.formatter) {
      if (typeof column.formatter === 'string') {
        // Built-in formatter by name
        const formatter = formatters[column.formatter];
        if (formatter) {
          return formatter(value, column.colorMap);
        }
      } else if (typeof column.formatter === 'function') {
        // Custom formatter function
        return column.formatter(value, row);
      }
    }
    // Default: escape HTML, capitalize first letter, and return as string
    if (value == null) return '-';
    const str = String(value);
    // Capitalize first letter for text values (skip if it's a number, URL, or already formatted)
    if (str && str.length > 0) {
      // Skip capitalization for numbers, URLs, emails, or values that look like IDs
      if (/^\d+$/.test(str) || /^https?:\/\//.test(str) || /@/.test(str) || /^[a-f0-9-]{36}$/i.test(str)) {
        return str;
      }
      // Capitalize first letter and lowercase the rest
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }
    return str;
  }

  /**
   * Render table header with sort indicators
   * @param {Array} columns - Column configurations
   * @param {string} tableId - Table ID for sort state
   * @param {Array} actions - Action configurations (to determine if Actions column exists)
   * @returns {string} HTML string for thead
   */
  function renderHeader(columns, tableId, actions) {
    const sortState = getSortState(tableId);
    
    let headerCells = columns.map((col, index) => {
      const isSortable = col.sortable === true;
      const isActive = sortState.column === col.field;
      let sortIcon = '';
      
      if (isSortable) {
        if (isActive) {
          sortIcon = sortState.direction === 'asc' ? ' ↑' : ' ↓';
        } else {
          sortIcon = ' ↕';
        }
      }
      
      const sortClass = isActive ? `sort-${sortState.direction}` : '';
      const sortableAttr = isSortable ? `data-sortable="${col.field}"` : '';
      const cursorStyle = isSortable ? 'style="cursor: pointer;"' : '';
      const isLast = index === columns.length - 1 && (!actions || actions.length === 0);
      const borderRight = isLast ? 'style="border-right: 1px solid #dee2e6;"' : '';
      
      return `<th class="${sortClass}" ${sortableAttr} ${cursorStyle} ${borderRight}>${col.label}${sortIcon}</th>`;
    }).join('');
    
    // Add Actions header if actions are defined
    if (actions && actions.length > 0) {
      headerCells += '<th style="border-right: 1px solid #dee2e6;">Actions</th>';
    }

    return `<thead class="table-light"><tr>${headerCells}</tr></thead>`;
  }

  /**
   * Render action buttons/dropdowns
   * @param {Array} actions - Action configurations
   * @param {Object} row - Row data
   * @returns {string} HTML string for actions cell
   */
  function renderActions(actions, row) {
    if (!actions || actions.length === 0) return '';

    const actionButtons = actions
      .filter(action => {
        // Check condition if provided
        if (action.condition && typeof action.condition === 'function') {
          return action.condition(row);
        }
        return true;
      })
      .map(action => {
        if (action.type === 'dropdown') {
          // Dropdown menu
          const dropdownItems = (action.items || [])
            .filter(item => {
              if (item.type === 'divider') return true;
              if (item.condition && typeof item.condition === 'function') {
                return item.condition(row);
              }
              return true;
            })
            .map(item => {
              if (item.type === 'divider') {
                return '<li><hr class="dropdown-divider"></li>';
              }
              const className = item.className || '';
              const onClickAttr = item.onClick 
                ? `data-action="${item.onClick}" data-row-data='${encodeURIComponent(JSON.stringify(row))}'`
                : '';
              return `<li><a class="dropdown-item ${className}" href="#" ${onClickAttr}>${item.label}</a></li>`;
            })
            .join('');

          return `
            <div class="dropdown">
              <button class="btn btn-sm btn-primary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                ${action.label || 'Actions'}
              </button>
              <ul class="dropdown-menu">${dropdownItems}</ul>
            </div>
          `;
        } else {
          // Simple button
          const className = action.className || 'btn btn-sm btn-primary';
          const onClickAttr = action.onClick 
            ? `data-action="${action.onClick}" data-row-data='${encodeURIComponent(JSON.stringify(row))}'`
            : '';
          const confirmAttr = action.confirm 
            ? `data-confirm="${action.confirm}"`
            : '';
          
          return `<button class="${className}" ${onClickAttr} ${confirmAttr}>${action.label}</button>`;
        }
      })
      .join(' ');

    return `<td>${actionButtons}</td>`;
  }

  /**
   * Render table rows (just <tr> elements, no <tbody> wrapper)
   * @param {Array} columns - Column configurations
   * @param {Array} data - Data array
   * @param {Array} actions - Action configurations
   * @returns {string} HTML string for rows
   */
  function renderRows(columns, data, actions) {
    if (!data || data.length === 0) return '';

    return data.map(row => {
      const cells = columns.map(col => {
        const value = row[col.field];
        const formatted = formatCell(value, row, col);
        return `<td>${formatted}</td>`;
      }).join('');

      const actionsCell = actions ? renderActions(actions, row) : '';
      return `<tr>${cells}${actionsCell}</tr>`;
    }).join('');
  }

  /**
   * Render table body with rows
   * @param {Array} columns - Column configurations
   * @param {Array} data - Data array
   * @param {Array} actions - Action configurations
   * @returns {string} HTML string for tbody
   */
  function renderBody(columns, data, actions) {
    const rows = renderRows(columns, data, actions);
    if (!rows) {
      return '<tbody><tr><td colspan="100%" class="text-center text-muted">No data</td></tr></tbody>';
    }
    return `<tbody>${rows}</tbody>`;
  }

  /**
   * Create complete table HTML
   * @param {Object} config - Table configuration
   * @param {string} config.id - Table ID
   * @param {Array} config.columns - Column definitions
   * @param {Array} [config.actions] - Action button definitions
   * @param {Object} [config.options] - Table options
   * @param {Array} data - Data array to render
   * @returns {string} Complete table HTML
   */
  function createTable(config, data) {
    const { id, columns, actions, options = {} } = config;
    
    console.log('[Table.create] Creating table:', id, 'with', data?.length, 'items');
    
    if (!id || !columns || !Array.isArray(columns)) {
      console.error('Table.create: Invalid config. Required: id, columns (array)');
      return '';
    }

    // Apply sorting if sort state exists
    const sortState = getSortState(id);
    let sortedData = data || [];
    console.log('[Table.create] Before sorting:', sortedData.length, 'items');
    if (sortState.column && sortState.direction) {
      sortedData = sortData(sortedData, sortState.column, sortState.direction);
      console.log('[Table.create] After sorting:', sortedData.length, 'items');
    }

    // Build table classes
    const tableClasses = [
      'table',
      options.striped === true ? 'table-striped' : '',
      options.bordered !== false ? 'table-bordered' : '',
      options.hover !== false ? 'table-hover' : '',
      'mb-0'
    ].filter(Boolean).join(' ');

    // Render header and body
    const header = renderHeader(columns, id, actions);
    console.log('[Table.create] Rendering body with', sortedData.length, 'items');
    const body = renderBody(columns, sortedData, actions);
    console.log('[Table.create] Body HTML generated');

    // Build table HTML
    const tableHtml = `<table class="${tableClasses}" id="${id}">${header}${body}</table>`;

    // Wrap in card if responsive option is set
    if (options.responsive !== false) {
      return `
        <div class="card table-card">
          <div class="card-body p-0" style="overflow-x: auto;">
            ${tableHtml}
          </div>
        </div>
      `;
    }

    return tableHtml;
  }

  /**
   * Create only table rows HTML (for pagination append)
   * @param {Object} config - Table configuration
   * @param {Array} data - Data array to render
   * @returns {string} HTML string for rows only
   */
  function createRows(config, data) {
    const { columns, actions } = config;
    
    if (!columns || !Array.isArray(columns)) {
      console.error('Table.createRows: Invalid config. Required: columns (array)');
      return '';
    }

    // Apply sorting if sort state exists
    const sortState = getSortState(config.id);
    let sortedData = data || [];
    if (sortState.column && sortState.direction) {
      sortedData = sortData(sortedData, sortState.column, sortState.direction);
    }

    return renderRows(columns, sortedData, actions);
  }

  /**
   * Create count notice HTML
   * @param {number} startIndex - Starting index
   * @param {number} endIndex - Ending index
   * @param {number|null} total - Total count (optional)
   * @param {number|null} pageNumber - Page number (optional)
   * @returns {string} HTML string for notice
   */
  function createCountNotice(startIndex, endIndex, total, pageNumber) {
    if (total === null || total === undefined) {
      return `<div class="notice">Showing: ${startIndex}–${endIndex}</div>`;
    }
    if (pageNumber !== null && pageNumber !== undefined) {
      return `<div class="notice">Showing: ${startIndex}–${endIndex} of ${total} (Page ${pageNumber})</div>`;
    }
    return `<div class="notice">Showing: ${startIndex}–${endIndex} of ${total}</div>`;
  }

  /**
   * Create load more button HTML
   * @param {Object} options - Button options
   * @param {boolean} [options.disabled] - Whether button is disabled
   * @param {boolean} [options.loading] - Whether button shows loading state
   * @param {string} [options.text] - Button text
   * @returns {string} HTML string for button
   */
  function createLoadMoreButton(options = {}) {
    const { disabled = false, loading = false, text = "Load more" } = options;
    
    if (loading) {
      const spinner = window.AdminUtils?.spinnerSmall ? window.AdminUtils.spinnerSmall() : 'Loading...';
      return `<button id="loadMoreBtn" class="btn btn-outline-primary" disabled>${spinner}</button>`;
    }
    
    if (disabled) {
      return `<button id="loadMoreBtn" class="btn btn-outline-primary" disabled>No more results</button>`;
    }
    
    return `<button id="loadMoreBtn" class="btn btn-outline-primary">${text}</button>`;
  }

  /**
   * Create load more controls wrapper with button
   * @param {Object} options - Button options
   * @returns {string} HTML string for controls wrapper
   */
  function createLoadMoreControls(options = {}) {
    const button = createLoadMoreButton(options);
    return `<div id="loadMoreWrap" class="d-grid my-3">${button}</div>`;
  }

  /**
   * Attach sort handlers to table headers
   * @param {string} tableId - Table ID
   */
  function attachSortHandlers(tableId) {
    const table = document.querySelector(`#${tableId}`);
    if (!table) return;
    
    table.querySelectorAll('th[data-sortable]').forEach(header => {
      header.style.cursor = 'pointer';
      header.addEventListener('click', () => {
        const column = header.getAttribute('data-sortable');
        const currentState = getSortState(tableId);
        
        // Toggle: none -> asc -> desc -> none
        let newDirection = 'asc';
        if (currentState.column === column) {
          if (currentState.direction === 'asc') newDirection = 'desc';
          else if (currentState.direction === 'desc') newDirection = null;
        }
        
        if (newDirection) {
          setSortState(tableId, column, newDirection);
          // Dispatch event for page script to handle
          document.body.dispatchEvent(new CustomEvent('table:sort', {
            detail: { tableId, column, direction: newDirection }
          }));
        } else {
          // Reset to unsorted
          setSortState(tableId, null, null);
          document.body.dispatchEvent(new CustomEvent('table:sort', {
            detail: { tableId, column: null, direction: null }
          }));
        }
      });
    });
  }

  /**
   * Attach row selection handlers
   * @param {string} tableId - Table ID
   */
  function attachRowSelectionHandlers(tableId) {
    const table = document.querySelector(`#${tableId}`);
    if (!table) return;

    // Handle row clicks for selection - clicking ANYTHING in a row selects it
    table.addEventListener('click', (e) => {
      // Don't select if clicking on sortable headers (those handle sorting)
      if (e.target.closest('th[data-sortable]')) {
        return;
      }

      // Don't handle selection for action buttons - they handle their own selection
      if (e.target.closest('[data-reveal-content], [data-view-all], [data-action], [data-lookup-user]')) {
        return;
      }

      // Find the row that was clicked (could be any cell, button, link, etc.)
      const row = e.target.closest('tbody tr');
      if (!row) return;

      // Check if this row is already selected
      const isCurrentlySelected = row.classList.contains('row-selected');

      // Remove selection from all rows in this table
      table.querySelectorAll('tbody tr').forEach(r => {
        r.classList.remove('row-selected');
      });

      // Toggle selection: if it was already selected, deselect it; otherwise select it
      if (!isCurrentlySelected) {
        row.classList.add('row-selected');
      }
    });
  }

  /**
   * Attach action button handlers
   * @param {string} tableId - Table ID
   */
  function attachActionHandlers(tableId) {
    const table = document.querySelector(`#${tableId}`);
    if (!table) return;

    // Handle action buttons
    table.addEventListener('click', (e) => {
      const actionButton = e.target.closest('[data-action]');
      if (!actionButton) return;

      e.preventDefault();
      const actionName = actionButton.getAttribute('data-action');
      const rowDataStr = actionButton.getAttribute('data-row-data');
      const confirmMsg = actionButton.getAttribute('data-confirm');

      if (!rowDataStr) return;

      try {
        const rowData = JSON.parse(decodeURIComponent(rowDataStr));

        // Check for confirmation
        if (confirmMsg) {
          if (!confirm(confirmMsg)) return;
        }

        // Call handler function if it exists
        if (actionName && typeof window[actionName] === 'function') {
          window[actionName](rowData);
        } else {
          console.warn(`Table: Action handler "${actionName}" not found`);
        }
      } catch (err) {
        console.error('Table: Error parsing row data', err);
      }
    });
  }

  /**
   * Initialize event handlers for all tables
   */
  function init() {
    // Find all tables with IDs
    document.querySelectorAll('table[id]').forEach(table => {
      const tableId = table.id;
      attachSortHandlers(tableId);
      attachActionHandlers(tableId);
      attachRowSelectionHandlers(tableId);
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-initialize after dynamic content is added
  document.addEventListener('adminshell:ready', init);
  document.addEventListener('table:reinit', init);

  // Expose API to window
  window.Table = {
    create: createTable,
    createRows: createRows,
    createCountNotice: createCountNotice,
    createLoadMoreButton: createLoadMoreButton,
    createLoadMoreControls: createLoadMoreControls,
    sortData: sortData,
    getSortState: getSortState,
    setSortState: setSortState,
    init: init,
    formatters: formatters
  };
})();

