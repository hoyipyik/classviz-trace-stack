// sidebar/utils.js - Helper utility functions

/**
 * Escape HTML special characters to prevent injection
 * @param {string} unsafe - String that may contain HTML characters
 * @returns {string} Escaped string
 */
export const escapeHtml = (unsafe) => {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};


/**
 * Creates a property row for displaying in the sidebar
 * @param {string} label - Property label
 * @param {string} value - Property value
 * @param {boolean} isCode - Whether the value should be displayed as code
 * @param {string} [containerId] - Optional ID for the container div
 * @returns {string} HTML string for the property row
 */
export const createPropertyRow = (label, value, isCode = false, containerId = '') => {
    if (value === undefined || value === null || value === '') {
        return ''; // Don't display empty properties
    }

    const containerIdAttr = containerId ? ` id="${containerId}"` : '';
    const valueId = containerId ? `${containerId}-value` : '';
    
    const valueHtml = isCode
        ? `<pre class="code-block" ${valueId ? `id="${valueId}"` : ''}>${escapeHtml(value)}</pre>`
        : `<div class="property-value" ${valueId ? `id="${valueId}"` : ''}>${escapeHtml(value)}</div>`;

    return `
        <div class="property-row"${containerIdAttr}>
            <div class="property-label">${label}</div>
            ${valueHtml}
        </div>
    `;
};

/**
 * Format header text with line breaks at logical points if too long
 * @param {string} text - Original header text
 * @returns {string} Formatted header text with possible line breaks
 */
export const formatHeaderText = (text) => {
    if (text.length <= 30) return text;
    
    // Add a line break after the class name before the method name
    const lastDotIndex = text.lastIndexOf('.');
    if (lastDotIndex > 0) {
        return text.substring(0, lastDotIndex + 1) +
            '<br>' +
            text.substring(lastDotIndex + 1);
    }
    
    return text;
};