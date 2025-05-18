/**
 * Utilities for filtering XML nodes
 */

/**
 * Creates a node filter function based on configuration
 * @param {Object} config - Configuration options for filtering
 * @return {Function} A filter function that determines if a node should be included
 */
export const createNodeFilter = (config) => {
  // Set defaults for missing config options
  const options = {
    // Methods to exclude (e.g. '<init>', '<clinit>')
    methodExclusions: [], 
    // Allow excluded methods at root level
    allowExcludedMethodsAtRoot: false,
    // Filter out native libraries (keep only application code)
    filterNativeLibs: true,
    // List of application packages to include
    includedPackages: [],
    // Special library methods to always allow regardless of package
    allowedLibMethods: [],
    // Completely skip all filtering (include everything)
    skipAllFilters: false,
    // Override with provided config
    ...config
  };
  
  /**
   * Checks if a node should be included based on its method name and class
   * @param {Element} node - The XML node to check
   * @param {boolean} isRootLevel - Whether this is at the root level
   * @return {boolean} Whether to include the node
   */
  return (node, isRootLevel = false) => {
    // Skip all filters if requested
    if (options.skipAllFilters) return true;
    
    // Basic node type check
    if (node.nodeType !== 1 || node.tagName !== 'node') return false;
    
    // Safely get attributes
    if (!node.getAttribute) return false;

    const methodName = node.getAttribute('methodName') || '';
    const className = node.getAttribute('class') || '';
    
    // Full method signature for allowedLibMethods check
    const fullMethod = `${className}.${methodName}()`;
    
    // Check against allowedLibMethods first (these are always included)
    if (options.allowedLibMethods.includes(fullMethod)) {
      return true;
    }
    
    // Method exclusion check
    const isExcludedMethod = options.methodExclusions.includes(methodName);
    if (isExcludedMethod) {
      // If this is a root level node and we allow excluded methods at root,
      // then include it despite being an excluded method
      if (isRootLevel && options.allowExcludedMethodsAtRoot) {
        return true;
      }
      return false;
    }
    
    // Native library filtering
    if (options.filterNativeLibs && options.includedPackages.length > 0) {
      // Check if the class is in one of the included packages
      // (meaning it's application code, not a native library)
      return options.includedPackages.some(pkg => className.startsWith(pkg));
    }
    
    // If we got here, include the node
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
export const getFilteredChildNodes = (xmlNode, isRoot = false) => {
  return Array.from(xmlNode.childNodes);
};