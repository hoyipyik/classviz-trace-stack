// cytoscapeInitialization.js - Handles Cytoscape initialization

import { createLegend } from './legend.js';

/**
 * Create and initialize a Cytoscape instance
 * @param {HTMLElement} container - The container element for Cytoscape
 * @param {Array} elements - Graph elements (nodes and edges)
 * @param {Array} style - The style definitions for the graph
 * @param {Object} options - Additional options for customization
 * @param {boolean} options.addLegend - Whether to add a legend (default: true)
 * @param {string} options.legendPosition - Position of the legend (default: 'bottom-right')
 * @returns {Object} The Cytoscape instance
 */
export function createCytoscapeInstance(container, elements, style, options = {}) {
    // Set default options
    const defaultOptions = {
        addLegend: true,
        legendPosition: 'top-left' // 'top-left', 'top-right', 'bottom-left', 'bottom-right'
    };
    
    const config = { ...defaultOptions, ...options };
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

    // Make sure the parent container has an ID for legend reference
    if (!container.id) {
        container.id = 'cy-container-' + Date.now();
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
    
    // Add legend if enabled
    let legendControls = null;
    if (config.addLegend) {
        // Create the legend using the parent container's ID
        legendControls = createLegend(cy, container.id, config.legendPosition);
    }

    // Store the legend controls for later access
    cy.legend = legendControls;

    return cy;
}

/**
 * Toggle the legend visibility
 * @param {Object} cy - The Cytoscape instance
 * @param {boolean} visible - Whether the legend should be visible
 * @param {boolean} pinned - Whether to pin the legend
 */
export function toggleLegend(cy, visible = true, pinned = false) {
    if (cy && cy.legend) {
        if (visible) {
            cy.legend.legendContainer.style.display = 'block';
            if (typeof cy.legend.legendContainer.togglePin === 'function') {
                cy.legend.legendContainer.togglePin(pinned);
            }
        } else {
            cy.legend.legendContainer.style.display = 'none';
        }
    }
}