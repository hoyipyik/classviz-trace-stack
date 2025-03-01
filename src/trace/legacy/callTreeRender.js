// callTreeRender.js
import { createCytoscapeInstance } from './components/cytoscape/cytoscapeInitialization.js';
import { setupNodeInteractions } from './components/cytoscape/nodeInteractions.js';
import { createSidebar } from './components/sidebar/sidebarCreation.js';

/**
 * Main function to render the call tree
 * @param {Object} graph - The graph data with nodes and edges
 */
export const callTreeRender = (graph) => {
    console.log('callTreeRender called with graph:', !!graph);
    
    // Validate graph data
    if (!graph || !graph.nodes || !graph.edges || !graph.style) {
        console.error('Invalid or missing graph data:', graph);
        return;
    }
    
    // Get and validate the main container element
    const callTreeElement = document.getElementById('calltree');
    if (!callTreeElement) {
        console.error('Call tree container element not found');
        return;
    }
    
    // Clear existing content
    callTreeElement.innerHTML = '';
    
    // Create layout containers
    const { layoutContainer, cyContainer } = createLayoutContainers();
    callTreeElement.appendChild(layoutContainer);
    
    try {
        // Create sidebar elements
        layoutContainer.appendChild(createSidebar());
        
        // Process nodes and initialize Cytoscape
        const safeNodes = sanitizeNodes(graph.nodes);
        const graphElements = [...safeNodes, ...graph.edges];
        
        console.log(`Initializing Cytoscape with: ${safeNodes.length} nodes and ${graph.edges.length} edges`);
        
        // Initialize the Cytoscape instance
        const cy = createCytoscapeInstance(cyContainer, graphElements, graph.style);
        
        if (!cy) {
            throw new Error('Failed to create Cytoscape instance');
        }
        
        // Setup node interaction handlers
        setupNodeInteractions(cy, layoutContainer.querySelector('#sidebar'));
        
        // Handle view management
        handleViewFitting(cy);
        
        console.log('Call tree rendered successfully');
    } catch (error) {
        console.error('Error in callTreeRender:', error);
        displayError(callTreeElement, error);
    }
};

/**
 * Create the main layout containers
 * @returns {Object} The created container elements
 */
function createLayoutContainers() {
    // Create main layout container
    const layoutContainer = document.createElement('div');
    layoutContainer.id = 'calltree-layout';
    
    // Apply styles using classList and CSS variables for better performance
    Object.assign(layoutContainer.style, {
        width: '100%',
        height: '800px',
        position: 'relative',
        overflow: 'hidden'
    });
    
    // Create Cytoscape container
    const cyContainer = document.createElement('div');
    cyContainer.id = 'cy-container';
    
    Object.assign(cyContainer.style, {
        width: '100%',
        height: '100%',
        transition: 'margin-right 0.3s ease'
    });
    
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
        // Create a new node object to avoid mutating the original
        const safeNode = { ...node };
        
        // Ensure data property exists
        safeNode.data = { ...node.data || {} };
        
        const data = safeNode.data;
        
        // Set default values for essential properties
        data.className = data.className || '';
        data.methodName = data.methodName || '';
        
        // Set label if not present
        if (!data.label) {
            data.label = data.className + (data.methodName ? '.' + data.methodName + '()' : '');
        }
        
        // Initialize collapsed state
        if (data.collapsed === undefined) {
            data.collapsed = false;
        }
        
        return safeNode;
    });
}

/**
 * Handle view fitting based on whether this is the first render
 * @param {Object} cy - The Cytoscape instance
 */
function handleViewFitting(cy) {
    if (!window.calltreeRendered) {
        console.log('First call tree render, fitting view');
        cy.fit();
        window.calltreeRendered = true;
    } else {
        console.log('Subsequent call tree render, preserving view position');
    }
}

/**
 * Display an error message
 * @param {HTMLElement} container - The container to display the error in
 * @param {Error} error - The error object
 */
function displayError(container, error) {
    console.error('Error rendering call tree:', error);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <h3>Error rendering call tree</h3>
        <p>${error.message}</p>
        <p>Please check the console for more details.</p>
    `;
    
    container.appendChild(errorDiv);
}