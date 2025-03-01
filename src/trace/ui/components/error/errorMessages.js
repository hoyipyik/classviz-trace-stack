// ui/components/error/errorMessages.js

/**
 * Display an error message in a container
 * @param {HTMLElement} container - The container to display the error in
 * @param {Error} error - The error object
 */
export function displayError(container, error) {
    console.error('Error rendering content:', error);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <h3>Error rendering content</h3>
        <p>${error.message}</p>
        <p>Please check the console for more details.</p>
    `;
    
    container.appendChild(errorDiv);
}

/**
 * Display a not-found error message
 * @param {HTMLElement} container - The container to display the error in
 * @param {string} itemType - The type of item not found
 */
export function displayNotFoundError(container, itemType) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message not-found';
    errorDiv.innerHTML = `
        <h3>${itemType} not found</h3>
        <p>The requested ${itemType.toLowerCase()} could not be found.</p>
    `;
    
    container.appendChild(errorDiv);
}

/**
 * Display a loading placeholder
 * @param {HTMLElement} container - The container to display the message in
 * @param {string} message - The loading message to display
 */
export function displayLoadingMessage(container, message = 'Loading...') {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-message';
    loadingDiv.innerHTML = `
        <p>${message}</p>
    `;
    
    container.appendChild(loadingDiv);
}