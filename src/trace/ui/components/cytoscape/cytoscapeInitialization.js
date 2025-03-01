// cytoscape/cytoscapeInitialization.js - Handles Cytoscape initialization

/**
 * Create and initialize a Cytoscape instance
 * @param {HTMLElement} container - The container element for Cytoscape
 * @param {Array} elements - Graph elements (nodes and edges)
 * @param {Array} style - The style definitions for the graph
 * @returns {Object} The Cytoscape instance
 */
export function createCytoscapeInstance(container, elements, style) {
    const updatedStyle = [...style];

    // Check if hidden style exists, if not add it
    const hasHiddenStyle = style.some(s => s.selector === '.hidden');
    if (!hasHiddenStyle) {
        updatedStyle.push({
            selector: '.hidden',
            style: {
                'display': 'none',
                'visibility': 'hidden'
            }
        });
    }

    const cy = cytoscape({
        container: container,
        elements: elements,
        style: updatedStyle,
        layout: {
            name: 'preset' // Use the pre-calculated positions
        }
    });

    // Store the Cytoscape instance globally for easy access from other modules
    window.cytrace = cy;

    return cy;
}