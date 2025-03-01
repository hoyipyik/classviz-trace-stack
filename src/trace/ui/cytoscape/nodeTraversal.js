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