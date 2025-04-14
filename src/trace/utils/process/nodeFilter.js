/**
 * Utilities for filtering XML nodes
 */

/**
 * Creates a node filter function based on configuration
 * @param {Object} config - Configuration options for filtering
 * @return {Function} A filter function that determines if a node should be included
 */
export const createNodeFilter = (config) => {
    /**
     * Checks if a node should be included based on its method name and class
     * @param {Element} node - The XML node to check
     * @param {boolean} isRootLevel - Whether this is at the root level
     * @return {boolean} Whether to include the node
     */
    return (node, isRootLevel = false) => {
      if (node.nodeType !== 1 || node.tagName !== 'node') return false;
      
      // Safely get attributes
      if (!node.getAttribute) return false;
  
      const methodName = node.getAttribute('methodName') || '';
      const className = node.getAttribute('class') || '';
  
      // Check if it's in the excluded methods list
      const isExcludedMethod = config.excludeMethods.includes(methodName);
      if (isExcludedMethod && !(isRootLevel && config.allowExcludedMethodsAtRoot)) {
        return false;
      }
  
      // If we're filtering by package
      if (config.onlyPackages) {
        // Full method signature (for exception list)
        const fullMethod = `${className}.${methodName}()`;
  
        // Check if it's in the exceptions list
        if (config.allowedLibMethods.includes(fullMethod)) {
          return true;
        }
  
        // Check if it's in an included package
        return config.includedPackages.some(pkg => className.startsWith(pkg));
      }
  
      return true;
    };
  };
  
  /**
   * Filter child nodes based on configuration
   * @param {Element} xmlNode - The XML node
   * @param {Function} shouldIncludeNode - Function to determine if a node should be included
   * @param {boolean} isRoot - Whether this is the root node
   * @return {Array} Filtered array of child nodes
   */
  export const getFilteredChildNodes = (xmlNode, shouldIncludeNode, isRoot = false) => {
    return Array.from(xmlNode.childNodes).filter(
      node => shouldIncludeNode(node, isRoot)
    );
  };