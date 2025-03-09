/**
 * Functions for building the graph data structures
 */

/**
 * Create a Cytoscape node
 * @param {Object} data - Node data
 * @param {Object} position - Node position {x, y}
 * @return {Object} A Cytoscape node object
 */
export const createCytoscapeNode = (data, position) => {
    return {
      data,
      position
    };
  };
  
  /**
   * Create a Cytoscape edge between nodes
   * @param {string} sourceId - Source node ID
   * @param {string} targetId - Target node ID
   * @return {Object} A Cytoscape edge object
   */
  export const createCytoscapeEdge = (sourceId, targetId) => {
    return {
      data: {
        id: `e${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId
      }
    };
  };
  
  /**
   * Create the final graph output
   * @param {Array} nodes - Array of node objects
   * @param {Array} edges - Array of edge objects
   * @param {Array} style - Array of style objects
   * @return {Object} Complete graph with nodes, edges, and style
   */
  export const createGraph = (nodes, edges, style) => {
    return {
      nodes,
      edges,
      style
    };
  };