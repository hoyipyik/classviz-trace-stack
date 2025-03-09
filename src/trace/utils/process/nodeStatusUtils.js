/**
 * Utility functions for determining node status in the call tree
 */

/**
 * Determines if a method name suggests it's an entry point based on naming conventions
 * @param {string} methodName - The method name to check
 * @return {boolean} Whether the method name suggests an entry point
 */
export const isMethodNameEntryPoint = (methodName) => {
    if (methodName.startsWith('get') || methodName.startsWith('set')) {
      return false;
    }
    
    const entryPointPrefixes = ['start', 'init', 'execute', 'run', 'process', 'perform'];
    return entryPointPrefixes.some(prefix => methodName.startsWith(prefix));
  };
  
  /**
   * Determines if a node has fanout based on number of children
   * @param {Array} childNodes - Array of child nodes
   * @param {number} fanoutThreshold - Threshold for considering a node to have fanout
   * @return {boolean} Whether the node has fanout
   */
  export const hasFanout = (childNodes, fanoutThreshold = 4) => {
    return childNodes.length >= fanoutThreshold;
  };
  
  /**
   * Determines if a node is an implementation entry point
   * @param {boolean} isRoot - Whether this is the root node
   * @param {Array} childNodes - Array of child nodes
   * @param {string} methodName - Method name
   * @param {boolean} parentIsFanout - Whether the parent node has fanout
   * @return {boolean} Whether the node is an implementation entry point
   */
  export const isImplementationEntryPoint = (isRoot, childNodes, methodName, parentIsFanout) => {
    if (isRoot || childNodes.length === 0) {
      return false;
    }
    
    return isMethodNameEntryPoint(methodName) || parentIsFanout;
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
    // This is a placeholder for future implementation
    // Currently always returns false as per original code
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
    childNodes,
    className,
    methodName,
    visitedPaths,
    parentIsFanout,
    nodeId
  ) => {
    const fanOut = hasFanout(childNodes);
    const implementationEntryPoint = isImplementationEntryPoint(isRoot, childNodes, methodName, parentIsFanout);
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
        isSummarised: false, // This would be set elsewhere based on user interaction
        recursiveEntryPoint: isRecursiveEntryPoint
      },
      visitedPaths: updatedVisitedPaths
    };
  };