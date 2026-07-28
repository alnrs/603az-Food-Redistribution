"use strict";

/*
 * Send an authenticated request to the ShareBite API.
 * Retrieves a valid Cognito ID token before each request.
 */
async function apiRequest(options = {}) {
    if (
        !window.ShareBiteAuth ||
        typeof window.ShareBiteAuth.getIdToken !== "function"
    ) {
        throw new Error(
            "Authentication service is unavailable. Please refresh the page and sign in again."
        );
    }

    if (
        !window.SHAREBITE_CONFIG ||
        !window.SHAREBITE_CONFIG.apiUrl
    ) {
        throw new Error(
            "ShareBite API configuration could not be loaded."
        );
    }

    const token =
        await window.ShareBiteAuth.getIdToken();

    const response = await fetch(
        window.SHAREBITE_CONFIG.apiUrl,
        {
            mode: "cors",
            cache: "no-store",
            ...options,

            headers: {
                Accept: "application/json",

                ...(options.body
                    ? {
                          "Content-Type":
                              "application/json"
                      }
                    : {}),

                ...(options.headers || {}),

                Authorization:
                    `Bearer ${token}`
            }
        }
    );

    const responseText =
        await response.text();

    let responseData = {};

    try {
        responseData = responseText
            ? JSON.parse(responseText)
            : {};
    } catch (error) {
        responseData = {
            message: responseText
        };
    }

    if (!response.ok) {
        throw new Error(
            responseData.message ||
            responseData.error ||
            `HTTP ${response.status}`
        );
    }

    return responseData;
}

window.apiRequest = apiRequest;