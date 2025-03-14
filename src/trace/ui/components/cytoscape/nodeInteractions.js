// cytoscape/nodeInteractions.js - Main module that coordinates node interactions

import { createHoverCardManager } from "./hoverCard.js";
import { createNodeSelectionManager } from "./nodeSelection.js";
import { displayNodeInfo } from "../sidebar/nodeInfoDisplay.js";
import { toggleSidebar } from "../sidebar/sidebarController.js";
import { expandAllDescendants, toggleChildren } from "./nodeVisibility.js";
import { executeCytoscapeAction } from "../sidebar/controlSection.js";

// Manager instances
let hoverCardManager = null;
let nodeSelectionManager = null;
let sidebarController = null;
// Track if mouse is over a node
let isMouseOverNode = false;

/**
 * Setup interactions for nodes
 * @param {Object} cy - The Cytoscape instance
 * @param {HTMLElement} sidebar - The sidebar element
 */
export function setupNodeInteractions(cy, sidebar) {
  // Initialize managers if they don't exist
  if (!hoverCardManager) {
    hoverCardManager = createHoverCardManager();
  }
  
  if (!nodeSelectionManager) {
    nodeSelectionManager = createNodeSelectionManager();
  }
  
  if (!sidebarController) {
    sidebarController = toggleSidebar(cy);
  }
  
  const { showSidebar, hideSidebar } = sidebarController;

  // Clear existing listeners
  cy.removeListener('tap');
  cy.removeListener('mouseover');
  cy.removeListener('mouseout');

  // Setup tap event for node selection
  cy.on('tap', 'node', function(evt) {
    const node = evt.target;
    const nodeId = node.id();
    const nodeData = node.data();
    
    // Log node info
    console.log('Tapped node:', nodeId, nodeData);
    
    // Select node and update sidebar
    nodeSelectionManager.selectNode(nodeId, cy);
    displayNodeInfo(nodeData);
    showSidebar();
    
    // Prevent event bubbling
    evt.originalEvent.stopPropagation();
  });

  // Setup hover events for hover card
  cy.on('mouseover', 'node', function(evt) {
    isMouseOverNode = true;
    const node = evt.target;
    const nodeData = node.data();
    const renderedPosition = node.renderedPosition();
    
    // Define control buttons for the hover card
    const controlButtons = [
      {
        id: 'hover-toggle-children-btn',
        label: 'Toggle Children',
        handler: async (nodeId) => await executeCytoscapeAction(nodeId, toggleChildren)
      },
      {
        id: 'hover-expand-all-btn',
        label: 'Expand All',
        handler: async (nodeId) => await executeCytoscapeAction(nodeId, expandAllDescendants)
      },
      {
        id: 'hover-view-details-btn',
        label: 'View Details',
        handler: (nodeId) => {
          const node = cy.getElementById(nodeId);
          if (node.length > 0) {
            const nodeData = node.data();
            // Select node and update sidebar
            nodeSelectionManager.selectNode(nodeId, cy);
            displayNodeInfo(nodeData);
            showSidebar();
          }
        }
      }
    ];
    
    // Show hover card with node data and control buttons
    hoverCardManager.showCard(
      nodeData, 
      renderedPosition,
      controlButtons
    );
  });

  // Setup mouseout event
  cy.on('mouseout', 'node', function() {
    isMouseOverNode = false;
    
    // Don't hide immediately, check if mouse moved to the card
    setTimeout(() => {
      if (!isMouseOverNode && !hoverCardManager.isMouseOver()) {
        hoverCardManager.hideCard();
      }
    }, 100);
  });
  
  // Background tap event to clear selection
  cy.on('tap', function(evt) {
    if (evt.target === cy) {
      hideSidebar();
      nodeSelectionManager.clearSelection(cy);
    }
  });
}

/**
 * Get the currently selected node ID
 * @returns {string|null} The selected node ID or null
 */
export function getSelectedNodeId() {
  return nodeSelectionManager ? nodeSelectionManager.getSelectedNodeId() : null;
}

/**
 * Clean up event listeners and DOM elements
 * Should be called when unmounting the component
 */
export function cleanupNodeInteractions() {
  if (hoverCardManager) {
    hoverCardManager.destroy();
    hoverCardManager = null;
  }
  
  isMouseOverNode = false;
}