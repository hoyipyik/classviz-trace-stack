
/**
 * Selection manager for flame graph with improved handling
 */
export class FlameGraphSelectionManager {
    constructor() {
        this.selectedNodes = new Map();
        this.enabled = false;
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
        } else {
            this.selectedNodes.set(nodeId, true);
            this.updateNodeColorState(nodeData, true);
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

    clearSelection() {
        this.selectedNodes.clear();
    }

    getSelectedNodeIds() {
        return Array.from(this.selectedNodes.keys());
    }
}
