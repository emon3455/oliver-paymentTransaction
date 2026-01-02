/**
 * Moderation Page Handlers
 * Orchestrator for moderation-specific event handlers
 * Routes events to ModerationUtils functions
 */

(function () {
  'use strict';

  const { spinner, spinnerInline, errorMessage } = window.AdminUtils;

  // Utility functions moved to ModerationUtils

  /**
   * Get base URL from API configuration
   */
  function getBaseUrl() {
    let baseUrl = "http://localhost:3000";
    try {
      const configScriptElement = document.getElementById("api-config");
      if (configScriptElement) {
        const pageConfig = JSON.parse(configScriptElement.textContent);
        const currentEnvironment = window.Env?.current || "dev";
        const moderationConfig = pageConfig["moderation"];
        if (moderationConfig && moderationConfig[currentEnvironment] && moderationConfig[currentEnvironment].endpoint) {
          const endpointUrl = moderationConfig[currentEnvironment].endpoint;
          const urlMatch = endpointUrl.match(/^(https?:\/\/[^\/]+)/);
          if (urlMatch) {
            baseUrl = urlMatch[1];
          }
        }
      }
    } catch (configError) {
      console.warn("[Moderation] Could not parse API config, using default base URL:", configError);
    }
    return baseUrl;
  }

  /**
   * Attach content reveal handlers (using event delegation)
   */
  function attachContentRevealHandlers() {
    // Use event delegation - only attach once
    if (document.body.dataset.contentRevealAttached) return;
    document.body.dataset.contentRevealAttached = "true";
    
    document.body.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-reveal-content]");
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();
      
      const moderationId = btn.getAttribute("data-reveal-content");
      const userId = btn.getAttribute("data-user-id");

      const row = btn.closest("tr");
      if (row) {
        // Select the row and keep it selected
        const table = row.closest("table");
        if (table) {
          // Remove selection from all rows
          table.querySelectorAll("tbody tr").forEach(r => {
            r.classList.remove("row-selected");
          });
          // Select this row
          row.classList.add("row-selected");
        }
      }

      // Get row data from table - check for data-row-data attribute or find row data
      let rowData = null;
      const rowDataAttr = btn.getAttribute("data-row-data");
      if (rowDataAttr) {
        try {
          rowData = JSON.parse(decodeURIComponent(rowDataAttr));
        } catch (e) {
          console.warn("Could not parse row data:", e);
        }
      }
      
      // If no row data attribute, try to get from table's stored data
      if (!rowData && row) {
        // Try to find the row in the table's data store
        const table = row.closest("table");
        if (table && window.currentPageRenderer) {
          // This would require storing row data - for now, we'll use the row attributes
          // But ideally we should store the full row data when rendering
        }
      }

      await showContentModal(moderationId, userId, rowData);
    });
  }

  /**
   * Attach action handlers (approve/reject) (using event delegation)
   */
  function attachActionHandlers() {
    // Use event delegation - only attach once
    if (document.body.dataset.actionHandlersAttached) return;
    document.body.dataset.actionHandlersAttached = "true";
    
    document.body.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();
      
      // Close the dropdown
      const dropdown = btn.closest(".dropdown");
      if (dropdown) {
        const dropdownToggle = dropdown.querySelector(".dropdown-toggle");
        if (dropdownToggle) {
          const bsDropdown = bootstrap.Dropdown.getInstance(dropdownToggle);
          if (bsDropdown) {
            bsDropdown.hide();
          }
        }
      }
      
      const action = btn.getAttribute("data-action");
      const moderationId = btn.getAttribute("data-moderation-id");
      const userId = btn.getAttribute("data-user-id");

      const row = btn.closest("tr");
      if (row) {
        row.classList.add("highlight");
        setTimeout(() => row.classList.remove("highlight"), 2000);
      }

      await showActionModal(action, moderationId, userId);
    });
  }

  /**
   * Attach view all handlers (using event delegation)
   */
  function attachViewAllHandlers() {
    // Use event delegation - only attach once
    if (document.body.dataset.viewAllAttached) return;
    document.body.dataset.viewAllAttached = "true";
    
    document.body.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-view-all]");
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();
      
      const moderationId = btn.getAttribute("data-view-all");
      const userId = btn.getAttribute("data-user-id");
      
      const row = btn.closest("tr");
      if (row) {
        // Select the row and keep it selected
        const table = row.closest("table");
        if (table) {
          // Remove selection from all rows
          table.querySelectorAll("tbody tr").forEach(r => {
            r.classList.remove("row-selected");
          });
          // Select this row
          row.classList.add("row-selected");
        }
      }
      
      // Extract row data from button
      let rowData = null;
      const rowDataAttr = btn.getAttribute("data-row-data");
      if (rowDataAttr) {
        try {
          rowData = JSON.parse(decodeURIComponent(rowDataAttr));
        } catch (e) {
          console.warn("Could not parse row data:", e);
        }
      }
      
      // Route to utility function
      if (window.ModerationUtils && window.ModerationUtils.showViewAllOffcanvas) {
        window.ModerationUtils.showViewAllOffcanvas(moderationId, userId, rowData);
      }
    });
  }

  /**
   * Attach user lookup handlers (using event delegation)
   */
  function attachUserLookupHandlers() {
    // Use event delegation - only attach once
    if (document.body.dataset.userLookupAttached) return;
    document.body.dataset.userLookupAttached = "true";
    
    document.body.addEventListener("click", async (e) => {
      const link = e.target.closest("[data-lookup-user]");
      if (!link) return;

      e.preventDefault();
      e.stopPropagation();
      
      const userId = link.getAttribute("data-lookup-user");
      await showUserDataModal(userId);
    });
  }

  /**
   * Show user data modal with spinner
   */
  async function showUserDataModal(userId) {
    const modal = window.ModalViewer;
    if (!modal) return;

    const modalTitle = document.querySelector("#viewModal .modal-title");
    if (modalTitle) modalTitle.textContent = "User Data";

    // Show spinner while loading
    modal.body.innerHTML = `<div class="text-center py-5">${spinner()}</div>`;
    modal.modal.show();

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock response
      modal.body.innerHTML = `
        <div class="alert alert-warning">
          <strong>This data is mocked. You need to implement real data.</strong>
        </div>
        <div class="mb-3">
          <h6>User ID:</h6>
          <p class="mb-0">${userId}</p>
        </div>
        <div class="mb-3">
          <h6>Note:</h6>
          <p class="text-muted mb-0">Replace this with actual user data fetch from API endpoint.</p>
        </div>
      `;
    } catch (error) {
      modal.body.innerHTML = errorMessage(error);
    }
  }

  /**
   * Show content modal at 90% width/height with action buttons
   * @param {string} moderationId - Moderation ID
   * @param {string} userId - User ID
   * @param {Object} rowData - Row data from table (optional, will fetch if not provided)
   */
  async function showContentModal(moderationId, userId, rowData = null) {
    // Create or get content reveal modal
    let contentModal = document.getElementById("contentRevealModal");
    if (!contentModal) {
      contentModal = document.createElement("div");
      contentModal.id = "contentRevealModal";
      contentModal.className = "modal fade";
      contentModal.setAttribute("tabindex", "-1");
      contentModal.innerHTML = `
        <div class="modal-dialog modal-xl" style="width: 90vw; max-width: 90vw; height: 90vh; max-height: 90vh; margin: 5vh auto;">
          <div class="modal-content d-flex flex-column" style="height: 100%;">
            <div class="modal-header">
              <h5 class="modal-title">Content Preview</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body flex-grow-1 overflow-auto" id="contentRevealBody" style="min-height: 0;">
              <!-- Content will be loaded here -->
            </div>
            <div class="modal-footer border-top">
              <button type="button" class="btn btn-primary" id="contentAddNoteBtn" data-moderation-id="${moderationId}" data-user-id="${userId}">Add Note</button>
              <button type="button" class="btn btn-primary" id="contentApproveBtn" data-moderation-id="${moderationId}" data-user-id="${userId}">Approve</button>
              <button type="button" class="btn btn-primary" id="contentDeclineBtn" data-moderation-id="${moderationId}" data-user-id="${userId}">Decline</button>
              <button type="button" class="btn btn-primary" id="contentResubmissionBtn" data-moderation-id="${moderationId}" data-user-id="${userId}">Resubmission Required</button>
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(contentModal);
    }

    const modalBody = document.getElementById("contentRevealBody");
    const bsModal = new bootstrap.Modal(contentModal);
    
    // Store rowData in modal for note adding
    if (rowData) {
      contentModal.dataset.rowData = encodeURIComponent(JSON.stringify(rowData));
    }
    
    // Update moderation IDs on buttons
    document.getElementById("contentAddNoteBtn")?.setAttribute("data-moderation-id", moderationId);
    document.getElementById("contentAddNoteBtn")?.setAttribute("data-user-id", userId);
    document.getElementById("contentApproveBtn")?.setAttribute("data-moderation-id", moderationId);
    document.getElementById("contentApproveBtn")?.setAttribute("data-user-id", userId);
    document.getElementById("contentDeclineBtn")?.setAttribute("data-moderation-id", moderationId);
    document.getElementById("contentDeclineBtn")?.setAttribute("data-user-id", userId);
    document.getElementById("contentResubmissionBtn")?.setAttribute("data-moderation-id", moderationId);
    document.getElementById("contentResubmissionBtn")?.setAttribute("data-user-id", userId);

    // Show spinner while loading
    modalBody.innerHTML = `<div class="text-center py-5">${spinner()}</div>`;
    bsModal.show();

    // Attach action handlers if not already attached
    const addNoteBtn = document.getElementById("contentAddNoteBtn");
    const approveBtn = document.getElementById("contentApproveBtn");
    const declineBtn = document.getElementById("contentDeclineBtn");
    const resubmissionBtn = document.getElementById("contentResubmissionBtn");

    if (addNoteBtn && !addNoteBtn.dataset.handlerAttached) {
      addNoteBtn.dataset.handlerAttached = "true";
      addNoteBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await showAddNoteModal(moderationId, userId, rowData);
      });
    }

    if (approveBtn && !approveBtn.dataset.handlerAttached) {
      approveBtn.dataset.handlerAttached = "true";
      approveBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        bsModal.hide();
        await showActionModal("approve", moderationId, userId);
      });
    }

    if (declineBtn && !declineBtn.dataset.handlerAttached) {
      declineBtn.dataset.handlerAttached = "true";
      declineBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        bsModal.hide();
        await showActionModal("reject", moderationId, userId);
      });
    }

    if (resubmissionBtn && !resubmissionBtn.dataset.handlerAttached) {
      resubmissionBtn.dataset.handlerAttached = "true";
      resubmissionBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        bsModal.hide();
        await showActionModal("resubmission", moderationId, userId);
      });
    }

    try {
      // Require row data - no API fallback
      if (!rowData) {
        modalBody.innerHTML = `
          <div class="alert alert-danger">
            <h6 class="alert-heading">Error: Missing Row Data</h6>
            <p class="mb-0">Row data is required to display content. Please refresh the page and try again.</p>
          </div>
        `;
        return;
      }
      
      const recordData = rowData;
      const content = recordData.content || {};

      // Check if content is empty
      if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) {
        modalBody.innerHTML = `
          <div class="alert alert-danger">
            <h6 class="alert-heading">Error: Empty Content</h6>
            <p class="mb-0">The content for this moderation record is empty.</p>
          </div>
        `;
        return;
      }

      // Detect content type using utility
      let typeInfo = null;
      let detectedType = '';
      let displayLabel = 'Unknown';
      
      if (window.ContentTypeDetector) {
        typeInfo = window.ContentTypeDetector.detect(recordData);
        detectedType = typeInfo.type;
        displayLabel = typeInfo.displayLabel;
      } else {
        // Fallback to old method
        const contentType = recordData.contentType || recordData.type || "";
        detectedType = contentType.toLowerCase().replace(/_/g, '_');
        displayLabel = contentType || 'Unknown';
      }

      // Display content based on detected type
      let contentHtml = "";
      const typeLower = detectedType;

      // Handle string-based types (report, text, tags, etc.)
      if (typeInfo && (typeInfo.isString || typeLower === 'report' || typeLower === 'text' || typeLower === 'html' || typeLower === 'global_tag' || typeLower === 'personal_tag' || typeLower === 'tag' || typeLower === 'tags')) {
        // Report or structured text content - similar style for all
        const tagName = content.tag || content.name || content.title || '';
        const tagValue = content.value || content.body || content.text || '';
        const tagDescription = content.description || '';
        
        contentHtml = `
          <div class="p-4">
            ${tagName ? `<h5>${tagName}</h5>` : content.title ? `<h5>${content.title}</h5>` : ''}
            <div class="border rounded p-3 mb-3" style="min-height: 200px; white-space: pre-wrap;">${tagValue || content.body || content.text || JSON.stringify(content, null, 2)}</div>
            ${tagDescription ? `<p class="mb-2"><strong>Description:</strong> ${tagDescription}</p>` : ''}
            ${content.reportType ? `<p class="mb-2"><strong>Report Type:</strong> ${content.reportType}</p>` : ''}
            ${content.reportedBy ? `<p class="mb-2"><strong>Reported By:</strong> ${content.reportedBy}</p>` : ''}
            ${content.reason ? `<p class="mb-2"><strong>Reason:</strong> ${content.reason}</p>` : ''}
            ${content.category ? `<p class="mb-2"><strong>Category:</strong> ${content.category}</p>` : ''}
            ${content.createdBy ? `<p class="mb-2"><strong>Created By:</strong> ${content.createdBy}</p>` : ''}
          </div>
        `;
      } else if (!typeInfo?.isString) {
        // Media types - render directly from content, validate if validator available
        let validation = null;
        if (window.ContentValidator) {
          validation = window.ContentValidator.validate(detectedType, content);
          if (!validation.valid) {
            modalBody.innerHTML = `
              <div class="alert alert-danger">
                <h6 class="alert-heading">Validation Error</h6>
                <p class="mb-0">${validation.error}</p>
              </div>
            `;
            return;
          }
        }

        // Render media directly from content (use validation.data if available, otherwise use content directly)
        const mediaData = validation?.data || content;

        if (typeLower === 'image' && (mediaData.url || content.url)) {
          const imgUrl = mediaData.url || content.url;
          const imgAlt = mediaData.alt || content.alt || 'Image';
          contentHtml = `
            <div class="text-center">
              <img src="${imgUrl}" alt="${imgAlt}" class="img-fluid" style="max-height: 70vh; object-fit: contain;">
              ${(mediaData.caption || content.caption) ? `<p class="mt-3 text-muted">${mediaData.caption || content.caption}</p>` : ''}
            </div>
          `;
        } else if ((typeLower === 'image_gallery' || typeLower === 'gallery') && (mediaData.images || content.images)) {
          // Gallery slider with navigation
          const images = mediaData.images || content.images;
          if (Array.isArray(images) && images.length > 0) {
            const galleryId = `gallery-${moderationId}`;
            const firstImg = images[0];
            const firstUrl = typeof firstImg === 'string' ? firstImg : (firstImg.url || '');
            const firstAlt = typeof firstImg === 'string' ? 'Image 1' : (firstImg.alt || 'Image 1');
            contentHtml = `
              <div id="${galleryId}" class="content-gallery">
                <div class="d-flex align-items-center justify-content-center position-relative" style="min-height: 60vh;">
                  <button class="btn btn-outline-primary gallery-nav gallery-nav-prev" data-gallery="${galleryId}" data-direction="prev" style="position: absolute; left: 0; z-index: 10;">
                    <i class="bi bi-chevron-left"></i>
                  </button>
                  <div class="gallery-viewport text-center" style="flex: 1; margin: 0 60px;">
                    <img id="${galleryId}-img" src="${firstUrl}" alt="${firstAlt}" class="img-fluid" style="max-height: 60vh; object-fit: contain;">
                    <p class="mt-2 text-muted" id="${galleryId}-caption">${typeof firstImg === 'object' && firstImg.caption ? firstImg.caption : `1 / ${images.length}`}</p>
                  </div>
                  <button class="btn btn-outline-primary gallery-nav gallery-nav-next" data-gallery="${galleryId}" data-direction="next" style="position: absolute; right: 0; z-index: 10;">
                    <i class="bi bi-chevron-right"></i>
                  </button>
                </div>
              </div>
            `;
            
            // Store gallery data for initialization (normalize to array of objects with url)
            const normalizedImages = images.map((img, idx) => {
              if (typeof img === 'string') {
                return { url: img, alt: `Image ${idx + 1}`, caption: null };
              }
              return {
                url: img.url || '',
                alt: img.alt || `Image ${idx + 1}`,
                caption: img.caption || null
              };
            });
            modalBody.dataset.galleryImages = JSON.stringify(normalizedImages);
            modalBody.dataset.galleryId = galleryId;
          }
        } else if (typeLower === 'video' && (mediaData.url || content.url)) {
          const videoUrl = mediaData.url || content.url;
          const videoTitle = mediaData.title || content.title;
          const videoId = `video-${moderationId}`;
          contentHtml = `
            <div class="text-center video-container">
              <video
                id="${videoId}"
                class="video-js vjs-default-skin vjs-big-play-centered"
                preload="auto"
                data-setup="{}"
              >
                <source src="${videoUrl}" type="video/mp4" />
                <p class="vjs-no-js">
                  To view this video please enable JavaScript, and consider upgrading to a web browser that
                  <a href="https://videojs.com/html5-video-support/" target="_blank">supports HTML5 video</a>.
                </p>
              </video>
              ${videoTitle ? `<p class="mt-2 mb-0"><strong>${videoTitle}</strong></p>` : ''}
            </div>
          `;
          
          // Store video ID for cleanup
          modalBody.dataset.videoId = videoId;
        } else if (typeLower === 'audio' && (mediaData.url || content.url)) {
          const audioUrl = mediaData.url || content.url;
          contentHtml = `
            <div class="text-center py-5">
              <audio controls class="w-100">
                <source src="${audioUrl}" type="audio/mpeg">
                Your browser does not support the audio tag.
              </audio>
            </div>
          `;
        } else if (typeLower === 'text' || typeLower === 'html') {
          const textContent = mediaData.text || content.text || content.body || content.content || '';
          const textTitle = mediaData.title || content.title;
          contentHtml = `
            <div class="p-4">
              ${textTitle ? `<h5>${textTitle}</h5>` : ''}
              <div class="border rounded p-3" style="min-height: 200px; white-space: pre-wrap;">${textContent}</div>
            </div>
          `;
        } else {
          // Unknown type - show as JSON
          contentHtml = `
            <div class="p-4">
              <h6>Content Type: ${displayLabel}</h6>
              <pre class="code-json bg-light p-3 rounded" style="max-height: 60vh; overflow-y: auto;">${JSON.stringify(content, null, 2)}</pre>
            </div>
          `;
        }
      } else {
        // No validator available - show content as JSON
        contentHtml = `
          <div class="p-4">
            <h6>Content Type: ${displayLabel}</h6>
            <pre class="code-json bg-light p-3 rounded" style="max-height: 60vh; overflow-y: auto;">${JSON.stringify(content, null, 2)}</pre>
          </div>
        `;
      }

      modalBody.innerHTML = contentHtml;
      
      // Initialize video.js player if video exists (wait for DOM)
      const videoId = modalBody.dataset.videoId;
      if (videoId && window.videojs) {
        setTimeout(() => {
          const videoEl = document.getElementById(videoId);
          if (videoEl) {
            try {
              // Check if player already exists and dispose it
              const existingPlayer = videojs.getPlayer(videoId);
              if (existingPlayer) {
                existingPlayer.dispose();
              }
              
              const player = videojs(videoId, {
                controls: true,
                autoplay: true,
                preload: 'auto',
                playbackRates: [0.5, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 10, 20],
                fluid: false,
                responsive: false,
                height: '100%',
                width: '100%',
                userActions: {
                  hotkeys: true
                }
              });
              
              // Set default playback rate to 10x
              player.ready(() => {
                player.playbackRate(10);
                // Ensure controls are enabled
                player.controls(true);
              });
              
              modalBody.dataset.videoPlayer = videoId;
            } catch (e) {
              console.warn('Failed to initialize video.js player:', e);
            }
          }
        }, 100);
      }
      
      // Cleanup video on modal close
      if (contentModal) {
        const cleanupVideo = () => {
          const videoId = modalBody.dataset.videoId;
          if (videoId && window.videojs) {
            const player = videojs.getPlayer(videoId);
            if (player) {
              player.pause();
              player.dispose();
            }
          } else if (videoId) {
            // Fallback for native video element
            const videoEl = document.getElementById(videoId);
            if (videoEl) {
              videoEl.pause();
              videoEl.src = '';
              videoEl.load();
            }
          }
          delete modalBody.dataset.videoId;
        };
        
        // Remove existing listeners to avoid duplicates
        contentModal.removeEventListener('hidden.bs.modal', cleanupVideo);
        contentModal.addEventListener('hidden.bs.modal', cleanupVideo);
      }
      
      // Initialize gallery if it exists
      if (modalBody.dataset.galleryId && modalBody.dataset.galleryImages) {
        const galleryId = modalBody.dataset.galleryId;
        const galleryImages = JSON.parse(modalBody.dataset.galleryImages);
        let currentIndex = 0;
        
        function updateGallery() {
          const img = document.getElementById(galleryId + "-img");
          const caption = document.getElementById(galleryId + "-caption");
          if (img && caption) {
            img.src = galleryImages[currentIndex].url;
            img.alt = galleryImages[currentIndex].alt;
            caption.textContent = galleryImages[currentIndex].caption || (currentIndex + 1) + " / " + galleryImages.length;
          }
        }
        
        // Attach navigation handlers
        setTimeout(() => {
          document.querySelectorAll(`[data-gallery="${galleryId}"]`).forEach(btn => {
            btn.addEventListener("click", (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (btn.classList.contains("gallery-nav-prev")) {
                currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
                updateGallery();
              } else if (btn.classList.contains("gallery-nav-next")) {
                currentIndex = (currentIndex + 1) % galleryImages.length;
                updateGallery();
              }
            });
          });
        }, 50);
      }
    } catch (error) {
      modalBody.innerHTML = errorMessage(error);
    }
  }

  /**
   * Show action modal (approve/reject/resubmission)
   */
  async function showActionModal(action, moderationId, userId) {
    const modal = window.ModalViewer;
    if (!modal) return;

    const actionLabels = {
      approve: "Approve Content",
      reject: "Decline Content",
      resubmission: "Require Resubmission"
    };

    const modalTitle = document.querySelector("#viewModal .modal-title");
    if (modalTitle) modalTitle.textContent = actionLabels[action] || "Confirm Action";

    modal.body.innerHTML = `
      <div class="alert alert-warning">
        <p><strong>Action:</strong> ${actionLabels[action] || action}</p>
        <p><strong>Moderation ID:</strong> ${moderationId}</p>
        <p><strong>User ID:</strong> ${userId}</p>
        <p class="mb-0">Confirm this action?</p>
      </div>
      <div class="d-grid gap-2">
        <button class="btn btn-${action === 'approve' ? 'success' : action === 'reject' ? 'danger' : 'warning'}" id="confirmActionBtn">
          Confirm ${actionLabels[action] || action}
        </button>
        <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
      </div>
    `;
    modal.modal.show();

    // Attach confirm handler
    document.getElementById("confirmActionBtn")?.addEventListener("click", async () => {
      alert(`TODO: Submit ${action} for ${moderationId}`);
      modal.modal.hide();
    });
  }

  /**
   * Show add note modal
   */
  async function showAddNoteModal(moderationId, userId, rowData) {
    // Create or get note modal
    let noteModal = document.getElementById("addNoteModal");
    if (!noteModal) {
      noteModal = document.createElement("div");
      noteModal.id = "addNoteModal";
      noteModal.className = "modal fade";
      noteModal.setAttribute("tabindex", "-1");
      noteModal.innerHTML = `
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Add Note</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label for="publicNoteText" class="form-label">Public Note <span class="text-muted">(visible to user)</span></label>
                <textarea class="form-control" id="publicNoteText" rows="3" placeholder="Enter public note that will be visible to the user..."></textarea>
              </div>
              <div class="mb-3">
                <label for="privateNoteText" class="form-label">Private Note <span class="text-muted">(internal only)</span></label>
                <textarea class="form-control" id="privateNoteText" rows="3" placeholder="Enter private note for internal use only..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" id="saveNoteBtn">Save Note</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(noteModal);
    }

    const bsNoteModal = new bootstrap.Modal(noteModal);
    const publicNoteTextArea = document.getElementById("publicNoteText");
    const privateNoteTextArea = document.getElementById("privateNoteText");
    const modalBody = noteModal.querySelector(".modal-body");
    
    // Clear previous values
    if (publicNoteTextArea) publicNoteTextArea.value = "";
    if (privateNoteTextArea) privateNoteTextArea.value = "";

    bsNoteModal.show();

    // Attach save handler
    const saveBtn = document.getElementById("saveNoteBtn");
    if (saveBtn) {
      // Remove existing listeners
      const newSaveBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
      
      newSaveBtn.addEventListener("click", async () => {
        const publicNoteText = publicNoteTextArea?.value.trim() || "";
        const privateNoteText = privateNoteTextArea?.value.trim() || "";
        
        if (!publicNoteText && !privateNoteText) {
          if (window.Processing) {
            window.Processing.showErrorNotice("Please enter at least one note (public or private).", "Validation Error");
          } else {
            alert("Please enter at least one note (public or private).");
          }
          return;
        }

        // Use processing utility to show overlay and handle success/error
        const noteTypes = [];
        if (publicNoteText) noteTypes.push("public");
        if (privateNoteText) noteTypes.push("private");
        const successMessage = `${noteTypes.join(" and ").replace(/^./, c => c.toUpperCase())} note${noteTypes.length > 1 ? 's' : ''} added successfully!`;

        await window.Processing?.process(
          async () => {
            // Mock delay for processing
            await new Promise(resolve => setTimeout(resolve, 500));

            const currentUser = userId || "admin"; // TODO: Get actual current user
            const timestamp = Date.now();
        
            // Add notes to rowData
            if (!rowData) {
              throw new Error("Row data not available.");
            }

            if (!rowData.notes) {
              rowData.notes = [];
            }
            
            // Add public note if provided
            if (publicNoteText) {
              const publicNote = {
                text: publicNoteText,
                addedBy: currentUser,
                addedAt: timestamp,
                isPublic: true,
                publicNote: publicNoteText
              };
              rowData.notes.push(publicNote);
            }
            
            // Add private note if provided
            if (privateNoteText) {
              const privateNote = {
                text: privateNoteText,
                addedBy: currentUser,
                addedAt: timestamp,
                isPublic: false,
                note: privateNoteText
              };
              rowData.notes.push(privateNote);
            }
            
            // Also add to meta.history if it exists
            if (!rowData.meta) {
              rowData.meta = {};
            }
            if (!rowData.meta.history) {
              rowData.meta.history = [];
            }
            
            if (publicNoteText) {
              rowData.meta.history.push({
                action: "public_note_added",
                publicNote: publicNoteText,
                addedBy: currentUser,
                timestamp: timestamp
              });
            }
            
            if (privateNoteText) {
              rowData.meta.history.push({
                action: "private_note_added",
                note: privateNoteText,
                addedBy: currentUser,
                timestamp: timestamp
              });
            }

            // Update stored rowData in modal
            const contentModal = document.getElementById("contentRevealModal");
            if (contentModal) {
              contentModal.dataset.rowData = encodeURIComponent(JSON.stringify(rowData));
            }

            // Update row data in table if possible
            const table = document.querySelector("#moderation-table");
            if (table) {
              const rows = table.querySelectorAll("tbody tr");
              rows.forEach(row => {
                const revealBtn = row.querySelector(`[data-reveal-content="${moderationId}"]`);
                if (revealBtn) {
                  const rowDataAttr = revealBtn.getAttribute("data-row-data");
                  if (rowDataAttr) {
                    try {
                      const existingRowData = JSON.parse(decodeURIComponent(rowDataAttr));
                      if (existingRowData.moderationId === moderationId || existingRowData.id === moderationId) {
                        // Update the row data attribute
                        revealBtn.setAttribute("data-row-data", encodeURIComponent(JSON.stringify(rowData)));
                        // Also update View button if it exists
                        const viewBtn = row.querySelector(`[data-view-all="${moderationId}"]`);
                        if (viewBtn) {
                          viewBtn.setAttribute("data-row-data", encodeURIComponent(JSON.stringify(rowData)));
                        }
                      }
                    } catch (e) {
                      console.warn("Could not update row data:", e);
                    }
                  }
                }
              });
            }

            // TODO: Save to API if not using mock data
            return rowData;
          },
          "Saving note...",
          successMessage,
          "Error Saving Note",
          modalBody // Show spinner and toast inside modal body (modal will stay open on success)
        );

        // Note: Modal stays open on success so user can see the success message
        // On error, modal also stays open so user can retry
      });
    }
  }

  // All utility functions moved to ModerationUtils
  // Handlers now just route events to utility functions

  /**
   * Initialize handlers after page render
   */
  function init() {
    // Attach all handlers using event delegation (only once)
    attachContentRevealHandlers();
    attachActionHandlers();
    attachViewAllHandlers();
    attachUserLookupHandlers();
  }

  // Expose handlers
  window.ModerationHandlers = {
    init
  };
})();

