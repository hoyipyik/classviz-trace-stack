import { colorUtils } from "./colorChanger.js";

/**
 * Maps method call data to flame graph compatible format
 * @param {Object} methodNode - The method call data node
 * @param {boolean} useTimeTotals - Whether to use total time (true) or self time (false) for node values
 * @return {Object} A flame graph compatible data structure
 */
export function mapMethodDataToTemporalFlameGraph(methodNode, useTimeTotals = true) {
  if (!methodNode) return null;

  // Extract the simple name from the label if available
  let displayName = methodNode.label;
  if (displayName && displayName.includes('.')) {
    // Get just the class name and method name from full path
    const parts = displayName.split('.');
    displayName = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  } else {
    displayName = `${methodNode.className}.${methodNode.methodName}()`;
  }

  const node = {
    name: displayName,
    value: Math.max(parseInt(useTimeTotals ? methodNode.time : methodNode.selfTime) || 1, 1),
    selected: methodNode.selected || false
  };

  // Add children if any
  if (methodNode.children && methodNode.children.length > 0) {
    node.children = methodNode.children.map(child => mapMethodDataToTemporalFlameGraph(child, useTimeTotals));
  }

  // Copy all properties from methodNode to the transformed node for metadata
  Object.keys(methodNode).forEach(key => {
    if (key !== 'children' && !(key in node)) {
      node[key] = methodNode[key];
    }
  });

  // Ensure key timing properties are correctly formatted as integers
  if (methodNode.time) node.totalTime = parseInt(methodNode.time);
  if (methodNode.selfTime) node.selfTime = parseInt(methodNode.selfTime);

  // Lighten color
  if (methodNode.color) node.color = colorUtils.lightenColor(methodNode.color, 0.35);

  return node;
}

/**
 * Maps method call data to a logical flame graph format
 * @param {Object} methodNode - The method call data node
 * @return {Object} Logical flame graph data structure showing call relationships
 */
export function mapMethodDataToLogicalFlameGraph(methodNode) {
  if (!methodNode) return null;

  // Extract the simple name from the label if available
  let displayName = methodNode.label;
  if (displayName && displayName.includes('.')) {
    // Get just the class name and method name from full path
    const parts = displayName.split('.');
    displayName = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  } else {
    displayName = `${methodNode.className}.${methodNode.methodName}()`;
  }

  const extraFactor = 0.05; // Additional 5% factor
  let children = [];

  // Recursively process children if they exist
  if (methodNode.children && methodNode.children.length > 0) {
    children = methodNode.children.map(child => mapMethodDataToLogicalFlameGraph(child));
  }

  // Set baseline value of 1 for leaf nodes; for nodes with children, calculate based on children sum
  const baseline = 1;
  let value = baseline;
  if (children.length > 0) {
    const sumChildren = children.reduce((sum, child) => sum + child.value, 0);
    value = Math.ceil(sumChildren * (1 + extraFactor));
  }

  const node = {
    name: displayName,
    value: value,
    selected: methodNode.selected || false
  };

  if (children.length > 0) {
    node.children = children;
  }

  // Copy original metadata (except 'children' property)
  Object.keys(methodNode).forEach(key => {
    if (key !== 'children' && !(key in node)) {
      node[key] = methodNode[key];
    }
  });

  // Process color if defined
  if (methodNode.color) {
    node.color = colorUtils.lightenColor(methodNode.color, 0.35);
  }

  return node;
}

/**
 * Generate arrays of nodes and edges from cascade tree and node mapping (nodes without children property)
 * @param {Object} cascadeTree - Cascade tree structure
 * @return {Object} Object containing arrays of nodes and edges
 */
export function convertToNodesAndEdges(cascadeTree) {
  const nodes = [];
  const edges = [];
  const processedIds = new Set();

  /**
   * Recursively process node and its children
   * @param {Object} node - Node to process
   */
  function processNode(node) {
    // Prevent processing the same node multiple times
    if (processedIds.has(node.id)) {
      return;
    }

    // Mark as processed
    processedIds.add(node.id);

    // Create data portion of node object (excluding children)
    const nodeData = { ...node };
    delete nodeData.children;  // Remove children property

    // Create node object and add to nodes array
    nodes.push({
      data: nodeData
    });

    // Get children of original node
    const children = node.children || [];

    // Process child relationships
    children.forEach(child => {
      // Create edge
      edges.push({
        data: {
          id: `e${node.id}-${child.id}`,
          source: node.id,
          target: child.id
        }
      });

      // Recursively process child node
      processNode(child);
    });
  }

  // Start processing from top-level nodes of cascade tree
  Object.values(cascadeTree).forEach(topNode => {
    processNode(topNode);
  });

  return { nodes, edges };
}