/**
 * Adds essential method nodes and their connections to a Cytoscape graph
 * @param {Object} cy - Cytoscape graph instance
 */
export function addEssentialMethods(cy) {
    // Get nodes and edges from the special graph
    const { nodes: essentialMethodNodes, edges: methodCallEdges } = window.specialGraph;
    
    // Prepare nodes batch for better performance
    const nodesToAdd = [];
    const parentIds = new Set();
    
    // Store original dimensions of parent nodes before modifying them
    storeOriginalDimensions(cy, essentialMethodNodes);

    // Process all method nodes
    essentialMethodNodes.forEach(methodNode => {
        const methodId = methodNode.data.id;
        const lastDotBeforeParens = methodId.lastIndexOf(".", methodId.indexOf("("));
        const classId = methodId.substring(0, lastDotBeforeParens);
        
        // Track parent classes for later height adjustment
        parentIds.add(classId);

        // Create node object
        nodesToAdd.push({
            group: 'nodes',
            data: { ...methodNode.data }
        });
    });

    // Add all nodes in a single batch operation for better performance
    if (nodesToAdd.length > 0) {
        cy.add(nodesToAdd);
        console.log(`Added ${nodesToAdd.length} method nodes`);

        // Adjust parent node heights to accommodate methods
        parentIds.forEach(classId => {
            const classNode = cy.$id(classId);
            if (classNode.length > 0) {
                const methodCount = classNode.children().length;
                // Calculate new height based on number of methods
                const newHeight = Math.max(150, 80 + (methodCount * 35));
                
                // Apply styles
                classNode.style({
                    'height': newHeight,
                    'text-valign': 'top',
                    'text-halign': 'center',
                    'text-margin-y': 18
                });
            }
        });

        // Style all method nodes
        styleMethods(cy, nodesToAdd);
    }

    // Add edges in batch
    addMethodEdges(cy, methodCallEdges);
}

/**
 * Styles method nodes within their parent containers
 * @param {Object} cy - Cytoscape graph instance
 * @param {Array} nodesToAdd - Method nodes to style
 */
function styleMethods(cy, nodesToAdd) {
    // First, group methods by class for more efficient processing
    const methodsByClass = {};
    
    nodesToAdd.forEach(node => {
        const methodId = node.data.id;
        const lastDotBeforeParens = methodId.lastIndexOf(".", methodId.indexOf("("));
        const classId = methodId.substring(0, lastDotBeforeParens);
        
        if (!methodsByClass[classId]) {
            methodsByClass[classId] = [];
        }
        methodsByClass[classId].push(methodId);
    });
    
    // Apply styles class by class
    Object.entries(methodsByClass).forEach(([classId, methodIds]) => {
        if (cy.$id(classId).length > 0) {
            // Get all method nodes for this class
            const methodNodes = cy.$id(classId).children();
            
            // Position each method node
            methodIds.forEach(methodId => {
                const methodIndex = Array.from(methodNodes).findIndex(n => n.id() === methodId);
                if (methodIndex >= 0) {
                    const startPosition = 55;
                    const spacing = 35;
                    const yPos = startPosition + (methodIndex * spacing);
                    
                    cy.$id(methodId).style({
                        'label': node => node.data('properties')?.simpleName || methodId.split('.').pop(),
                        'color': 'black',
                        'font-size': '12px',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'background-color': '#D3D3D3',
                        'border-width': '1px',
                        'border-color': '#999',
                        'border-opacity': 0.8,
                        'shape': 'round-rectangle',
                        'width': '120px',
                        'height': '30px',
                        'text-wrap': 'ellipsis',
                        'text-max-width': '110px',
                        'position-x': 0,
                        'position-y': yPos
                    });
                }
            });
        }
    });
}

/**
 * Stores the original dimensions of parent class nodes before modifications
 * @param {Object} cy - Cytoscape graph instance
 * @param {Array} methodNodes - Method nodes to be added
 */
function storeOriginalDimensions(cy, methodNodes) {
    // Create storage object if it doesn't exist
    if (!window.originalNodeDimensions) {
        window.originalNodeDimensions = {};
        
        // Find all parent class IDs
        methodNodes.forEach(methodNode => {
            const methodId = methodNode.data.id;
            const lastDotBeforeParens = methodId.lastIndexOf(".", methodId.indexOf("("));
            const classId = methodId.substring(0, lastDotBeforeParens);
            
            // Store dimensions if not already stored and class exists
            if (!window.originalNodeDimensions[classId]) {
                const classNode = cy.$id(classId);
                if (classNode.length > 0) {
                    window.originalNodeDimensions[classId] = {
                        width: classNode.style('width'),
                        height: classNode.style('height')
                    };
                }
            }
        });
    }
}

/**
 * Adds and styles method call edges
 * @param {Object} cy - Cytoscape graph instance
 * @param {Array} methodCallEdges - Edges representing method calls
 */
function addMethodEdges(cy, methodCallEdges) {
    const edgesToAdd = [];

    // Filter edges where both source and target exist in the graph
    methodCallEdges.forEach(edgeData => {
        const sourceId = edgeData.data.source;
        const targetId = edgeData.data.target;

        if (cy.$id(sourceId).length > 0 && cy.$id(targetId).length > 0) {
            edgesToAdd.push({
                group: 'edges',
                data: edgeData.data
            });
        } else {
            console.warn(`Cannot add edge: ${sourceId} -> ${targetId}, one or both nodes not found`);
        }
    });

    // Add edges in batch
    if (edgesToAdd.length > 0) {
        cy.add(edgesToAdd);
        console.log(`Added ${edgesToAdd.length} method call edges`);

        // Style trace_call edges
        cy.edges(`[interaction = "trace_call"]`).style({
            'width': 2,
            'line-color': '#FF9900',  // orange
            'target-arrow-color': '#FF9900',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'line-style': 'dotted',
            'line-dash-pattern': [2, 2],
            'arrow-scale': 1.2,
            'opacity': 0.8,
            'source-endpoint': 'outside-to-node',
            'target-endpoint': 'outside-to-node',
            'edge-distances': 'node-position'
        });
    }
}