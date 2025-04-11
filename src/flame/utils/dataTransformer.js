import { colorUtils } from "./colorChanger.js";

/**
 * Maps method call data to flame graph compatible format with optimized layout
 * @param {Object} methodNode - The method call data node
 * @param {boolean} useTimeTotals - Whether to use total time (true) or self time (false) for node values
 * @param {number} minValue - Minimum value for any node (default: 1)
 * @param {number} scalingFactor - Factor to scale child nodes relative to parents (default: 0.95)
 * @return {Object} A flame graph compatible data structure
 */
export function mapMethodDataToTemporalFlameGraphWithLayoutOpt(methodNode, useTimeTotals = true, minValue = 8, scalingFactor = 0.95) {
  if (!methodNode) return null;
  
  // Step 1: Build the complete tree and calculate raw values
  function buildInitialTree(node) {
    if (!node) return null;
    
    // Add to selectedMap if node is selected
    // if (node.selected && selectedMap) {
    //   selectedMap.set(node.id, node);
    // }
    
    const rawValue = parseInt(useTimeTotals ? node.time : node.selfTime) || 0;
    const treeNode = {
      originalNode: node,
      rawValue: rawValue,
      depth: 0,
      children: [],
      parent: null
    };
    
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        const childNode = buildInitialTree(child);
        if (childNode) {
          childNode.parent = treeNode;
          childNode.depth = treeNode.depth + 1;
          treeNode.children.push(childNode);
        }
      });
    }
    
    return treeNode;
  }
  
  const rootNode = buildInitialTree(methodNode);
  
  // Step 2: Identify all tree nodes and calculate max depth
  const allNodes = [];
  let maxDepth = 0;
  
  function collectNodes(node) {
    if (!node) return;
    
    allNodes.push(node);
    maxDepth = Math.max(maxDepth, node.depth);
    
    node.children.forEach(child => collectNodes(child));
  }
  
  collectNodes(rootNode);
  
  // Step 3: Calculate strict hierarchical values from top down
  // First, assign the root node value
  rootNode.value = Math.max(rootNode.rawValue, minValue);
  
  // Then process by depth level to ensure consistent parent-child relationships
  for (let depth = 1; depth <= maxDepth; depth++) {
    const nodesAtDepth = allNodes.filter(node => node.depth === depth);
    
    nodesAtDepth.forEach(node => {
      if (!node.parent) return; // Skip orphaned nodes
      
      // Calculate the max possible value based on parent
      const parentValue = node.parent.value;
      const maxChildValue = parentValue * scalingFactor;
      
      // Apply minimum value, but cap at the parent-determined maximum
      node.value = Math.min(
        maxChildValue,
        Math.max(node.rawValue, minValue)
      );
      
      // Important: Ensure this node's value is visibly smaller than its parent
      if (Math.abs(node.value - parentValue) < 0.1) {
        node.value = parentValue * scalingFactor;
      }
    });
  }
  
  // Step 4: Perform a final check to enforce strict parent > child relationship
  allNodes.forEach(node => {
    if (node.parent && node.value >= node.parent.value) {
      node.value = node.parent.value * scalingFactor;
    }
  });
  
  // Step 5: Build the final flame graph structure
  function buildFlameGraph(treeNode) {
    if (!treeNode) return null;
    
    const originalNode = treeNode.originalNode;
    
    const node = {
      name: originalNode.label || `${originalNode.className}.${originalNode.methodName}()`,
      value: treeNode.value,
      selected: originalNode.selected || false,
      _originalValue: treeNode.rawValue,
      _depth: treeNode.depth // Store depth for debugging
    };
    
    // Process children if any, sort by value
    if (treeNode.children && treeNode.children.length > 0) {
      // Sort children by their values in descending order
      const sortedChildren = [...treeNode.children].sort((a, b) => 
        b.value - a.value
      );
      
      node.children = sortedChildren.map(child => buildFlameGraph(child));
    }
    
    // Copy all properties from originalNode to the transformed node for metadata
    Object.keys(originalNode).forEach(key => {
      if (key !== 'children' && !(key in node)) {
        node[key] = originalNode[key];
      }
    });
    
    // Ensure key timing properties are correctly formatted as integers
    if (originalNode.time) node.totalTime = parseInt(originalNode.time);
    if (originalNode.selfTime) node.selfTime = parseInt(originalNode.selfTime);
    
    // Lighten color
    if (originalNode.color) node.color = colorUtils.lightenColor(originalNode.color, 0.35);
    
    return node;
  }
  
  return buildFlameGraph(rootNode);
}


/**
 * Maps method call data to flame graph compatible format
 * @param {Object} methodNode - The method call data node
 * @param {boolean} useTimeTotals - Whether to use total time (true) or self time (false) for node values
 * @return {Object} A flame graph compatible data structure
 */
export function mapMethodDataToTemporalFlameGraph(methodNode, useTimeTotals = true) {
  if (!methodNode) return null;

  // Add to selectedMap if node is selected
  // if (methodNode.selected && selectedMap) {
  //   selectedMap.set(methodNode.id, methodNode);
  // }

  const node = {
    name: methodNode.label || `${methodNode.className}.${methodNode.methodName}()`,
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

  // // Add to selectedMap if node is selected
  // if (methodNode.selected && selectedMap) {
  //   selectedMap.set(methodNode.id, methodNode);
  // }

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
    name: methodNode.label || `${methodNode.className}.${methodNode.methodName}()`,
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