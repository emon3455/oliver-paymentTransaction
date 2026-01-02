/**
 * Moderation Utilities
 * Contains all moderation-specific formatting and display logic
 */

(function () {
  'use strict';

  const { spinner, spinnerInline, errorMessage } = window.AdminUtils;

  /**
   * Format date/time value
   */
  function formatDateTime(dateValue) {
    if (!dateValue) return "-";
    try {
      const date = typeof dateValue === "number" ? new Date(dateValue) : new Date(dateValue);
      // Check if date is valid
      if (isNaN(date.getTime()) || date.getTime() <= 0) {
        return "-";
      }
      return date.toLocaleString();
    } catch (e) {
      return "-";
    }
  }

  /**
   * Get moderated date from row
   */
  function getDateModerated(item) {
    const status = (item.status || "").toLowerCase();
    if (status === "approved" || status === "rejected") {
      const dateValue = item.actionedAt || (item.meta && item.meta.lastModifiedAt) || item.moderatedAt;
      if (dateValue) {
        return formatDateTime(dateValue);
      }
    }
    return "-";
  }

  /**
   * Check if a value is a valid date
   */
  function isValidDate(value) {
    if (!value) return false;
    // Check if it's a number (timestamp)
    if (typeof value === 'number') {
      // Valid timestamps are typically between 1970 and 2100 (in milliseconds)
      return value > 0 && value < 4102444800000;
    }
    // Check if it's a date string
    if (typeof value === 'string') {
      const date = new Date(value);
      return !isNaN(date.getTime()) && date.getTime() > 0;
    }
    // Check if it's a Date object
    if (value instanceof Date) {
      return !isNaN(value.getTime()) && value.getTime() > 0;
    }
    return false;
  }

  /**
   * Capitalize a string value (skip URLs, emails, UUIDs, numbers, IDs)
   */
  function capitalizeValue(str, key) {
    if (typeof str !== 'string') return str;
    
    // Don't capitalize URLs
    if (str.match(/^https?:\/\//i)) return str;
    
    // Don't capitalize emails
    if (str.includes('@') && str.includes('.')) return str;
    
    // Don't capitalize UUIDs (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    if (str.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) return str;
    
    // Don't capitalize if it's all numbers or contains special patterns
    if (str.match(/^[\d\s\-_#]+$/)) return str;
    
    // Don't capitalize ID fields (userId, moderationId, contentId, etc.)
    const keyLower = (key || '').toLowerCase();
    const idFields = ['userid', 'moderationid', 'contentid'];
    if (idFields.some(idField => keyLower === idField || keyLower.endsWith(idField))) {
      return str;
    }
    // Also check if key ends with 'id' (case-insensitive)
    if (keyLower.endsWith('id') && keyLower.length > 2) {
      return str;
    }
    
    // Capitalize first letter of each word
    return str
      .split(/\s+/)
      .map(word => {
        if (!word) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }

  /**
   * Format a field label (capitalize and add spaces)
   */
  function formatFieldLabel(key) {
    if (!key) return '';
    
    // Special cases for common abbreviations
    const specialCases = {
      'id': 'ID',
      'pk': 'PK',
      'sk': 'SK',
      'url': 'URL',
      'api': 'API',
      'html': 'HTML',
      'css': 'CSS',
      'js': 'JS',
      'json': 'JSON',
      'xml': 'XML'
    };
    
    // Split by camelCase and underscores
    let formatted = key
      .replace(/([A-Z])/g, ' $1')  // Add space before capital letters
      .replace(/_/g, ' ')           // Replace underscores with spaces
      .trim();
    
    // Capitalize first letter of each word and handle special cases
    formatted = formatted
      .split(' ')
      .map(word => {
        const wordLower = word.toLowerCase();
        // Check if word is a special case
        if (specialCases[wordLower]) {
          return specialCases[wordLower];
        }
        // Capitalize first letter
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
    
    return formatted;
  }

  /**
   * Format a field value for display
   */
  function formatFieldValue(value, key) {
    if (value === null || value === undefined) {
      return "-";
    }
    
    // Special formatting for type field - format like "Global_tag" to "Global Tag"
    if (key === 'type' && typeof value === 'string') {
      return value.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
    
    // Fields that should NEVER be treated as dates
    const nonDateFields = ['status', 'type', 'contentType', 'mediaType', 'moderatedBy', 'userId', 'moderationId', 'id', 'pk', 'sk', 'contentId', 'priority', 'reason', 'action', 'escalatedBy'];
    
    // Fields that should be treated as dates (only if value is valid date)
    const dateFields = ['submittedAt', 'createdAt', 'updatedAt', 'deletedAt', 'actionedAt', 'moderatedAt', 'lastModifiedAt', 'addedAt', 'timestamp'];
    
    const keyLower = (key || '').toLowerCase();
    
    // Check if this is a non-date field first (highest priority)
    if (nonDateFields.some(ndf => keyLower === ndf.toLowerCase() || keyLower.endsWith(ndf.toLowerCase()))) {
      // Handle dayKey specially
      if (key === 'dayKey' && typeof value === 'string' && value.length === 8) {
        const year = value.substring(0, 4);
        const month = value.substring(4, 6);
        const day = value.substring(6, 8);
        return `${year}-${month}-${day}`;
      }
      const strValue = String(value);
      return capitalizeValue(strValue, key);
    }
    
    // Handle dates - only for specific date fields AND if value is actually a valid date
    if (key && dateFields.some(df => {
      const dfLower = df.toLowerCase();
      return keyLower === dfLower || keyLower.endsWith(dfLower);
    }) && isValidDate(value)) {
      return formatDateTime(value);
    }
    
    // Handle booleans (including numeric booleans 0/1)
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    if (typeof value === "number" && (value === 0 || value === 1)) {
      // Check if this field is typically a boolean
      const booleanFields = ['isDeleted', 'isPreApproved', 'isSystemGenerated', 'isPublic', 'isActive'];
      if (booleanFields.some(bf => keyLower.includes(bf.toLowerCase()))) {
        return value === 1 ? "Yes" : "No";
      }
    }
    
    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length === 0) return "-";
      return `[${value.length} item${value.length !== 1 ? 's' : ''}]`;
    }
    
    // Handle objects (but not nested objects - those go in JSON payload)
    if (typeof value === "object") {
      return `{Object}`;
    }
    
    // For string values, capitalize them
    const strValue = String(value);
    return capitalizeValue(strValue, key);
  }

  /**
   * Ensure moderation offcanvas exists
   */
  function ensureModerationOffcanvas() {
    let offcanvasElement = document.querySelector("#moderationDetailsOffcanvas");
    if (!offcanvasElement) {
      const wrapperElement = document.createElement("div");
      wrapperElement.innerHTML = `
        <div class="offcanvas offcanvas-end offcanvas-details" tabindex="-1" id="moderationDetailsOffcanvas">
          <div class="offcanvas-header">
            <h5 class="offcanvas-title">Moderation Record</h5>
            <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
          </div>
          <div class="offcanvas-body" id="moderationDetailsBody"></div>
        </div>
      `;
      document.body.appendChild(wrapperElement.firstElementChild);
      offcanvasElement = document.querySelector("#moderationDetailsOffcanvas");
    }
    return {
      canvas: offcanvasElement,
      body: document.querySelector("#moderationDetailsBody"),
      api: new bootstrap.Offcanvas(offcanvasElement)
    };
  }

  /**
   * Show view all offcanvas (KYC style)
   */
  function showViewAllOffcanvas(moderationId, userId, rowData) {
    if (!rowData) {
      if (window.Processing) {
        window.Processing.showErrorNotice("Row data is required. Please refresh the page and try again.", "Error");
      } else {
        alert("Error: Row data is required. Please refresh the page and try again.");
      }
      return;
    }

    const { canvas, body, api } = ensureModerationOffcanvas();
    
    body.innerHTML = spinnerInline("Loading record...");
    
    const titleEl = canvas.querySelector(".offcanvas-title");
    if (titleEl) {
      titleEl.textContent = `Moderation Record: ${moderationId}`;
    }

    api.show();

    try {
      const recordData = rowData;
      const status = (recordData.status || "").toLowerCase();
      const statusLabel = status === "pending" ? "Pending Resubmission" : 
                         status === "approved" ? "Approved" : 
                         status === "rejected" ? "Rejected" : 
                         recordData.status || "-";

      // Dynamically build field display from ALL fields in recordData
      // Exclude nested objects (content, meta, notes) and internal fields - they'll be in the JSON payload
      // dayKey: Partition key for date-based queries (YYYYMMDD format). Used for efficient date range queries in DynamoDB.
      const fieldsToExclude = ['content', 'meta', 'notes', 'pk', 'sk', 'dayKey', 'statusSubmittedAt'];
      
      // If both type and contentType exist, exclude contentType (prefer type)
      if (recordData.type && recordData.contentType) {
        fieldsToExclude.push('contentType');
      }
      
      const fields = [];
      
      for (const key in recordData) {
        if (recordData.hasOwnProperty(key) && !fieldsToExclude.includes(key)) {
          const value = recordData[key];
          // Only show primitive values, dates, and simple arrays in the field list
          // Complex objects are shown in the JSON payload
          if (value !== null && typeof value !== 'object') {
            fields.push({
              label: formatFieldLabel(key),
              value: formatFieldValue(value, key)
            });
          } else if (Array.isArray(value) && value.length > 0 && typeof value[0] !== 'object') {
            // Simple arrays of primitives
            fields.push({
              label: formatFieldLabel(key),
              value: formatFieldValue(value, key)
            });
          }
        }
      }

      // Sort fields for better readability (important fields first)
      const importantFields = ['moderationId', 'id', 'userId', 'type', 'contentType', 'status', 'priority', 'moderatedBy'];
      fields.sort((a, b) => {
        const aIndex = importantFields.findIndex(f => a.label.toLowerCase().includes(f.toLowerCase()));
        const bIndex = importantFields.findIndex(f => b.label.toLowerCase().includes(f.toLowerCase()));
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.label.localeCompare(b.label);
      });

      const fieldsHtml = fields.map(field => 
        `<p class="mb-2"><strong>${field.label}:</strong> ${field.value}</p>`
      ).join("");

      // Display content/media details using ContentTypeDetector
      let contentHtml = "";
      const content = recordData.content || {};
      
      if (content && Object.keys(content).length > 0 && window.ContentTypeDetector) {
        // Detect content type using utility
        const typeInfo = window.ContentTypeDetector.detect(recordData);
        const detectedType = typeInfo.type;
        const displayLabel = typeInfo.displayLabel;
        const isMedia = typeInfo.isMedia;
        const isString = typeInfo.isString;
        
        contentHtml = `
          <div class="mt-4 border-top pt-4">
            <h6>Content/Media Details</h6>
            <p class="mb-2"><strong>Content Type:</strong> ${displayLabel}</p>
        `;
        
        // Display based on detected type
        if (detectedType === 'image' && content.url) {
          contentHtml += `
            <div class="mb-3">
              <p class="mb-2"><strong>Src URL:</strong> <a href="${content.url}" target="_blank" class="text-break">${content.url}</a></p>
              ${content.alt ? `<p class="mb-2 text-muted"><strong>Alt Text:</strong> ${content.alt}</p>` : ''}
              ${content.caption ? `<p class="mb-2 text-muted"><strong>Caption:</strong> ${content.caption}</p>` : ''}
            </div>
          `;
        } else if ((detectedType === 'gallery' || detectedType === 'image_gallery') && content.images && Array.isArray(content.images) && content.images.length > 0) {
          const imageUrls = content.images.map((img, idx) => {
            const imgUrl = typeof img === 'string' ? img : (img.url || '');
            const imgAlt = typeof img === 'string' ? null : (img.alt || null);
            const imgCaption = typeof img === 'object' ? (img.caption || null) : null;
            return { url: imgUrl, alt: imgAlt, caption: imgCaption };
          });
          contentHtml += `
            <div class="mb-3">
              <p class="mb-2"><strong>Gallery:</strong> ${content.images.length} image(s)</p>
              ${imageUrls.map((img, idx) => `
                <p class="mb-2"><strong>Image ${idx + 1} Src URL:</strong> <a href="${img.url}" target="_blank" class="text-break">${img.url}</a></p>
                ${img.alt && img.alt !== `Image ${idx + 1}` ? `<p class="mb-2 text-muted"><strong>Image ${idx + 1} Alt:</strong> ${img.alt}</p>` : ''}
                ${img.caption ? `<p class="mb-2 text-muted"><strong>Image ${idx + 1} Caption:</strong> ${img.caption}</p>` : ''}
              `).join("")}
            </div>
          `;
        } else if (detectedType === 'video' && content.url) {
          contentHtml += `
            <div class="mb-3">
              <p class="mb-2"><strong>Src URL:</strong> <a href="${content.url}" target="_blank" class="text-break">${content.url}</a></p>
              ${content.title ? `<p class="mb-2"><strong>Title:</strong> ${content.title}</p>` : ''}
            </div>
          `;
        } else if (detectedType === 'audio' && content.url) {
          contentHtml += `
            <div class="mb-3">
              <p class="mb-2"><strong>Src URL:</strong> <a href="${content.url}" target="_blank" class="text-break">${content.url}</a></p>
              ${content.title ? `<p class="mb-2"><strong>Title:</strong> ${content.title}</p>` : ''}
              ${content.artist ? `<p class="mb-2"><strong>Artist:</strong> ${content.artist}</p>` : ''}
            </div>
          `;
        } else if (isString || detectedType === 'text' || detectedType === 'html' || detectedType === 'report' || detectedType === 'global_tag' || detectedType === 'personal_tag' || detectedType === 'tag' || detectedType === 'tags') {
          // String-based content types - display all fields
          const contentFields = [];
          for (const key in content) {
            if (content.hasOwnProperty(key)) {
              const value = content[key];
              if (value !== null && value !== undefined) {
                if (typeof value === 'object' && !Array.isArray(value)) {
                  contentFields.push({ label: formatFieldLabel(key), value: JSON.stringify(value, null, 2) });
                } else if (Array.isArray(value)) {
                  contentFields.push({ label: formatFieldLabel(key), value: `[${value.length} item(s)]` });
                } else {
                  contentFields.push({ label: formatFieldLabel(key), value: String(value) });
                }
              }
            }
          }
          
          if (contentFields.length > 0) {
            contentHtml += `
              <div class="mb-3">
                ${contentFields.map(field => 
                  `<p class="mb-2"><strong>${field.label}:</strong> ${field.value}</p>`
                ).join("")}
              </div>
            `;
          }
        } else {
          // Unknown type - display all fields as fallback
          const contentFields = [];
          for (const key in content) {
            if (content.hasOwnProperty(key)) {
              const value = content[key];
              if (value !== null && value !== undefined) {
                if (typeof value === 'object' && !Array.isArray(value)) {
                  contentFields.push({ label: formatFieldLabel(key), value: JSON.stringify(value, null, 2) });
                } else if (Array.isArray(value)) {
                  contentFields.push({ label: formatFieldLabel(key), value: `[${value.length} item(s)]` });
                } else {
                  contentFields.push({ label: formatFieldLabel(key), value: String(value) });
                }
              }
            }
          }
          
          if (contentFields.length > 0) {
            contentHtml += `
              <div class="mb-3">
                ${contentFields.map(field => 
                  `<p class="mb-2"><strong>${field.label}:</strong> ${field.value}</p>`
                ).join("")}
              </div>
            `;
          }
        }
        
        contentHtml += `</div>`;
      }

      // Get previous moderation updates from history or notes
      const history = recordData.meta?.history || [];
      const notes = recordData.notes || [];
      const previousUpdates = [...history, ...notes].sort((a, b) => {
        const timeA = a.timestamp || a.addedAt || 0;
        const timeB = b.timestamp || b.addedAt || 0;
        return timeB - timeA;
      });

      let previousUpdatesHtml = "";
      if (previousUpdates.length > 0) {
        previousUpdatesHtml = `
          <div class="mt-4 border-top pt-4">
            <h6>Previous Moderation Updates</h6>
            ${previousUpdates.map((update, index) => {
              const updateType = update.action || update.type || "Update";
              const updateTime = formatDateTime(update.timestamp || update.addedAt || update.createdAt);
              const updateUser = update.userId || update.addedBy || update.createdBy || "-";
              
              // Handle public and private notes separately
              let noteDisplay = "";
              if (update.publicNote) {
                noteDisplay += `<p class="mb-2"><strong>Public Note:</strong> <span class="text-primary">${update.publicNote}</span></p>`;
              }
              if (update.note) {
                noteDisplay += `<p class="mb-2"><strong>Private Note:</strong> <span class="text-muted">${update.note}</span></p>`;
              }
              if (update.text && !update.publicNote && !update.note) {
                noteDisplay += `<p class="mb-2"><strong>Note:</strong> ${update.isPublic ? `<span class="text-primary">${update.text}</span>` : `<span class="text-muted">${update.text}</span>`}</p>`;
              }
              if (!noteDisplay && (update.message || update.text)) {
                noteDisplay = `<p class="mb-2"><strong>Message:</strong> ${update.message || update.text}</p>`;
              }
              
              return `
                <div class="mb-3 border-bottom pb-3">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <strong>${updateType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} ${index + 1}</strong>
                    ${updateTime !== "-" ? `<span class="badge text-bg-secondary">${updateTime}</span>` : ''}
                  </div>
                  <p class="mb-1"><strong>User:</strong> ${updateUser}</p>
                  ${noteDisplay}
                  <pre class="code-json bg-light p-3 rounded small mt-2" style="max-height: 200px; overflow-y: auto;">${JSON.stringify(update, null, 2)}</pre>
                </div>
              `;
            }).join("")}
          </div>
        `;
      } else {
        previousUpdatesHtml = `
          <div class="mt-4 border-top pt-4">
            <h6>Previous Moderation Updates</h6>
            <div class="text-muted">No previous updates recorded.</div>
          </div>
        `;
      }

      body.innerHTML = `
        <div class="mb-3 d-flex justify-content-between align-items-center">
          <h5 class="mb-0">Moderation Record</h5>
          <span class="badge text-bg-${status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'warning'}">${statusLabel}</span>
        </div>
        ${fieldsHtml}
        ${contentHtml}
        <div class="mt-4 border-top pt-3">
          <h6>Full Table Payload</h6>
          <pre class="code-json bg-light p-3 rounded">${JSON.stringify(recordData, null, 2)}</pre>
        </div>
        ${previousUpdatesHtml}
      `;
    } catch (error) {
      body.innerHTML = errorMessage(error);
    }
  }

  /**
   * Show content modal
   */
  function showContentModal(moderationId, userId, rowData) {
    // Implementation moved to handlers - this is just a placeholder
    // The actual implementation should be in handlers.js
    console.warn("showContentModal should be called from handlers");
  }

  /**
   * Show user data modal
   */
  function showUserDataModal(userId) {
    // Implementation moved to handlers - this is just a placeholder
    console.warn("showUserDataModal should be called from handlers");
  }

  /**
   * Show action modal
   */
  function showActionModal(action, moderationId, userId) {
    // Implementation moved to handlers - this is just a placeholder
    console.warn("showActionModal should be called from handlers");
  }

  // Expose utilities
  window.ModerationUtils = {
    formatDateTime,
    getDateModerated,
    formatFieldLabel,
    formatFieldValue,
    showViewAllOffcanvas,
    ensureModerationOffcanvas
  };
})();

