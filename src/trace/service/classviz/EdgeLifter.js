/**
 * EdgeLifter - Handles edge lifting functionality to simplify visualization
 */
export class EdgeLifter {
    constructor(cy, data, ALLOWED_LIB_METHODS, edgeManager, nodeStyler) {
        this.cy = cy;
        this.data = data;
        this.ALLOWED_LIB_METHODS = ALLOWED_LIB_METHODS;
        this.edgeManager = edgeManager;
        this.nodeStyler = nodeStyler;
    }

    /**
     * Lift edges to parent level when source and target have different parents
     */
    liftEdges() {
        console.log("Starting edge lifting process...");

        // Map to track parent-to-parent edges and their counts
        const parentEdgeMap = new Map(); // "parentSourceId_parentTargetId" -> { count, edgeId }

        // Collect all current edges for processing
        const edgesToProcess = [];
        this.edgeManager.insertedEdges.forEach((edge, edgeId) => {
            edgesToProcess.push({ edge, edgeId });
        });

        // Process each edge
        for (const { edge, edgeId } of edgesToProcess) {
            const sourceNodeLabel = edge.data('source');
            const targetNodeLabel = edge.data('target');
            const sourceOriginalId = edge.data('sourceOriginalId');
            const targetOriginalId = edge.data('targetOriginalId');

            // Get source and target nodes
            const sourceNode = this.cy.$id(sourceNodeLabel);
            const targetNode = this.cy.$id(targetNodeLabel);

            if (!sourceNode.length || !targetNode.length) {
                console.warn(`Source or target node not found for edge ${edgeId}`);
                continue;
            }

            // Get parent nodes
            const sourceParent = sourceNode.parent();
            const targetParent = targetNode.parent();

            // If both nodes have no parent (library methods) or same parent, skip
            if ((!sourceParent.length && !targetParent.length) ||
                (sourceParent.length && targetParent.length && sourceParent.id() === targetParent.id())) {
                console.log(`Edge ${edgeId} kept - same parent or both library methods`);
                continue;
            }

            // Determine parent IDs for the new edge
            let parentSourceId, parentTargetId;

            if (!sourceParent.length) {
                // Source is library method, use source node itself
                parentSourceId = sourceNodeLabel;
            } else {
                // Source has parent class
                parentSourceId = sourceParent.id();
            }

            if (!targetParent.length) {
                // Target is library method, use target node itself
                parentTargetId = targetNodeLabel;
            } else {
                // Target has parent class
                parentTargetId = targetParent.id();
            }

            // Create key for parent edge mapping
            const parentEdgeKey = `${parentSourceId}_${parentTargetId}`;

            // Remove the original edge
            this.edgeManager.removeEdgeFromMappings(edgeId, sourceOriginalId, targetOriginalId);
            this.cy.remove(edge);
            this.edgeManager.insertedEdges.delete(edgeId);

            console.log(`Removed original edge ${edgeId} between ${sourceNodeLabel} and ${targetNodeLabel}`);

            // Check if parent-to-parent edge already exists
            if (parentEdgeMap.has(parentEdgeKey)) {
                // Increment count and make existing edge thicker
                const existingEdgeInfo = parentEdgeMap.get(parentEdgeKey);
                existingEdgeInfo.count++;

                const existingEdge = this.edgeManager.insertedEdges.get(existingEdgeInfo.edgeId);
                if (existingEdge) {
                    // Make edge thicker based on count
                    const newWidth = Math.min(30, 3 + existingEdgeInfo.count * 2); // Cap at 30px width
                    existingEdge.style('width', newWidth);

                    // Update label to show count
                    existingEdge.style('label', `called ${existingEdgeInfo.count} times`);

                    // Enhance gradient colors for thicker edges
                    const sourceColor = existingEdge.data('sourceColor');
                    const targetColor = existingEdge.data('targetColor');

                    if (sourceColor && targetColor) {
                        // Re-apply gradient with potentially enhanced colors for visibility
                        existingEdge.style({
                            'line-gradient-stop-colors': `${sourceColor} ${targetColor}`,
                            'line-gradient-stop-positions': '0% 100%',
                            'target-arrow-color': targetColor
                        });
                    }

                    console.log(`Increased thickness of existing parent edge ${existingEdgeInfo.edgeId} to width ${newWidth} with gradient ${sourceColor} to ${targetColor}`);
                }
            } else {
                // Create new parent-to-parent edge
                const newEdgeId = this.edgeManager.createParentEdge(parentSourceId, parentTargetId, sourceOriginalId, targetOriginalId);

                if (newEdgeId) {
                    // Track this parent edge with initial count of 1
                    parentEdgeMap.set(parentEdgeKey, {
                        count: 1,
                        edgeId: newEdgeId
                    });

                    console.log(`Created new parent edge ${newEdgeId} between ${parentSourceId} and ${parentTargetId}`);
                }
            }
        }

        console.log(`Edge lifting completed. Processed ${edgesToProcess.length} edges.`);
    }

}