/**
 * APIHandler class to manage API requests, open popups, handle loading states,
 * send requests, and process responses.
 * Supports legacy and new parameter names for flexibility.
 *
 * @version 1.0
 */
class APIHandler {
    /**
     * Initializes the APIHandler class with optional default parameters.
     *
     * @param {Object} defaults - Default configuration for API requests.
     */
    constructor(defaults = {}) {
        this.defaultParams = {
            apiBaseUrl: '',
            queryParams: {},
            httpMethod: 'GET',
            requestData: {},
            ...defaults
        };
    }

    /**
     * Handles an API request with given parameters.
     *
     * @param {Object} apiParams - Parameters for the API request.
     * @returns {Promise<Object|void>} - Returns response data or undefined.
     */
    async handleRequest(apiParams) {
        console.log("-> APIHandler: Starting request", ["data = " + JSON.stringify(apiParams), "filename = api.js", "reference_code = Ab12"]);

        // Apply default parameters and map legacy names to new ones
        apiParams = {
            apiBaseUrl: apiParams.baseUrl || this.defaultParams.apiBaseUrl,
            queryParams: apiParams.params || this.defaultParams.queryParams,
            httpMethod: apiParams.method || this.defaultParams.httpMethod,
            requestData: apiParams.data || this.defaultParams.requestData,
            responseCallback: apiParams.callback || this.defaultParams.responseCallback,
            popupIdToOpen: apiParams.openPopupId || this.defaultParams.popupIdToOpen,
            targetContainer: apiParams.container || this.defaultParams.targetContainer,
            ...apiParams
        };

        console.log("-> APIHandler: Mapped API parameters", ["data = " + JSON.stringify(apiParams), "filename = api.js", "reference_code = Cd34"]);

        // Extract specific parameters from the apiParams object
        const {
            apiBaseUrl,
            queryParams,
            httpMethod,
            requestData,
            responseCallback,
            popupIdToOpen,
            targetContainer
        } = apiParams;

        // Initialize responseData to hold the response from the API
        let responseData;

        // Begin API request handling
        try {
            // Open popup if `popupIdToOpen` is provided
            if (popupIdToOpen) {
                console.log("-> APIHandler: Opening popup with ID", ["data = " + popupIdToOpen, "filename = api.js", "reference_code = Gh78"]);
                // Open the popup with the provided ID
                this.handlePopup(popupIdToOpen);
            }

            // Construct the base URL for the request
            let url = this.constructUrl(apiBaseUrl, queryParams, httpMethod);

            // Send the API request and await the response
            const response = await fetch(url, {
                method: httpMethod,
                body: httpMethod === 'POST' ? (requestData instanceof FormData ? requestData : JSON.stringify(requestData)) : null
            });

            console.log("-> APIHandler: API Response Status", ["data = " + response.status, "filename = api.js", "reference_code = Cd12"]);

            // Process the API response
            responseData = await this.processResponse(response, apiParams);

            // Handle the response based on the provided parameters
            if (targetContainer) {
                console.log("-> APIHandler: Populating target container with API data", ["data = " + targetContainer, "filename = api.js", "reference_code = Zf12"]);

                // Populate the target container with the API response data
                this.populateContentWithApiData(targetContainer, responseData, queryParams?.per_page);
            } else if (popupIdToOpen) {
                console.log("-> APIHandler: Populating popup container with API data", ["data = " + popupIdToOpen, "filename = api.js", "reference_code = Xz56"]);

                // Populate the popup container with the API response data
                this.populatePopupContent(popupIdToOpen, responseData);
            } else if (responseCallback) {
                console.log("-> APIHandler: Calling response callback function", ["data = " + responseCallback, "filename = api.js", "reference_code = Lx90"]);
    
                // Call the response callback function with the response data
                responseCallback(responseData);
            }

            // Return the response data if successful
            return responseData;

        } catch (error) {
            console.error("-> APIHandler: Error occurred", ["data = " + error.message, "filename = api.js", "reference_code = Za34"]);
            // Dispatch an error event if an error occurs during the API request
            this.dispatchErrorEvent(apiParams, error);
        }
    }

    /**
     * Constructs the URL for the API request.
     *
     * @param {string} baseUrl - Base URL for the API.
     * @param {Object} queryParams - Query parameters for GET requests.
     * @param {string} method - HTTP method, like 'GET' or 'POST'.
     * @returns {string} - Constructed URL with query parameters.
     */
    constructUrl(baseUrl, queryParams, method) {
        // Initialize the URL with the base URL
        let url = baseUrl;

        // If the method is GET, serialize query parameters into a query string
        if (method === 'GET') {
            console.log("-> APIHandler: HTTP Method is GET, processing query parameters", ["data = " + JSON.stringify(queryParams), "filename = api.js", "reference_code = Uv12"]);

            // Function to serialize parameters into URL query string format
            let serializeParams = params => Object.keys(params)
                .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
                .join('&');

            // Append serialized query parameters to the URL
            url += `?${serializeParams(queryParams)}`;
            console.log("-> APIHandler: Final GET Request URL with Parameters", ["data = " + url, "filename = api.js", "reference_code = Yz56"]);
        }

        // Return the constructed URL
        return url;
    }

    /**
     * Opens a popup with the specified ID.
     *
     * @param {string} popupId - ID of the popup to open.
     */
    handlePopup(popupId) {
        console.log("-> APIHandler: Attempting to open popup with ID", ["data = " + popupId, "filename = api.js", "reference_code = Gh78"]);

        // Check if open_popup function exists before attempting to open popup
        if (typeof open_popup === 'function') {
            // Open the popup using the provided ID
            open_popup({
                'target': `[data-popup-id=\'${popupId}\']`
            });
        } else {
            // Log an error if open_popup function does not exist
            console.error("-> APIHandler: Error - open_popup function is not defined.", ["filename = api.js", "reference_code = Ij90"]);
        }

        // Select the popup container element based on the provided ID
        const popUpContainer = document.querySelector(`[data-attribute-popup-ajax-container="${popupId}"]`);

        // Check if the popup container exists before performing any actions
        if (popUpContainer) {
            console.log("-> APIHandler: Popup Container Found", ["data = ", popUpContainer, "filename = api.js", "reference_code = Mn34"]);

            // Find the loader element within the popup container
            const loader = popUpContainer.querySelector('[data-loader]');

            // Find the blurred background element within the popup container
            const blurredBg = popUpContainer.querySelector('[data-blurred-background]');

            // Verify both loader and blurred background elements exist before proceeding
            if (loader) {
                console.log("-> APIHandler: Loader Found in Popup Container", ["data = ", loader, "filename = api.js", "reference_code = Op56"]);

                // Loop through all child elements of the popup container from the last to the first
                for (let i = (popUpContainer.children.length - 1); i >= 0; i--) {
                    // Select each child element in the container
                    const child = popUpContainer.children[i];

                    // Check if the current child element is neither the loader nor the blurred background
                    if (child !== loader && child !== blurredBg) {
                        // Remove the current child element if it is not the loader or blurred background
                        child.remove();

                        console.log("-> APIHandler: Removed child element from popup container", ["data = ", child, "filename = api.js", "reference_code = Qr78"]);
                    }
                }
                // Set the display property of the loader to 'flex' to make it visible while waiting for the API response
                loader.style.display = 'flex';
            }
        }
    }

    /**
     * Processes the API response, calling the appropriate handlers or dispatching events.
     *
     * @param {Response} response - Fetch API response.
     * @param {Object} apiParams - Original parameters passed to the request.
     * @returns {Promise<Object|void>} - Parsed response data if successful.
     */
    async processResponse(response, apiParams) {
        // Parse the JSON response data
        const responseData = await response.json();

        // Check if the response is successful (status code 200-299)
        if (response.ok) {
            console.log("-> APIHandler: Parsed Response Data", ["data = " + JSON.stringify(responseData), "filename = api.js", "reference_code = Ef34"]);
    
            // Dispatch a success event with the response data
            this.dispatchSuccessEvent(apiParams, response, responseData);
    
            // Return the parsed response data
            return responseData;
        } else {
            console.error("-> APIHandler: Error in API Response Status", ["data = " + response.status, "filename = api.js", "reference_code = Wx12"]);
    
            // Dispatch an error event with the response status
            this.dispatchErrorEvent(apiParams, new Error(`Request failed with status ${response.status}`));
    
            // Throw an error with the response status
            throw new Error(`Request failed with status ${response.status}`);
        }
    }

    /**
     * Populates a target container with data from the API response.
     *
     * @param {string} container - Identifier of the target container.
     * @param {Object} data - API response data.
     * @param {number} perPage - The number of items per page for pagination logic.
     */
    populateContentWithApiData(container, data, perPage) {
        console.log("-> populateContentWithApiData: Starting function execution", ["data = " + JSON.stringify(data), "filename = api.js", "reference_code = Zf4d"]);

        // Select the container based on the given container identifier, ensuring it exists.
        let containerElement = document.querySelector(`div[data-target="${container}"]`);
        if (!containerElement) return; // Return if containerElement does not exist.

        // Select elements within the container, ensuring each exists before proceeding.
        let contentContainer = containerElement.querySelector("[data-html-container]");
        let loader = containerElement.querySelector("[data-loader]");
        let emptyContainer = containerElement.querySelector("[data-empty]");

        // Extract the 'result' and 'last_page' properties from the parsed JSON data, ensuring they exist.
        const result = data.result || [];
        const lastPage = data.last_page;

        // Hide the loader if it exists.
        if (loader) {
            loader.style.display = "none";
            console.log("-> populateContentWithApiData: Hiding loader", ["loader = ", loader, "filename = api.js", "reference_code = W3gT"]);
        }

        // Check if there are no results and the last page is not false, indicating no more data to display.
        if (result.length === 0 && lastPage !== false) {
            // Hide the content container if it exists and display the empty container.
            if (contentContainer) contentContainer.style.display = "none";
            if (emptyContainer) emptyContainer.classList.remove("dn-ns");
            console.log("-> populateContentWithApiData: No results found, showing empty container", ["container = " + container, "filename = api.js", "reference_code = P1yR"]);
        } else {
            // Results are available to display, so show the content container and populate it with data.
            if (contentContainer) contentContainer.style.display = "";
            console.log("-> populateContentWithApiData: Showing content container", ["contentContainer = ", contentContainer, "filename = api.js", "reference_code = U6vE"]);

            // Iterate over each item in the result and append its HTML content to the content container.
            result.forEach(itemHTML => {
                if (contentContainer) {
                    contentContainer.insertAdjacentHTML("beforeend", itemHTML);
                    console.log("-> populateContentWithApiData: Appending HTML item to content container", ["itemHTML = " + itemHTML, "filename = api.js", "reference_code = K8fL"]);
                }
            });
        }

        // Select the "Load More" button if it exists within the container.
        let loadMoreButton = containerElement.querySelector("[data-load-more-button]");

        // If the "Load More" button exists, set its initial visibility and handle its behavior.
        if (loadMoreButton) {
            loadMoreButton.style.display = "inline-flex";
            console.log("-> populateContentWithApiData: Displaying 'Load More' button", ["loadMoreButton = ", loadMoreButton, "filename = api.js", "reference_code = Y3hG"]);

            // Call 'pageElementsHandleSaveButtonClick' to reset the "Load More" button to its default state.
            pageElementsHandleSaveButtonClick(loadMoreButton, true);
            console.log("-> populateContentWithApiData: Called pageElementsHandleSaveButtonClick to reset 'Load More' button", ["loadMoreButton = ", loadMoreButton, "filename = api.js", "reference_code = B9jQ"]);

            // Hide the "Load More" button if there are fewer results than perPage or if it's the last page.
            if (result.length < perPage || lastPage === true) {
                loadMoreButton.style.display = "none";
                console.log("-> populateContentWithApiData: Hiding 'Load More' button due to end of data", ["result.length = " + result.length, "perPage = " + perPage, "lastPage = " + lastPage, "filename = api.js", "reference_code = R4zD"]);
            }
        }
    }

    /**
     * Populates a popup container with data from the API response.
     *
     * @param {string} popupId - ID of the popup to populate.
     * @param {Object} data - API response data.
     */
    populatePopupContent(popupId, data) {
        // Select the popup container
        const popUpContainer = document.querySelector(`[data-attribute-popup-ajax-container="${popupId}"]`);

        // Check if the popup container exists before performing any actions
        if (popUpContainer) {
            console.log("-> apiHandler: Popup container exists", ["data = ", popUpContainer, "filename = api.js", "reference_code = Mn12"]);

            // Find the loader element within the popup container
            const loader = popUpContainer.querySelector('[data-loader]');

            // Check if the loader exists before performing any actions
            if (loader) {
                loader.style.display = 'none';
                console.log("-> apiHandler: Hiding the loader", ["data = ", loader, "filename = api.js", "reference_code = Op34"]);
            }

            // Insert the received HTML content into the popup container
            popUpContainer.insertAdjacentHTML('beforeend', data.html);
        }
    }

    /**
     * Dispatches a custom success event for successful API requests.
     */
    dispatchSuccessEvent(apiParams, response, data) {
        // Dispatch a custom event with the response data
        document.dispatchEvent(new CustomEvent('dash-api-handler-response', {
            detail: { success: true, error: false, args: apiParams, response, data }
        }));
    }

    /**
     * Dispatches a custom error event when an API request fails.
     */
    dispatchErrorEvent(apiParams, error) {
        // Dispatch a custom event with the response data
        document.dispatchEvent(new CustomEvent('dash-api-handler-response', {
            detail: { success: false, error: true, data: null, args: apiParams, error_message: error }
        }));
    }
}

// Usage example:
// const apiParams = {
//     apiBaseUrl: 'https://api.example.com/data',
//     queryParams: { per_page: 10 },
//     httpMethod: 'GET',
//     requestData: {},
//     responseCallback: (data) => console.log(data),
// };
// new APIHandler().handleRequest(apiParams);




// CSRF Protection

// No specific measures are taken for CSRF (Cross-Site Request Forgery) protection.
// Recommendation: Include CSRF tokens in requests if interacting with a server that relies on session-based authentication or otherwise requires CSRF protection. Although JWT tokens provide some CSRF resistance, consider adding server-side checks for CSRF when necessary.
// Content Security Policy (CSP)

// The code does not ensure CSP, which can prevent malicious script execution.
// Recommendation: Add headers on the server to enforce CSP, allowing only scripts and resources from trusted origins.

// Additionally, enforce strict sanitization policies for any data that interacts with HTML in the DOM to prevent XSS vulnerabilities.



// test minified
// update all usage of code
// documentation for how to use api handler with a very basic summary of this script which explains the flow of the copde with some slight technical data.
