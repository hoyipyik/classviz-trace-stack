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
    window.cy = cy;
    
    return cy;
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
    
    if (node.length === 0) {
        console.error(`Node with ID "${nodeId}" not found`);
        return;
    }
    
    // Get current collapsed state and toggle it
    const currentCollapsed = node.data('collapsed');
    const collapsed = currentCollapsed === undefined ? true : !currentCollapsed;
    
    // console.log(`Toggle node ${nodeId}: collapsed=${collapsed}`);

    // Update node's collapsed data
    node.data('collapsed', collapsed);
    
    // Get all descendant nodes
    const descendants = getAllDescendants(cy, nodeId);
    
    if (collapsed) {
        // Collapse: hide all descendants
        hideNodes(cy, descendants);
    } else {
        // Expand: show direct children only
        const directChildren = getChildNodes(cy, nodeId);
        // console.log(`Showing ${directChildren.length} direct children of node ${nodeId}`);
        showDirectChildren(cy, nodeId, directChildren);
    }
    
    // Re-run layout
    runLayout(cy);
    
    // forceRender(cy);
}

/**
 * Run the graph layout algorithm
 * @param {Object} cy - The Cytoscape instance
 */
function runLayout(cy) {
    // Use preset layout to maintain existing positions
    cy.layout({
        name: 'preset',
        animate: true,
        animationDuration: 300,
        fit: false // Prevent zooming to fit which could change the view
    }).run();
}


/**
 * Force re-render all elements in the graph
 * @param {Object} cy - The Cytoscape instance
 */
function forceRender(cy) {
    cy.elements().forEach(ele => {
        if (ele.hasClass('hidden')) {
            ele.style('display', 'none');
        } else {
            ele.style('display', 'element');
        }
    });
    
    // Update style
    cy.style().update();
}

/**
 * Hide the specified nodes and their edges
 * @param {Object} cy - The Cytoscape instance
 * @param {Array} nodes - The nodes to hide
 */
function hideNodes(cy, nodes) {
    if (nodes.length === 0) {
        console.log("No nodes to hide");
        return;
    }
    
    console.log(`Hiding ${nodes.length} nodes`);
    
    nodes.forEach(descendant => {
        // use style to hide
        descendant.style('display', 'none');
        
        // Also add hidden class
        descendant.addClass('hidden');
        
        // Also hide edges connected to these nodes
        const connectedEdges = descendant.connectedEdges();
        connectedEdges.style('display', 'none');
        connectedEdges.addClass('hidden');
        
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
        // 直接使用樣式設置顯示
        child.style('display', 'element');
        
        // 同時移除 hidden 類
        child.removeClass('hidden');
        
        // Find and show the edge between parent and this child
        // Using selector to find edges between the parent and child
        const edgesToChild = cy.edges(`[source = "${parentId}"][target = "${child.id()}"]`);
        edgesToChild.style('display', 'element');
        edgesToChild.removeClass('hidden');
    });
}

/**
 * Expand all descendants of a node
 * @param {Object} cy - The Cytoscape instance
 * @param {string} nodeId - The ID of the node to expand
 */
export function expandAllDescendants(cy, nodeId) {
    // Get the node
    const node = cy.getElementById(nodeId);
    
    if (node.length === 0) {
        console.error(`Node with ID "${nodeId}" not found`);
        return;
    }
    
    // Set current node as not collapsed
    node.data('collapsed', false);
    
    // Get all descendant nodes
    const descendants = getAllDescendants(cy, nodeId);
    
    // Show all descendants
    descendants.forEach(descendant => {
        descendant.style('display', 'element');
        descendant.removeClass('hidden');
        
        // Show edges connected to these nodes
        const connectedEdges = descendant.connectedEdges();
        connectedEdges.style('display', 'element');
        connectedEdges.removeClass('hidden');
        
        // Set all descendants as not collapsed
        descendant.data('collapsed', false);
    });
    
    // Re-run layout
    runLayout(cy);
    
    // force render
    // forceRender(cy);
}

/**
 * Get all direct child nodes of a node
 * @param {Object} cy - The Cytoscape instance
 * @param {string} nodeId - The ID of the parent node
 * @returns {Array} The child nodes
 */
export function getChildNodes(cy, nodeId) {
    // Get all edges where this node is the source
    const outgoingEdges = cy.edges(`[source = "${nodeId}"]`);
    
    // Create an array to store the child nodes
    const childNodes = cy.collection();
    
    // For each outgoing edge, get the target node
    outgoingEdges.forEach(edge => {
        const targetId = edge.data('target');
        const targetNode = cy.getElementById(targetId);
        if (targetNode.length > 0) {
            childNodes.merge(targetNode);
        }
    });
    
    // console.log(`Found ${childNodes.length} direct children for node ${nodeId}`);
    return childNodes;
}

/**
 * Get all descendant nodes of a node (recursive)
 * @param {Object} cy - The Cytoscape instance
 * @param {string} nodeId - The ID of the parent node
 * @returns {Array} All descendant nodes
 */
export function getAllDescendants(cy, nodeId) {
    const descendants = cy.collection();
    const seen = new Set();
    
    function collectDescendants(id) {
        if (seen.has(id)) return;
        seen.add(id);
        
        const children = getChildNodes(cy, id);
        if (children.length > 0) {
            descendants.merge(children);
            children.forEach(child => {
                collectDescendants(child.id());
            });
        }
    }
    
    collectDescendants(nodeId);
    console.log(`Found ${descendants.length} total descendants for node ${nodeId}`);
    return descendants;
}