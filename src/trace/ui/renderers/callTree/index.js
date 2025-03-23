// ui/renderers/callTree/index.js
import { createLayoutContainers } from './layoutContainers.js';
import { sanitizeNodes } from './nodeProcessor.js';
import { displayError } from '../../components/error/errorMessages.js';
import { createSidebar } from '../../components/sidebar/sidebarCreation.js';
import { setupNodeInteractions } from '../../components/cytoscape/nodeInteractions.js';
import { createCytoscapeInstance } from '../../components/cytoscape/cytoscapeInitialization.js';

/**
 * Main function to render the call tree
 * @param {Object} graph - The graph data with nodes and edges
 * @returns {Object|null} - The Cytoscape instance or null if rendering failed
 */
export function renderCallTree(graph) {
    console.log('Call tree renderer initialized with graph:', !!graph);
    
    // Validate graph data
    if (!graph || !graph.nodes || !graph.edges || !graph.style) {
        console.error('Invalid or missing graph data:', graph);
        return null;
    }
    
    // Get and validate the main container element
    const callTreeElement = document.getElementById('calltree');
    if (!callTreeElement) {
        console.error('Call tree container element not found');
        return null;
    }
    
    // Clear existing content
    callTreeElement.innerHTML = '';
    
    try {
        // Create layout containers
        const { layoutContainer, cyContainer } = createLayoutContainers();
        callTreeElement.appendChild(layoutContainer);
        
        // Create and add sidebar
        layoutContainer.appendChild(createSidebar());
        
        // Process nodes and prepare graph elements
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
        
        // Handle view fitting
        // fitViewIfNeeded(cy);
        
        // Store Cytoscape instance for global access
        window.cytrace = cy;
        
        console.log('Call tree rendered successfully');
        return cy;
    } catch (error) {
        console.error('Error in renderCallTree:', error);
        displayError(callTreeElement, error);
        return null;
    }
}

/**
 * Handle view fitting based on whether this is the first render
 * @param {Object} cy - The Cytoscape instance
 */
export function fitViewIfNeeded(cy) {
    if (!window.calltreeRendered) {
        console.log('First call tree render, fitting view');
        cy.fit();
        window.calltreeRendered = true;
    } else {
        console.log('Subsequent call tree render, preserving view position');
    }
}