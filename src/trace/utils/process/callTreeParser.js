import { getCytoscapeStyles } from './cytoscapeStyles.js';
import { LAYOUT } from './constants.js';
import { fetchNodeData, getNodeAttributes, createNodeLabel } from './nodeDataProcessor.js';
import { calculateTreeMetrics } from './treeMetricsCalculator.js';
import { computeNodeStatus } from './nodeStatusUtils.js';
import { calculateNodePosition, calculateChildrenLayouts } from './layoutCalculator.js';
import { createNodeFilter, getFilteredChildNodes } from './nodeFilter.js';
import { createCytoscapeNode, createCytoscapeEdge, createGraph } from './graphBuilder.js';


export const EXCEPT_METHODS = [
  'java.awt.EventDispatchThread.run()', 
  'java.util.concurrent.ThreadPoolExecutor$Worker.run()'
];

/**
 * Parse XML document into a Cytoscape-compatible graph
 * @param {Document} xmlDoc - XML document to parse
 * @param {Object} options - Configuration options
 * @param {Array<string>} [options.excludeMethods=[]] - Method names to exclude (e.g. ['<init>', '<clinit>'])
 * @param {boolean} [options.allowExcludedMethodsAtRoot=false] - Allow excluded methods if they're at the root
 * @param {boolean} [options.onlyPackages=false] - Only include nodes from specific packages
 * @param {Array<string>} [options.includedPackages=[]] - Packages to include (e.g. ['nl.tudelft.jpacman'])
 * @param {Array<string>} [options.exceptMethods=[]] - Specific method paths to include even if from excluded packages
 * @return {Object} Nodes, edges and style for Cytoscape
 */
export const callTreeParser = (xmlDoc, options = {}) => {
  // Default options with sensible defaults
  const config = {
    excludeMethods: ['<init>', '<clinit>'],
    allowExcludedMethodsAtRoot: false,
    onlyPackages: true,
    includedPackages: ['nl.tudelft.jpacman'],
    exceptMethods: EXCEPT_METHODS,
    ...options
  };

  const nodes = [];
  const edges = [];
  let nodeIdCounter = 1;

  // Create the node filter
  const shouldIncludeNode = createNodeFilter(config);

  /**
   * Position nodes and create the graph
   * @param {Element} xmlNode - XML node to traverse
   * @param {string|null} parentId - ID of the parent node, null for root
   * @param {number} depth - Current depth in the tree
   * @param {number} leftBound - Left boundary for positioning
   * @param {Map} visitedPaths - Map to track visited paths for recursion detection
   * @param {boolean} parentIsFanout - Whether the parent node has fanout
   * @return {number} New left boundary after processing
   */
  const traverseNode = (xmlNode, parentId = null, depth = 0, leftBound = 0, visitedPaths = new Map(), parentIsFanout = false) => {
    const isRoot = !parentId;
    const attributes = getNodeAttributes(xmlNode);

    // Skip excluded methods (unless at root if allowed)
    if (config.excludeMethods.includes(attributes.methodName) && !(isRoot && config.allowExcludedMethodsAtRoot)) {
      return leftBound;
    }

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

    // Create Cytoscape node
    const nodeData = {
      id: nodeId,
      ...attributes,
      ...processedData,
      label,
      isRoot,
      collapsed: false,
      // Tree statistics
      treeStats: {
        directChildrenCount: treeMetrics.directChildrenCount,
        totalDescendants: treeMetrics.totalDescendants,
        subtreeDepth: treeMetrics.subtreeDepth,
        level: depth
      },
      // Node status
      status
    };

    // Add node to the collection
    nodes.push(createCytoscapeNode(nodeData, position));

    // Create edge if there's a parent
    if (parentId) {
      edges.push(createCytoscapeEdge(parentId, nodeId));
    }

    // Optimize child layout calculation
    if (childNodes.length > 0) {
      // Pre-calculate all children layouts at once
      const { childLayouts } = calculateChildrenLayouts(childNodes, shouldIncludeNode, leftBound);
      
      // Process each child with its pre-calculated layout
      childLayouts.forEach(({ node, startX }) => {
        traverseNode(
          node,
          nodeId,
          depth + 1,
          startX,
          new Map(updatedVisitedPaths),
          status.fanOut
        );
      });
      
      return childLayouts.length > 0 
        ? childLayouts[childLayouts.length - 1].startX + childLayouts[childLayouts.length - 1].width 
        : leftBound;
    }
    
    return leftBound + LAYOUT.NODE_SIZE;
  };

  // Get the root node and start traversal
  const rootNode = xmlDoc.getElementsByTagName('tree')[0];
  if (!rootNode) {
    console.error("Root 'tree' element not found in XML document");
    return { nodes: [], edges: [] };
  }

  traverseNode(rootNode, null, 0, 0, new Map(), false);

  // Return the complete graph with styling
  return createGraph(nodes, edges, getCytoscapeStyles(LAYOUT.NODE_SIZE));
};