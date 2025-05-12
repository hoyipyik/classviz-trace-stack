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
    },
    visitedPaths: updatedVisitedPaths
  };
};