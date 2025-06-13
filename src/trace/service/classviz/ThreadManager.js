import { generateFocusedBorderColors } from "../../utils/colour/colourUtils.js";

/**
 * ThreadManager - Handles thread-based organization and tracking
 */
export class ThreadManager {
    constructor(idRangeByThreadMap) {
        this.idRangeByThreadMap = idRangeByThreadMap;
        this.threadToFocusedBorderColour = new Map();
        this.threadToMethodNodesInOrder = new Map();
        this.currentIndexByThread = new Map();

        this.initFocusedBorderColors();
        this.initThreadMaps();
    }

    /**
     * Initialize focused border colors for different threads
     */
    initFocusedBorderColors() {
        const focusedBorderColors = generateFocusedBorderColors(this.idRangeByThreadMap.size);

        let colorIndex = 0;
        this.idRangeByThreadMap.forEach((_, threadName) => {
            this.threadToFocusedBorderColour.set(threadName, focusedBorderColors[colorIndex]);
            colorIndex++;
        });
    }

    /**
     * Initialize thread-related maps
     */
    initThreadMaps() {
        this.idRangeByThreadMap.forEach((_, threadName) => {
            this.threadToMethodNodesInOrder.set(threadName, []);
            this.currentIndexByThread.set(threadName, 0);
        });
    }

    /**
     * Add node to thread's ordered method list
     * @param {string} currentThreadName - Current thread name
     * @param {string} id - Original node ID
     * @param {string} nodeLabel - Method label
     */
    addToThreadMethodNodes(currentThreadName, id, nodeLabel) {
        if (!currentThreadName) return;

        if (!this.threadToMethodNodesInOrder.has(currentThreadName)) {
            this.threadToMethodNodesInOrder.set(currentThreadName, []);
        }

        const threadNodes = this.threadToMethodNodesInOrder.get(currentThreadName);
        const existingNodeIndex = threadNodes.findIndex(node => node.originalId === id);

        // Only add if not already in list
        if (existingNodeIndex === -1) {
            threadNodes.push({
                originalId: id,
                label: nodeLabel
            });

            // Sort by originalId
            threadNodes.sort((a, b) => parseInt(a.originalId) - parseInt(b.originalId));
        }
    }

    /**
     * Remove node from thread's ordered method list
     * @param {string} currentThreadName - Current thread name
     * @param {string} id - Original node ID
     */
    removeFromThreadMethodNodes(currentThreadName, id) {
        if (currentThreadName && this.threadToMethodNodesInOrder.has(currentThreadName)) {
            const threadNodes = this.threadToMethodNodesInOrder.get(currentThreadName);
            const nodeIndex = threadNodes.findIndex(node => node.originalId === id);

            if (nodeIndex !== -1) {
                threadNodes.splice(nodeIndex, 1);
            }
        }
    }

    /**
     * Update current index for a thread based on node ID
     * @param {string} currentThreadName - Current thread name
     * @param {string} nodeId - Node ID to find index for
     */
    updateCurrentIndexByNodeId(currentThreadName, nodeId) {
        if (!currentThreadName) return;

        this.threadToMethodNodesInOrder.forEach((methodNodes, threadName) => {
            const index = methodNodes.findIndex(node => node.originalId === nodeId);
            if (index !== -1 && threadName === currentThreadName) {
                this.currentIndexByThread.set(threadName, index);
            }
        });
    }

    /**
     * Get selected nodes for a specific thread
     * @param {string} threadName - Thread name
     * @param {function} isNodeSelected - Function to check if node is selected
     * @returns {Array} - Array of selected nodes
     */
    getSelectedNodesForThread(threadName, isNodeSelected) {
        const methodNodes = this.threadToMethodNodesInOrder.get(threadName) || [];
        return methodNodes.filter(node => isNodeSelected(node.label, node.originalId));
    }

    /**
     * Get all thread names
     * @returns {Array} - Array of thread names
     */
    getAllThreadNames() {
        return Array.from(this.threadToMethodNodesInOrder.keys());
    }

    /**
     * Get focused border color for a thread
     * @param {string} threadName - Thread name
     * @returns {string} - Border color
     */
    getFocusedBorderColor(threadName) {
        return this.threadToFocusedBorderColour.get(threadName);
    }

    /**
     * Reset all thread data
     */
    reset() {
        this.threadToMethodNodesInOrder.forEach((_, threadName) => {
            this.threadToMethodNodesInOrder.set(threadName, []);
            this.currentIndexByThread.set(threadName, 0);
        });
    }

    /**
     * Get method nodes for a thread in order
     * @param {string} threadName - Thread name
     * @returns {Array} - Array of method nodes
     */
    getMethodNodesInOrder(threadName) {
        return this.threadToMethodNodesInOrder.get(threadName) || [];
    }

    /**
     * Get current index for a thread
     * @param {string} threadName - Thread name
     * @returns {number} - Current index
     */
    getCurrentIndex(threadName) {
        return this.currentIndexByThread.get(threadName) || 0;
    }

    /**
     * Set current index for a thread
     * @param {string} threadName - Thread name
     * @param {number} index - Index to set
     */
    setCurrentIndex(threadName, index) {
        this.currentIndexByThread.set(threadName, index);
    }
}