import { getNodeAttributes } from './nodeDataProcessor.js';
import { calculateTreeMetrics } from './treeMetricsCalculator.js';
import { getFilteredChildNodes } from './nodeFilter.js';
import { fetchNodeData } from './nodeDataProcessor.js';
import { PACKAGE_COLORS } from '../colour/colourConstant.js';
import { processRecursiveStatuses } from './nodeStatusUtils.js';

// We have filtered native java libs, we preserve these below as they are entries of a thread
export const ALLOWED_LIB_METHODS = [
  'java.awt.EventDispatchThread.run()',
  'java.util.concurrent.ThreadPoolExecutor$Worker.run()'
];

export const callTreeParser = (xmlDoc, options = {}) => {
  // Default options with reasonable defaults
  // const config = {
  //   methodExclusions: ['<init>', '<clinit>'],
  //   allowExcludedMethodsAtRoot: false,
  //   filterNativeLibs: true,
  //   includedPackages: ['nl.tudelft.jpacman'],
  //   allowedLibMethods: ALLOWED_LIB_METHODS,
  //   skipAllFilters: false,
  //   ...options
  // };

  console.log(xmlDoc)

  // Node mapping for direct access
  const nodeMap = {};

  // Map to store package names and their assigned colors
  const packageColorMap = new Map();

  // Package color assignment counter
  let colorIndex = 0;

  // Node ID counter (starts from 0)
  let nodeIdCounter = 0;

  /**
   * Assign a color to a package
   * @param {string} packageName - Package name
   * @return {string} Color hex code
   */
  const assignPackageColor = (packageName) => {
    if (!packageColorMap.has(packageName)) {
      // Assign the next available color from the predefined palette
      const colorCode = PACKAGE_COLORS[colorIndex % PACKAGE_COLORS.length];
      packageColorMap.set(packageName, colorCode);
      colorIndex++;
    }
    return packageColorMap.get(packageName);
  };

  /**
   * Process nodes using DFS and build cascade structure
   * @param {Element} xmlNode - XML node to traverse
   * @param {string|null} parentId - Parent node ID, null for root
   * @param {number} depth - Current depth in tree
   * @param {boolean} parentIsFanout - Whether parent node has fanout
   * @return {Object} Node data
   */
  const processNodeDFS = (xmlNode, parentId = null, depth = 0, parentIsFanout = false) => {
    const isRoot = !parentId;
    const attributes = getNodeAttributes(xmlNode);
    const cvizId = attributes.cvizId;
    const sourceCode = attributes.sourceCode;

    // Skip excluded methods (unless at root and allowed)
    // if (config.methodExclusions.includes(attributes.methodName) && !(isRoot && config.allowExcludedMethodsAtRoot)) {
    //   return { nodeData: null };
    // }

    // Extract package name and assign a color
    let packageColor = '';

    // Create unique numeric ID for node (starting from 0)
    const nodeId = (nodeIdCounter++).toString();

    // Filter child nodes based on configuration
    const childNodes = getFilteredChildNodes(xmlNode, isRoot);

    // Calculate tree metrics
    const treeMetrics = calculateTreeMetrics(xmlNode, cvizId);

    // Fetch and process node data
    const processedData = fetchNodeData(attributes.cvizId, isRoot);

    if (processedData.packageName) {
      // console.log(processedData.packageName)
      packageColor = assignPackageColor(processedData.packageName);
    }
    // Create node label
    const label = processedData.qualifiedName + "()";
    const visibility = processedData.visibility || null;
    const treeStats = {
      directChildrenCount: treeMetrics.directChildrenCount,
      totalDescendants: treeMetrics.totalDescendants,
      subtreeDepth: treeMetrics.subtreeDepth,
      level: depth
    }

    // Create initial node status (without recursive evaluation)
    const initialStatus = {
      fanOut: false,
      implementationEntryPoint: false,
      chainStartPoint: false,
      recursiveEntryPoint: false,
      isSummarised: false
    }

    // Create node data with all information
    const nodeData = {
      id: nodeId,
      parentId: parentId, // Include parent node ID
      label,
      className: label.split(".")[0],
      methodName: label.split(".")[1],
      // packageName,
      color: packageColor,
      originalColor: packageColor,
      ...processedData,
      time: attributes.time,
      selfTime: attributes.selfTime,
      percent: attributes.percent,
      isRoot,
      collapsed: true,
      selected: false,
      // Tree statistics
      treeStats: treeStats,
      // Initial node status (without recursion detection yet)
      status: initialStatus,
      // Initialize children array
      children: []
    };

    // Add node to mapping for direct access
    nodeMap[nodeId] = nodeData;

    // Process child nodes and add them to current node
    if (childNodes.length > 0) {
      childNodes.forEach(childNode => {
        const { nodeData: childData } = processNodeDFS(
          childNode,
          nodeId, // Pass current node ID as parent ID for children
          depth + 1,
          initialStatus.fanOut
        );

        if (childData) {
          nodeData.children.push(childData);
        }
      });
    }

    return { nodeData };
  };

  // Get root node and start processing
  const rootNode = xmlDoc.getElementsByTagName('tree')[0];

  if (!rootNode) {
    console.error("Root 'tree' element not found in XML document");
    return {
      cascadeTree: {},
      nodeMap: {},
      rootNode: null,
      packageColorMap: new Map()
    };
  }

  // Start processing from root node
  const { nodeData: rootData } = processNodeDFS(rootNode, null, 0, false);

  // Return empty result if processing failed
  if (!rootData) {
    return {
      cascadeTree: {},
      nodeMap: {},
      rootNode: null,
      packageColorMap: new Map()
    };
  }

  // Process recursion status after tree is built
  processRecursiveStatuses(rootData, nodeMap);

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

  const idRangeByThreadMap = new Map();

  // Process each thread to determine its ID range
  for (let i = 0; i < rootData.children.length; i++) {
    const thread = rootData.children[i];
    const startId = parseInt(thread.id);

    // The end ID is one less than the next thread's ID
    // If it's the last thread, use the nodeMap's size as the boundary
    let endId;
    if (i < rootData.children.length - 1) {
      endId = parseInt(rootData.children[i + 1].id) - 1;
    } else {
      // For the last thread, use the total number of nodes
      endId = Object.keys(nodeMap).length - 1;
    }

    // Store the ID range with the thread label as key
    idRangeByThreadMap.set(thread.label, [startId, endId]);
  }

  // Return comprehensive result
  return {
    cascadeTree: labelBasedTree,        // Cascade tree with labels as keys
    nodeMap: nodeMap,                   // Node ID mapping
    rootNode: rootData,                 // Original root node
    packageColorMap: packageColorMap,   // Map of package names to colors
    idRangeByThreadMap: idRangeByThreadMap
  };
};