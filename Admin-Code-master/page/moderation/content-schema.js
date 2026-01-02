// Plain JS, JSON-like schema for moderation content.
// Exposes a readable object on window for documentation and reference.
// This is not enforced at runtime; it describes expected shapes.

window.ModerationContentSchema = {
  types: [
    "text",
    "html",
    "image",
    "video",
    "audio",
    "gallery",
    "emoji",
    "icon",
    "tag",
    "tags",
    "personal_tag",
    "global_tag",
    "link",
    "report",
  ],
  examples: {
    text: {
      title: "Optional title",
      body: "Plain text body",
    },
    html: {
      title: "Optional title",
      body: "<p>HTML content string</p>",
    },
    image: {
      url: "https://cdn.example.com/image.jpg",
      thumbnail: null,
      width: null,
      height: null,
      name: null,
      description: null,
      format: "jpeg",
    },
    video: {
      url: "https://cdn.example.com/video.mp4",
      thumbnail: null,
      duration: null,
      width: null,
      height: null,
      name: null,
      description: null,
      format: "mp4",
    },
    audio: {
      url: "https://cdn.example.com/audio.mp3",
      thumbnail: null,
      duration: null,
      name: null,
      description: null,
      format: "mp3",
    },
    gallery: {
      images: [
        {
          url: "https://cdn.example.com/img-1.jpg",
          thumbnail: null,
          width: null,
          height: null,
          name: null,
          description: null,
          format: "jpeg",
          order: 1,
        },
      ],
      name: null,
      description: null,
    },
    emoji: {
      emoji: "😄",
      unicode: "U+1F604",
      name: "smiling face with open mouth",
      description: null,
    },
    icon: {
      icon: "star",
      svg: "<svg viewBox='0 0 24 24'>...</svg>",
      url: "https://cdn.example.com/icon.svg",
      name: null,
      description: null,
    },
    tag: {
      tag: "music",
      name: "Music",
      description: "Audio-related content",
    },
    tags: {
      tags: [
        { tag: "music", name: "Music", description: "Audio" },
        { tag: "art", name: "Art", description: "Visual" },
      ],
    },
    link: {
      url: "https://example.com/article",
      title: "Article Title",
      thumbnail: null,
      name: null,
      description: null,
    },
    report: {
      title: "Inappropriate Content",
      body: "Reported due to violation of guidelines.",
      reportType: "content_violation",
      reportedBy: "user-123",
    },
    fallback: {
      message: "Content unavailable",
      rawContentId: "abc-123",
    },
    error: {
      error: "Bad Content",
      message: "Malformed payload",
    },
  },
};

