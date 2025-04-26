export class ClassvizManager {
    constructor(data, cy, eventBus) {
        this.data = data;
        this.cy = cy;
        this.eventBus = eventBus;

        this.originalDimensions = {}; // class node id -> original dimensions
        this.insertedNodes = new Map(); // cy method node id (nodeData.label) -> cy method node
        this.insertedEdges = new Map(); // edge node id -> cy edge 
        window.insertedEdges = this.insertedEdges; // for debugging
        this.classToMethodsMap = new Map(); // class node id -> method node cy ids list (nodeData.label)

        // 以 call tree 的原始 id 為 key：存放以此原始節點作為 source/target 的 edge id
        this.originalIdToSourceEdges = new Map(); // originalId -> Set(edge id) 來源為該原始節點的 edge
        this.originalIdToTargetEdges = new Map(); // originalId -> Set(edge id) 目標為該原始節點的 edge

        this.eventBus.subscribe('changeSingleMethodByIdToClassviz', (
            { nodeId, selected }) => {
            if (selected) {
                this.insertSingleMethodById(nodeId);
            } else {
                // remove single node
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
                    originalId: id,
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
    // 使用DFS遍歷並創建邊緣
    traverseDownAndCreateEdges(originalId, sourceNodeLabel) {
        const visited = new Set();
        console.log(`Traversing down from ${originalId}  ${sourceNodeLabel} to create edges`);

        // 輔助函數，使用DFS遍歷
        const dfs = (currentId) => {
            if (visited.has(currentId)) return;
            visited.add(currentId);
            // console.log(`Visiting node ${currentId}`);

            const currentNode = this.data.nodes.get(currentId);
            if (!currentNode) return;

            // 對非源節點的選中節點創建邊緣
            if (currentId !== originalId && currentNode.data.selected) {
                const targetNodeLabel = this.getMethodLabelById(currentId);
                if (targetNodeLabel && this.insertedNodes.has(targetNodeLabel)) {
                    // Removed the condition "sourceNodeLabel !== targetNodeLabel" to allow self-referencing edges
                    this.createEdge(originalId, sourceNodeLabel, currentId, targetNodeLabel);
                    // 找到選中節點後不再深入遍歷
                    return;
                }
            }

            // 遍歷子節點
            const children = currentNode.data.children || [];
            for (const child of children) {
                // 從子節點對象中提取ID
                // 根據您的數據結構調整這部分邏輯
                const childId = child.id || child.nodeId || child;
                
                // 確保提取到有效的ID
                if (childId && (typeof childId === 'string' || typeof childId === 'number')) {
                    dfs(childId);
                } else {
                    console.error(`Cannot extract valid ID from child:`, child);
                }
            }
        };

        // 從源節點開始遍歷，但不為源節點創建邊緣
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