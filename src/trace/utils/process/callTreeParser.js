import { getNodeAttributes, createNodeLabel } from './nodeDataProcessor.js';
import { calculateTreeMetrics } from './treeMetricsCalculator.js';
import { computeNodeStatus } from './nodeStatusUtils.js';
import { createNodeFilter, getFilteredChildNodes } from './nodeFilter.js';
import { fetchNodeData } from './nodeDataProcessor.js';
import { createCytoscapeNode, createCytoscapeEdge } from './graphBuilder.js';
import { calculateNodePosition } from './layoutCalculator.js';
import { LAYOUT } from './constants.js';
import { getCytoscapeStyles } from './cytoscapeStyles.js';

/**
 * Extracts the package name from a fully qualified class name
 * @param {string} className - Fully qualified class name (e.g., nl.tudelft.jpacman.board.Square)
 * @return {string} Package name (e.g., nl.tudelft.jpacman.board)
 */
function extractPackageName(className) {
  if (!className || typeof className !== 'string') {
    return '';
  }
  
  // Find the last dot in the className
  const lastDotIndex = className.lastIndexOf('.');
  
  // If there's no dot, return empty string (no package)
  if (lastDotIndex === -1) {
    return '';
  }
  
  // Return everything before the last dot
  return className.substring(0, lastDotIndex);
}

export const EXCEPT_METHODS = [
  'java.awt.EventDispatchThread.run()', 
  'java.util.concurrent.ThreadPoolExecutor$Worker.run()'
];

export const callTreeParser = (xmlDoc, options = {}) => {
  // Default options with reasonable defaults
  const config = {
    excludeMethods: ['<init>', '<clinit>'],
    allowExcludedMethodsAtRoot: false,
    onlyPackages: true,
    includedPackages: ['nl.tudelft.jpacman'],
    exceptMethods: EXCEPT_METHODS,
    ...options
  };

  // Node mapping for direct access
  const nodeMap = {};
  
  // Arrays to store nodes and edges (for graph representation)
  const nodes = [];
  const edges = [];
  
  // Set to store unique package names
  const packages = new Set();
  
  // Node ID counter (starts from 0)
  let nodeIdCounter = 0;
  
  // Create node filter
  const shouldIncludeNode = createNodeFilter(config);

  /**
   * Process nodes using DFS and build cascade structure
   * @param {Element} xmlNode - XML node to traverse
   * @param {string|null} parentId - Parent node ID, null for root
   * @param {number} depth - Current depth in tree
   * @param {number} leftBound - Left boundary for calculating node position
   * @param {Map} visitedPaths - Map of visited paths for recursion detection
   * @param {boolean} parentIsFanout - Whether parent node has fanout
   * @return {Object} Node data and new left boundary
   */
  const processNodeDFS = (xmlNode, parentId = null, depth = 0, leftBound = 0, visitedPaths = new Map(), parentIsFanout = false) => {
    const isRoot = !parentId;
    const attributes = getNodeAttributes(xmlNode);

    // Skip excluded methods (unless at root and allowed)
    if (config.excludeMethods.includes(attributes.methodName) && !(isRoot && config.allowExcludedMethodsAtRoot)) {
      return { nodeData: null, newLeftBound: leftBound };
    }

    // Extract package name and add to packages set if it exists
    if (attributes.className) {
      const packageName = extractPackageName(attributes.className);
      if (packageName) {
        packages.add(packageName);
      }
    }

    // Create unique numeric ID for node (starting from 0)
    const nodeId = (nodeIdCounter++).toString();
    
    // Filter child nodes based on configuration
    const childNodes = getFilteredChildNodes(xmlNode, shouldIncludeNode, isRoot);

    // Create node label
    const label = createNodeLabel(isRoot, attributes.className, attributes.methodName);

    // Calculate node position
    const position = calculateNodePosition(xmlNode, shouldIncludeNode, depth, leftBound, childNodes);

    // Calculate node status
    const { status, visitedPaths: updatedVisitedPaths } = computeNodeStatus(
      isRoot,
      childNodes,
      attributes.className,
      attributes.methodName,
      visitedPaths,
      parentIsFanout,
      nodeId
    );

    // Calculate tree metrics
    const treeMetrics = calculateTreeMetrics(xmlNode, shouldIncludeNode);

    // Fetch and process node data
    const processedData = fetchNodeData(attributes.className, attributes.methodName, isRoot);

    // Create node data with all information
    const nodeData = {
      id: nodeId,
      parentId: parentId, // Include parent node ID
      label,
      className: attributes.className,
      methodName: attributes.methodName,
      ...processedData,
      time: attributes.time,
      selfTime: attributes.selfTime,
      isRoot,
      collapsed: false,
      selected: false,
      // Tree statistics
      treeStats: {
        directChildrenCount: treeMetrics.directChildrenCount,
        totalDescendants: treeMetrics.totalDescendants,
        subtreeDepth: treeMetrics.subtreeDepth,
        level: depth
      },
      // Node status
      status,
      // Initialize children array
      children: []
    };

    // Add node to mapping for direct access
    nodeMap[nodeId] = nodeData;
    
    // Create Cytoscape node and add to nodes array
    nodes.push(createCytoscapeNode(nodeData, position));
    
    // If there's a parent, create edge and add to edges array
    if (parentId !== null) {
      edges.push(createCytoscapeEdge(parentId, nodeId));
    }

    // Update leftBound for child node layout
    let newLeftBound = leftBound;
    
    // Process child nodes and add them to current node
    if (childNodes.length > 0) {
      childNodes.forEach(childNode => {
        const { nodeData: childData, newLeftBound: childLeftBound } = processNodeDFS(
          childNode,
          nodeId, // Pass current node ID as parent ID for children
          depth + 1,
          newLeftBound,
          new Map(updatedVisitedPaths),
          status.fanOut
        );
        
        if (childData) {
          nodeData.children.push(childData);
          newLeftBound = childLeftBound;
        }
      });
    } else {
      // If no children, just increment leftBound
      newLeftBound += LAYOUT.NODE_SIZE;
    }

    return { nodeData, newLeftBound };
  };

  // Get root node and start processing
  const rootNode = xmlDoc.getElementsByTagName('tree')[0];
  if (!rootNode) {
    console.error("Root 'tree' element not found in XML document");
    return { 
      cascadeTree: {}, 
      nodeMap: {}, 
      nodes: [], 
      edges: [],
      rootNode: null,
      packages: new Set()
    };
  }

  // Start processing from root node
  const { nodeData: rootData } = processNodeDFS(rootNode, null, 0, 0, new Map(), false);
  
  // Return empty result if processing failed
  if (!rootData) {
    return { 
      cascadeTree: {}, 
      nodeMap: {}, 
      nodes: [], 
      edges: [],
      rootNode: null,
      packages: new Set()
    };
  }

  // Create structure with root children's labels as keys
  const labelBasedTree = {};
  
  // Add root node's children as top-level entries in labelBasedTree
  if (rootData.children && rootData.children.length > 0) {
    rootData.children.forEach(child => {
      labelBasedTree[child.label] = child;
    });
  } else {
    // Use root node itself if it has no children
    labelBasedTree[rootData.label] = rootData;
  }

  // Get Cytoscape styles
  const styles = getCytoscapeStyles(LAYOUT.NODE_SIZE);

  // Return comprehensive result
  return { 
    cascadeTree: labelBasedTree,  // Cascade tree with labels as keys
    nodeMap: nodeMap,             // Node ID mapping
    rootNode: rootData,           // Original root node
    nodes: nodes,                 // Node array for graph representation
    edges: edges,                 // Edge array for graph representation
    cytoscapeStyles: styles,      // Cytoscape styles
    packages: packages            // Set of unique package names
  };
};