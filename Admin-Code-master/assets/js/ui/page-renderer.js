/**
 * Page Renderer Utility
 * Unified renderer for all page types: simple tables, paginated, tabbed+paginated
 */

(function () {
  'use strict';

  /**
   * PageRenderer class
   */
  class PageRenderer {
    constructor(config) {
      // Validate config
      if (!config.section || !config.tableConfig) {
        throw new Error('PageRenderer: section and tableConfig are required');
      }

      this.config = config;
      this.section = config.section;
      this.tableConfig = config.tableConfig;
      this.pagination = config.pagination || { enabled: false };
      this.tabs = config.tabs || [];
      
      // State
      this.cursor = 0;
      this.total = 0;
      this.container = null;
      this.activeTab = this.tabs.length > 0 ? this.tabs[0].id : null;
      this.tabCounts = {};
      
      // Get utilities
      this.pageContent = window.AdminShell?.pageContent;
      this.renderChips = window.AdminShell?.renderChips;
      this.spinner = window.AdminUtils?.spinner;
      this.spinnerSmall = window.AdminUtils?.spinnerSmall;
      this.errorMessage = window.AdminUtils?.errorMessage;

      if (!this.pageContent) {
        throw new Error('PageRenderer: AdminShell not ready');
      }

      // Initialize tab counts
      this.tabs.forEach(tab => {
        this.tabCounts[tab.id] = 0;
      });
    }

    /**
     * Initialize and render the page
     */
    async init() {
      this.reset();
      await this.render(false);
      this.attachEventListeners();
    }

    /**
     * Reset pagination state
     */
    reset() {
      this.cursor = 0;
      this.total = 0;
      this.container = null;
    }

    /**
     * Get active filters including tab status
     */
    getActiveFilters() {
      const filters = { ...(window.AdminState.activeFilters[this.section] || {}) };
      
      // Apply tab status filter if tabs are configured
      if (this.tabs.length > 0) {
        const currentTab = this.tabs.find(t => t.id === this.activeTab);
        if (currentTab && currentTab.statusFilter) {
          filters.status = currentTab.statusFilter;
        } else if (currentTab && !currentTab.statusFilter) {
          delete filters.status;
        }
      }
      
      return filters;
    }

    /**
     * Render tabs HTML
     */
    renderTabsHtml() {
      if (this.tabs.length === 0 || !window.Tabs) return '';
      
      return window.Tabs.create({
        containerId: `${this.section}-tabs`,
        marginBottom: "mb-3",
        tabs: this.tabs.map(tab => ({
          id: `tab-${tab.id}`,
          label: tab.label,
          count: this.tabCounts[tab.id] || 0,
          targetId: `${this.section}-content`,
          active: this.activeTab === tab.id,
          onClick: "handlePageTabClick"
        }))
      });
    }

    /**
     * Update tab labels with counts
     */
    updateTabLabels() {
      if (this.tabs.length === 0 || !window.Tabs) return;
      
      this.tabs.forEach(tab => {
        window.Tabs.updateCount(`tab-${tab.id}`, this.tabCounts[tab.id]);
      });
    }

    /**
     * Refresh tab counts
     */
    async refreshTabCounts() {
      if (this.tabs.length === 0) return;

      try {
        const baseFilters = { ...(window.AdminState.activeFilters[this.section] || {}) };
        delete baseFilters.status; // Remove status to get counts per tab

        const countPromises = this.tabs.map(async (tab) => {
          const filters = { ...baseFilters };
          if (tab.statusFilter) {
            filters.status = tab.statusFilter;
          }
          const count = await window.ApiService.getTotalCount(this.section, filters);
          return { tabId: tab.id, count: count || 0 };
        });

        const results = await Promise.all(countPromises);
        results.forEach(({ tabId, count }) => {
          this.tabCounts[tabId] = count;
        });

        this.updateTabLabels();
      } catch (err) {
        console.warn(`[PageRenderer] Could not refresh tab counts:`, err);
      }
    }

    /**
     * Attach filter chip removal handlers
     */
    attachChipHandlers(chipsElement) {
      if (!chipsElement) return;

      chipsElement.querySelectorAll(".filter-chip .btn-close").forEach((closeBtn) => {
        closeBtn.addEventListener("click", () => {
          const filterKey = closeBtn.closest(".filter-chip")?.getAttribute("data-chip");
          if (!filterKey) return;

          const filters = window.AdminState.activeFilters[this.section] || {};
          delete filters[filterKey];
          window.AdminState.activeFilters[this.section] = filters;

          this.reset();
          this.render(false);
        });
      });
    }

    /**
     * Main render function
     * @param {boolean} shouldAppend - Whether to append (load more) or replace
     */
    async render(shouldAppend = false) {
      // Show loading state
      if (!shouldAppend) {
        this.pageContent.innerHTML = this.spinner();
        this.container = document.createElement("div");
      } else {
        const loadMoreWrap = document.querySelector("#loadMoreWrap");
        if (loadMoreWrap) {
          loadMoreWrap.innerHTML = this.spinnerSmall();
        }
      }

      try {
        const activeFilters = this.getActiveFilters();
        
        // Determine pagination settings
        const limit = this.pagination.enabled 
          ? (this.pagination.pageSize || 20)
          : 999;

        // Fetch data and total count
        const [apiResponse, totalCount] = await Promise.all([
          window.DataService.get(this.section, {
            filters: activeFilters,
            pagination: { limit, offset: this.cursor }
          }),
          window.ApiService.getTotalCount(this.section, activeFilters)
        ]);

        const dataItems = apiResponse.items || [];
        this.total = totalCount !== null ? totalCount : (apiResponse.total || dataItems.length);

        // Calculate pagination info
        const startIndex = this.cursor + 1;
        const endIndex = Math.min(this.cursor + dataItems.length, this.total);
        const currentPageNumber = this.pagination.enabled ? Math.floor(this.cursor / limit) + 1 : null;

        // Initial render setup
        if (!shouldAppend) {
          this.pageContent.innerHTML = "";
          this.pageContent.appendChild(this.container);

          // Add tabs if configured
          if (this.tabs.length > 0) {
            const tabsHtml = this.renderTabsHtml();
            const tabsWrapper = document.createElement("div");
            tabsWrapper.innerHTML = tabsHtml;
            this.container.appendChild(tabsWrapper);
            window.Tabs.init();
            this.refreshTabCounts();
          }

          // Add chips
          const chipsWrapper = document.createElement("div");
          chipsWrapper.id = "chipsWrap";
          chipsWrapper.className = "filter-chips";
          chipsWrapper.innerHTML = this.renderChips(this.section);
          this.container.appendChild(chipsWrapper);
          this.attachChipHandlers(chipsWrapper);
        }

        // Render table
        if (this.pagination.enabled) {
          // Paginated mode: create new table block for each page
          const tableHtml = window.Table.create(this.tableConfig, dataItems);
          const countNotice = window.Table.createCountNotice(startIndex, endIndex, this.total, currentPageNumber);
          
          const contentBlock = document.createElement("div");
          contentBlock.className = "mb-4 table-content-block";
          contentBlock.innerHTML = countNotice + tableHtml;
          this.container.appendChild(contentBlock);
          
          window.Table.init();

          // Add/update load more button
          let loadMoreWrap = this.pageContent.querySelector("#loadMoreWrap");
          if (!loadMoreWrap) {
            loadMoreWrap = Object.assign(document.createElement("div"), {
              id: "loadMoreWrap",
              className: "d-grid my-3"
            });
            this.pageContent.appendChild(loadMoreWrap);
          }

          const hasMore = apiResponse.nextCursor !== null || (this.cursor + dataItems.length < this.total);
          const loadMoreHtml = window.Table.createLoadMoreControls({ disabled: !hasMore });
          loadMoreWrap.innerHTML = loadMoreHtml;

          const loadMoreBtn = loadMoreWrap.querySelector("#loadMoreBtn");
          if (loadMoreBtn) {
            loadMoreBtn.onclick = () => {
              if (hasMore) {
                this.cursor = apiResponse.nextCursor || (this.cursor + limit);
                this.render(true);
              }
            };
            
            if (!hasMore) {
              loadMoreBtn.textContent = "No more results";
              loadMoreBtn.disabled = true;
            }
          }
        } else {
          // Simple mode: single table, no pagination
          const tableHtml = window.Table.create(this.tableConfig, dataItems);
          this.container.innerHTML += tableHtml;
          window.Table.init();
        }

      } catch (error) {
        if (!shouldAppend) {
          this.pageContent.innerHTML = this.errorMessage(error);
        } else {
          const loadMoreWrap = document.querySelector("#loadMoreWrap");
          if (loadMoreWrap) {
            loadMoreWrap.innerHTML = this.errorMessage(error, "Failed to load more");
          }
        }
        console.error(`[PageRenderer] Error rendering ${this.section}:`, error);
      }
    }

    /**
     * Handle tab click
     */
    handleTabClick(tabId) {
      const tab = this.tabs.find(t => `tab-${t.id}` === tabId);
      if (!tab) return;

      this.activeTab = tab.id;
      
      // Update filters
      const filters = window.AdminState.activeFilters[this.section] || {};
      if (tab.statusFilter) {
        filters.status = tab.statusFilter;
      } else {
        delete filters.status;
      }
      window.AdminState.activeFilters[this.section] = filters;

      // Reset and re-render
      this.reset();
      this.render(false);
    }

    /**
     * Attach global event listeners
     */
    attachEventListeners() {
      // Listen for refresh events
      document.body.addEventListener("section:refresh", () => {
        this.reset();
        this.render(false);
      });

      document.body.addEventListener("env:changed", () => {
        this.reset();
        this.render(false);
      });

      // Handle table sorting
      document.body.addEventListener("table:sort", (e) => {
        const { tableId, column, direction } = e.detail;
        if (tableId !== this.tableConfig.id) return;

        // For simple (non-paginated) mode, re-sort and re-render tbody
        if (!this.pagination.enabled) {
          // This requires storing currentData - for now, just re-fetch
          this.render(false);
        }
      });
    }
  }

  // Global tab click handler
  window.handlePageTabClick = (targetId, button) => {
    const tabId = button.id;
    if (window.currentPageRenderer) {
      window.currentPageRenderer.handleTabClick(tabId);
    }
  };

  // Expose PageRenderer
  window.PageRenderer = {
    /**
     * Initialize a page with configuration
     * @param {Object} config - Page configuration
     * @returns {PageRenderer} Renderer instance
     */
    init(config) {
      const renderer = new PageRenderer(config);
      window.currentPageRenderer = renderer; // Store for tab handler
      renderer.init();
      return renderer;
    }
  };
})();

