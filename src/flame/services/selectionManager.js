
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
            this.updateNodeColorState(nodeData, false);
            this.dataManager.updateSelectionForSingleNode(nodeId, false);
        } else {
            this.selectedNodes.set(nodeId, true);
            this.updateNodeColorState(nodeData, true);
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

    updateNodeColorState(nodeData, isSelected) {
        if (!nodeData) return;

        nodeData._originalColor = nodeData._originalColor || nodeData.color || null;
        nodeData.selected = isSelected;
    }

    getSelectionCount() {
        return this.selectedNodes.size;
    }

    // Updated function to select all nodes in the current graph
    selectAllAtCurrentGraph(currentData, isTopLevel = true, nodeIdsToSelect = []) {
        if (!currentData) return nodeIdsToSelect;

        // Process the node itself first
        const nodeId = this.getNodeId(currentData);
        this.selectedNodes.set(nodeId, true);
        this.updateNodeColorState(currentData, true);
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
        this.selectedNodes.delete(nodeId);
        this.updateNodeColorState(currentData, false);
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
        this.selectedNodes.clear();
        this.dataManager.updateSelectionForAllNodes(false);
        this.renderData();

    }

    getSelectedNodeIds() {
        return Array.from(this.selectedNodes.keys());
    }
}
