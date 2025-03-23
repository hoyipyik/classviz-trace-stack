/**
 * Removes essential method nodes and their connections from a Cytoscape graph
 * and restores the graph to its previous state
 * @param {Object} cy - Cytoscape graph instance
 */
export function removeEssentialMethods(cy) {
    // Get nodes and edges from the special graph
    if(!window.specialGraph){
        return;
    }
    const { nodes: essentialMethodNodes, edges: methodCallEdges } = window.specialGraph;
    
    // Track parent class nodes that need height adjustment
    const parentIds = new Set();
    
    // Collect method IDs to remove
    const methodIds = essentialMethodNodes.map(methodNode => {
        const methodId = methodNode.data.id;
        const lastDotBeforeParens = methodId.lastIndexOf(".", methodId.indexOf("("));
        const classId = methodId.substring(0, lastDotBeforeParens);
        
        // Track the parent class for restoring later
        parentIds.add(classId);
        
        return methodId;
    });
    
    // Collect edge IDs to remove
    const edgeIds = methodCallEdges.map(edge => edge.data.id);
    
    // Remove all method edges first
    if (edgeIds.length > 0) {
        const edgesToRemove = cy.collection();
        edgeIds.forEach(edgeId => {
            const edge = cy.$id(edgeId);
            if (edge.length > 0) {
                edgesToRemove.merge(edge);
            }
        });
        
        if (!edgesToRemove.empty()) {
            cy.remove(edgesToRemove);
            console.log(`Removed ${edgesToRemove.size()} method call edges`);
        }
    }
    
    // Remove all method nodes
    if (methodIds.length > 0) {
        const nodesToRemove = cy.collection();
        methodIds.forEach(methodId => {
            const node = cy.$id(methodId);
            if (node.length > 0) {
                nodesToRemove.merge(node);
            }
        });
        
        if (!nodesToRemove.empty()) {
            cy.remove(nodesToRemove);
            console.log(`Removed ${nodesToRemove.size()} method nodes`);
        }
    }
    
    // This section was moved to a separate function in addEssentialMethods
    
    // Restore parent class nodes to original style
    parentIds.forEach(classId => {
        const classNode = cy.$id(classId);
        if (classNode.length > 0) {
            // Get original dimensions if available
            const originalDimensions = window.originalNodeDimensions && 
                                      window.originalNodeDimensions[classId];
            
            // Restore original style
            classNode.style({
                'width': originalDimensions ? originalDimensions.width : classNode.style('width'),
                'height': originalDimensions ? originalDimensions.height : classNode.style('height'),
                'text-valign': 'center',
                'text-halign': 'center',
                'text-margin-y': 0
            });
        }
    });
    
    // Force a layout update if needed
    cy.layout({
        name: 'preset',
        fit: false,
        animate: false
    }).run();
}
