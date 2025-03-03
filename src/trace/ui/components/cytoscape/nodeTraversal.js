// cytoscape/nodeTraversal.js - Functions for traversing nodes

/**
 * Get all direct child nodes of a node
 * @param {Object} cy - The Cytoscape instance
 * @param {string} nodeId - The ID of the parent node
 * @returns {Array} The child nodes
 */
export function getChildNodes(cy, nodeId) {
    // Use Cytoscape's built-in selector to directly get child nodes
    // This is more efficient than manually traversing edges
    return cy.getElementById(nodeId).outgoers().nodes();
}

/**
 * Get all descendant nodes of a node (recursive)
 * @param {Object} cy - The Cytoscape instance
 * @param {string} nodeId - The ID of the parent node
 * @returns {Array} All descendant nodes
 */
export function getAllDescendants(cy, nodeId) {
    // Use a more efficient approach with Cytoscape's built-in traversal
    const rootNode = cy.getElementById(nodeId);
    
    // Use breadth-first search (bfs) to find all descendants
    const descendants = rootNode.outgoers().nodes();
    
    // Track visited nodes to avoid duplicates in cyclic graphs
    const visited = new Set([nodeId]);
    
    // Process each level of descendants
    let currentLevel = descendants;
    while (currentLevel.length > 0) {
        const nextLevel = cy.collection();
        
        currentLevel.forEach(node => {
            const id = node.id();
            if (!visited.has(id)) {
                visited.add(id);
                const children = node.outgoers().nodes();
                nextLevel.merge(children);
            }
        });
        
        descendants.merge(nextLevel);
        currentLevel = nextLevel;
    }
    
    console.log(`Found ${descendants.length} total descendants for node ${nodeId}`);
    return descendants;
}


/**
 * Get all descendant nodes of a node in a hierarchical cascade format
 * @param {Object} cy - The Cytoscape instance
 * @param {string} nodeId - The ID of the parent node
 * @param {Array<string>} properties - Array of property names to include (default: all properties)
 * @param {Set} visited - Set of visited node IDs (internal use for recursion)
 * @returns {Object} Hierarchical tree structure with specified properties and children arrays
 */
export function getAllDescendantsAsTree(cy, nodeId, properties = [
    'id', 
    'methodName', 
    'className', 
    'time', 
    'percent',
    'sourceCode',
    'visibility',
    'simpleName',
    'qualifiedName',
    'kind',
    'docComment',
    'metaSrc',
    'description',
    'subtreeSummary',
    'subtreeDetailedExplanation',
    'returns',
    'reason',
    'howToUse',
    'howItWorks',
    'assertions',
    'layer',
    'color',
    'label',
    'detailedDescription',
    'isRoot',
    'collapsed'
], visited = new Set()) {
    // Check for previously visited nodes to avoid cycles
    if (visited.has(nodeId)) {
        return null;
    }
    
    // Get the node and validate
    const node = cy.getElementById(nodeId);
    if (!node.length) {
        return null;
    }
    
    // Mark this node as visited
    visited.add(nodeId);
    
    // Extract node data once
    const data = node.data();
    
    // Create node object efficiently
    const nodeObj = { id: nodeId};
    
    // Add selected properties from node data
    for (let i = 0; i < properties.length; i++) {
        const prop = properties[i];
        if (prop !== 'id') { // Skip ID as we've already added it
            nodeObj[prop] = data[prop] !== undefined ? data[prop] : '';
        }
    }
    nodeObj.children = [];
    
    // Get immediate children as a collection
    const childNodes = node.outgoers().nodes();
    
    // Process children if there are any
    if (childNodes.length > 0) {
        // Process each child
        childNodes.forEach(childNode => {
            const childId = childNode.id();
            const childTree = getAllDescendantsAsTree(cy, childId, properties, visited);
            if (childTree) {
                nodeObj.children.push(childTree);
            }
        });
    }
    
    return nodeObj;
}