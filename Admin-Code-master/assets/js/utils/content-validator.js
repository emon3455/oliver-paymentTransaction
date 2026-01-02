/**
 * Content Validator Utility
 * Validates different content types: image, image gallery, video, audio, text
 */

(function () {
  'use strict';

  /**
   * Validate image content
   * @param {Object} content - Content object
   * @returns {Object} { valid: boolean, error: string|null, data: Object|null }
   */
  function validateImage(content) {
    if (!content || !content.url) {
      return { valid: false, error: "Image URL is required", data: null };
    }

    // Check if URL is valid
    try {
      new URL(content.url);
    } catch (e) {
      return { valid: false, error: "Invalid image URL", data: null };
    }

    // Check if it's NOT a video or audio (more lenient - assume image if valid URL)
    const urlLower = content.url.toLowerCase();
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
    const videoPlatforms = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com'];
    
    const isVideo = videoExtensions.some(ext => urlLower.includes(ext)) ||
                    videoPlatforms.some(platform => urlLower.includes(platform));
    const isAudio = audioExtensions.some(ext => urlLower.includes(ext));
    
    // If it's clearly a video or audio, reject it
    if (isVideo) {
      return { valid: false, error: "URL appears to be a video, not an image", data: null };
    }
    if (isAudio) {
      return { valid: false, error: "URL appears to be audio, not an image", data: null };
    }

    // Otherwise, assume it's a valid image URL (many image URLs don't have extensions)
    return {
      valid: true,
      error: null,
      data: {
        url: content.url,
        alt: content.alt || content.title || "Image",
        caption: content.caption || null
      }
    };
  }

  /**
   * Validate image gallery content
   * @param {Object} content - Content object
   * @returns {Object} { valid: boolean, error: string|null, data: Object|null }
   */
  function validateImageGallery(content) {
    if (!content || !content.images || !Array.isArray(content.images)) {
      return { valid: false, error: "Gallery must contain an array of images", data: null };
    }

    if (content.images.length === 0) {
      return { valid: false, error: "Gallery must contain at least one image", data: null };
    }

    // Validate each image
    const validatedImages = [];
    for (let i = 0; i < content.images.length; i++) {
      const img = content.images[i];
      const validation = validateImage(img);
      if (!validation.valid) {
        return { valid: false, error: `Image ${i + 1}: ${validation.error}`, data: null };
      }
      validatedImages.push(validation.data);
    }

    return {
      valid: true,
      error: null,
      data: {
        images: validatedImages,
        title: content.title || "Image Gallery"
      }
    };
  }

  /**
   * Validate video content
   * @param {Object} content - Content object
   * @returns {Object} { valid: boolean, error: string|null, data: Object|null }
   */
  function validateVideo(content) {
    if (!content || !content.url) {
      return { valid: false, error: "Video URL is required", data: null };
    }

    // Check if URL is valid
    try {
      new URL(content.url);
    } catch (e) {
      return { valid: false, error: "Invalid video URL", data: null };
    }

    // Check if it's a video extension or video platform
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
    const videoPlatforms = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com'];
    const urlLower = content.url.toLowerCase();
    const isVideo = videoExtensions.some(ext => urlLower.includes(ext)) ||
                    videoPlatforms.some(platform => urlLower.includes(platform));

    if (!isVideo) {
      return { valid: false, error: "URL does not appear to be a video", data: null };
    }

    return {
      valid: true,
      error: null,
      data: {
        url: content.url,
        title: content.title || "Video",
        thumbnail: content.thumbnail || null
      }
    };
  }

  /**
   * Validate audio content
   * @param {Object} content - Content object
   * @returns {Object} { valid: boolean, error: string|null, data: Object|null }
   */
  function validateAudio(content) {
    if (!content || !content.url) {
      return { valid: false, error: "Audio URL is required", data: null };
    }

    // Check if URL is valid
    try {
      new URL(content.url);
    } catch (e) {
      return { valid: false, error: "Invalid audio URL", data: null };
    }

    // Check if it's an audio extension
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
    const urlLower = content.url.toLowerCase();
    const isAudio = audioExtensions.some(ext => urlLower.includes(ext));

    if (!isAudio) {
      return { valid: false, error: "URL does not appear to be an audio file", data: null };
    }

    return {
      valid: true,
      error: null,
      data: {
        url: content.url,
        title: content.title || "Audio",
        artist: content.artist || null
      }
    };
  }

  /**
   * Validate text content
   * @param {Object} content - Content object
   * @returns {Object} { valid: boolean, error: string|null, data: Object|null }
   */
  function validateText(content) {
    if (!content || (!content.text && !content.body && !content.content)) {
      return { valid: false, error: "Text content is required", data: null };
    }

    const text = content.text || content.body || content.content || "";

    if (text.trim().length === 0) {
      return { valid: false, error: "Text content cannot be empty", data: null };
    }

    return {
      valid: true,
      error: null,
      data: {
        text: text,
        title: content.title || null
      }
    };
  }

  /**
   * Validate content based on type
   * @param {string} type - Content type (image, image_gallery, video, audio, text)
   * @param {Object} content - Content object
   * @returns {Object} { valid: boolean, error: string|null, data: Object|null }
   */
  function validateContent(type, content) {
    if (!type) {
      return { valid: false, error: "Content type is required", data: null };
    }

    if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) {
      return { valid: false, error: "Content is empty", data: null };
    }

    const typeLower = type.toLowerCase().replace(/_/g, '_');

    switch (typeLower) {
      case 'image':
        return validateImage(content);
      case 'image_gallery':
      case 'gallery':
        return validateImageGallery(content);
      case 'video':
        return validateVideo(content);
      case 'audio':
        return validateAudio(content);
      case 'text':
      case 'html':
        return validateText(content);
      default:
        return { valid: false, error: `Unknown content type: ${type}`, data: null };
    }
  }

  // Expose validator
  window.ContentValidator = {
    validate: validateContent,
    validateImage,
    validateImageGallery,
    validateVideo,
    validateAudio,
    validateText
  };
})();

