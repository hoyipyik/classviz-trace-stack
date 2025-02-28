// callTreeRender.js
import { setupNodeInteractions } from './cytoscapeHandler.js';
import { createCytoscapeInstance } from './cytoscapeHandler.js';
import { createSidebar } from './sidebarHandler.js';

/**
 * Main function to render the call tree
 * @param {Object} graph - The graph data with nodes and edges
 */
export const callTreeRender = (graph) => {
    // Get the main container element
    const callTreeElement = document.getElementById('calltree');
    
    // Clear existing content
    clearElement(callTreeElement);
    
    // Create layout containers
    const { layoutContainer, cyContainer } = createLayoutContainers();
    callTreeElement.appendChild(layoutContainer);
    
    // Create sidebar elements
    const sidebar = createSidebar();
    layoutContainer.appendChild(sidebar);
    
    // Initialize the Cytoscape instance
    try {
        const safeNodes = sanitizeNodes(graph.nodes);
        const cy = createCytoscapeInstance(cyContainer, [...safeNodes, ...graph.edges], graph.style);
        
        // Setup node interaction handlers
        setupNodeInteractions(cy, sidebar);
        
        // Fit the view to see all elements
        cy.fit();
    } catch (error) {
        displayError(callTreeElement, error);
    }
};

/**
 * Clear all children from an element
 * @param {HTMLElement} element - The element to clear
 */
function clearElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

/**
 * Create the main layout containers
 * @returns {Object} The created container elements
 */
function createLayoutContainers() {
    // Create main layout container
    const layoutContainer = document.createElement('div');
    layoutContainer.id = 'calltree-layout';
    layoutContainer.style.width = '100%';
    layoutContainer.style.height = '800px';
    layoutContainer.style.position = 'relative';
    layoutContainer.style.overflow = 'hidden';
    
    // Create Cytoscape container
    const cyContainer = document.createElement('div');
    cyContainer.id = 'cy-container';
    cyContainer.style.width = '100%';
    cyContainer.style.height = '100%';
    cyContainer.style.transition = 'margin-right 0.3s ease';
    layoutContainer.appendChild(cyContainer);
    
    return { layoutContainer, cyContainer };
}

/**
 * Process nodes to ensure they have all required properties
 * @param {Array} nodes - The array of node objects
 * @returns {Array} Sanitized nodes with default values where needed
 */
function sanitizeNodes(nodes) {
    return nodes.map(node => {
        // Ensure node.data exists
        if (!node.data) {
            node.data = {};
        }
        
        // Provide default values for essential properties
        if (!node.data.className) node.data.className = '';
        if (!node.data.methodName) node.data.methodName = '';
        if (!node.data.label) {
            node.data.label = node.data.className + 
                (node.data.methodName ? '.' + node.data.methodName + '()' : '');
        }
        
        return node;
    });
}

/**
 * Display an error message
 * @param {HTMLElement} container - The container to display the error in
 * @param {Error} error - The error object
 */
function displayError(container, error) {
    console.error('Error rendering call tree:', error);
    container.innerHTML = `
        <div class="error-message">
            <h3>Error rendering call tree</h3>
            <p>${error.message}</p>
            <p>Please check the console for more details.</p>
        </div>
    `;
}