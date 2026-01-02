/**
 * Bootstrap Tabs Utility
 * Reusable tab component using Bootstrap 5 nav-tabs
 * Supports data attributes for configuration
 */

(function () {
  'use strict';

  /**
   * Initialize tabs with data attributes
   * Looks for elements with data-tabs-container attribute
   */
  function initTabs() {
    // Find all tab containers
    const tabContainers = document.querySelectorAll('[data-tabs-container]');
    
    tabContainers.forEach((container) => {
      // Find all tab buttons within this container
      const tabButtons = container.querySelectorAll('[data-tab-target]');
      
      tabButtons.forEach((button) => {
        // Add click event listener
        button.addEventListener('click', (e) => {
          e.preventDefault();
          
          // Get target content ID from data attribute
          const targetId = button.getAttribute('data-tab-target');
          if (!targetId) return;
          
          // Get click handler function name (optional)
          const clickHandler = button.getAttribute('data-tab-click');
          
          // Get all tabs and panes in this container
          const allTabs = container.querySelectorAll('[data-tab-target]');
          const allPanes = container.closest('.app-main')?.querySelectorAll('.tab-pane') ||
                          document.querySelectorAll('.tab-pane');
          
          // Remove active class from all tabs
          allTabs.forEach((tab) => {
            tab.classList.remove('active');
          });
          
          // Remove active and show classes from all panes
          allPanes.forEach((pane) => {
            pane.classList.remove('active', 'show');
          });
          
          // Add active class to clicked tab
          button.classList.add('active');
          
          // Add active and show classes to target pane
          const targetPane = document.getElementById(targetId);
          if (targetPane) {
            targetPane.classList.add('active', 'show');
          }
          
          // Call custom click handler if provided
          if (clickHandler && typeof window[clickHandler] === 'function') {
            window[clickHandler](targetId, button);
          }
        });
      });
    });
  }

  /**
   * Create tab HTML structure
   * @param {Object} config - Tab configuration
   * @param {string} config.containerId - Container ID for tabs
   * @param {string} [config.marginBottom] - Margin bottom class (default: "mb-4")
   * @param {Array} config.tabs - Array of tab objects with {id, label, count, targetId, active, onClick}
   * @returns {string} HTML string for tabs
   */
  function createTabs(config) {
    const { containerId, tabs, marginBottom = 'mb-4' } = config;
    
    // Check if any tab has explicit active state
    const hasExplicitActive = tabs.some(tab => tab.active === true);
    
    const tabsHtml = tabs.map((tab, index) => {
      // Only default to first tab if no tab has explicit active state
      const isActive = hasExplicitActive 
        ? (tab.active === true)
        : (tab.active || index === 0);
      const activeClass = isActive ? 'active' : '';
      const onClickAttr = tab.onClick ? `data-tab-click="${tab.onClick}"` : '';
      // Build label with count if provided
      const labelText = typeof tab.count !== 'undefined' && tab.count !== null
        ? `${tab.label} (${tab.count})`
        : tab.label;
      
      return `
        <li class="nav-item" role="presentation">
          <button 
            class="nav-link ${activeClass}" 
            id="${tab.id}" 
            type="button" 
            role="tab"
            data-tab-target="${tab.targetId}"
            ${onClickAttr}
          >
            ${labelText}
          </button>
        </li>
      `;
    }).join('');
    
    return `
      <ul class="nav nav-tabs ${marginBottom}" role="tablist" data-tabs-container="${containerId || 'tabs-container'}">
        ${tabsHtml}
      </ul>
    `;
  }

  /**
   * Update tab label text
   * @param {string} tabId - Tab button ID to update
   * @param {string} newLabel - New label text
   */
  function updateLabel(tabId, newLabel) {
    const tabButton = document.getElementById(tabId);
    if (tabButton) {
      // Get current count if exists (from text like "All (5)")
      const currentText = tabButton.textContent.trim();
      const countMatch = currentText.match(/\((\d+)\)$/);
      const currentCount = countMatch ? countMatch[1] : null;
      
      // Update label, preserving count if it existed
      if (currentCount !== null) {
        tabButton.textContent = `${newLabel} (${currentCount})`;
      } else {
        tabButton.textContent = newLabel;
      }
    }
  }

  /**
   * Update tab count in label
   * @param {string} tabId - Tab button ID to update
   * @param {number|string} newCount - New count value
   */
  function updateCount(tabId, newCount) {
    const tabButton = document.getElementById(tabId);
    if (tabButton) {
      // Get current label (text before count)
      const currentText = tabButton.textContent.trim();
      const labelMatch = currentText.match(/^(.+?)(?:\s*\(\d+\))?$/);
      const baseLabel = labelMatch ? labelMatch[1].trim() : currentText;
      
      // Update with new count
      tabButton.textContent = `${baseLabel} (${newCount})`;
    }
  }

  /**
   * Update tab label and count together
   * @param {string} tabId - Tab button ID to update
   * @param {string} newLabel - New label text
   * @param {number|string} newCount - New count value
   */
  function updateLabelAndCount(tabId, newLabel, newCount) {
    const tabButton = document.getElementById(tabId);
    if (tabButton) {
      tabButton.textContent = `${newLabel} (${newCount})`;
    }
  }

  /**
   * Activate a specific tab by ID
   * @param {string} tabId - Tab button ID to activate
   */
  function activateTab(tabId) {
    const tabButton = document.getElementById(tabId);
    if (tabButton && tabButton.hasAttribute('data-tab-target')) {
      tabButton.click();
    }
  }

  // Initialize tabs on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTabs);
  } else {
    // DOM already loaded
    initTabs();
  }

  // Re-initialize tabs after dynamic content is added
  document.addEventListener('adminshell:ready', initTabs);
  
  // Also listen for custom event to re-initialize tabs
  document.addEventListener('tabs:reinit', initTabs);

  // Expose API to window
  window.Tabs = {
    init: initTabs,
    create: createTabs,
    activate: activateTab,
    updateLabel: updateLabel,
    updateCount: updateCount,
    updateLabelAndCount: updateLabelAndCount
  };
})();

