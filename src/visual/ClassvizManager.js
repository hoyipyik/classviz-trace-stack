export class ClassvizManager {
    constructor(data, cy, eventBus) {
        this.data = data;
        this.cy = cy;
        this.eventBus = eventBus;

        this.originalDimensions = {}; // class node id -> original dimensions
        this.insertedNodes = new Map(); // cy method node id (nodeData.label) -> cy method node
        this.insertedEdges = new Map(); // edge node id -> cy edge 
       
        this.classToMethodsMap = new Map(); // class node id -> method node cy ids list (nodeData.label)

        this.methodLabelToOriginalIds = new Map(); // method node label -> original ID set

        // Uses the original ID from call tree as key: stores edge IDs where this original node is the source/target
        this.originalIdToSourceEdges = new Map(); // originalId -> Set(edge id) edges where this original node is the source
        this.originalIdToTargetEdges = new Map(); // originalId -> Set(edge id) edges where this original node is the target

        this.eventBus.subscribe('changeSingleMethodByIdToClassviz', (
            { nodeId, selected }) => {
            if (selected) {
                this.insertSingleMethodById(nodeId);
            } else {
                // remove single node
                this.removeSingleMethodById(nodeId);
            }

        });

        this.eventBus.subscribe('changeMultiMethodByIdsToClassviz', (ids) => {

        });
    }

    getMethodLabelById(id) {
        const nodeData = this.data.nodes.get(id).data;
        if (nodeData) {
            return nodeData.label;
        } else {
            console.error(`Node with id ${id} not found`);
            return null;
        }

    }

    findClassNodeByNodeLabel(label) {
        const parenIndex = label.indexOf("(");
        if (parenIndex === -1) return;
        const lastDotBeforeParens = label.lastIndexOf(".", parenIndex);
        if (lastDotBeforeParens === -1) return;
        const classId = label.substring(0, lastDotBeforeParens);
        return this.cy.$id(classId);
    }


    insertSingleMethodById(id) {
        // Get the node label (which will be used as the cy node id)
        const nodeLabel = this.getMethodLabelById(id);
        if (!nodeLabel) {
            console.error(`Could not get label for node with id ${id}`);
            return;
        }
    
        // Update the methodLabelToOriginalIds map
        if (!this.methodLabelToOriginalIds.has(nodeLabel)) {
            this.methodLabelToOriginalIds.set(nodeLabel, new Set());
        }
        this.methodLabelToOriginalIds.get(nodeLabel).add(id);
    
        // Check if the node already exists - if so, we only need to handle edges
        const nodeExists = this.insertedNodes.has(nodeLabel);
        let addedNode = null;
    
        if (!nodeExists) {
            // Node creation logic - only execute if the node doesn't exist
            // Find the corresponding class node
            const classNode = this.findClassNodeByNodeLabel(nodeLabel);
            if (!classNode || classNode.length === 0) {
                console.warn(`Class node for method ${nodeLabel} not found in cytoscape`);
                return;
            }
    
            const classId = classNode.id();
            const currentPosition = classNode.position();
    
            // If we haven't stored the original dimensions and position of the class node, save them (for potential restoration later)
            if (!this.originalDimensions[classId]) {
                this.originalDimensions[classId] = {
                    width: classNode.style('width'),
                    height: classNode.style('height'),
                    textValign: classNode.style('text-valign'),
                    textHalign: classNode.style('text-halign'),
                    textMarginY: classNode.style('text-margin-y'),
                    position: { x: currentPosition.x, y: currentPosition.y }
                };
            }
    
            const nodeData = this.data.nodes.get(id).data;
    
            // Create method node (note that this node's data.parent is set to classNode)
            const methodNodeData = {
                group: 'nodes',
                data: {
                    id: nodeLabel,
                    originalId: id, // We keep just one originalId in the node data
                    parent: classId,
                    visible: true,
                    name: nodeLabel.split('.').pop(),
                    labels: ["Operation"],
                    properties: {
                        ...nodeData,
                        kind: "method",
                        simpleName: nodeLabel.split('.').pop()
                    }
                }
            };
    
            // Add method node to cytoscape
            addedNode = this.cy.add(methodNodeData);
            this.insertedNodes.set(nodeLabel, addedNode);
    
            // Update the classToMethodsMap
            if (!this.classToMethodsMap.has(classId)) {
                this.classToMethodsMap.set(classId, new Set());
            }
            this.classToMethodsMap.get(classId).add(nodeLabel);
    
            // Adjust the parent (class) node's style while maintaining its position
            // Dynamically adjust the height based on the number of method nodes
            const methodCount = classNode.children().length;
            const newHeight = Math.max(150, 80 + (methodCount * 110)); // Increased spacing between methods
            const newWidth = Math.max(parseInt(this.originalDimensions[classId].width), 800); // Greatly increased width
    
            classNode.style({
                'width': newWidth,
                'height': newHeight,
                'text-valign': 'top',
                'text-halign': 'center',
                'text-margin-y': 18
            });
    
            // Explicitly reset the class node's position to avoid offset due to style changes
            classNode.position(currentPosition);
    
            // Calculate the position for the method node
            const methodIndex = classNode.children().length - 1;
            const parentCenter = currentPosition;
            const parentTopY = parentCenter.y - (newHeight / 2);
    
            // Improved positioning calculation to prevent overlap
            const offsetY = 60 + (methodIndex * 40); // Increased vertical spacing
            const methodAbsoluteY = parentTopY + offsetY;
    
            // Horizontal centering with variance for many methods
            const horizontalVariance = methodCount > 4 ? (methodIndex % 2) * 20 - 10 : 0;
            const methodAbsoluteX = parentCenter.x + horizontalVariance;
    
            // Set the method node's position
            addedNode.position({
                x: methodAbsoluteX,
                y: methodAbsoluteY
            });
    
            // Set other styles for the method node (excluding position)
            const color = nodeData.color || nodeData.nodeColor || '#D3D3D3';
            addedNode.style({
                'label': nodeData.properties?.simpleName || nodeLabel.split('.').pop(),
                'color': 'black',
                'font-size': '12px',
                'text-valign': 'center',
                'text-halign': 'center',
                'background-color': color,
                'border-width': '1px',
                'border-color': '#999',
                'border-opacity': 0.8,
                'shape': 'round-rectangle',
                'width': '120px',
                'height': '30px',
                'text-wrap': 'ellipsis',
                'text-max-width': '110px'
            });
        } else {
            // Node already exists, retrieve it for edge creation
            addedNode = this.insertedNodes.get(nodeLabel);
            console.log(`Method node ${nodeLabel} already exists, proceeding with edge creation`);
        }
    
        // Whether the node is new or existing, create the edges
        this.createEdgesForNode(id, nodeLabel);
    }
    
    removeSingleMethodById(id) {
        // Get the node label which is used as the cy node id
        const nodeLabel = this.getMethodLabelById(id);
        if (!nodeLabel) {
            console.error(`Could not get label for node with id ${id}`);
            return;
        }
    
        // Check if the node exists
        const nodeExists = this.insertedNodes.has(nodeLabel);
        if (!nodeExists) {
            console.warn(`Method node ${nodeLabel} not found, nothing to remove`);
            return;
        }
    
        // Check if this id is associated with the method label
        if (!this.methodLabelToOriginalIds.has(nodeLabel) || 
            !this.methodLabelToOriginalIds.get(nodeLabel).has(id)) {
            console.warn(`ID ${id} not associated with method ${nodeLabel}`);
            return;
        }
    
        // Get the actual node
        const methodNode = this.insertedNodes.get(nodeLabel);
        if (!methodNode) return;
    
        // Get the class node
        const classNode = this.findClassNodeByNodeLabel(nodeLabel);
        if (!classNode || classNode.length === 0) {
            console.warn(`Class node for method ${nodeLabel} not found`);
            return;
        }
        const classId = classNode.id();
    
        // Collect parents and children
        const targetChildrenOriginalIds = [];
        let parentOriginalId = null;
    
        // Process edges where this node is the source
        if (this.originalIdToSourceEdges.has(id)) {
            this.originalIdToSourceEdges.get(id).forEach(edgeId => {
                const edge = this.insertedEdges.get(edgeId);
                if (edge) {
                    const targetOriginalId = edge.data('targetOriginalId');
                    targetChildrenOriginalIds.push(targetOriginalId);
                    
                    // Remove the edge
                    this.cy.remove(edge);
                    this.insertedEdges.delete(edgeId);
                    
                    // Update tracking maps
                    if (this.originalIdToTargetEdges.has(targetOriginalId)) {
                        this.originalIdToTargetEdges.get(targetOriginalId).delete(edgeId);
                    }
                }
            });
        }
    
        // Process edges where this node is the target
        if (this.originalIdToTargetEdges.has(id)) {
            const parentEdges = Array.from(this.originalIdToTargetEdges.get(id));
            
            // Assert that there's only one parent
            if (parentEdges.length > 1) {
                console.warn(`Method ${nodeLabel} has multiple parents, expected only one in tree structure`);
            }
            
            // Process the parent edge (should be only one in a tree)
            if (parentEdges.length > 0) {
                const edgeId = parentEdges[0];
                const edge = this.insertedEdges.get(edgeId);
                if (edge) {
                    parentOriginalId = edge.data('sourceOriginalId');
                    
                    // Remove the edge
                    this.cy.remove(edge);
                    this.insertedEdges.delete(edgeId);
                    
                    // Update tracking maps
                    if (this.originalIdToSourceEdges.has(parentOriginalId)) {
                        this.originalIdToSourceEdges.get(parentOriginalId).delete(edgeId);
                    }
                }
            }
        }
    
        // Create edges between parent and children
        if (parentOriginalId && targetChildrenOriginalIds.length > 0) {
            const parentNodeLabel = this.getMethodLabelById(parentOriginalId);
            
            if (parentNodeLabel && this.insertedNodes.has(parentNodeLabel)) {
                // Create direct edges from parent to each child
                targetChildrenOriginalIds.forEach(childId => {
                    const childNodeLabel = this.getMethodLabelById(childId);
                    if (childNodeLabel && this.insertedNodes.has(childNodeLabel)) {
                        this.createEdge(parentOriginalId, parentNodeLabel, childId, childNodeLabel);
                    }
                });
            }
        }
    
        // Update the methodLabelToOriginalIds map
        this.methodLabelToOriginalIds.get(nodeLabel).delete(id);
        
        // Only remove the node if no more original IDs are associated with it
        const shouldRemoveNode = this.methodLabelToOriginalIds.get(nodeLabel).size === 0;
        
        if (shouldRemoveNode) {
            // Remove the node itself from cytoscape
            this.cy.remove(methodNode);
            
            // Update our tracking data structures
            this.insertedNodes.delete(nodeLabel);
            this.methodLabelToOriginalIds.delete(nodeLabel);
            
            // Update the class-to-methods mapping
            if (this.classToMethodsMap.has(classId)) {
                this.classToMethodsMap.get(classId).delete(nodeLabel);
                
                // If this was the last method in the class, restore original dimensions
                if (this.classToMethodsMap.get(classId).size === 0) {
                    this.restoreClassOriginalDimensions(classId);
                } else {
                    // Otherwise, adjust class size based on remaining methods
                    this.adjustClassSize(classId);
                }
            }
        }
        
        // Clean up tracking maps regardless of whether we removed the node
        this.originalIdToSourceEdges.delete(id);
        this.originalIdToTargetEdges.delete(id);
    }
    
    // Helper method to restore class to original dimensions
    restoreClassOriginalDimensions(classId) {
        const classNode = this.cy.$id(classId);
        if (!classNode || classNode.length === 0) return;
        
        const originalDim = this.originalDimensions[classId];
        if (originalDim) {
            classNode.style({
                'width': originalDim.width,
                'height': originalDim.height,
                'text-valign': originalDim.textValign,
                'text-halign': originalDim.textHalign,
                'text-margin-y': originalDim.textMarginY
            });
            
            // Reset position if needed
            if (originalDim.position) {
                classNode.position(originalDim.position);
            }
        }
    }
    
    // Helper method to adjust class size based on number of methods
    adjustClassSize(classId) {
        const classNode = this.cy.$id(classId);
        if (!classNode || classNode.length === 0) return;
        
        const methodCount = classNode.children().length;
        const newHeight = Math.max(150, 80 + (methodCount * 110));
        const newWidth = Math.max(
            parseInt(this.originalDimensions[classId]?.width || 150), 
            800
        );
        
        const currentPosition = classNode.position();
        
        classNode.style({
            'width': newWidth,
            'height': newHeight
        });
        
        // Explicitly reset position to avoid offset
        classNode.position(currentPosition);
        
        // Reposition the remaining methods
        this.repositionMethodsInClass(classId);
    }
    
    // Helper method to reposition methods after one is removed
    repositionMethodsInClass(classId) {
        const classNode = this.cy.$id(classId);
        if (!classNode || classNode.length === 0) return;
        
        const children = classNode.children();
        const methodCount = children.length;
        const parentCenter = classNode.position();
        const newHeight = parseInt(classNode.style('height'));
        const parentTopY = parentCenter.y - (newHeight / 2);
        
        children.forEach((methodNode, index) => {
            // Recalculate position for each method
            const offsetY = 60 + (index * 40);
            const methodAbsoluteY = parentTopY + offsetY;
            
            // Horizontal centering with variance for many methods
            const horizontalVariance = methodCount > 4 ? (index % 2) * 20 - 10 : 0;
            const methodAbsoluteX = parentCenter.x + horizontalVariance;
            
            // Set new position
            methodNode.position({
                x: methodAbsoluteX,
                y: methodAbsoluteY
            });
        });
    }

    createEdgesForNode(id, nodeLabel) {
        // If there's only one inserted node, no edges need to be created yet
        if (this.insertedNodes.size <= 1) {
            console.log("Only one node exists, skipping edge creation");
            return;
        }

        // Get the node data from the original data source
        const nodeData = this.data.nodes.get(id).data;
        if (!nodeData) {
            console.error(`Node data not found for id ${id}`);
            return;
        }

        // If traceMode is not enabled (the default false branch)
        if (!this.data.traceMode) {
            // Find the parent node by traversing up the call tree
            const parentInfo = this.findFirstSelectedParent(id);
            console.log(`Parent info for node ${id}:`, parentInfo);

            if (parentInfo) {
                const { parentId, parentNodeLabel } = parentInfo;

                // Remove all edges originating from the parent node
                this.removeAllEdgesFromNode(parentId);

                // Now traverse downward from the parent node to create new edges
                this.traverseDownAndCreateEdges(parentId, parentNodeLabel);
            }
            // If no selected parent found, just handle the current node's connections
            this.traverseDownAndCreateEdges(id, nodeLabel);

        }
    }

    // Helper method to remove all edges that originate from the given node
    removeAllEdgesFromNode(originalId) {
        if (this.originalIdToSourceEdges.has(originalId)) {
            const edgeIds = this.originalIdToSourceEdges.get(originalId);
            for (const edgeId of edgeIds) {
                // Remove the edge from Cytoscape if it exists
                if (this.insertedEdges.has(edgeId)) {
                    const edge = this.insertedEdges.get(edgeId);
                    this.cy.remove(edge);
                    this.insertedEdges.delete(edgeId);
                }
            }
            // Clear the set of source edges
            this.originalIdToSourceEdges.set(originalId, new Set());
            console.log(`Removed all edges from node ${originalId}`);
        }
    }

    // Helper method to find the first selected parent node in the call tree
    findFirstSelectedParent(originalId) {
        let currentId = originalId;

        while (currentId) {
            const currentNode = this.data.nodes.get(currentId);
            if (!currentNode) break;

            const parentId = currentNode.data.parentId;
            if (!parentId) break;

            const parentNode = this.data.nodes.get(parentId);
            if (!parentNode) break;

            // Check if the parent is selected
            if (parentNode.data.selected) {
                // Found a selected parent, return its information
                const parentNodeLabel = this.getMethodLabelById(parentId);
                if (parentNodeLabel && this.insertedNodes.has(parentNodeLabel)) {
                    return { parentId, parentNodeLabel };
                }
            }

            // Move up to the parent
            currentId = parentId;
        }

        // No selected parent found
        return null;
    }

    // Helper method to traverse down and create edges from the source node
    // Uses DFS traversal to create edges
    traverseDownAndCreateEdges(originalId, sourceNodeLabel) {
        const visited = new Set();
        console.log(`Traversing down from ${originalId}  ${sourceNodeLabel} to create edges`);

        // Helper function using DFS traversal
        const dfs = (currentId) => {
            if (visited.has(currentId)) return;
            visited.add(currentId);

            const currentNode = this.data.nodes.get(currentId);
            if (!currentNode) return;

            // Create edges for selected nodes that aren't the source node
            if (currentId !== originalId && currentNode.data.selected) {
                const targetNodeLabel = this.getMethodLabelById(currentId);
                if (targetNodeLabel && this.insertedNodes.has(targetNodeLabel)) {
                    this.createEdge(originalId, sourceNodeLabel, currentId, targetNodeLabel);
                    // Stop traversing deeper after finding a selected node
                    return;
                }
            }

            // Traverse child nodes
            const children = currentNode.data.children || [];
            for (const child of children) {
                // Extract ID from child object
                // Adjust this logic based on your data structure
                const childId = child.id || child.nodeId || child;

                // Ensure a valid ID was extracted
                if (childId && (typeof childId === 'string' || typeof childId === 'number')) {
                    dfs(childId);
                } else {
                    console.error(`Cannot extract valid ID from child:`, child);
                }
            }
        };

        // Start traversal from source node, but don't create edges for source node
        dfs(originalId);
    }

    // Helper method to create an edge between two nodes
    createEdge(sourceOriginalId, sourceNodeLabel, targetOriginalId, targetNodeLabel) {
        // Generate a unique ID for the edge
        const edgeId = `edge_${sourceOriginalId}_${targetOriginalId}_${new Date().getTime()}`;

        // Check if this edge already exists
        if (this.insertedEdges.has(edgeId)) {
            console.log(`Edge ${edgeId} already exists, skipping creation`);
            return;
        }

        // Create the edge data
        const edgeData = {
            group: 'edges',
            data: {
                id: edgeId,
                source: sourceNodeLabel,
                target: targetNodeLabel,
                sourceOriginalId: sourceOriginalId,
                targetOriginalId: targetOriginalId,
                label: "trace_call",
                interaction: "trace_call"
            }
        };

        // Add the edge to cytoscape
        const edge = this.cy.add(edgeData);
        console.log(`Edge created: ${edgeId} from ${sourceNodeLabel} to ${targetNodeLabel}`);

        // Style the edge
        edge.style({
            'width': 2,
            'line-color': '#999',
            'target-arrow-color': '#999',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier'
        });

        // For self-referential edges, adjust the curve style to make them visible
        if (sourceNodeLabel === targetNodeLabel) {
            edge.style({
                'curve-style': 'unbundled-bezier',
                'control-point-distances': [50],
                'control-point-weights': [0.5],
                'loop-direction': '0deg',
                'loop-sweep': '90deg'
            });
        }

        // Store the edge in our map
        this.insertedEdges.set(edgeId, edge);

        // Track this edge in our original ID maps
        if (!this.originalIdToSourceEdges.has(sourceOriginalId)) {
            this.originalIdToSourceEdges.set(sourceOriginalId, new Set());
        }
        this.originalIdToSourceEdges.get(sourceOriginalId).add(edgeId);

        if (!this.originalIdToTargetEdges.has(targetOriginalId)) {
            this.originalIdToTargetEdges.set(targetOriginalId, new Set());
        }
        this.originalIdToTargetEdges.get(targetOriginalId).add(edgeId);

        console.log(`Created edge from ${sourceNodeLabel} to ${targetNodeLabel}`);
    }
}