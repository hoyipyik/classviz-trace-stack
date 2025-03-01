// cytoscape/nodeVisibility.js - Functions for showing/hiding nodes
import { getChildNodes, getAllDescendants } from './nodeTraversal.js';
import { runLayout } from './layoutManager.js';

/**
 * Toggle the visibility of a node's children
 * @param {Object} cy - The Cytoscape instance
 * @param {string} nodeId - The ID of the node to toggle
 */
export function toggleChildren(cy, nodeId) {
    const node = cy.getElementById(nodeId);
    
    if (node.length === 0) {
        console.error(`Node with ID "${nodeId}" not found`);
        return;
    }

    // Toggle collapsed state
    const collapsed = !node.data('collapsed');
    node.data('collapsed', collapsed);

    if (collapsed) {
        // Collapse: hide all descendants
        hideNodes(getAllDescendants(cy, nodeId));
    } else {
        // Expand: show direct children only
        showNodes(getChildNodes(cy, nodeId), nodeId);
    }

    // Get current layout and re-run it
    const currentLayoutName = document.getElementById('fit-mode').value;
    runLayout(cy, currentLayoutName, false);
}

/**
 * Expand all descendants of a node
 * @param {Object} cy - The Cytoscape instance
 * @param {string} nodeId - The ID of the node to expand
 */
export function expandAllDescendants(cy, nodeId) {
    const node = cy.getElementById(nodeId);
    
    if (node.length === 0) {
        console.error(`Node with ID "${nodeId}" not found`);
        return;
    }

    // Set current node as not collapsed
    node.data('collapsed', false);
    
    // Get and show all descendants
    const descendants = getAllDescendants(cy, nodeId);
    showNodes(descendants);
    
    // Set all descendants as not collapsed
    descendants.forEach(descendant => {
        descendant.data('collapsed', false);
    });

    // Re-run layout
    const currentLayoutName = document.getElementById('fit-mode').value;
    runLayout(cy, currentLayoutName, false);
}

/**
 * Hide the specified nodes and their edges
 * @param {Array|Collection} nodes - The nodes to hide
 */
function hideNodes(nodes) {
    if (nodes.length === 0) return;

    console.log(`Hiding ${nodes.length} nodes`);
    
    // Process each node individually without using batch
    nodes.forEach(node => {
        // Hide node and add hidden class
        node.style('display', 'none');
        node.addClass('hidden');
        
        // Hide connected edges
        const connectedEdges = node.connectedEdges();
        connectedEdges.style('display', 'none');
        connectedEdges.addClass('hidden');
        
        // Mark as collapsed
        node.data('collapsed', true);
    });
}

/**
 * Show nodes and their connecting edges
 * @param {Array|Collection} nodes - The nodes to show
 * @param {string} [parentId] - Optional parent ID to only show edges from parent
 */
function showNodes(nodes, parentId = null) {
    if (nodes.length === 0) return;
    
    nodes.forEach(node => {
        // Show node and remove hidden class
        node.style('display', 'element');
        node.removeClass('hidden');
        
        if (parentId) {
            // Only show edges from parent to this child
            const edgesToParent = node.connectedEdges(`[source = "${parentId}"][target = "${node.id()}"]`);
            edgesToParent.style('display', 'element');
            edgesToParent.removeClass('hidden');
        } else {
            // Show all connected edges
            const connectedEdges = node.connectedEdges();
            connectedEdges.style('display', 'element');
            connectedEdges.removeClass('hidden');
        }
    });
}