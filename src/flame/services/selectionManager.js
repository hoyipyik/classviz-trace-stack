
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
    selectAllAtCurrentGraph(currentData, isTopLevel = true) {
        if (!currentData) return;
        // Process the node itself first
        const nodeId = this.getNodeId(currentData);
        this.selectedNodes.set(nodeId, true);
        this.updateNodeColorState(currentData, true);
        this.dataManager.updateSelectionForSingleNode(nodeId, true);

        // Recursively process children if they exist
        if (currentData.children && currentData.children.length > 0) {
            for (const childNode of currentData.children) {
                this.selectAllAtCurrentGraph(childNode, false);
            }
        }

        // Only render when we're at the top level of recursion
        if (isTopLevel) {
            this.renderData();
        }
    }

    // Updated function to clear all selections in the current graph
    clearAllAtCurrentGraph(currentData, isTopLevel = true) {
        if (!currentData) return;
        // Process the node itself first
        const nodeId = this.getNodeId(currentData);
        this.selectedNodes.delete(nodeId);
        this.updateNodeColorState(currentData, false);
        this.dataManager.updateSelectionForSingleNode(nodeId, false);

        // Recursively process children if they exist
        if (currentData.children && currentData.children.length > 0) {
            for (const childNode of currentData.children) {
                this.clearAllAtCurrentGraph(childNode, false);
            }
        }

        // Only render when we're at the top level of recursion
        if (isTopLevel) {
            this.renderData();
        }
    }

    // Updated function to select all nodes across multiple flame graphs
    selectAll() {
        const dataMap = this.dataManager.getData();
        if (!dataMap) return;
        // Iterate through each key in the map
        // this.dataManager.updateSelectionForAllNodes(true);
        for (const key in dataMap) {
            const rootNode = dataMap[key];
            if (!rootNode) continue;

            // Process the root node and all its children recursively
            this.selectAllAtCurrentGraph(rootNode, false);
        }

        this.renderData();
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
