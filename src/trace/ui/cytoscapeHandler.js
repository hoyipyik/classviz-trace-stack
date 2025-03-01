// cytoscapeHandler.js - Handles Cytoscape initialization and operations
import { displayNodeInfo, toggleSidebar } from './sidebarHandler.js';
let selectedNodeId = null;
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


/**
 * Setup interactions for nodes
 * @param {Object} cy - The Cytoscape instance
 * @param {HTMLElement} sidebar - The sidebar element
 */
export function setupNodeInteractions(cy, sidebar) {
    const { showSidebar, hideSidebar } = toggleSidebar(cy);

    // Node tap event
    cy.on('tap', 'node', function (evt) {
        const node = evt.target;
        console.log('Tapped node:', node.id(), node.data());
        selectNode(node.id(), cy);
        // Display node details in the sidebar
        displayNodeInfo(node.data());

        // Show sidebar
        showSidebar();

        // Prevent event from bubbling to canvas
        evt.originalEvent.stopPropagation();
    });

    // Background tap event
    cy.on('tap', function (evt) {
        if (evt.target === cy) {
            hideSidebar();
        }
    });
}


function selectNode(nodeId, cy) {
    // 清除之前的選擇
    clearNodeSelection(cy);

    // 設置新的選擇
    if (nodeId) {
        const node = cy.getElementById(nodeId);
        if (node.length > 0) {
            node.addClass('selected');
            selectedNodeId = nodeId;
        }
    }
}

// 清除節點選擇
function clearNodeSelection(cy) {
    cy.nodes().removeClass('selected');
    selectedNodeId = null;
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

// Add this new function to your cytoscapeHandler.js file

/**
 * Store the original positions of all visible nodes
 * @param {Object} cy - The Cytoscape instance
 * @returns {Object} Map of node IDs to their positions
 */
export function storeOriginalPositions(cy) {
    const positions = {};
    cy.nodes().forEach(node => {
        if (!node.hasClass('hidden')) {
            positions[node.id()] = {
                x: node.position('x'),
                y: node.position('y')
            };
        }
    });
    return positions;
}

/**
 * Restore nodes to their original positions
 * @param {Object} cy - The Cytoscape instance
 * @param {Object} positions - Map of node IDs to positions
 */
export function restorePositions(cy, positions) {
    Object.entries(positions).forEach(([id, pos]) => {
        const node = cy.getElementById(id);
        if (node.length > 0) {
            node.position(pos);
        }
    });
    cy.fit();
}

// Now modify your runLayout function to use these new functions
export function runLayout(cy, layoutName = 'preset', fitToView = false) {
    // Store original positions if they're not already stored in the cy instance
    if (!cy.scratch('originalPositions')) {
        cy.scratch('originalPositions', storeOriginalPositions(cy));
    }

    // Common layout options
    const layoutOptions = {
        animate: true,
        animationDuration: 300,
        fit: fitToView  // Use the fitToView parameter to control fitting
    };

    // Run the appropriate layout
    switch (layoutName) {
        case 'breadthfirst':
            cy.layout({
                name: 'breadthfirst',
                directed: true,
                padding: 40,
                spacingFactor: 1.3,     // Increased for better spacing
                circle: false,
                grid: true,
                nodeDimensionsIncludeLabels: true,
                roots: 'node[?isRoot]',
                maximal: true,
                avoidOverlap: true,
                animate: false,
                fit: true,
                rankDir: 'TB',          // Top to bottom direction
                ...layoutOptions
            }).run();
            break;
        case 'klay':
            cy.layout({
                name: 'klay',
                ...layoutOptions
            }).run();
            break;
        case 'circle':
            cy.layout({
                name: 'circle',
                ...layoutOptions
            }).run();
            break;
        case 'concentric':
            cy.layout({
                name: 'concentric',
                ...layoutOptions
            }).run();
            break;
        case 'dagre':
            cy.layout({
                name: 'dagre',
                ...layoutOptions
            }).run();
            break;
        case 'cola':
            cy.layout({
                name: 'cola',
                ...layoutOptions,
                fit: true,
                animate: true,
            }).run();
            break;
        case 'grid':
            cy.layout({
                name: 'grid',
                ...layoutOptions
            }).run();
            break;
        case 'cose':
            cy.layout({
                name: 'cose',
                ...layoutOptions
            }).run();
            break;
        case 'fcose':
            cy.layout({
                name: 'fcose',
                ...layoutOptions
            }).run();
            break;
        default:
            // Use the stored original positions instead of current preset data
            const originalPositions = cy.scratch('originalPositions');
            if (originalPositions) {
                restorePositions(cy, originalPositions);
            } else {
                // Fallback to normal preset if no stored positions
                cy.layout({
                    name: 'preset',
                    ...layoutOptions
                }).run();
            }
            break;

    }
}
/**
 * Force re-render all elements in the graph
 * @param {Object} cy - The Cytoscape instance
 */
export function forceRender(cy) {
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