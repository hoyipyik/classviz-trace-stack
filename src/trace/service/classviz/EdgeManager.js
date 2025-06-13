import { generateColorSpectrum } from "../../utils/colour/colourUtils.js";

/**
 * EdgeManager - Handles all edge creation, styling, and management
 */
export class EdgeManager {
    constructor(cy, data, insertedEdges, originalIdToSourceEdges, originalIdToTargetEdges, nodeFactory, nodeStyler) {
        this.cy = cy;
        this.data = data;
        this.insertedEdges = insertedEdges;
        this.originalIdToSourceEdges = originalIdToSourceEdges;
        this.originalIdToTargetEdges = originalIdToTargetEdges;
        this.nodeFactory = nodeFactory;
        this.nodeStyler = nodeStyler;
    }

    /**
     * Create basic edge between two nodes
     * @param {string} sourceOriginalId - Source node original ID
     * @param {string} sourceNodeLabel - Source node label
     * @param {string} targetOriginalId - Target node original ID
     * @param {string} targetNodeLabel - Target node label
     * @returns {object|null} - Created edge or null
     */
    createEdge(sourceOriginalId, sourceNodeLabel, targetOriginalId, targetNodeLabel) {
        const edgeId = `edge_${sourceOriginalId}_${targetOriginalId}_${new Date().getTime()}`;

        if (this.insertedEdges.has(edgeId)) {
            return;
        }

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

        const edge = this.cy.add(edgeData);
        this.nodeStyler.applyBasicEdgeStyle(edge, sourceNodeLabel, targetNodeLabel);

        this.insertedEdges.set(edgeId, edge);
        this.trackEdgeInMappings(edgeId, sourceOriginalId, targetOriginalId);

        return edge;
    }

    /**
     * Create numbered edge with sequence number and gradient color
     * @param {string} sourceOriginalId - Source node original ID
     * @param {string} sourceNodeLabel - Source node label
     * @param {string} targetOriginalId - Target node original ID
     * @param {string} targetNodeLabel - Target node label
     * @param {number} sequenceNumber - Sequence number for display
     * @param {string} color - Edge color fallback
     * @returns {object|null} - Created edge or null
     */
    createNumberedEdge(sourceOriginalId, sourceNodeLabel, targetOriginalId, targetNodeLabel, sequenceNumber, color) {
        const edgeId = `edge_${sourceOriginalId}_${targetOriginalId}_${new Date().getTime()}`;

        // Get source and target node colors
        const sourceNodeData = this.data.nodes.get(sourceOriginalId)?.data;
        const targetNodeData = this.data.nodes.get(targetOriginalId)?.data;
        const sourceColour = sourceNodeData?.color || color || '#000000';
        const targetColour = targetNodeData?.color || color || '#000000';

        if (this.insertedEdges.has(edgeId)) {
            console.warn(`Edge with potentially duplicate ID ${edgeId} skipped.`);
            return;
        }

        const edgeData = {
            group: 'edges',
            data: {
                id: edgeId,
                source: sourceNodeLabel,
                target: targetNodeLabel,
                sourceOriginalId: sourceOriginalId,
                targetOriginalId: targetOriginalId,
                label: `${sequenceNumber}`,
                sequenceNumber: sequenceNumber,
                interaction: "trace_call",
                sourceColour: sourceColour,
                targetColour: targetColour
            }
        };

        const edge = this.cy.add(edgeData);
        this.nodeStyler.applyNumberedEdgeStyle(edge, sourceNodeLabel, targetNodeLabel, sequenceNumber, sourceColour, targetColour);

        this.insertedEdges.set(edgeId, edge);
        this.trackEdgeInMappings(edgeId, sourceOriginalId, targetOriginalId);

        return edge;
    }


    /**
     * Create an edge between parent nodes (classes or library methods)
     * @param {string} parentSourceId - Parent source node ID
     * @param {string} parentTargetId - Parent target node ID
     * @param {string} originalSourceId - Original source node ID (for mapping maintenance)
     * @param {string} originalTargetId - Original target node ID (for mapping maintenance)
     * @returns {string|null} - Created edge ID or null if failed
     */
    createParentEdge(parentSourceId, parentTargetId, originalSourceId, originalTargetId) {
        // Generate unique edge ID
        const edgeId = `lifted_edge_${parentSourceId}_${parentTargetId}_${new Date().getTime()}`;

        // Check if edge already exists
        if (this.insertedEdges.has(edgeId)) {
            console.warn(`Parent edge ${edgeId} already exists`);
            return null;
        }

        // Get colors from the parent nodes for gradient effect
        const { sourceColor, targetColor } = this.getParentNodeColors(parentSourceId, parentTargetId, originalSourceId, originalTargetId);

        // Create edge data
        const edgeData = {
            group: 'edges',
            data: {
                id: edgeId,
                source: parentSourceId,
                target: parentTargetId,
                sourceOriginalId: originalSourceId,
                targetOriginalId: originalTargetId,
                label: "called 1 times",
                interaction: "lifted_call",
                edgeType: "lifted",
                sourceColor: sourceColor,
                targetColor: targetColor
            }
        };

        // Add edge to cytoscape
        const edge = this.cy.add(edgeData);

        console.log(`Creating lifted edge with gradient from ${sourceColor} to ${targetColor}`);

        // Style the lifted edge with gradient colors
        this.nodeStyler.applyLiftedEdgeStyle(edge, parentSourceId, parentTargetId, sourceColor, targetColor);

        // Store edge in mapping
        this.insertedEdges.set(edgeId, edge);

        // Maintain original ID mappings
        if (!this.originalIdToSourceEdges.has(originalSourceId)) {
            this.originalIdToSourceEdges.set(originalSourceId, new Set());
        }
        this.originalIdToSourceEdges.get(originalSourceId).add(edgeId);

        if (!this.originalIdToTargetEdges.has(originalTargetId)) {
            this.originalIdToTargetEdges.set(originalTargetId, new Set());
        }
        this.originalIdToTargetEdges.get(originalTargetId).add(edgeId);

        return edgeId;
    }

    /**
     * Remove edge from internal mappings
     * @param {string} edgeId - Edge ID to remove
     * @param {string} sourceOriginalId - Source node original ID
     * @param {string} targetOriginalId - Target node original ID
     */
    removeEdgeFromMappings(edgeId, sourceOriginalId, targetOriginalId) {
        
    }

    /**
     * Track edge in original ID mappings
     * @param {string} edgeId - Edge ID
     * @param {string} sourceOriginalId - Source original ID
     * @param {string} targetOriginalId - Target original ID
     */
    trackEdgeInMappings(edgeId, sourceOriginalId, targetOriginalId) {
        if (!this.originalIdToSourceEdges.has(sourceOriginalId)) {
            this.originalIdToSourceEdges.set(sourceOriginalId, new Set());
        }
        this.originalIdToSourceEdges.get(sourceOriginalId).add(edgeId);

        if (!this.originalIdToTargetEdges.has(targetOriginalId)) {
            this.originalIdToTargetEdges.set(targetOriginalId, new Set());
        }
        this.originalIdToTargetEdges.get(targetOriginalId).add(edgeId);
    }

    /**
     * Remove all edges originating from a specific node
     * @param {string} originalId - Original node ID
     */
    removeAllEdgesFromNode(originalId) {
        if (this.originalIdToSourceEdges.has(originalId)) {
            const edgeIds = this.originalIdToSourceEdges.get(originalId);
            for (const edgeId of edgeIds) {
                if (this.insertedEdges.has(edgeId)) {
                    const edge = this.insertedEdges.get(edgeId);
                    this.cy.remove(edge);
                    this.insertedEdges.delete(edgeId);
                    this.originalIdToTargetEdges.forEach((edges, targetId) => {
                        if (edges.has(edgeId)) {
                            edges.delete(edgeId);
                        }
                    });
                }
            }
            this.originalIdToSourceEdges.set(originalId, new Set());
        }
    }

    /**
     * Clear all edges in the visualization
     */
    clearAllEdges() {
        const edgeIds = [];
        this.insertedEdges.forEach((_, id) => {
            edgeIds.push(id);
        });

        for (const edgeId of edgeIds) {
            if (this.insertedEdges.has(edgeId)) {
                const edge = this.insertedEdges.get(edgeId);
                this.cy.remove(edge);
                this.insertedEdges.delete(edgeId);

                const sourceOriginalId = edge.data('sourceOriginalId');
                const targetOriginalId = edge.data('targetOriginalId');

                if (sourceOriginalId && this.originalIdToSourceEdges.has(sourceOriginalId)) {
                    this.originalIdToSourceEdges.get(sourceOriginalId).delete(edgeId);
                }

                if (targetOriginalId && this.originalIdToTargetEdges.has(targetOriginalId)) {
                    this.originalIdToTargetEdges.get(targetOriginalId).delete(edgeId);
                }
            }
        }
    }

    /**
     * Handle edge connections when removing a node
     * @param {string} id - Original node ID
     * @param {string} nodeLabel - Method label
     */
    handleNodeEdges(id, nodeLabel) {
        const targetChildrenOriginalIds = [];
        let parentOriginalId = null;

        // Process edges where this node is the source
        if (this.originalIdToSourceEdges.has(id)) {
            this.originalIdToSourceEdges.get(id).forEach(edgeId => {
                const edge = this.insertedEdges.get(edgeId);
                if (edge) {
                    const targetOriginalId = edge.data('targetOriginalId');
                    targetChildrenOriginalIds.push(targetOriginalId);

                    this.cy.remove(edge);
                    this.insertedEdges.delete(edgeId);

                    if (this.originalIdToTargetEdges.has(targetOriginalId)) {
                        this.originalIdToTargetEdges.get(targetOriginalId).delete(edgeId);
                    }
                }
            });
        }

        // Process edges where this node is the target
        if (this.originalIdToTargetEdges.has(id)) {
            const parentEdges = Array.from(this.originalIdToTargetEdges.get(id));

            if (parentEdges.length > 1) {
                console.warn(`Method ${nodeLabel} has multiple parents, expected only one in tree structure`);
            }

            if (parentEdges.length > 0) {
                const edgeId = parentEdges[0];
                const edge = this.insertedEdges.get(edgeId);
                if (edge) {
                    parentOriginalId = edge.data('sourceOriginalId');

                    this.cy.remove(edge);
                    this.insertedEdges.delete(edgeId);

                    if (this.originalIdToSourceEdges.has(parentOriginalId)) {
                        this.originalIdToSourceEdges.get(parentOriginalId).delete(edgeId);
                    }
                }
            }
        }

        // Reconnect parent to children
        this.reconnectParentToChildren(parentOriginalId, targetChildrenOriginalIds);
    }

    /**
     * Reconnect parent node to children nodes after intermediate node removal
     * @param {string} parentOriginalId - Parent node original ID
     * @param {Array} targetChildrenOriginalIds - Array of children node IDs
     */
    reconnectParentToChildren(parentOriginalId, targetChildrenOriginalIds) {
        if (parentOriginalId && targetChildrenOriginalIds.length > 0) {
            const parentNodeLabel = this.nodeFactory.getMethodLabelById(parentOriginalId);

            if (parentNodeLabel && this.nodeFactory.nodeExists(parentNodeLabel)) {
                targetChildrenOriginalIds.forEach(childId => {
                    const childNodeLabel = this.nodeFactory.getMethodLabelById(childId);
                    if (childNodeLabel && this.nodeFactory.nodeExists(childNodeLabel)) {
                        this.createEdge(parentOriginalId, parentNodeLabel, childId, childNodeLabel);
                    }
                });
            }
        }
    }

    /**
     * Create sequential edges for trace mode
     * @param {Map} threadToMethodNodesInOrder - Map of thread to method nodes
     * @param {function} isNodeSelected - Function to check if node is selected
     */
    createSequentialEdges(threadToMethodNodesInOrder, isNodeSelected) {
        threadToMethodNodesInOrder.forEach((methodNodes, threadName) => {
            const selectedNodes = methodNodes.filter(node =>
                this.nodeFactory.nodeExists(node.label) && isNodeSelected(node.originalId)
            );

            if (selectedNodes.length < 2) {
                return;
            }

            selectedNodes.forEach(node => {
                this.removeAllEdgesFromNode(node.originalId);
            });

            for (let i = 0; i < selectedNodes.length - 1; i++) {
                const currentNode = selectedNodes[i];
                const nextNode = selectedNodes[i + 1];

                this.createEdge(
                    currentNode.originalId,
                    currentNode.label,
                    nextNode.originalId,
                    nextNode.label
                );
            }
        });
    }

    /**
     * Create numbered sequential edges for trace mode
     * @param {Map} threadToMethodNodesInOrder - Map of thread to method nodes
     * @param {function} isNodeSelected - Function to check if node is selected
     */
    createNumberedSequentialEdges(threadToMethodNodesInOrder, isNodeSelected) {
        threadToMethodNodesInOrder.forEach((methodNodes, threadName) => {
            const selectedNodes = methodNodes.filter(node =>
                this.nodeFactory.nodeExists(node.label) && isNodeSelected(node.originalId)
            );

            if (selectedNodes.length < 2) {
                return;
            }

            selectedNodes.forEach(node => {
                this.removeAllEdgesFromNode(node.originalId);
            });

            const colorSpectrum = generateColorSpectrum(selectedNodes.length - 1);

            for (let i = 0; i < selectedNodes.length - 1; i++) {
                const currentNode = selectedNodes[i];
                const nextNode = selectedNodes[i + 1];

                this.createNumberedEdge(
                    currentNode.originalId,
                    currentNode.label,
                    nextNode.originalId,
                    nextNode.label,
                    i + 1,
                    colorSpectrum[i]
                );
            }
        });
    }


    /**
     * Get colors from parent nodes for gradient effect
     * @param {string} parentSourceId - Parent source node ID
     * @param {string} parentTargetId - Parent target node ID
     * @param {string} originalSourceId - Original source node ID
     * @param {string} originalTargetId - Original target node ID
     * @returns {object} - Object containing sourceColor and targetColor
     */
    getParentNodeColors(parentSourceId, parentTargetId, originalSourceId, originalTargetId) {
        let sourceColor = '#666666'; // Default color
        let targetColor = '#666666'; // Default color
        
        const sourceNodeData = this.data.nodes.get(originalSourceId)?.data;
        const targetNodeData = this.data.nodes.get(originalTargetId)?.data;
        
        if (sourceNodeData && sourceNodeData.color) {
            sourceColor = sourceNodeData.color;
        }
        if (targetNodeData && targetNodeData.color) {
            targetColor = targetNodeData.color;
        }
        
        return { sourceColor, targetColor };
    }
}