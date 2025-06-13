/**
 * CallTreeManager - Handles call tree traversal and edge creation for hierarchical view
 */
export class CallTreeManager {
    constructor(data, edgeManager, nodeFactory) {
        this.data = data;
        this.edgeManager = edgeManager;
        this.nodeFactory = nodeFactory;
    }

    /**
     * Rebuild all edges for call tree mode with standard styling
     * @param {Map} threadToMethodNodesInOrder - Map of thread to method nodes
     */
    rebuildCallTreeEdges(threadToMethodNodesInOrder) {
        threadToMethodNodesInOrder.forEach((_, threadName) => {
            const treeData = this.data.threadsData[threadName];
            if (!treeData) return;

            const rootNode = treeData;
            if (!rootNode) return;

            this.traverseTreeAndCreateEdges(rootNode);
        });
    }

    /**
     * Rebuild numbered call tree edges with colors and sequence numbers
     * @param {Map} threadToMethodNodesInOrder - Map of thread to method nodes
     */
    rebuildNumberedCallTreeEdges(threadToMethodNodesInOrder) {
        this.edgeManager.clearAllEdges();

        const maxDepth = this.calculateMaxDepth(threadToMethodNodesInOrder);
        const depthColors = this.generateDepthColors(maxDepth);

        threadToMethodNodesInOrder.forEach((_, threadName) => {
            const treeData = this.data.threadsData[threadName];
            if (!treeData) return;

            const rootNode = treeData;
            if (!rootNode) return;

            this.traverseTreeAndCreateNumberedEdges(rootNode, depthColors);
        });
    }

    /**
     * Traverse tree structure and create edges between selected nodes
     * @param {object} node - Current tree node
     * @param {Set} visited - Set of visited nodes to prevent cycles
     * @param {string|null} lastSelectedParentId - Last selected parent node ID
     * @param {string|null} lastSelectedParentLabel - Last selected parent node label
     */
    traverseTreeAndCreateEdges(node, visited = new Set(), lastSelectedParentId = null, lastSelectedParentLabel = null) {
        if (!node || visited.has(node.id)) return;
        visited.add(node.id);

        const nodeData = this.data.nodes.get(node.id)?.data;
        if (!nodeData) return;

        const nodeLabel = this.nodeFactory.getMethodLabelById(node.id);
        const isCurrentNodeSelected = nodeData.selected && nodeLabel && this.nodeFactory.nodeExists(nodeLabel);

        let currentSelectedParentId = lastSelectedParentId;
        let currentSelectedParentLabel = lastSelectedParentLabel;

        if (isCurrentNodeSelected) {
            currentSelectedParentId = node.id;
            currentSelectedParentLabel = nodeLabel;

            if (lastSelectedParentId && lastSelectedParentLabel) {
                this.edgeManager.createEdge(lastSelectedParentId, lastSelectedParentLabel, node.id, nodeLabel);
            }
        }

        const children = node.children || [];
        for (const child of children) {
            this.traverseTreeAndCreateEdges(
                child,
                visited,
                currentSelectedParentId,
                currentSelectedParentLabel
            );
        }
    }

    /**
     * Calculate maximum depth of selected nodes in the call tree
     * @param {Map} threadToMethodNodesInOrder - Map of thread to method nodes
     * @returns {number} - Maximum depth found
     */
    calculateMaxDepth(threadToMethodNodesInOrder) {
        let maxDepth = 0;

        const calculateNodeDepth = (node, depth = 0, visited = new Set()) => {
            if (!node || !node.id || visited.has(node.id)) return depth;
            visited.add(node.id);

            const nodeData = this.data.nodes.get(node.id)?.data;
            if (!nodeData) return depth;

            const nodeLabel = this.nodeFactory.getMethodLabelById(node.id);
            const isNodeSelected = nodeData.selected && nodeLabel && this.nodeFactory.nodeExists(nodeLabel);

            if (isNodeSelected) {
                maxDepth = Math.max(maxDepth, depth);
            }

            const children = node.children || [];
            for (const child of children) {
                calculateNodeDepth(child, depth + 1, new Set([...visited]));
            }

            return depth;
        };

        threadToMethodNodesInOrder.forEach((_, threadName) => {
            const treeData = this.data.threadsData[threadName];
            if (treeData) {
                calculateNodeDepth(treeData, 0);
            }
        });

        return maxDepth;
    }

    /**
     * Generate color palette for different call tree depths
     * @param {number} maxDepth - Maximum depth to generate colors for
     * @returns {object} - Mapping of depth to color
     */
    generateDepthColors(maxDepth) {
        const colors = {};

        if (maxDepth < 0) maxDepth = 0;

        for (let depth = 0; depth <= maxDepth; depth++) {
            const hue = Math.floor((depth / (maxDepth + 1)) * 360);
            colors[depth] = `hsl(${hue}, 80%, 50%)`;
        }

        return colors;
    }

    /**
     * Traverse tree and create numbered edges with depth-based colors
     * @param {object} node - Current tree node
     * @param {object} depthColors - Mapping of depth to color
     * @param {Set} visited - Set of visited nodes
     * @param {number} depth - Current depth in tree
     * @param {string|null} lastSelectedParentId - Last selected parent node ID
     * @param {string|null} lastSelectedParentLabel - Last selected parent node label
     */
    traverseTreeAndCreateNumberedEdges(node, depthColors = "", visited = new Set(), depth = 0, lastSelectedParentId = null, lastSelectedParentLabel = null) {
        if (!node || !node.id || visited.has(node.id)) return;
        visited.add(node.id);

        const nodeData = this.data.nodes.get(node.id)?.data;
        if (!nodeData) return;

        const nodeLabel = this.nodeFactory.getMethodLabelById(node.id);
        const isCurrentNodeSelected = nodeData.selected && nodeLabel && this.nodeFactory.nodeExists(nodeLabel);

        let currentSelectedParentId = lastSelectedParentId;
        let currentSelectedParentLabel = lastSelectedParentLabel;
        let currentDepth = depth;

        if (isCurrentNodeSelected) {
            currentSelectedParentId = node.id;
            currentSelectedParentLabel = nodeLabel;

            if (lastSelectedParentId && lastSelectedParentLabel) {
                this.edgeManager.createNumberedEdge(
                    lastSelectedParentId,
                    lastSelectedParentLabel,
                    node.id,
                    nodeLabel,
                    depth,
                    depthColors[depth - 1] || '#999999'
                );
            }
        }

        const children = node.children || [];
        for (const child of children) {
            this.traverseTreeAndCreateNumberedEdges(
                child,
                depthColors,
                new Set([...visited]),
                isCurrentNodeSelected ? depth + 1 : depth,
                currentSelectedParentId,
                currentSelectedParentLabel
            );
        }
    }

    /**
     * Find the first selected parent node in the call tree hierarchy
     * @param {string} originalId - Starting node ID
     * @returns {object|null} - Parent info object or null
     */
    findFirstSelectedParent(originalId) {
        let currentId = originalId;

        while (currentId) {
            const currentNode = this.data.nodes.get(currentId);
            if (!currentNode) break;

            const parentId = currentNode.data.parentId;
            if (!parentId) break;

            const parentNode = this.data.nodes.get(parentId);
            if (!parentNode) break;

            if (parentNode.data.selected) {
                const parentNodeLabel = this.nodeFactory.getMethodLabelById(parentId);
                if (parentNodeLabel && this.nodeFactory.nodeExists(parentNodeLabel)) {
                    return { parentId, parentNodeLabel };
                }
            }

            currentId = parentId;
        }

        return null;
    }

    /**
     * Traverse down from source node and create edges using DFS
     * @param {string} originalId - Source node original ID
     * @param {string} sourceNodeLabel - Source node label
     */
    traverseDownAndCreateEdges(originalId, sourceNodeLabel) {
        const visited = new Set();

        const dfs = (currentId) => {
            if (visited.has(currentId)) return;
            visited.add(currentId);

            const currentNode = this.data.nodes.get(currentId);
            if (!currentNode) return;

            if (currentId !== originalId && currentNode.data.selected) {
                const targetNodeLabel = this.nodeFactory.getMethodLabelById(currentId);
                if (targetNodeLabel && this.nodeFactory.nodeExists(targetNodeLabel)) {
                    this.edgeManager.createEdge(originalId, sourceNodeLabel, currentId, targetNodeLabel);
                    return;
                }
            }

            const children = currentNode.data.children || [];
            for (const child of children) {
                const childId = child.id || child.nodeId || child;

                if (childId && (typeof childId === 'string' || typeof childId === 'number')) {
                    dfs(childId);
                } else {
                    console.error(`Cannot extract valid ID from child:`, child);
                }
            }
        };

        dfs(originalId);
    }

    /**
     * Create edges for a newly inserted node based on call tree structure
     * @param {string} id - Original node ID
     * @param {string} nodeLabel - Method label
     */
    createEdgesForNode(id, nodeLabel) {
        const nodeData = this.data.nodes.get(id).data;
        if (!nodeData) {
            console.error(`Node data not found for id ${id}`);
            return;
        }

        const parentInfo = this.findFirstSelectedParent(id);

        if (parentInfo) {
            const { parentId, parentNodeLabel } = parentInfo;
            this.edgeManager.removeAllEdgesFromNode(parentId);
            this.traverseDownAndCreateEdges(parentId, parentNodeLabel);
        }
        
        this.traverseDownAndCreateEdges(id, nodeLabel);
    }
}