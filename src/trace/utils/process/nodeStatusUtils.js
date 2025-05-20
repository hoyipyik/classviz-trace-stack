/**
 * Utility functions for determining node status in the call tree
 */


/**
 * Determines if a node has fanout based on number of children and cross-package calls
 * @param {Array} childNodes - Array of child nodes
 * @param {string} className - Class name of the current node
 * @param {string} methodName - Method name of the current node
 * @param {Object} config - Optional configuration parameters
 * @return {boolean} Whether the node has fanout
 */
export const hasFanout = (childNodes, className, methodName, config = {}) => {
  return false;
  // Default configuration parameters
  const {
    fanoutThreshold = 4,          // Minimum child nodes for standard fanout
    crossPackageCntThreshold = 3, // Minimum cross-package calls for standard fanout
    largeNodeThreshold = 6,       // Number of children that automatically qualifies as fanout
    coordinationChildThreshold = 3, // Minimum children for coordination-named methods
    coordinationCrossPackageThreshold = 1, // Minimum cross-package calls for coordination methods
    coordinationPhrases = [
      'main', 'init', 'start', 'launch', 'execute', 'run',
      'process', 'handle', 'dispatch', 'coordinate', 'orchestrate',
      'manage', 'control', 'perform', 'bootstrap', 'setup',
      'initialize', 'activate', 'begin', 'trigger', 'invoke'
    ]
  } = config;

  // Check if method name contains coordination-related terms
  const hasCoordinationName = coordinationPhrases.some(phrase =>
    methodName.toLowerCase().includes(phrase.toLowerCase())
  );

  // Calculate cross-package calls
  let crossPackageCnt = 0;
  let uniquePackages = new Set();
  const currentPackage = className.split('.').slice(0, -1).join('.');

  childNodes.forEach(child => {
    const childClass = child.getAttribute('class') || '';
    const childPackage = childClass.split('.').slice(0, -1).join('.');

    if (childPackage !== currentPackage) {
      crossPackageCnt++;
      uniquePackages.add(childPackage);
    }
  });

  // Rule 1: Very large number of children automatically qualifies as fanout
  if (childNodes.length >= largeNodeThreshold) return true;

  // Rule 2: Methods with coordination-related names have lower thresholds
  if (hasCoordinationName && childNodes.length >= coordinationChildThreshold) {
    return crossPackageCnt >= coordinationCrossPackageThreshold;
  }

  // Rule 3: Standard case - sufficient children and cross-package calls
  return childNodes.length >= fanoutThreshold && crossPackageCnt >= crossPackageCntThreshold;
};

/**
* Determines if a node represents an implementation entry point
* @param {boolean} isRoot - Whether the node is a root node
* @param {Array} childNodes - Child nodes of the current node
* @param {string} methodName - Method name of the current node
* @param {boolean} parentIsFanout - Whether the parent node is a fanout node
* @param {Object} nodeInfo - Additional node information (optional)
* @return {boolean} Whether the node is an implementation entry point
*/

export const isImplementationEntryPoint = (isRoot, childNodes, methodName, parentIsFanout, visibility, treeStats) => {
  return false;
  // Root nodes or nodes without children cannot be implementation entry points
  if (isRoot || !childNodes || childNodes.length === 0) {
    return false;
  }

  // If parent is a fanout/coordination node, it's likely an implementation entry point
  if (parentIsFanout) {
    return true;
  }

  if (!visibility) {
    return false;
  }
  // console.log(treeStats)

  if (treeStats.subtreeDepth <= 3) {
    return false
  }

  if (treeStats.totalDescendants <= 6) {
    return false
  }

  if (treeStats.directChildrenCount <= 3) {
    return false
  }

  // Check if the method name suggests an entry point
  return isMethodNameEntryPoint(methodName);
};

/**
 * Determines if a method name suggests it's an entry point based on naming conventions
 * @param {string} methodName - The method name to check
 * @return {boolean} Whether the method name suggests an entry point
 */
export const isMethodNameEntryPoint = (methodName) => {
  return false;
  if (!methodName) {
    return false;
  }

  // Common accessor patterns that are not entry points
  if (
    methodName === 'equals' || methodName === 'hashCode' || methodName === 'toString') {
    return false;
  }

  // Entry point naming patterns (slightly expanded from your list)
  const entryPointPrefixes = [
    'start', 'init', 'execute', 'run', 'process', 'get', 'set',
    'perform', 'create', 'build', 'handle', 'apply'
  ];

  return entryPointPrefixes.some(prefix => methodName.toLowerCase().includes(prefix));
};



/**
 * Determines if a node is a recursive entry point
 * @param {string} className - Class name of current node
 * @param {string} methodName - Method name of current node
 * @param {Array} childNodes - Array of child nodes
 * @param {Map} visitedPaths - Map of visited paths
 * @return {Object} Object containing isRecursiveEntryPoint status and updated visitedPaths
 */
export const checkRecursiveEntryPoint = (className, methodName, childNodes, visitedPaths) => {
  const nodePath = `${className}.${methodName}`;
  let isRecursiveEntryPoint = false;

  // Create a copy of the visitedPaths map to avoid modifying the original
  const updatedVisitedPaths = new Map(visitedPaths);

  if (visitedPaths.has(nodePath)) {
    // This is a recursive call but not the entry point
  } else {
    // Check if this node appears in its own children (direct recursion)
    const hasRecursiveChildren = childNodes.some(child => {
      const childClass = child.getAttribute('class') || '';
      const childMethod = child.getAttribute('methodName') || '';
      return childClass === className && childMethod === methodName;
    });

    if (hasRecursiveChildren) {
      isRecursiveEntryPoint = true;
    }
  }

  return { isRecursiveEntryPoint, visitedPaths: updatedVisitedPaths };
};

/**
 * Determines if a node is a chain start point
 * Currently a placeholder function that always returns false
 * @param {Object} node - The node to check
 * @return {boolean} Whether the node is a chain start point
 */
export const isChainStartPoint = (node) => {
  // useless feature now
  return false;
};

/**
 * Computes the complete status object for a node
 * @param {boolean} isRoot - Whether this is the root node 
 * @param {Array} childNodes - Array of child nodes
 * @param {string} className - Class name
 * @param {string} methodName - Method name
 * @param {Map} visitedPaths - Map of visited paths for recursion detection
 * @param {boolean} parentIsFanout - Whether the parent node has fanout
 * @param {string} nodeId - ID of the current node
 * @return {Object} Status object and updated visitedPaths
 */
export const computeNodeStatus = (
  isRoot,
  visibility,
  sourceCode,
  childNodes,
  className,
  methodName,
  visitedPaths,
  parentIsFanout,
  nodeId,
  treeStats
) => {
  try {
    const fanOut = hasFanout(childNodes, className, methodName);
    const implementationEntryPoint = isImplementationEntryPoint(isRoot, childNodes, methodName, parentIsFanout, visibility, treeStats);
    const chainStartPoint = isChainStartPoint({ className, methodName });

    const nodePath = `${className}.${methodName}`;
    const { isRecursiveEntryPoint, visitedPaths: updatedVisitedPaths } =
      checkRecursiveEntryPoint(className, methodName, childNodes, visitedPaths);

    // Update visited paths map for future recursive checks
    if (!updatedVisitedPaths.has(nodePath)) {
      updatedVisitedPaths.set(nodePath, nodeId);
    }

    return {
      status: {
        fanOut,
        implementationEntryPoint,
        chainStartPoint,
        recursiveEntryPoint: isRecursiveEntryPoint,
        isSummarised: false // This would be set elsewhere based on user interaction
      }
    };
  } catch (error) {
    // if there is an error, return all false safe obj
    //  console.error(error)
    return {
      status: {
        fanOut: false,
        implementationEntryPoint: false,
        chainStartPoint: false,
        recursiveEntryPoint: false,
        isSummarised: false
      }
    };
  }
};



// ====== recursive ========
/**
 * Utility for processing recursive statuses throughout the tree after it's built
 */
/**
 * Utility for identifying recursive entry points in the tree
 */

/**
 * Identifies and marks recursive entry points in the tree
 * @param {Object} rootNode - The root node of the tree
 * @param {Object} nodeMap - Map of all nodes by their IDs
 */
export const processRecursiveStatuses = (rootNode, nodeMap) => {
  // First identify nodes that have direct recursion (call themselves directly)
  markDirectRecursiveEntryPoints(rootNode);
};

/**
 * Marks nodes that directly call themselves as recursive entry points
 * @param {Object} node - Current node to process
 */
const markDirectRecursiveEntryPoints = (node) => {
  if (!node) return;

  const nodeSignature = node.label;

  // Check if any of the children call the same method (direct recursion)
  if (node.children && node.children.length > 0) {
    // Check if this node calls itself directly (through one of its children)
    const hasDirectRecursion = node.children.some(child => child.label === nodeSignature);

    if (hasDirectRecursion) {
      // This is a recursive entry point - it directly calls itself
      node.status.recursiveEntryPoint = true;
    }

    // Process all children recursively
    node.children.forEach(child => {
      markDirectRecursiveEntryPoints(child);
    });
  }
};

//========= compress loop ===========
/**
 * Generates a unique signature for a subtree based on its structure
 * @param {Object} node - The node to generate a signature for
 * @return {string} A string signature representing the subtree structure
 */
const generateSubtreeSignature = (node) => {
  if (!node) return '';

  let signature = node.label; // Start with the current node's label

  // Sort children to ensure consistent ordering
  if (node.children && node.children.length > 0) {
    const childSignatures = node.children.map(child => generateSubtreeSignature(child));
    childSignatures.sort(); // Sort for consistent ordering regardless of original order
    signature += '(' + childSignatures.join(',') + ')';
  }

  return signature;
};

/**
 * Simple deduplication of children nodes for each node
 * @param {Object} root - Root node to process
 */
export const deduplicateTree = (root) => {

  if (!root || !root.children) {
    return;
  }

  if (root.label === "class35791.2702()") {
    console.log(root)
  }

  // Use Map to store unique child nodes, with signature as key
  const uniqueChildrenMap = new Map();

  // First pass: find all unique child nodes
  for (const child of root.children) {
    // Use method name as simple signature
    const signature = child.label;

    if (!uniqueChildrenMap.has(signature)) {
      // First time seeing this signature, record it
      uniqueChildrenMap.set(signature, {
        node: child,
        count: 1,
        totalTime: parseFloat(child.time) || 0
      });
    } else {
      // Already have a node with same signature, increment count and time
      const info = uniqueChildrenMap.get(signature);
      info.count++;
      info.totalTime += parseFloat(child.time) || 0;
    }
  }

  // Create new children array containing only unique child nodes
  const newChildren = [];

  // Iterate through unique child nodes Map, update node data
  uniqueChildrenMap.forEach((info, signature) => {
    const node = info.node;

    // If this method appears multiple times, update label and status
    if (info.count > 1) {
      node.label = `${signature} (×${info.count})`;
      node.time = info.totalTime.toString();
      node.status.isMerged = true;
      node.occurrenceCount = info.count;
    }

    newChildren.push(node);
  });

  // Replace original children list with new unique children list
  root.children = newChildren;

  // Recursively process children of each child node
  for (const child of root.children) {
    deduplicateTree(child);
  }
};