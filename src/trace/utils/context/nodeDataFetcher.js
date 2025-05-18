export const nodeDataFetcher = (className, methodName) => {
  // Check if required parameters are provided
  if (!className || !methodName) {
    return null;
  }

  // Safely access window.context, return null if it doesn't exist
  const context = window.context || {};
  const { nodes, edges } = context;

  // Return null if nodes object doesn't exist
  if (!nodes) {
    return null;
  }

  // Build the query factor
  let queryFactor = `${className}.${methodName}(`;
  if (methodName === "<init>") {
    queryFactor = `${className}(`;
  }

  // Find the node key with error handling
  const nodeKey = findSpecificKey(nodes, queryFactor);

  // If no key is found, return null
  if (!nodeKey) {
    return null;
  }

  // Return the node data, or null if it doesn't exist
  return nodes[nodeKey] || null;
};

// Modified findSpecificKey function to handle null/undefined input
function findSpecificKey(object, prefix) {
  // Safety check - if object isn't valid or prefix isn't a string, return undefined
  if (!object || typeof object !== 'object' || !prefix || typeof prefix !== 'string') {
    return undefined;
  }

  // Find a key that matches our criteria
  return Object.keys(object).find(key =>
    key.startsWith(prefix) &&
    key.endsWith(")")
  );
}

/*
 * Extracts the package name from a fully qualified class name
 * @param {string} className - Fully qualified class name (e.g., nl.tudelft.jpacman.board.Square)
 * @return {string} Package name (e.g., nl.tudelft.jpacman.board)
 */
export function extractPackageName(className) {
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