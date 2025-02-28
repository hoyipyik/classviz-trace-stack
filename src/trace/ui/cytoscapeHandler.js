// cytoscapeHandler.js - Handles Cytoscape initialization and operations
import { displayNodeInfo, toggleSidebar } from './sidebarHandler.js';

/**
 * Create and initialize a Cytoscape instance
 * @param {HTMLElement} container - The container element for Cytoscape
 * @param {Array} elements - Graph elements (nodes and edges)
 * @param {Array} style - The style definitions for the graph
 * @returns {Object} The Cytoscape instance
 */
export function createCytoscapeInstance(container, elements, style) {
    return cytoscape({
        container: container,
        elements: elements,
        style: style,
        layout: {
            name: 'preset' // Use the pre-calculated positions
        }
    });
}


/**
 * Setup interactions for nodes
 * @param {Object} cy - The Cytoscape instance
 * @param {HTMLElement} sidebar - The sidebar element
 */
export function setupNodeInteractions(cy, sidebar) {
    const { showSidebar, hideSidebar } = toggleSidebar(cy);
    
    // Node tap event
    cy.on('tap', 'node', function(evt) {
        const node = evt.target;
        console.log('Tapped node:', node.id(), node.data());
        
        // Display node details in the sidebar
        displayNodeInfo(node.data());
        
        // Show sidebar
        showSidebar();
        
        // Prevent event from bubbling to canvas
        evt.originalEvent.stopPropagation();
    });
    
    // Background tap event
    cy.on('tap', function(evt) {
        if (evt.target === cy) {
            hideSidebar();
        }
    });
}


/**
 * Toggle the visibility of a node's children
 * @param {Object} cy - The Cytoscape instance
 * @param {string} nodeId - The ID of the node to toggle
 */
export function toggleChildren(cy, nodeId) {
    // Get the node
    const node = cy.getElementById(nodeId);
    
    // Toggle collapse state
    const collapsed = !node.data('collapsed');

    // Update node's collapsed data
    cy.getElementById(nodeId).data('collapsed', collapsed);
    
    // Get all descendant nodes
    const descendants = getAllDescendants(cy, nodeId);
    
    if (collapsed) {
        // Collapse: hide all descendants
        hideNodes(cy, descendants);
    } else {
        // Expand: show direct children only
        const directChildren = getChildNodes(cy, nodeId);
        showDirectChildren(cy, nodeId, directChildren);
    }
    
    // Re-run layout
    runLayout(cy);
}

/**
 * Hide the specified nodes and their edges
 * @param {Object} cy - The Cytoscape instance
 * @param {Array} nodes - The nodes to hide
 */
function hideNodes(cy, nodes) {
    nodes.forEach(descendant => {
        descendant.addClass('hidden');
        // Also hide edges connected to these nodes
        descendant.connectedEdges().addClass('hidden');
        
        // Set all child nodes as collapsed
        descendant.data('collapsed', true);
    });
}

/**
 * Show direct children of a node
 * @param {Object} cy - The Cytoscape instance
 * @param {string} parentId - The ID of the parent node
 * @param {Array} children - The direct children to show
 */
function showDirectChildren(cy, parentId, children) {
    children.forEach(child => {
        child.removeClass('hidden');
        // Show edges connecting these nodes
        cy.getElementById(parentId).edgesTo(child).removeClass('hidden');
    });
}

/**
 * Run the graph layout algorithm
 * @param {Object} cy - The Cytoscape instance
 */
function runLayout(cy) {
    cy.layout({
        name: 'klay',
        directed: true,
        padding: 30,
        spacingFactor: 1.5,
        roots: ['root'],
        animate: true,
        animationDuration: 300
    }).run();
}

/**
 * Expand all descendants of a node
 * @param {Object} cy - The Cytoscape instance
 * @param {string} nodeId - The ID of the node to expand
 */
export function expandAllDescendants(cy, nodeId) {
    // Get the node
    const node = cy.getElementById(nodeId);
    
    // Set current node as not collapsed
    node.data('collapsed', false);
    
    // Get all descendant nodes
    const descendants = getAllDescendants(cy, nodeId);
    
    // Show all descendants
    descendants.forEach(descendant => {
        descendant.removeClass('hidden');
        // Show edges connected to these nodes
        descendant.connectedEdges().removeClass('hidden');
        
        // Set all descendants as not collapsed
        descendant.data('collapsed', false);
    });
    
    // Re-run layout
    runLayout(cy);
}

/**
 * Get all direct child nodes of a node
 * @param {Object} cy - The Cytoscape instance
 * @param {string} nodeId - The ID of the parent node
 * @returns {Array} The child nodes
 */
export function getChildNodes(cy, nodeId) {
    const node = cy.getElementById(nodeId);
    return node.outgoers().targets();
}

/**
 * Get all descendant nodes of a node (recursive)
 * @param {Object} cy - The Cytoscape instance
 * @param {string} nodeId - The ID of the parent node
 * @returns {Array} All descendant nodes
 */
export function getAllDescendants(cy, nodeId) {
    const descendants = [];
    const seen = new Set();
    
    function collectDescendants(id) {
        if (seen.has(id)) return;
        seen.add(id);
        
        const children = getChildNodes(cy, id);
        children.forEach(child => {
            descendants.push(child);
            collectDescendants(child.id());
        });
    }
    
    collectDescendants(nodeId);
    return descendants;
}