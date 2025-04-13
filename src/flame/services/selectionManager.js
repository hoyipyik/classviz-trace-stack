
/**
 * Selection manager for flame graph with improved handling
 */
export class FlameGraphSelectionManager {
    constructor(dataManager) {
        this.selectedNodes = new Map();
        this.enabled = false;
        this.dataManager = dataManager;

        // call back
        this.renderData = null;
        this.updateSelectedNodes(this.dataManager.getData());
    }

    updateSelectedNodes(data) {
        if (!data) return;

        this.selectedNodes.clear();

        const updateNodeRecursively = (node) => {
            if (!node) return;

            // If node is selected, add it to the selectedNodes Map
            if (node.selected) {
                const nodeId = this.getNodeId(node);
                this.selectedNodes.set(nodeId, true);
            }

            // Recursively process children if they exist
            if (node.children && node.children.length > 0) {
                for (const childNode of node.children) {
                    updateNodeRecursively(childNode);
                }
            }
        };

        // Process each root node in the data
        for (const key in data) {
            const rootNode = data[key];
            if (!rootNode) continue;

            updateNodeRecursively(rootNode);
        }
    }

    setDataRefreshCallback(callback) {
        this.renderData = callback;
    }

    toggleSelectionMode() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    isEnabled() {
        return this.enabled;
    }

    toggleNodeSelection(nodeData) {
        if (!nodeData) return false;

        const nodeId = this.getNodeId(nodeData);
        const isCurrentlySelected = this.selectedNodes.has(nodeId);

        if (isCurrentlySelected) {
            this.selectedNodes.delete(nodeId);
            // this.updateNodeColorState(nodeData, false);
            this.dataManager.updateSelectionForSingleNode(nodeId, false);
        } else {
            this.selectedNodes.set(nodeId, true);
            // this.updateNodeColorState(nodeData, true);
            this.dataManager.updateSelectionForSingleNode(nodeId, true);
        }

        return !isCurrentlySelected;
    }

    isNodeSelected(nodeData) {
        if (!nodeData) return false;
        return this.selectedNodes.has(this.getNodeId(nodeData));
    }

    getNodeId(nodeData) {
        if (!nodeData) return "unknown";

        if (nodeData.id) return nodeData.id;

        // Create a unique identifier based on available properties
        return `${nodeData.className || ''}|${nodeData.methodName || ''}|${nodeData.name || ''}|${nodeData.value || ''}`;
    }

    getSelectionCount() {
        return this.selectedNodes.size;
    }

    // Updated function to select all nodes in the current graph
    selectAllAtCurrentGraph(currentData, isTopLevel = true, nodeIdsToSelect = []) {
        if (!currentData) return nodeIdsToSelect;

        // Process the node itself first
        const nodeId = this.getNodeId(currentData);
        // this.selectedNodes.set(nodeId, true);
        nodeIdsToSelect.push(nodeId);

        // Recursively process children if they exist
        if (currentData.children && currentData.children.length > 0) {
            for (const childNode of currentData.children) {
                this.selectAllAtCurrentGraph(childNode, false, nodeIdsToSelect);
            }
        }

        // Only update selection and render when we're at the top level of recursion
        if (isTopLevel) {
            this.dataManager.updateSelectionForMultiNodes(nodeIdsToSelect, true);
            this.renderData();
        }

        return nodeIdsToSelect;
    }

    // Updated function to clear all selections in the current graph
    clearAllAtCurrentGraph(currentData, isTopLevel = true, nodeIdsToClear = []) {
        if (!currentData) return nodeIdsToClear;

        // Process the node itself first
        const nodeId = this.getNodeId(currentData);
        // this.selectedNodes.delete(nodeId);
        nodeIdsToClear.push(nodeId);

        // Recursively process children if they exist
        if (currentData.children && currentData.children.length > 0) {
            for (const childNode of currentData.children) {
                this.clearAllAtCurrentGraph(childNode, false, nodeIdsToClear);
            }
        }

        // Only update selection and render when we're at the top level of recursion
        if (isTopLevel) {
            this.dataManager.updateSelectionForMultiNodes(nodeIdsToClear, false);
            this.renderData();
        }

        return nodeIdsToClear;
    }

    // Updated function to select all nodes across multiple flame graphs
    selectAll() {
        const dataMap = this.dataManager.getData();
        if (!dataMap) return;

        const allNodeIds = [];

        // Iterate through each key in the map
        for (const key in dataMap) {
            const rootNode = dataMap[key];
            if (!rootNode) continue;

            // Process the root node and all its children recursively
            // But don't render or update selection until we've collected all node IDs
            this.selectAllAtCurrentGraph(rootNode, false, allNodeIds);
        }

        // Now batch update all nodes and render once
        if (allNodeIds.length > 0) {
            this.dataManager.updateSelectionForMultiNodes(allNodeIds, true);
            this.renderData();
        }
    }

    clearAll() {
        // this.selectedNodes.clear();
        this.dataManager.updateSelectionForAllNodes(false);
        this.renderData();

    }

    selectOrClearByPackageName(packageName, select) {
        const selectedIds = [];
        const traverser = (node) => {
            if (!node)
                return;
            if (node.packageName === packageName) {
                const nodeId = this.getNodeId(node);
                selectedIds.push(nodeId);
            }
            if (node.children && node.children.length > 0) {
                for (const child of node.children) {
                    traverser(child);
                }
            }
        }
        const dataMap = this.dataManager.getData();
        if (!dataMap) return;
        
        for (const key in dataMap) {
            const rootNode = dataMap[key];
            if (!rootNode) continue;
            traverser(rootNode);
        }

        if (selectedIds.length > 0) {
            this.dataManager.updateSelectionForMultiNodes(selectedIds, select);
            this.renderData();
        }
    }


    /**
    * Selects all direct children of the given node
    * @param {Object} nodeData - The parent node whose direct children should be selected
    * @param {boolean} includeItself - Whether to include the parent node in selection (default: true)
    */
    selectDirectChildren(nodeData, includeItself = true) {
        if (!nodeData) return;

        const nodeIdsToSelect = [];

        // Include parent node if flag is true
        if (includeItself) {
            const parentId = this.getNodeId(nodeData);
            nodeIdsToSelect.push(parentId);
        }

        // Collect IDs of all direct children
        if (nodeData.children) {
            for (const child of nodeData.children) {
                const childId = this.getNodeId(child);
                nodeIdsToSelect.push(childId);
            }
        }

        // Batch update all selected nodes and trigger render
        if (nodeIdsToSelect.length > 0) {
            this.dataManager.updateSelectionForMultiNodes(nodeIdsToSelect, true);
            this.renderData();
        }
    }

    /**
     * Clears selection for all direct children of the given node
     * @param {Object} nodeData - The parent node whose direct children should be deselected
     * @param {boolean} includeItself - Whether to include the parent node in deselection (default: true)
     */
    clearDirectChildren(nodeData, includeItself = true) {
        if (!nodeData) return;

        const nodeIdsToClear = [];

        // Include parent node if flag is true
        if (includeItself) {
            const parentId = this.getNodeId(nodeData);
            nodeIdsToClear.push(parentId);
        }

        // Collect IDs of all direct children
        if (nodeData.children) {
            for (const child of nodeData.children) {
                const childId = this.getNodeId(child);
                nodeIdsToClear.push(childId);
            }
        }

        // Batch update all deselected nodes and trigger render
        if (nodeIdsToClear.length > 0) {
            this.dataManager.updateSelectionForMultiNodes(nodeIdsToClear, false);
            this.renderData();
        }
    }

    /**
     * Selects all descendants (children, grandchildren, etc.) of the given node
     * @param {Object} nodeData - The parent node whose descendants should be selected
     * @param {boolean} includeItself - Whether to include the parent node in selection (default: true)
     */
    selectAllDescendants(nodeData, includeItself = true) {
        if (!nodeData) return;

        const nodeIdsToSelect = [];

        // Include parent node if flag is true
        if (includeItself) {
            const parentId = this.getNodeId(nodeData);
            nodeIdsToSelect.push(parentId);
        }

        // Helper function to recursively collect all descendant IDs
        const collectDescendantIds = (node) => {
            if (!node) return;

            const nodeId = this.getNodeId(node);
            nodeIdsToSelect.push(nodeId);

            if (node.children && node.children.length > 0) {
                for (const child of node.children) {
                    collectDescendantIds(child);
                }
            }
        };

        // Start collecting from the node's children
        if (nodeData.children) {
            for (const child of nodeData.children) {
                collectDescendantIds(child);
            }
        }

        // Batch update all selected nodes and trigger render
        if (nodeIdsToSelect.length > 0) {
            this.dataManager.updateSelectionForMultiNodes(nodeIdsToSelect, true);
            this.renderData();
        }
    }

    /**
     * Clears selection for all descendants of the given node
     * @param {Object} nodeData - The parent node whose descendants should be deselected
     * @param {boolean} includeItself - Whether to include the parent node in deselection (default: true)
     */
    clearAllDescendants(nodeData, includeItself = true) {
        if (!nodeData) return;

        const nodeIdsToClear = [];

        // Include parent node if flag is true
        if (includeItself) {
            const parentId = this.getNodeId(nodeData);
            nodeIdsToClear.push(parentId);
        }

        // Helper function to recursively collect all descendant IDs
        const collectDescendantIds = (node) => {
            if (!node) return;

            const nodeId = this.getNodeId(node);
            nodeIdsToClear.push(nodeId);

            if (node.children && node.children.length > 0) {
                for (const child of node.children) {
                    collectDescendantIds(child);
                }
            }
        };

        // Start collecting from the node's children
        if (nodeData.children) {
            for (const child of nodeData.children) {
                collectDescendantIds(child);
            }
        }

        // Batch update all deselected nodes and trigger render
        if (nodeIdsToClear.length > 0) {
            this.dataManager.updateSelectionForMultiNodes(nodeIdsToClear, false);
            this.renderData();
        }
    }

    selectOrClearByIdRange(startId, endId, selectFlag) {
        const nodeIdsToSelect = [];
        for(let i = startId; i <= endId; i ++){
            const nodeId = i.toString();
            nodeIdsToSelect.push(nodeId);
        }
        if(nodeIdsToSelect.length > 0){
            this.dataManager.updateSelectionForMultiNodes(nodeIdsToSelect, selectFlag);
            this.renderData();
        }

    }

    getSelectedNodeIds() {
        return Array.from(this.selectedNodes.keys());
    }
}
