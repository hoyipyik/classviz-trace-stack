// cytoscape/nodeInteractions.js - Handles node interactions

import { displayNodeInfo } from "../sidebar/nodeInfoDisplay.js";
import { toggleSidebar } from "../sidebar/sidebarController.js";

// Track selected node ID
let selectedNodeId = null;
// Cache sidebar controller to avoid recreating it
let sidebarController = null;

/**
 * Setup interactions for nodes
 * @param {Object} cy - The Cytoscape instance
 * @param {HTMLElement} sidebar - The sidebar element
 */
export function setupNodeInteractions(cy, sidebar) {
  // Initialize sidebar controller only once
  if (!sidebarController) {
    sidebarController = toggleSidebar(cy);
  }
  
  const { showSidebar, hideSidebar } = sidebarController;

  // Use event delegation for better performance
  cy.removeListener('tap'); // Clear any existing listeners

  // Node tap event
  cy.on('tap', 'node', function(evt) {
    const node = evt.target;
    const nodeId = node.id();
    const nodeData = node.data();
    
    // Log node info
    console.log('Tapped node:', nodeId, nodeData);
    
    // Select node and update sidebar
    selectNode(nodeId, cy);
    displayNodeInfo(nodeData);
    showSidebar();
    
    // Prevent event bubbling
    evt.originalEvent.stopPropagation();
  });

  // Background tap event - use once property for efficiency
  cy.on('tap', function(evt) {
    if (evt.target === cy) {
      hideSidebar();
      clearNodeSelection(cy);
    }
  });
}

/**
 * Select a node by ID and highlight it
 * @param {string} nodeId - ID of the node to select
 * @param {Object} cy - The Cytoscape instance
 * @returns {boolean} Whether the selection was successful
 */
export function selectNode(nodeId, cy) {
  // Skip if already selected
  if (selectedNodeId === nodeId) return true;
  
  // Clear previous selection
  clearNodeSelection(cy);

  // Set new selection
  if (nodeId) {
    const node = cy.getElementById(nodeId);
    if (node.length > 0) {
      // Use batch for better performance with styles
      cy.startBatch();
      node.addClass('selected');
      cy.endBatch();
      
      selectedNodeId = nodeId;
      return true;
    }
  }
  
  return false;
}

/**
 * Clear all node selections
 * @param {Object} cy - The Cytoscape instance
 */
export function clearNodeSelection(cy) {
  if (!selectedNodeId) return; // Skip if nothing selected
  
  cy.startBatch();
  cy.nodes().removeClass('selected');
  cy.endBatch();
  
  selectedNodeId = null;
}

/**
 * Get the currently selected node ID
 * @returns {string|null} The selected node ID or null
 */
export function getSelectedNodeId() {
  return selectedNodeId;
}