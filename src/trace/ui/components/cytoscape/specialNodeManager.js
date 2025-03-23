import { EXCEPT_METHODS } from "../../../utils/process/callTreeParser.js";

/**
 * Extracts special nodes from a Cytoscape.js graph and constructs a new graph 
 * preserving the hierarchical relationships between special nodes.
 * 
 * @param {Object} cy - The Cytoscape.js instance
 * @returns {Object} - Object with nodes and edges arrays for the new graph
 */
export function extractWholeSpecialNodesTree(cy = window.cytrace) {
  // Arrays for our results
  const specialNodes = [];
  const specialEdges = [];

  // Maps for tracking
  const specialNodeIds = new Set(); // Set of original node IDs for quick lookup
  const labelToNodeData = new Map(); // Maps labels to node data objects

  // Step 1: Identify all special nodes
  cy.nodes().forEach(node => {
    const status = node.data('status') || {};
    const className = node.data('className');
    const nodeId = node.id();
    const label = node.data('label');

    // Check if this is a special node
    if (status.fanOut ||
      status.implementationEntryPoint ||
      status.recursiveEntryPoint ||
      className === "Root") {
    // if(true){
      
      const methodId = label;
      const lastDotBeforeParens = methodId.lastIndexOf(".", methodId.indexOf("("));
      const classId = methodId.substring(0, lastDotBeforeParens);
      let parent = classId;
      // methodId not in EXCEPT_METHODS, parent use classId, else ''
      if (EXCEPT_METHODS.includes(methodId)) {
        parent = '';
      }
      
      // Create node data with original ID as a property
      const nodeData = {
        ...node.data(),
        id: label,
        originalId: nodeId, // Store original ID to maintain relationship with original graph
        parent: parent,
        visible: true,
        name: label.split('.').pop(),
        originalId: nodeId,
        labels: [
            "Operation"
        ],
        properties: {
          ...node.data(),
          kind: "method",
          simpleName: label.split('.').pop(),
        }
      };
      
      // Add to special nodes array
      specialNodes.push({
        data: nodeData
      });

      // Store mapping of label to node data
      if (!labelToNodeData.has(label)) {
        labelToNodeData.set(label, []);
      }
      labelToNodeData.get(label).push(nodeData);
      
      // Store original node ID
      specialNodeIds.add(nodeId);
    }
  });

  // Step 2: Build parent map for the original graph
  const parentMap = new Map(); // Maps node ID to its parent

  cy.edges().forEach(edge => {
    const source = edge.source().id();
    const target = edge.target().id();

    // Add to parent map
    parentMap.set(target, source);
  });

  // Step 3: For each special node, find its nearest special ancestors
  specialNodeIds.forEach(nodeId => {
    findNearestSpecialAncestors(
      nodeId,
      specialNodeIds,
      parentMap,
      specialEdges,
      cy
    );
  });

  return {
    nodes: specialNodes,
    edges: specialEdges
  };
}

/**
 * Finds the nearest special ancestor for a given special node
 * and creates an edge between them.
 */
function findNearestSpecialAncestors(nodeId, specialNodeIds, parentMap, specialEdges, cy) {
  // Start from the node's parent
  let currentId = parentMap.get(nodeId);

  // Process special case: root nodes don't have ancestors
  if (!currentId) return;

  // Keep track of visited nodes to avoid cycles
  const visited = new Set();

  // Track the path length
  let pathLength = 0;

  // Go up the tree until we find a special ancestor or reach root
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    pathLength++;

    // If this ancestor is special, create an edge and stop searching upward
    if (specialNodeIds.has(currentId)) {
      // Get the label of source and target nodes from the original graph
      const sourceLabel = cy.getElementById(currentId).data('label');
      const targetLabel = cy.getElementById(nodeId).data('label');
      
      // Create a unique edge ID that includes both labels and original IDs
      // This ensures uniqueness even with duplicate labels
      const edgeId = `e_${sourceLabel}_${currentId}_${targetLabel}_${nodeId}`;
      
      specialEdges.push({
        data: {
          id: edgeId,
          source: sourceLabel,
          target: targetLabel,
          sourceOriginalId: currentId,
          targetOriginalId: nodeId,
          pathLength: pathLength,
          label: "trace_call",
          interaction: "trace_call"
        }
      });
      return; // Found nearest special ancestor, no need to go further
    }

    // Move up to the next parent
    currentId = parentMap.get(currentId);
  }
}