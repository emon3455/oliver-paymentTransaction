/**
 * Content Type Detector Utility
 * Safely detects content types from moderation records
 */

(function () {
  'use strict';

  /**
   * Detect content type from record data
   * @param {Object} recordData - The moderation record data
   * @returns {Object} { type: string, displayLabel: string, isMedia: boolean, isString: boolean }
   */
  function detectContentType(recordData) {
    if (!recordData || typeof recordData !== 'object') {
      return { type: 'unknown', displayLabel: 'Unknown', isMedia: false, isString: false };
    }

    // Get type from contentType or type field
    const contentType = (recordData.contentType || recordData.type || '').toLowerCase().trim();
    const content = recordData.content || {};

    // String-based types (not media)
    const stringTypes = ['text', 'html', 'global_tag', 'personal_tag', 'tag', 'tags', 'report', 'link'];
    
    // Check if it's a string type
    for (const stringType of stringTypes) {
      if (contentType === stringType) {
        return {
          type: stringType,
          displayLabel: formatTypeLabel(stringType),
          isMedia: false,
          isString: true
        };
      }
    }

    // Media types
    const mediaTypes = ['image', 'video', 'audio', 'gallery', 'image_gallery', 'emoji', 'icon'];
    
    // Check if it's a known media type
    for (const mediaType of mediaTypes) {
      if (contentType === mediaType) {
        return {
          type: mediaType,
          displayLabel: formatTypeLabel(mediaType),
          isMedia: true,
          isString: false
        };
      }
    }

    // If type is "media" or unknown, try to detect from content structure
    if (contentType === 'media' || !contentType || contentType === '') {
      const detected = detectFromContentStructure(content);
      // If we successfully detected a type, return it; otherwise fall back to "Unknown"
      if (detected.type !== 'unknown') {
        return detected;
      }
      // If type was "media" but we couldn't detect, return "Unknown" instead of "Media"
      if (contentType === 'media') {
        return { type: 'unknown', displayLabel: 'Unknown', isMedia: false, isString: false };
      }
      return detected;
    }

    // Fallback: return the original type with formatted label
    return {
      type: contentType || 'unknown',
      displayLabel: formatTypeLabel(contentType || 'unknown'),
      isMedia: false,
      isString: false
    };
  }

  /**
   * Detect content type from content structure
   * @param {Object} content - The content object
   * @returns {Object} { type: string, displayLabel: string, isMedia: boolean, isString: boolean }
   */
  function detectFromContentStructure(content) {
    if (!content || typeof content !== 'object') {
      return { type: 'unknown', displayLabel: 'Unknown', isMedia: false, isString: false };
    }

    // Check for gallery
    if (content.images && Array.isArray(content.images) && content.images.length > 0) {
      return { type: 'gallery', displayLabel: 'Image Gallery', isMedia: true, isString: false };
    }

    // Check for image
    if (content.url) {
      const url = content.url.toLowerCase();
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', 'image', 'photo', 'img'];
      if (imageExtensions.some(ext => url.includes(ext))) {
        return { type: 'image', displayLabel: 'Image', isMedia: true, isString: false };
      }
      
      // Check for video
      const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', 'video'];
      const videoPlatforms = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com'];
      if (videoExtensions.some(ext => url.includes(ext)) || videoPlatforms.some(platform => url.includes(platform))) {
        return { type: 'video', displayLabel: 'Video', isMedia: true, isString: false };
      }
      
      // Check for audio
      const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', 'audio', 'sound'];
      if (audioExtensions.some(ext => url.includes(ext))) {
        return { type: 'audio', displayLabel: 'Audio', isMedia: true, isString: false };
      }
    }

    // Check for text-based content
    if (content.body || content.text || content.title) {
      if (content.reportType || content.reportedBy) {
        return { type: 'report', displayLabel: 'Report', isMedia: false, isString: true };
      }
      return { type: 'text', displayLabel: 'Text', isMedia: false, isString: true };
    }

    // Check for tag types
    if (content.tag) {
      return { type: 'tag', displayLabel: 'Tag', isMedia: false, isString: true };
    }
    if (content.tags && Array.isArray(content.tags)) {
      return { type: 'tags', displayLabel: 'Tags', isMedia: false, isString: true };
    }

    // Default to unknown
    return { type: 'unknown', displayLabel: 'Unknown', isMedia: false, isString: false };
  }

  /**
   * Format type label for display
   * @param {string} type - The content type
   * @returns {string} Formatted label
   */
  function formatTypeLabel(type) {
    if (!type || type === 'unknown' || type === 'media') {
      return 'Unknown';
    }

    // Handle special cases
    const specialCases = {
      'image_gallery': 'Image Gallery',
      'global_tag': 'Global Tag',
      'personal_tag': 'Personal Tag',
      'image': 'Image',
      'video': 'Video',
      'audio': 'Audio',
      'gallery': 'Image Gallery',
      'text': 'Text',
      'html': 'HTML',
      'report': 'Report',
      'tag': 'Tag',
      'tags': 'Tags',
      'link': 'Link',
      'emoji': 'Emoji',
      'icon': 'Icon'
    };

    if (specialCases[type]) {
      return specialCases[type];
    }

    // Default: capitalize and replace underscores
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Expose utility
  window.ContentTypeDetector = {
    detect: detectContentType,
    detectFromStructure: detectFromContentStructure,
    formatLabel: formatTypeLabel
  };
})();

