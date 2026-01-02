/**
 * API Service
 * Handles data fetching from local JSON files or remote API endpoints
 */

// Flag to determine whether to use remote API endpoints or local JSON files
const USE_ENDPOINTS = false;
// Timeout duration for fetch requests in milliseconds (20 seconds)
const FETCH_TIMEOUT = 20000;

/**
 * Check if API config script tag exists
 * @returns {boolean} True if script tag exists, false otherwise
 */
function hasApiConfigScript() {
  // Check if API config script tag exists in current page
  return !!document.getElementById("api-config");
}

/**
 * Get page-specific API configuration from HTML
 * Looks for <script type="application/json" id="api-config"> tag in current page
 * @param {string} sectionName - Section name to get config for
 * @returns {Object|null} API configuration object or null if section not found in config
 * @throws {Error} If config script tag is missing or JSON parsing fails
 */
function getPageApiConfig(sectionName) {
  // Check if API config script tag exists
  if (!hasApiConfigScript()) {
    // Throw error if config script tag is missing (no fallback)
    throw new Error(
      `API configuration script tag (#api-config) is missing for section: ${sectionName}. Please add <script type="application/json" id="api-config"> to the page HTML.`
    );
  }
  // Try to parse JSON configuration
  try {
    // Get API config script tag
    const configScriptElement = document.getElementById("api-config");
    // Parse JSON from script tag content
    const pageConfig = JSON.parse(configScriptElement.textContent);
    // Return configuration for this section or null if section not found
    return pageConfig[sectionName] || null;
  } catch (parseError) {
    // Throw error if parsing fails (no fallback)
    throw new Error(
      `Failed to parse API configuration for section: ${sectionName}. ${parseError.message}`
    );
  }
}

/**
 * Fetch with timeout and error handling
 * @param {string} url - URL to fetch from
 * @param {Object} fetchOptions - Fetch API options object
 * @param {number} timeoutMilliseconds - Timeout in milliseconds (default: 20000)
 * @returns {Promise<Response>} Fetch response object
 */
async function fetchWithTimeout(url, fetchOptions = {}, timeoutMilliseconds = FETCH_TIMEOUT) {
  // Create abort controller for timeout handling
  const abortController = new AbortController();
  // Set timeout to abort request after specified duration
  const timeoutIdentifier = setTimeout(() => abortController.abort(), timeoutMilliseconds);

  // Try to fetch the resource
  try {
    // Default cache control to prevent browser caching
    // Only add if cache option is not explicitly provided in fetchOptions
    const finalFetchOptions = {
      // Spread fetch options first
      ...fetchOptions,
      // Add cache control if not already specified (prevents browser caching)
      ...(fetchOptions.cache === undefined ? { cache: 'no-store' } : {}),
      // Add abort signal for timeout control
      signal: abortController.signal
    };
    
    // Perform fetch request with abort signal
    const fetchResponse = await fetch(url, finalFetchOptions);
    // Clear timeout since request completed
    clearTimeout(timeoutIdentifier);

    // Check if response indicates an HTTP error
    if (!fetchResponse.ok) {
      // Get status text or use default
      const responseStatusText = fetchResponse.statusText || "Unknown Error";
      // Initialize error message with status code
      let errorMessageText = `HTTP ${fetchResponse.status}: ${responseStatusText}`;

      // Try to extract error message from response body
      try {
        // Attempt to parse response as JSON
        const errorResponseData = await fetchResponse.json().catch(() => null);
        // Check if response contains message field
        if (errorResponseData && errorResponseData.message) {
          // Use message from response
          errorMessageText = errorResponseData.message;
        } else if (errorResponseData && errorResponseData.error) {
          // Use error field from response
          errorMessageText = errorResponseData.error;
        }
      } catch (parseError) {
        // If JSON parsing fails, use status text (already set above)
      }

      // Create error object with enhanced message
      const httpError = new Error(errorMessageText);
      // Attach HTTP status code to error
      httpError.status = fetchResponse.status;
      // Attach status text to error
      httpError.statusText = responseStatusText;
      // Mark error as HTTP error type
      httpError.isHttpError = true;
      // Throw the error
      throw httpError;
    }

    // Return successful response
    return fetchResponse;
  } catch (caughtError) {
    // Clear timeout on error
    clearTimeout(timeoutIdentifier);

    // Check if error is due to timeout (abort)
    if (caughtError.name === "AbortError") {
      // Create timeout-specific error
      const timeoutError = new Error(
        `Request timed out after ${timeoutMilliseconds / 1000} seconds`
      );
      // Mark as timeout error
      timeoutError.isTimeout = true;
      // Store timeout duration
      timeoutError.timeout = timeoutMilliseconds;
      // Throw timeout error
      throw timeoutError;
    }

    // Check if error is network-related
    if (caughtError.name === "TypeError" && caughtError.message.includes("fetch")) {
      // Create network error
      const networkError = new Error("Network error: Unable to connect to server");
      // Mark as network error
      networkError.isNetworkError = true;
      // Throw network error
      throw networkError;
    }

    // Re-throw other errors (including HTTP errors)
    throw caughtError;
  }
}

// Expose payload builders for different sections
window.PayloadBuilders = {
  /**
   * Build payload for products section
   * @param {Object} filterValues - Filter values object
   * @param {Object} paginationOptions - Pagination options object
   * @returns {Object} Payload object for API request
   */
  products(filterValues = {}, paginationOptions = {}) {
    // Return payload object with all filter values
    return {
      // Include current environment
      env: window.Env.current,
      // Set section name
      section: "products",
      // Include search query if provided
      q: filterValues.q || undefined,
      // Include category filter if provided
      category: filterValues.category || undefined,
      // Include status filter if provided
      status: filterValues.status || undefined,
      // Include type filter if provided
      type: filterValues.type || undefined,
      // Include in stock filter if true
      in_stock: filterValues.inStock === true ? true : undefined,
      // Include promo filter if true
      promo_only: filterValues.promo === true ? true : undefined,
      // Include SKU filter if provided
      sku: filterValues.sku || undefined,
      // Include minimum price filter if provided
      price_min:
        typeof filterValues.price_from !== "undefined" ? filterValues.price_from : undefined,
      // Include maximum price filter if provided
      price_max: typeof filterValues.price_to !== "undefined" ? filterValues.price_to : undefined,
      // Include tags filter if array is provided
      tags: Array.isArray(filterValues.tags) ? filterValues.tags : undefined,
      // Include pagination options
      pagination: paginationOptions
    };
  },
  /**
   * Build payload for orders section
   * @param {Object} filterValues - Filter values object
   * @param {Object} paginationOptions - Pagination options object
   * @returns {Object} Payload object for API request
   */
  orders(filterValues = {}, paginationOptions = {}) {
    // Return payload object for orders
    return {
      // Include current environment
      env: window.Env.current,
      // Set section name
      section: "orders",
      // Include search query if provided
      query: filterValues.q || undefined,
      // Include status filter if provided
      status: filterValues.status || undefined,
      // Include channel filter if provided
      channel: filterValues.channel || undefined,
      // Include from date filter if provided
      from: filterValues.from || undefined,
      // Include to date filter if provided
      to: filterValues.to || undefined,
      // Include pagination options
      pagination: paginationOptions
    };
  },
  /**
   * Build payload for subscriptions section
   * @param {Object} filterValues - Filter values object
   * @param {Object} paginationOptions - Pagination options object
   * @returns {Object} Payload object for API request
   */
  subscriptions(filterValues = {}, paginationOptions = {}) {
    // Return payload object with spread filters and pagination
    return {
      env: window.Env.current,
      section: "subscriptions",
      ...filterValues,
      pagination: paginationOptions
    };
  },
  /**
   * Build payload for users section
   * @param {Object} filterValues - Filter values object
   * @param {Object} paginationOptions - Pagination options object
   * @returns {Object} Payload object for API request
   */
  users(filterValues = {}, paginationOptions = {}) {
    // Return payload object with spread filters and pagination
    return {
      env: window.Env.current,
      section: "users",
      ...filterValues,
      pagination: paginationOptions
    };
  },
  /**
   * Build payload for media section
   * @param {Object} filterValues - Filter values object
   * @param {Object} paginationOptions - Pagination options object
   * @returns {Object} Payload object for API request
   */
  media(filterValues = {}, paginationOptions = {}) {
    // Return payload object with spread filters and pagination
    return {
      env: window.Env.current,
      section: "media",
      ...filterValues,
      pagination: paginationOptions
    };
  },
  /**
   * Build payload for moderation section
   * @param {Object} filterValues - Filter values object
   * @param {Object} paginationOptions - Pagination options object
   * @returns {Object} Payload object for API request
   */
  moderation(filterValues = {}, paginationOptions = {}) {
    // Return payload object for moderation section
    return {
      env: window.Env.current,
      section: "moderation",
      q: filterValues.q || undefined,
      status: filterValues.status || undefined,
      type: filterValues.type || undefined,
      userId: filterValues.userId || undefined,
      from: filterValues.from || undefined,
      to: filterValues.to || undefined,
      pagination: paginationOptions
    };
  },
  /**
   * Build payload for demo section
   * @param {Object} filterValues - Filter values object
   * @param {Object} paginationOptions - Pagination options object
   * @returns {Object} Payload object for API request
   */
  demo(filterValues = {}, paginationOptions = {}) {
    // Return payload object with all filter values
    return {
      // Include current environment
      env: window.Env.current,
      // Set section name
      section: "demo",
      // Include search query if provided
      q: filterValues.q || undefined,
      // Include category filter if provided
      category: filterValues.category || undefined,
      // Include status filter if provided
      status: filterValues.status || undefined,
      // Include type filter if provided
      type: filterValues.type || undefined,
      // Include in stock filter if true
      in_stock: filterValues.inStock === true ? true : undefined,
      // Include promo filter if true
      promo_only: filterValues.promo === true ? true : undefined,
      // Include SKU filter if provided
      sku: filterValues.sku || undefined,
      // Include minimum price filter if provided
      price_min:
        typeof filterValues.price_from !== "undefined" ? filterValues.price_from : undefined,
      // Include maximum price filter if provided
      price_max: typeof filterValues.price_to !== "undefined" ? filterValues.price_to : undefined,
      // Include tags filter if array is provided
      tags: Array.isArray(filterValues.tags) ? filterValues.tags : undefined,
      // Include pagination options
      pagination: paginationOptions
    };
  },
  /**
   * Build payload for scylla-db section
   * @param {Object} filterValues - Filter values object
   * @param {Object} paginationOptions - Pagination options object
   * @returns {Object} Payload object for API request
   */
  "scylla-db"(filterValues = {}, paginationOptions = {}) {
    // Return payload object with spread filters and pagination
    return {
      env: window.Env.current,
      section: "scylla-db",
      ...filterValues,
      pagination: paginationOptions
    };
  },
  /**
   * Build payload for postgres section
   * @param {Object} filterValues - Filter values object
   * @param {Object} paginationOptions - Pagination options object
   * @returns {Object} Payload object for API request
   */
  postgres(filterValues = {}, paginationOptions = {}) {
    // Return payload object with spread filters and pagination
    return {
      env: window.Env.current,
      section: "postgres",
      ...filterValues,
      pagination: paginationOptions
    };
  },
  /**
   * Build payload for mysql section
   * @param {Object} filterValues - Filter values object
   * @param {Object} paginationOptions - Pagination options object
   * @returns {Object} Payload object for API request
   */
  mysql(filterValues = {}, paginationOptions = {}) {
    // Return payload object with spread filters and pagination
    return {
      env: window.Env.current,
      section: "mysql",
      ...filterValues,
      pagination: paginationOptions
    };
  },
  /**
   * Build payload for kyc-shufti section
   * @param {Object} filterValues - Filter values object
   * @param {Object} paginationOptions - Pagination options object
   * @returns {Object} Payload object for API request
   */
  "kyc-shufti"(filterValues = {}, paginationOptions = {}) {
    // Return payload object for KYC section
    return {
      // Include current environment
      env: window.Env.current,
      // Set section name
      section: "kyc-shufti",
      // Include search query if provided (maps to userId or reference in backend)
      q: filterValues.q || undefined,
      // Include email filter if provided (client-side filtered)
      email: filterValues.email || undefined,
      // Include country filter if provided (client-side filtered)
      country: filterValues.country || undefined,
      // Include status filter if provided
      status: filterValues.status || undefined,
      // Include from date filter if provided (maps to dateFrom)
      from: filterValues.from || undefined,
      // Include to date filter if provided (maps to dateTo)
      to: filterValues.to || undefined,
      // Include pagination options
      pagination: paginationOptions
    };
  },
  /**
   * Build default payload for unknown sections
   * @param {Object} filterValues - Filter values object
   * @param {Object} paginationOptions - Pagination options object
   * @returns {Object} Payload object for API request
   */
  default(filterValues = {}, paginationOptions = {}) {
    // Return default payload object with spread filters and pagination
    return {
      env: window.Env.current,
      section: "default",
      ...filterValues,
      pagination: paginationOptions
    };
  }
};

/**
 * Fetches data from local JSON files
 * @param {string} sectionName - Section name (products, orders, etc.)
 * @returns {Promise<Array>} Array of data items
 */
async function localFetch(sectionName) {
  // Data files are now located in page/{section}/data.json
  // Get current pathname from window location
  const currentPathname = window.location.pathname;
  // Extract base path (everything before /page/)
  const basePath = currentPathname.substring(0, currentPathname.indexOf("/page/") + 1) || "";
  // Construct full URL to data file
  const dataFileUrl = `${basePath}page/${sectionName}/data.json`;

  // Try to fetch the data file
  try {
    // Fetch data file with timeout handling
    const fetchResponse = await window.ApiService._fetchWithTimeout(dataFileUrl, {
      cache: "no-store"
    });
    // Parse and return JSON data
    return await fetchResponse.json();
  } catch (fetchError) {
    // Enhance error message with file path information
    if (fetchError.isHttpError) {
      // Check for 404 not found error
      if (fetchError.status === 404) {
        // Set custom message for missing file
        fetchError.message = `Data file not found: ${dataFileUrl}`;
      } else if (fetchError.status >= 500) {
        // Set custom message for server errors
        fetchError.message = `Server error (${fetchError.status}): ${
          fetchError.statusText || "Internal Server Error"
        }`;
      }
    } else if (fetchError.isTimeout) {
      // Set custom message for timeout errors
      fetchError.message = `Request timed out after ${
        fetchError.timeout / 1000
      } seconds while loading: ${dataFileUrl}`;
    }
    // Re-throw enhanced error
    throw fetchError;
  }
}

/**
 * Get total count for a section (from separate endpoint)
 * @param {string} sectionName - Section name to get count for
 * @param {Object} filters - Filter values object
 * @returns {Promise<number|null>} Total count or null if unavailable
 */
async function getTotalCount(sectionName, filters = {}) {
  try {
    // Get page-specific API configuration
    const pageApiConfig = getPageApiConfig(sectionName);
    const currentEnvironment = window.Env?.current || "dev";
    
    if (!pageApiConfig || !pageApiConfig[currentEnvironment]) {
      return null;
    }

    const endpoint = pageApiConfig[currentEnvironment].endpoint?.trim();
    const shouldUseEndpoint = USE_ENDPOINTS || (endpoint && endpoint !== "");

    if (shouldUseEndpoint && endpoint) {
      // Try to fetch from /count endpoint
      const countUrl = endpoint.endsWith('/') 
        ? endpoint.slice(0, -1) + '/count'
        : endpoint + '/count';
      
      // Build query string from filters
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value != null && value !== '') {
          queryParams.append(key, value);
        }
      });
      
      const urlWithParams = queryParams.toString() 
        ? `${countUrl}?${queryParams.toString()}`
        : countUrl;

      const response = await fetchWithTimeout(urlWithParams, { method: 'GET' });
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.count || data.total || null;
    } else {
      // For mock data, apply filters and return filtered count
      // Use fetchWithTimeout directly to avoid circular dependency
      const currentPathname = window.location.pathname;
      const basePath = currentPathname.substring(0, currentPathname.indexOf("/page/") + 1) || "";
      const dataFileUrl = `${basePath}page/${sectionName}/data.json`;
      
      try {
        const fetchResponse = await fetchWithTimeout(dataFileUrl, { 
          cache: "no-store",
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
        if (!fetchResponse.ok) return null;
        let fullData = await fetchResponse.json();
        
        console.log('[getTotalCount] Total items before filter:', fullData.length, 'filters:', filters);
        
        if (!Array.isArray(fullData)) return null;
        
        // Apply status filter if provided (same logic as in get function)
        if (filters.status && filters.status !== "" && filters.status !== "Any") {
          console.log('[getTotalCount] Applying status filter:', filters.status);
          const originalLength = fullData.length;
          fullData = fullData.filter(
            (dataItem) => (dataItem.status || "").toLowerCase() === filters.status.toLowerCase()
          );
          console.log('[getTotalCount] After status filter:', fullData.length, 'items (was', originalLength, ')');
        } else {
          console.log('[getTotalCount] No status filter to apply');
        }
        
        // Apply other filters if needed (category, type, etc.)
        // Add more filter logic here if needed for accurate counts
        
        console.log('[getTotalCount] Returning count:', fullData.length);
        return fullData.length;
      } catch (error) {
        console.warn(`[ApiService] Failed to fetch mock data for count:`, error);
        return null;
      }
    }
  } catch (error) {
    console.warn(`[ApiService] Failed to fetch total count for ${sectionName}:`, error);
    return null;
  }
}

/**
 * API Service
 * Main service for fetching data from local or remote sources
 */
window.ApiService = {
  /**
   * Expose fetchWithTimeout function for use in page scripts
   */
  _fetchWithTimeout: fetchWithTimeout,
  
  /**
   * Get total count for a section from separate endpoint
   */
  getTotalCount: getTotalCount,

  /**
   * Get data for a section with optional filters and pagination
   * @param {string} sectionName - Section name to fetch data for
   * @param {Object} requestOptions - Options object
   * @param {Object} requestOptions.filters - Filter values object
   * @param {Object} requestOptions.pagination - Pagination object with limit and offset
   * @returns {Promise<Object>} Response object with items, total, nextCursor, prevCursor
   */
  async get(sectionName, { filters = {}, pagination = { limit: 50, offset: 0 } } = {}) {
    // Extract base section name from path (e.g., "developer/scylla-db" -> "scylla-db") by splitting by "/" and getting the last part
    const sectionNameParts = sectionName.split("/");
    const baseSectionName = sectionNameParts[sectionNameParts.length - 1];
    // Get payload builder function for section (try full path first, then base name, then default)
    const payloadBuilderFunction =
      window.PayloadBuilders && window.PayloadBuilders[sectionName]
        ? window.PayloadBuilders[sectionName]
        : window.PayloadBuilders && window.PayloadBuilders[baseSectionName]
        ? window.PayloadBuilders[baseSectionName]
        : window.PayloadBuilders.default;

    // Build payload using builder function
    const requestPayload = payloadBuilderFunction(filters, pagination);
    // Log payload and filters for debugging
    console.log("[ApiService] GET - Section:", sectionName, "Filters:", filters, "Payload:", requestPayload);

    // Simulate network latency for realistic behavior
    await new Promise((resolveFunction) => setTimeout(resolveFunction, 450));

    // Get page-specific API configuration from HTML (check if config script tag exists first, will throw error if missing)
    if (!hasApiConfigScript()) {
      throw new Error(
        `API configuration script tag (#api-config) is missing for section: ${sectionName}. Please add <script type="application/json" id="api-config"> to the page HTML.`
      );
    }
    // Try full section name first, then base section name
    // getPageApiConfig returns null if section not found in config (but script tag exists)
    const pageApiConfig = getPageApiConfig(sectionName) || getPageApiConfig(baseSectionName);
    // Get current environment
    const currentEnvironment = window.Env.current;
    // Check if current environment should use real endpoint (must be non-empty string)
    const shouldUseEndpoint =
      pageApiConfig &&
      pageApiConfig[currentEnvironment] &&
      pageApiConfig[currentEnvironment].endpoint &&
      pageApiConfig[currentEnvironment].endpoint.trim() !== "";

    // Check if using remote API endpoints (global flag or page-specific config)
    if (USE_ENDPOINTS || shouldUseEndpoint) {
      // Get endpoint URL from page config or global config
      let endpointUrl;
      if (shouldUseEndpoint && pageApiConfig[currentEnvironment].endpoint) {
        // Use page-specific endpoint
        endpointUrl = pageApiConfig[currentEnvironment].endpoint;
      } else {
        // Use global endpoint configuration
        const baseUrl = (window.AdminEndpoints?.base || {})[window.Env.current] || "";
        const routePath = (window.AdminEndpoints?.routes || {})[sectionName] || `/${sectionName}`;
        endpointUrl = baseUrl + routePath;
      }

      // Try to fetch from remote API
      try {
        // Check if this section uses GET with query parameters (kyc-shufti)
        const usesGetMethod = sectionName === "kyc-shufti" || baseSectionName === "kyc-shufti";
        
        // Declare API response variable
        let apiResponse;
        
        // Check if using GET method
        if (usesGetMethod) {
          // Build query parameters for GET request
          const queryParams = new URLSearchParams();
          // Add search query (maps to userId or reference based on pattern)
          if (filters.q) {
            // If query starts with "ref-", it's likely a reference ID
            if (filters.q.startsWith("ref-")) {
              queryParams.append("reference", filters.q);
            } else {
              // Otherwise, treat as userId
              queryParams.append("userId", filters.q);
            }
          }
          // Add status filter (send as-is, no mapping needed)
          if (filters.status && filters.status !== "" && filters.status !== "Any") {
            // Send status directly to backend (already in backend format)
            queryParams.append("status", filters.status);
          }
          // Add dateFrom filter
          if (filters.from) {
            queryParams.append("dateFrom", filters.from);
          }
          // Add dateTo filter
          if (filters.to) {
            queryParams.append("dateTo", filters.to);
          }
          // Add limit for pagination
          if (pagination.limit) {
            queryParams.append("limit", pagination.limit);
          }
          // Add offset for pagination
          if (pagination.offset) {
            queryParams.append("offset", pagination.offset);
          }
          // Construct full URL with query parameters
          const queryString = queryParams.toString();
          const fullUrl = queryString ? `${endpointUrl}?${queryString}` : endpointUrl;
          // Fetch data from remote endpoint using GET
          apiResponse = await window.ApiService._fetchWithTimeout(fullUrl, {
            // Use GET method
            method: "GET"
          });
        } else {
          // Fetch data from remote endpoint using POST
          apiResponse = await window.ApiService._fetchWithTimeout(endpointUrl, {
            // Use POST method
            method: "POST",
            // Set content type header
            headers: { "Content-Type": "application/json" },
            // Stringify payload as request body
            body: JSON.stringify(requestPayload)
          });
        }
        // Parse JSON response
        let responseData = await apiResponse.json();
        
        // Transform backend response format for kyc-shufti section
        // Backend returns: { count, sessions, filters, timestamp }
        // Frontend expects: { items, total, nextCursor, prevCursor }
        // Backend field mapping: reference -> referenceId, userEmail -> email, userCountry -> country, created_at -> createdAt
        if (usesGetMethod && responseData.sessions && Array.isArray(responseData.sessions)) {
          // Transform sessions to items - map backend field names to frontend field names
          // Keep status values as-is from backend (e.g., "verification.accepted", "verification.declined")
          let allItems = responseData.sessions.map((session) => {
            // Map backend fields to frontend expected fields
            return {
              ...session,
              // Map reference to referenceId
              referenceId: session.reference,
              // Map userEmail to email
              email: session.userEmail,
              // Map userCountry to country
              country: session.userCountry,
              // Map created_at to createdAt
              createdAt: session.created_at,
              // Map appLocale to locale
              locale: session.appLocale,
              // Map verificationMode to mode
              mode: session.verificationMode,
              // Keep status and lastEvent as-is from backend (no normalization)
              status: session.status,
              lastEvent: session.lastEvent || session.status,
              // Keep original fields for backward compatibility
              reference: session.reference,
              userEmail: session.userEmail,
              userCountry: session.userCountry,
              created_at: session.created_at,
              appLocale: session.appLocale,
              verificationMode: session.verificationMode
            };
          });
          
          // Apply client-side filtering for unsupported filters (email, country) BEFORE pagination
          // Apply email filter if provided (client-side)
          if (filters.email) {
            // Convert email to lowercase for case-insensitive search
            const emailFilter = filters.email.toLowerCase();
            // Filter array by email (check both userEmail and email fields)
            allItems = allItems.filter((dataItem) => {
              // Get email from mapped field or original field
              const itemEmail = (dataItem.email || dataItem.userEmail || "").toLowerCase();
              // Return true if email contains filter value
              return itemEmail.includes(emailFilter);
            });
          }
          
          // Apply country filter if provided (client-side)
          if (filters.country) {
            // Convert country to uppercase for case-insensitive search
            const countryFilter = filters.country.toUpperCase();
            // Filter array by country (check both userCountry and country fields)
            allItems = allItems.filter((dataItem) => {
              // Get country from mapped field or original field
              const itemCountry = (dataItem.country || dataItem.userCountry || dataItem.data?.country || "").toUpperCase();
              // Return true if country matches filter value
              return itemCountry.includes(countryFilter);
            });
          }
          
          // Apply pagination (client-side since backend returns all)
          const paginationOffset = Number(pagination?.offset || 0);
          const paginationLimit = Number(pagination?.limit || 50);
          const paginationEndIndex = Math.min(paginationOffset + paginationLimit, allItems.length);
          
          // Create transformed response with filtered and paginated items
          responseData = {
            items: allItems.slice(paginationOffset, paginationEndIndex),
            total: allItems.length, // Use filtered count, not original count
            nextCursor: paginationEndIndex < allItems.length ? paginationEndIndex : null,
            prevCursor: paginationOffset > 0 ? Math.max(0, paginationOffset - paginationLimit) : null
          };
        } else if (responseData.items && Array.isArray(responseData.items)) {
          // Apply client-side filtering for other sections that use POST
          // Create filtered array starting with response items
          let filteredItems = responseData.items;
          
          // Apply email filter if provided (client-side)
          if (filters.email) {
            // Convert email to lowercase for case-insensitive search
            const emailFilter = filters.email.toLowerCase();
            // Filter array by email
            filteredItems = filteredItems.filter((dataItem) => {
              // Get email and convert to lowercase
              const itemEmail = (dataItem.email || "").toLowerCase();
              // Return true if email contains filter value
              return itemEmail.includes(emailFilter);
            });
          }
          
          // Apply country filter if provided (client-side)
          if (filters.country) {
            // Convert country to uppercase for case-insensitive search
            const countryFilter = filters.country.toUpperCase();
            // Filter array by country
            filteredItems = filteredItems.filter((dataItem) => {
              // Get country from dataItem or nested data object
              const itemCountry = (dataItem.country || dataItem.data?.country || "").toUpperCase();
              // Return true if country matches filter value
              return itemCountry.includes(countryFilter);
            });
          }
          
          // Update response with filtered items
          responseData.items = filteredItems;
          // Update total count if it was provided
          if (typeof responseData.total === "number") {
            responseData.total = filteredItems.length;
          }
        }
        
        // Return response data
        return responseData;
      } catch (apiError) {
        // Enhance error message with endpoint information
        if (apiError.isHttpError) {
          // Check for 404 not found
          if (apiError.status === 404) {
            // Set message for missing endpoint
            apiError.message = `Endpoint not found: ${endpointUrl}`;
          } else if (apiError.status >= 500) {
            // Set message for server errors
            apiError.message = `Internal server error (${apiError.status}): ${
              apiError.statusText || "Server Error"
            }`;
          } else {
            // Set message for other HTTP errors
            apiError.message = `API error (${apiError.status}): ${
              apiError.statusText || "Request Failed"
            }`;
          }
        } else if (apiError.isTimeout) {
          // Set message for timeout errors
          apiError.message = `Request timed out after ${
            apiError.timeout / 1000
          } seconds: ${endpointUrl}`;
        } else if (apiError.isNetworkError) {
          // Set message for network errors
          apiError.message = `Network error: Unable to connect to ${endpointUrl}`;
        }
        // Re-throw enhanced error
        throw apiError;
      }
    } else {
      // Fetch data array from local JSON file
      let dataArray = await localFetch(sectionName);

      // Apply search query filter if provided
      if (filters.q) {
        // Convert query to lowercase for case-insensitive search
        const searchQuery = filters.q.toLowerCase();
        // Filter array by search query
        dataArray = dataArray.filter((dataItem) => {
          // Get user ID and convert to lowercase
          const itemUserId = (dataItem.userId || "").toLowerCase();
          // Get reference ID and convert to lowercase
          const itemReferenceId = (dataItem.referenceId || "").toLowerCase();
          // Return true if query matches user ID or reference ID
          return itemUserId.includes(searchQuery) || itemReferenceId.includes(searchQuery);
        });
      }

      // Apply email filter if provided
      if (filters.email) {
        // Convert email to lowercase for case-insensitive search
        const emailFilter = filters.email.toLowerCase();
        // Filter array by email
        dataArray = dataArray.filter((dataItem) => {
          // Get email and convert to lowercase
          const itemEmail = (dataItem.email || "").toLowerCase();
          // Return true if email contains filter value
          return itemEmail.includes(emailFilter);
        });
      }

      // Apply country filter if provided
      if (filters.country) {
        // Convert country to uppercase for case-insensitive search
        const countryFilter = filters.country.toUpperCase();
        // Filter array by country
        dataArray = dataArray.filter((dataItem) => {
          // Get country from dataItem or nested data object
          const itemCountry = (dataItem.country || dataItem.data?.country || "").toUpperCase();
          // Return true if country matches filter value
          return itemCountry.includes(countryFilter);
        });
      }

      // Apply status filter if provided and not empty/Any
      if (filters.status && filters.status !== "" && filters.status !== "Any") {
        console.log('[ApiService] Applying status filter:', filters.status, 'to', dataArray.length, 'items');
        // Filter array by status (exact match, case-insensitive)
        dataArray = dataArray.filter(
          (dataItem) => (dataItem.status || "").toLowerCase() === filters.status.toLowerCase()
        );
        console.log('[ApiService] After status filter:', dataArray.length, 'items remaining');
      } else {
        console.log('[ApiService] No status filter applied. filters.status =', filters.status);
      }

      // Apply from date filter if provided
      if (filters.from) {
        // Create date object from filter value
        const fromDateFilter = new Date(filters.from);
        // Filter array by from date
        dataArray = dataArray.filter((dataItem) => {
          // Create date object from item created date
          const itemCreatedDate = new Date(dataItem.createdAt);
          // Return true if item date is on or after from date
          return itemCreatedDate >= fromDateFilter;
        });
      }

      // Apply to date filter if provided
      if (filters.to) {
        // Create date object from filter value
        const toDateFilter = new Date(filters.to);
        // Set time to end of day (23:59:59.999)
        toDateFilter.setHours(23, 59, 59, 999);
        // Filter array by to date
        dataArray = dataArray.filter((dataItem) => {
          // Create date object from item created date
          const itemCreatedDate = new Date(dataItem.createdAt);
          // Return true if item date is on or before to date
          return itemCreatedDate <= toDateFilter;
        });
      }

      // Get pagination offset value
      const paginationOffset = Number(pagination?.offset || 0);
      // Get pagination limit value
      const paginationLimit = Number(pagination?.limit || 50);
      // Calculate end index for pagination
      const paginationEndIndex = Math.min(paginationOffset + paginationLimit, dataArray.length);

      // Return paginated response object
      return {
        // Return sliced array for current page
        items: dataArray.slice(paginationOffset, paginationEndIndex),
        // Return total count of all items
        total: dataArray.length,
        // Return next cursor if more items exist, null otherwise
        nextCursor: paginationEndIndex < dataArray.length ? paginationEndIndex : null,
        // Return previous cursor if not on first page, null otherwise
        prevCursor: paginationOffset > 0 ? Math.max(0, paginationOffset - paginationLimit) : null
      };
    }
  }
};

// Create backward compatibility alias for DataService
window.DataService = window.ApiService;
