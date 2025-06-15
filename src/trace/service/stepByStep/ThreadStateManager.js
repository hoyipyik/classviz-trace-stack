/**
 * Manages thread state and coordinates with visualization
 */
export class ThreadStateManager {
    constructor(classvizManager, dataStore) {
        this.classvizManager = classvizManager;
        this.dataStore = dataStore;
    }

    getThreadData(threadName) {
        const methodNodes = this.classvizManager.threadToMethodNodesInOrder.get(threadName) || [];
        const currentIndex = this.classvizManager.currentIndexByThread.get(threadName) || 0;
        const borderColor = this.classvizManager.threadToFocusedBorderColour.get(threadName);
        const currentMethod = methodNodes[currentIndex];

        return {
            threadName,
            methodNodes,
            currentIndex,
            maxIndex: methodNodes.length - 1,
            borderColor,
            currentMethod
        };
    }

    getAllThreadNames() {
        return Array.from(this.classvizManager.threadToMethodNodesInOrder.keys());
    }

    updateThreadIndex(threadName, newIndex) {
        const threadData = this.getThreadData(threadName);
        
        // Validate index bounds
        if (newIndex < 0 || newIndex >= threadData.methodNodes.length) {
            console.error(`Invalid index ${newIndex} for thread ${threadName}`);
            return false;
        }

        this.classvizManager.currentIndexByThread.set(threadName, newIndex);
        
        // Update visualization if in step-by-step mode
        if (this.classvizManager.stepByStepMode) {
            this._updateVisualization(threadName, threadData.methodNodes, newIndex, threadData.borderColor);
        }

        // Update current focus
        const currentNodeId = threadData.methodNodes[newIndex].originalId;
        this.dataStore.current = currentNodeId;

        return true;
    }

    _updateVisualization(threadName, methodNodes, currentIndex, borderColor) {
        methodNodes.forEach((node, index) => {
            const nodeId = node.originalId;
            const nodeData = this.dataStore.getNodeDataByThreadAndId(threadName, nodeId);
            
            if (nodeData) {
                let color;
                if (index < currentIndex) {
                    // For nodes before current position, set slightly dark gray
                    color = '#999999';
                    this.classvizManager.changeColorOfNodeById(nodeId, color, true, nodeData.originalColor);
                } else if (index > currentIndex) {
                    // Check if this node has the same label as the current node - if so, skip coloring
                    if (methodNodes[currentIndex] && methodNodes[currentIndex].label === node.label) {
                        return;
                    }
                    // For nodes after current position, set light gray
                    color = '#DDDDDD';
                    this.classvizManager.changeColorOfNodeById(nodeId, color, true, nodeData.originalColor);
                } else {
                    // For the current node, use border color
                    color = borderColor;
                    this.classvizManager.changeColorOfNodeById(nodeId, color, true, nodeData.originalColor);
                }
            } else {
                console.log("[Error no data]");
            }
        });
    }

    resetAllThreadColors() {
        for (const [threadName, nodes] of this.classvizManager.threadToMethodNodesInOrder.entries()) {
            nodes.forEach(node => {
                const nodeId = node.originalId;
                const nodeData = this.dataStore.getNodeDataByThreadAndId(threadName, nodeId);
                if (nodeData) {
                    this.classvizManager.changeColorOfNodeById(
                        nodeId,
                        nodeData.originalColor || nodeData.color,
                        false
                    );
                }
            });
        }
    }
}