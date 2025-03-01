// cytoscape/layoutManager.js - Layout handling and position management

/**
 * Store the original positions of all visible nodes
 * @param {Object} cy - The Cytoscape instance
 * @returns {Object} Map of node IDs to their positions
 */
export function storeOriginalPositions(cy) {
    const positions = {};
    cy.nodes().forEach(node => {
      positions[node.id()] = {
        x: node.position('x'),
        y: node.position('y')
      };
    });
    return positions;
  }
  
  /**
   * Restore nodes to their original positions
   * @param {Object} cy - The Cytoscape instance
   * @param {Object} positions - Map of node IDs to positions
   * @param {boolean} doFit - Whether to fit the graph to view after restoring positions  
   */
  export function restorePositions(cy, positions, doFit = false) {
    // Prevent layout transition animation during position restoration
    cy.elements().removeClass('animated');
    
    // Apply the stored positions to each node more efficiently
    for (const nodeId of Object.keys(positions)) {
      const node = cy.getElementById(nodeId);
      if (node.length > 0) {
        node.position(positions[nodeId]);
      }
    }
    
    // Only fit to view if explicitly requested
    if (doFit) {
      cy.fit();
    }
    
    // Re-enable animations for future layout changes using requestAnimationFrame
    requestAnimationFrame(() => {
      cy.elements().addClass('animated');
    });
  }
  
  /**
   * Get layout options for a specific layout
   * @param {string} layoutName - The name of the layout
   * @param {boolean} fitToView - Whether to fit the graph after layout
   * @returns {Object} The layout options
   */
  function getLayoutOptions(layoutName, fitToView) {
    // Common options that apply to all layouts
    const commonOptions = {
      animate: true,
      animationDuration: 300,
      fit: fitToView
    };
    
    // Layout-specific options
    let specificOptions = {};
    
    switch (layoutName) {
      case 'breadthfirst':
        specificOptions = {
          directed: true,
          padding: 40,
          spacingFactor: 1.3,
          circle: false,
          grid: true,
          nodeDimensionsIncludeLabels: true,
          roots: 'node[?isRoot]',
          maximal: true,
          avoidOverlap: true,
          animate: false,
          rankDir: 'TB'
        };
        break;
      case 'case':
        specificOptions = {
          animate: false,
          fit: true,
        };
        break;
      case 'cola':
        specificOptions = {
          animate: true,
          fit: true,
        };
        break;
      // No specific options for other layouts - use defaults
    }
    
    // Combine options
    return {
      name: layoutName,
      ...commonOptions,
      ...specificOptions
    };
  }
  
  /**
   * Run a specific layout algorithm on the graph
   * @param {Object} cy - The Cytoscape instance
   * @param {string} layoutName - The name of the layout algorithm to use
   * @param {boolean} fitToView - Whether to fit the graph to view after layout
   */
  export function runLayout(cy, layoutName = 'preset', fitToView = false) {
    // Store original positions if not already stored
    if (!cy.scratch('originalPositions')) {
      cy.scratch('originalPositions', storeOriginalPositions(cy));
    }
  
    // Handle preset layout (original positions)
    if (layoutName === 'preset') {
      const originalPositions = cy.scratch('originalPositions');
      if (originalPositions) {
        restorePositions(cy, originalPositions, fitToView);
        return;
      }
    }
  
    // Get options for the specified layout
    const layoutOptions = getLayoutOptions(layoutName, fitToView);
    
    // Run the layout
    cy.layout(layoutOptions).run();
  }
  
  /**
   * Force re-render all elements in the graph
   * @param {Object} cy - The Cytoscape instance
   */
  export function forceRender(cy) {
    // Use batch for better performance
    cy.startBatch();
    
    cy.elements().forEach(ele => {
      ele.style('display', ele.hasClass('hidden') ? 'none' : 'element');
    });
    
    cy.endBatch();
    cy.style().update();
  }