/**
 * Processing Utility
 * Global utility for showing processing/saving overlays and success toasts
 */

(function () {
  'use strict';

  /**
   * Show processing overlay with spinner
   * @param {string} message - Optional message to display
   * @param {HTMLElement} container - Optional container to show spinner inside (if not provided, shows global overlay)
   * @returns {Function} Function to hide the overlay
   */
  function showProcessing(message = "Processing...", container = null) {
    // Remove any existing overlay
    const existing = document.getElementById("processing-overlay");
    if (existing) {
      existing.remove();
    }

    // Create overlay
    const overlay = document.createElement("div");
    overlay.id = "processing-overlay";
    
    if (container) {
      // Show inside container (relative positioning)
      container.style.position = "relative";
      overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 255, 255, 0.9);
        z-index: 1000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-radius: 0.375rem;
      `;
      container.appendChild(overlay);
    } else {
      // Show global overlay (fixed positioning)
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 255, 255, 0.9);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      `;
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="spinner-border spinner-large" style="width: 3rem; height: 3rem; border-width: 0.3rem;"></div>
      <div class="mt-3" style="font-size: 1.1rem; color: #475569;">${message}</div>
    `;

    // Return function to hide overlay
    return function hideProcessing() {
      if (overlay && overlay.parentNode) {
        overlay.remove();
      }
    };
  }

  /**
   * Close all Bootstrap modals
   */
  function closeAllModals() {
    // Get all Bootstrap modal instances and close them
    const modals = document.querySelectorAll('.modal.show, .modal[style*="display"]');
    modals.forEach(modalEl => {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) {
        modal.hide();
      } else {
        // Fallback: manually hide modal
        modalEl.classList.remove('show');
        modalEl.style.display = 'none';
        document.body.classList.remove('modal-open');
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
          backdrop.remove();
        }
      }
    });

    // Also close offcanvas if any are open
    const offcanvases = document.querySelectorAll('.offcanvas.show');
    offcanvases.forEach(offcanvasEl => {
      const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl);
      if (offcanvas) {
        offcanvas.hide();
      }
    });
  }

  /**
   * Show success toast in bottom right or inside container
   * @param {string} message - Success message
   * @param {number} duration - Duration in milliseconds (default: 3000, set to 0 or null to disable auto-close)
   * @param {HTMLElement} container - Optional container to show toast inside (if not provided, shows in bottom right)
   * @param {boolean} closeModals - Whether to close all modals (default: true, set to false if showing in container)
   */
  function showSuccessToast(message, duration = 3000, container = null, closeModals = true) {
    // Close all modals before showing success (unless showing inside container)
    // If container is provided, NEVER close modals - user should see the success message
    if (closeModals && !container) {
      closeAllModals();
    }
    // Explicitly do nothing if container is provided - modals must stay open

    // Remove any existing toast
    const existing = document.getElementById("success-toast");
    if (existing) {
      existing.remove();
    }

    // Create toast
    const toast = document.createElement("div");
    toast.id = "success-toast";
    toast.className = "alert alert-success alert-dismissible fade show";
    
    if (container) {
      // Show inside container - don't auto-close, manual close only
      toast.style.cssText = `
        margin: 1rem 0 0 0;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      `;
      container.appendChild(toast);
      // Don't set auto-remove timeout when in container - manual close only
    } else {
      // Show in bottom right (global) - auto-close after duration
      let toastContainer = document.getElementById("toast-container");
      if (!toastContainer) {
        toastContainer = document.createElement("div");
        toastContainer.id = "toast-container";
        toastContainer.style.cssText = `
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 10000;
          display: flex;
          flex-direction: column;
          gap: 10px;
        `;
        document.body.appendChild(toastContainer);
      }
      
      toast.style.cssText = `
        min-width: 300px;
        max-width: 500px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        margin: 0;
      `;
      toastContainer.appendChild(toast);
      
      // Auto-remove after duration (only for global toasts)
      if (duration && duration > 0) {
        setTimeout(() => {
          if (toast && toast.parentNode) {
            toast.classList.remove("show");
            setTimeout(() => {
              if (toast && toast.parentNode) {
                toast.remove();
              }
            }, 150); // Wait for fade animation
          }
        }, duration);
      }
    }

    toast.innerHTML = `
      <div class="d-flex align-items-center">
        <i class="bi bi-check-circle-fill me-2 fs-5"></i>
        <div class="flex-grow-1">${message}</div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
  }

  /**
   * Show error notice (Bootstrap alert)
   * @param {string} message - Error message
   * @param {string} title - Optional title (default: "Error")
   * @param {HTMLElement} container - Container to append notice to (default: pageContent)
   */
  function showErrorNotice(message, title = "Error", container = null) {
    const targetContainer = container || document.getElementById("pageContent") || document.body;
    
    const notice = document.createElement("div");
    notice.className = "alert alert-danger alert-dismissible fade show";
    notice.style.cssText = "margin: 1rem 0;";
    notice.setAttribute("role", "alert");

    notice.innerHTML = `
      <div class="d-flex align-items-start">
        <i class="bi bi-exclamation-triangle me-2 fs-5"></i>
        <div class="flex-grow-1">
          <strong>${title}</strong>
          <div class="mt-1">${message}</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;

    // Insert at the top of container
    if (targetContainer.firstChild) {
      targetContainer.insertBefore(notice, targetContainer.firstChild);
    } else {
      targetContainer.appendChild(notice);
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notice && notice.parentNode) {
        notice.classList.remove("show");
        setTimeout(() => {
          if (notice && notice.parentNode) {
            notice.remove();
          }
        }, 150);
      }
    }, 5000);
  }

  /**
   * Process an async operation with overlay and toast
   * @param {Function} asyncFn - Async function to execute
   * @param {string} processingMessage - Message to show during processing
   * @param {string} successMessage - Message to show on success
   * @param {string} errorTitle - Error title if operation fails
   * @param {HTMLElement} container - Optional container to show spinner/toast inside
   * @returns {Promise} Promise that resolves when operation completes
   */
  async function processWithOverlay(asyncFn, processingMessage = "Processing...", successMessage = "Operation completed successfully", errorTitle = "Error", container = null) {
    const hideOverlay = showProcessing(processingMessage, container);
    
    try {
      const result = await asyncFn();
      hideOverlay();
      // If container provided, show toast inside it and don't close modals
      // Also disable auto-close for container toasts (manual close only)
      // Otherwise show global toast and close modals with auto-close
      const shouldCloseModals = container ? false : true;
      const toastDuration = container ? 0 : 3000; // 0 = no auto-close for container toasts
      showSuccessToast(successMessage, toastDuration, container, shouldCloseModals);
      return result;
    } catch (error) {
      hideOverlay();
      const errorMessage = error?.message || error || "An unknown error occurred";
      // Show error notice in container if provided, otherwise globally
      if (container) {
        showErrorNotice(errorMessage, errorTitle, container);
      } else {
        showErrorNotice(errorMessage, errorTitle);
      }
      throw error;
    }
  }

  // Expose utility
  window.Processing = {
    show: showProcessing,
    showSuccessToast,
    showErrorNotice,
    process: processWithOverlay,
    closeAllModals
  };
})();

