/**
 * NodeFactory - Creates and manages method nodes (both library and regular)
 */
export class NodeFactory {
    constructor(cy, data, ALLOWED_LIB_METHODS, insertedNodes, methodLabelToOriginalIds, classLayoutManager, nodeStyler) {
        this.cy = cy;
        this.data = data;
        this.ALLOWED_LIB_METHODS = ALLOWED_LIB_METHODS;
        this.insertedNodes = insertedNodes;
        this.methodLabelToOriginalIds = methodLabelToOriginalIds;
        this.classLayoutManager = classLayoutManager;
        this.nodeStyler = nodeStyler;
    }

    /**
     * Get method label by node ID from the data source
     * @param {string} id - Original node ID
     * @returns {string|null} - Method label or null if not found
     */
    getMethodLabelById(id) {
        const nodeData = this.data.nodes.get(id).data;
        if (nodeData) {
            return nodeData.label;
        } else {
            console.error(`Node with id ${id} not found`);
            return null;
        }
    }

    /**
     * Find class node by method label
     * @param {string} label - Method label
     * @returns {object|null} - Cytoscape class node or null
     */
    findClassNodeByNodeLabel(label) {
        const parenIndex = label.indexOf("(");
        if (parenIndex === -1) return;
        const lastDotBeforeParens = label.lastIndexOf(".", parenIndex);
        if (lastDotBeforeParens === -1) return;
        const classId = label.substring(0, lastDotBeforeParens);
        return this.cy.$id(classId);
    }

    /**
     * Core function to create a method node
     * @param {string} id - Original node ID
     * @param {string} nodeLabel - Method label
     * @returns {object|null} - Created Cytoscape node or null
     */
    createMethodNode(id, nodeLabel) {
        // Check if the node already exists
        if (this.insertedNodes.has(nodeLabel)) {
            return this.insertedNodes.get(nodeLabel);
        }

        // Update the methodLabelToOriginalIds map
        if (!this.methodLabelToOriginalIds.has(nodeLabel)) {
            this.methodLabelToOriginalIds.set(nodeLabel, new Set());
        }
        this.methodLabelToOriginalIds.get(nodeLabel).add(id);

        const nodeData = this.data.nodes.get(id).data;
        const isAllowedLibMethod = this.ALLOWED_LIB_METHODS.includes(nodeLabel);
        const classNode = this.findClassNodeByNodeLabel(nodeLabel);

        // If there's no class node but it's not an allowed library method, return null
        if ((!classNode || classNode.length === 0) && !isAllowedLibMethod) {
            console.warn(`Class node for method ${nodeLabel} not found in cytoscape and not in allowed library methods`);
            return null;
        }

        let addedNode;

        if (isAllowedLibMethod && (!classNode || classNode.length === 0)) {
            // Create library method node without a parent
            addedNode = this.createLibraryMethodNode(id, nodeLabel, nodeData);
        } else {
            // Regular method node with parent class node
            addedNode = this.createRegularMethodNode(id, nodeLabel, nodeData, classNode);
        }

        return addedNode;
    }

    /**
     * Create a standalone library method node without parent class
     * @param {string} id - Original node ID
     * @param {string} nodeLabel - Method label
     * @param {object} nodeData - Node data from source
     * @returns {object} - Created Cytoscape node
     */
    createLibraryMethodNode(id, nodeLabel, nodeData) {
        const methodNodeData = {
            group: 'nodes',
            data: {
                id: nodeLabel,
                originalId: id,
                visible: true,
                name: nodeLabel.split('.').pop(),
                labels: ["LibraryOperation"],
                properties: {
                    ...nodeData,
                    kind: "library-method",
                    simpleName: nodeLabel.split('.').pop()
                }
            }
        };

        // Add library method node to cytoscape
        const addedNode = this.cy.add(methodNodeData);
        this.insertedNodes.set(nodeLabel, addedNode);

        // Calculate and set position
        const position = this.classLayoutManager.calculateLibraryMethodPosition();
        addedNode.position(position);

        // Apply specialized styles for library method nodes
        this.nodeStyler.applyLibraryMethodStyle(addedNode, nodeData, nodeLabel);

        return addedNode;
    }

    /**
     * Create a method node with parent class node
     * @param {string} id - Original node ID
     * @param {string} nodeLabel - Method label
     * @param {object} nodeData - Node data from source
     * @param {object} classNode - Parent class node
     * @returns {object} - Created Cytoscape node
     */
    createRegularMethodNode(id, nodeLabel, nodeData, classNode) {
        const classId = classNode.id();

        // Adjust class node style and size
        const methodCount = classNode.children().length + 1; // +1 for the new node
        const { newHeight, currentPosition } = this.classLayoutManager.adjustClassForMethods(classId, classNode, methodCount);

        // Create method node
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
        const addedNode = this.cy.add(methodNodeData);
        this.insertedNodes.set(nodeLabel, addedNode);

        // Update the classToMethodsMap
        this.classLayoutManager.addMethodToClass(classId, nodeLabel);

        // Calculate method node position
        const methodIndex = methodCount - 1; // 0-based index
        const methodPosition = this.classLayoutManager.calculateMethodPosition(
            methodIndex, methodCount, currentPosition, newHeight
        );

        // Set the method node's position
        addedNode.position(methodPosition);

        // Apply style for the method node
        this.nodeStyler.applyRegularMethodStyle(addedNode, nodeData, nodeLabel);

        return addedNode;
    }

    /**
     * Check if a node exists in the inserted nodes
     * @param {string} nodeLabel - Method label
     * @returns {boolean} - Whether the node exists
     */
    nodeExists(nodeLabel) {
        return this.insertedNodes.has(nodeLabel);
    }

    /**
     * Get an existing node
     * @param {string} nodeLabel - Method label
     * @returns {object|null} - Cytoscape node or null
     */
    getExistingNode(nodeLabel) {
        return this.insertedNodes.get(nodeLabel) || null;
    }

    /**
     * Remove a method node and update mappings
     * @param {string} id - Original node ID
     * @param {string} nodeLabel - Method label
     * @returns {boolean} - Success status
     */
    removeMethodNode(id, nodeLabel) {
        // Check if node and ID mapping exist
        if (!this.insertedNodes.has(nodeLabel) ||
            !this.methodLabelToOriginalIds.has(nodeLabel) ||
            !this.methodLabelToOriginalIds.get(nodeLabel).has(id)) {
            console.warn(`Node ${nodeLabel} with ID ${id} not found or not properly mapped`);
            return false;
        }

        const methodNode = this.insertedNodes.get(nodeLabel);
        if (!methodNode) return false;

        // Update the originalId to node mapping
        this.methodLabelToOriginalIds.get(nodeLabel).delete(id);

        // Determine if node should be completely removed
        const shouldRemoveNode = this.methodLabelToOriginalIds.get(nodeLabel).size === 0;

        if (shouldRemoveNode) {
            // Check if this is a library method
            const isLibraryMethod = this.ALLOWED_LIB_METHODS.includes(nodeLabel) || !methodNode.parent().length;
            let classId = null;

            if (!isLibraryMethod) {
                const classNode = this.findClassNodeByNodeLabel(nodeLabel);
                if (classNode && classNode.length > 0) {
                    classId = classNode.id();
                }
            }

            // Remove the node from cytoscape
            this.cy.remove(methodNode);
            this.insertedNodes.delete(nodeLabel);
            this.methodLabelToOriginalIds.delete(nodeLabel);

            // Update class mapping if applicable
            if (!isLibraryMethod && classId) {
                const isClassEmpty = this.classLayoutManager.removeMethodFromClass(classId, nodeLabel);

                // Adjust class size or restore original dimensions
                if (isClassEmpty) {
                    this.classLayoutManager.restoreClassOriginalDimensions(classId);
                } else {
                    this.classLayoutManager.adjustClassSize(classId);
                }
            }
        }

        return true;
    }
}