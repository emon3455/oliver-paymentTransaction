/**
 * Admin Configuration
 * Central configuration for sidebar, filters, and notes
 */

window.AdminConfig = {
  sidebar: [
    {
      slug: "products",
      label: "Products"
    },
    {
      slug: "orders",
      label: "Orders"
    },
    {
      slug: "subscriptions",
      label: "Subscriptions"
    },
    {
      slug: "users",
      label: "Users"
    },
    {
      slug: "media",
      label: "Media"
    },
    {
      slug: "moderation",
      label: "Moderation"
    },
    {
      slug: "stats",
      label: "Stats"
    },
    {
      slug: "site-settings",
      label: "Site Settings"
    },
    {
      slug: "sales-registry",
      label: "Sales Registry"
    },
    {
      slug: "translation-settings",
      label: "Translation Settings"
    },
    {
      slug: "notification-settings",
      label: "Notification Settings"
    },
    {
      slug: "fetch",
      label: "Fetch Demo"
    },
    {
      slug: "demo",
      label: "Demo Page"
    },
    {
      slug: "kyc-shufti",
      label: "KYC (Shufti)"
    },
    {
      type: "divider"
    },
    {
      type: "group",
      label: "Developers",
      children: [
        {
          type: "group",
          label: "Database Management",
          children: [
            {
              slug: "developer/scylla-db",
              label: "Scylla DB"
            },
            {
              slug: "developer/postgres",
              label: "Postgres"
            },
            {
              slug: "developer/mysql",
              label: "MySQL"
            }
          ]
        },
        {
          type: "group",
          label: "Edge Tests",
          children: [
            {
              slug: "developer/edge-tests-demo",
              label: "Demo (Template)"
            },
            {
              slug: "developer/edge-tests-products",
              label: "Products Class"
            },
            {
              slug: "developer/edge-tests-orders",
              label: "Orders Class"
            },
            {
              slug: "developer/edge-tests-cart",
              label: "Cart Class"
            },
            {
              slug: "developer/edge-tests-wishlist",
              label: "Wishlist Class"
            },
            {
              slug: "developer/edge-tests-coupon",
              label: "Coupon Class"
            },
            {
              slug: "developer/edge-tests-subscriptions",
              label: "Subscriptions Class"
            },
            {
              slug: "developer/edge-tests-transactions",
              label: "Transactions Class"
            },
            {
              slug: "developer/edge-tests-gateway-1",
              label: "Gateway 1 Class"
            },
            {
              slug: "developer/edge-tests-gateway-2",
              label: "Gateway 2 Class"
            },
            {
              slug: "developer/edge-tests-media",
              label: "Media Class"
            },
            {
              slug: "developer/edge-tests-moderation",
              label: "Moderation Class"
            },
            {
              slug: "developer/edge-tests-referrals",
              label: "Referrals Class"
            },
            {
              slug: "developer/edge-tests-users",
              label: "Users Class"
            },
            {
              slug: "developer/edge-tests-kyc",
              label: "KYC Class"
            }
          ]
        },
        {
          slug: "developer/integration-reminders",
          label: "Integration Reminders"
        }
      ]
    }
  ],
  filters: {
    products: [
      {
        type: "text",
        name: "q",
        label: "Search",
        placeholder: "name, sku…"
      },
      {
        type: "select",
        name: "category",
        label: "Category",
        options: ["All", "Apparel", "Electronics", "Beauty"]
      },
      {
        type: "select",
        name: "status",
        label: "Status",
        options: ["Any", "Active", "Draft", "Archived"]
      },
      {
        type: "radio",
        name: "type",
        label: "Type",
        options: ["Any", "Physical", "Digital"]
      },
      {
        type: "toggle",
        name: "promo",
        label: "On Promotion"
      },
      {
        type: "toggle",
        name: "inStock",
        label: "In Stock"
      },
      {
        type: "text",
        name: "sku",
        label: "SKU"
      },
      {
        type: "number",
        name: "price_from",
        label: "Price From"
      },
      {
        type: "number",
        name: "price_to",
        label: "Price To"
      },
      {
        type: "checks",
        name: "tags",
        label: "Tags",
        options: ["New", "Sale", "Featured", "Limited"]
      }
    ],
    orders: [
      {
        type: "text",
        name: "q",
        label: "Search",
        placeholder: "search…"
      }
    ],
    subscriptions: [
      {
        type: "text",
        name: "q",
        label: "Search",
        placeholder: "search…"
      }
    ],
    users: [
      {
        type: "text",
        name: "q",
        label: "Search",
        placeholder: "search…"
      }
    ],
    media: [
      {
        type: "text",
        name: "q",
        label: "Search",
        placeholder: "search…"
      }
    ],
    moderation: [
      {
        type: "text",
        name: "q",
        label: "Search",
        placeholder: "Moderation ID or User ID"
      },
      {
        type: "select",
        name: "status",
        label: "Status",
        options: [
          { value: "all", label: "All Statuses" },
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Declined" }
        ]
      },
      {
        type: "select",
        name: "type",
        label: "Type",
        options: [
          "",
          { value: "image", label: "Image" },
          { value: "video", label: "Video" },
          { value: "audio", label: "Audio" },
          { value: "text", label: "Text" },
          { value: "emoji", label: "Emoji" },
          { value: "icon", label: "Icon" },
          { value: "tag", label: "Tag" },
          { value: "link", label: "Link" },
          { value: "gallery", label: "Image Gallery" }
        ]
      },
      {
        type: "text",
        name: "userId",
        label: "User ID",
        placeholder: "Enter User ID"
      },
      {
        type: "date",
        name: "from",
        label: "Date From"
      },
      {
        type: "date",
        name: "to",
        label: "Date To"
      }
    ],
    stats: [],
    "site-settings": [],
    "sales-registry": [],
    "translation-settings": [],
    "notification-settings": [],
    fetch: [],
    "scylla-db": [],
    postgres: [],
    mysql: [],
    "kyc-shufti": [
      {
        type: "text",
        name: "q",
        label: "Search",
        placeholder: "User ID or Reference ID"
      },
      {
        type: "text",
        name: "email",
        label: "Email",
        placeholder: "Email address"
      },
      {
        type: "text",
        name: "country",
        label: "Country",
        placeholder: "Country code"
      },
      {
        type: "select",
        name: "status",
        label: "Status",
        options: [
          "",
          { value: "verification.accepted", label: "Accepted" },
          { value: "verification.declined", label: "Declined" },
          { value: "request.pending", label: "Pending" },
          { value: "verification.pending", label: "Verification Pending" },
          { value: "request.timeout", label: "Timeout" },
          { value: "verification.cancelled", label: "Cancelled" }
        ]
      },
      {
        type: "date",
        name: "from",
        label: "Date From"
      },
      {
        type: "date",
        name: "to",
        label: "Date To"
      }
    ],
    demo: [
      {
        type: "text",
        name: "q",
        label: "Search",
        placeholder: "name, sku…"
      },
      {
        type: "select",
        name: "category",
        label: "Category",
        options: ["All", "Apparel", "Electronics", "Beauty"]
      },
      {
        type: "select",
        name: "status",
        label: "Status",
        options: ["Any", "Active", "Draft", "Archived"]
      },
      {
        type: "radio",
        name: "type",
        label: "Type",
        options: ["Any", "Physical", "Digital"]
      },
      {
        type: "toggle",
        name: "promo",
        label: "On Promotion"
      },
      {
        type: "toggle",
        name: "inStock",
        label: "In Stock"
      },
      {
        type: "text",
        name: "sku",
        label: "SKU"
      },
      {
        type: "number",
        name: "price_from",
        label: "Price From"
      },
      {
        type: "number",
        name: "price_to",
        label: "Price To"
      },
      {
        type: "checks",
        name: "tags",
        label: "Tags",
        options: ["New", "Sale", "Featured", "Limited"]
      }
    ]
  },
  notes: {
    products: {
      heading: "Stats Overview",
      list: [
        "Total creators registered",
        "Total fans registered",
        "Total media uploaded (image, video, audio)"
      ]
    },
    orders: {
      heading: "Stats Overview",
      list: [
        "Total creators registered",
        "Total fans registered",
        "Total media uploaded (image, video, audio)"
      ]
    },
    subscriptions: {
      heading: "Stats Overview",
      list: [
        "Total creators registered",
        "Total fans registered",
        "Total media uploaded (image, video, audio)"
      ]
    },
    users: {
      heading: "Stats Overview",
      list: [
        "Total creators registered",
        "Total fans registered",
        "Total media uploaded (image, video, audio)"
      ]
    },
    media: {
      heading: "Stats Overview",
      list: [
        "Total creators registered",
        "Total fans registered",
        "Total media uploaded (image, video, audio)"
      ]
    },
    moderation: {
      heading: "Stats Overview",
      list: [
        "Total creators registered",
        "Total fans registered",
        "Total media uploaded (image, video, audio)"
      ]
    },
    stats: {
      heading: "Stats Overview",
      list: [
        "Total creators registered",
        "Total fans registered",
        "Total media uploaded (image, video, audio)"
      ]
    },
    "site-settings": {
      heading: "Here you will manage:",
      list: [
        "Banned words",
        "Banned emails",
        "Global tags",
        "Authentication settings",
        "Blocked countries",
        "Ringtones",
        "Default media & URLs",
        "Force premium users"
      ]
    },
    "sales-registry": {
      text: "This page shows all recorded sales transactions, totals by period, and exportable sales reports."
    },
    "translation-settings": {
      text: "Configure supported locales and fallback language. Manage custom string translations per language."
    },
    "notification-settings": {
      text: "Define notification channels (email, SMS, push) and configure templates and triggers for each event type."
    },
    fetch: {
      text: ""
    },
    "scylla-db": {
      text: "Manage Scylla DB backups. Create new backups, download existing ones, or restore from a backup."
    },
    postgres: {
      text: "Manage Postgres database backups. Create new backups, download existing ones, or restore from a backup."
    },
    mysql: {
      text: "Manage MySQL database backups. Create new backups, download existing ones, or restore from a backup."
    },
    "kyc-shufti": {
      text: "Manage KYC verification records from ShuftiPro. View details, check status, and fetch full verification data from ShuftiPro API."
    },
    demo: {
      heading: "Demo Page Features",
      list: [
        "Table with pagination (20 items per page)",
        "Comprehensive filters (search, category, status, type, toggles, price range, tags)",
        "View All offcanvas (slides in from right with detailed view)",
        "Popup modal (view formatted JSON)",
        "Filter chips with removal",
        "Environment switching (prod/stage/dev)"
      ]
    }
  }
};
