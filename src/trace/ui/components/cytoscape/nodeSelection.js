// cytoscape/interactions/nodeSelection.js - Handles node selection

/**
 * Creates a node selection manager
 * @returns {Object} Node selection API
 */
export function createNodeSelectionManager() {
    // Track selected node ID
    let selectedNodeId = null;
  
    /**
     * Select a node by ID and highlight it
     * @param {string} nodeId - ID of the node to select
     * @param {Object} cy - The Cytoscape instance
     * @returns {boolean} Whether the selection was successful
     */
    function selectNode(nodeId, cy) {
      // Skip if already selected
      if (selectedNodeId === nodeId) return true;
      
      // Clear previous selection
      clearSelection(cy);
  
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
    function clearSelection(cy) {
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
    function getSelectedNodeId() {
      return selectedNodeId;
    }
  
    // Return the public API
    return {
      selectNode,
      clearSelection,
      getSelectedNodeId
    };
  }