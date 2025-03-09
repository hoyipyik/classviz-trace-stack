/**
 * Calculate tree metrics for a node and its subtree
 * @param {Element} xmlNode - XML node to calculate metrics for
 * @param {Function} shouldIncludeNode - Function to determine if a node should be included
 * @param {Set} visitedNodes - Set of visited node signatures to detect recursion
 * @return {Object} Tree metrics including direct children count, total descendants,
 *                 subtree depth, and whether it's a recursive call
 */
export const calculateTreeMetrics = (xmlNode, shouldIncludeNode, visitedNodes = new Set()) => {
    const childNodes = Array.from(xmlNode.childNodes).filter(
      node => shouldIncludeNode(node)
    );
  
    // Check for recursion by examining class+method signature
    const nodeSignature = xmlNode.getAttribute ?
      `${xmlNode.getAttribute('class') || ''}.${xmlNode.getAttribute('methodName') || ''}` : '';
  
    const isRecursive = nodeSignature && visitedNodes.has(nodeSignature);
  
    // If this is a recursive call, we don't count descendants to avoid infinite loops
    if (isRecursive) {
      return {
        directChildrenCount: childNodes.length,
        totalDescendants: childNodes.length,
        subtreeDepth: 1,
        isRecursive: true
      };
    }
  
    // Add current node signature to visited set for recursion detection
    if (nodeSignature) {
      visitedNodes.add(nodeSignature);
    }
  
    let totalDescendants = 0;
    let maxDepth = 0;
  
    for (const child of childNodes) {
      const childMetrics = calculateTreeMetrics(child, shouldIncludeNode, new Set(visitedNodes));
      totalDescendants += 1 + childMetrics.totalDescendants;
      maxDepth = Math.max(maxDepth, childMetrics.subtreeDepth);
    }
  
    // Remove current node from visited set before returning
    if (nodeSignature) {
      visitedNodes.delete(nodeSignature);
    }
  
    return {
      directChildrenCount: childNodes.length,
      totalDescendants: totalDescendants,
      subtreeDepth: childNodes.length > 0 ? maxDepth + 1 : 1,
      isRecursive: false
    };
  };