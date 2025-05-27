
import { generateColorSpectrum, generateFocusedBorderColors } from "../utils/colour/colourUtils.js";
import { ALLOWED_LIB_METHODS } from "../utils/process/callTreeParser.js";

export class ClassvizManager {
    constructor(data, cy, eventBus, idRangeByThreadMap) {
        this.stepByStepMode = false;
        this.useNumberedEdges = true;
        this.ALLOWED_LIB_METHODS = ALLOWED_LIB_METHODS;
        this.data = data;
        this.cy = cy;
        this.eventBus = eventBus;

        this.idRangeByThreadMap = idRangeByThreadMap; // Map of thread names to ID ranges;
        this.threadToFocusedBorderColour = new Map(); // threadname -> border color string
        this.threadToMethodNodesInOrder = new Map(); // threadname -> method node list {originalId, label(cy node id)}  in order of orignaiId
        this.currentIndexByThread = new Map(); // threadname -> current index in the method node list

        this.initFocusedBorderColors();

        // init this.threadToMethodNodesInOrder with the data
        idRangeByThreadMap.forEach((_, threadName) => {
            this.threadToMethodNodesInOrder.set(threadName, []);
            this.currentIndexByThread.set(threadName, 0);

        });

        this.originalDimensions = {}; // class node id -> original dimensions
        this.insertedNodes = new Map(); // cy method node id (nodeData.label) -> cy method node
        this.insertedEdges = new Map(); // edge node id -> cy edge 

        this.classToMethodsMap = new Map(); // class node id -> method node cy ids list (nodeData.label)

        this.methodLabelToOriginalIds = new Map(); // method node label -> original ID set

        // Uses the original ID from call tree as key: stores edge IDs where this original node is the source/target
        this.originalIdToSourceEdges = new Map(); // originalId -> Set(edge id) edges where this original node is the source
        this.originalIdToTargetEdges = new Map(); // originalId -> Set(edge id) edges where this original node is the target

        const numberedEdgeControlInput = document.getElementById('numberedEdges');
        if (numberedEdgeControlInput) {
            numberedEdgeControlInput.checked = this.useNumberedEdges;
            numberedEdgeControlInput.addEventListener('change', (event) => {
                this.toggleEdgeNumbering(event.target.checked);
            });
        }

        this.eventBus.subscribe('changeSingleMethodByIdToClassviz', (
            { nodeId, selected }) => {
            if (selected) {
                this.insertSingleMethodById(nodeId);
            } else {
                // remove single node
                this.removeSingleMethodById(nodeId);
            }
            if (this.useNumberedEdges) {
                this.switchTraceMode(this.data.traceMode, true);
            }
            if (this.stepByStepMode) {
                this.eventBus.publish('switchStepByStepMode', { flag: true });
            }

        });

        this.eventBus.subscribe('changeMultiMethodByIdsToClassviz', (
            { nodeIds, selected }) => {
            if (selected) {
                // nodeIds.forEach((nodeId) => {
                //     this.insertSingleMethodById(nodeId);
                // });
                this.insertMultipleMethodByIds(nodeIds);
            } else {
                // remove single node
                nodeIds.forEach((nodeId) => {
                    this.removeSingleMethodById(nodeId);
                });
                // this.removeMultipleMethodByIds(nodeIds)
            }
            if (this.useNumberedEdges) {
                this.switchTraceMode(this.data.traceMode, true);
            }
            if (this.stepByStepMode) {
                this.eventBus.publish('switchStepByStepMode', { flag: true });
            }
        });

        this.eventBus.subscribe('switchTraceMode', ({ traceMode }) => {
            this.switchTraceMode(traceMode);
        });

        this.eventBus.subscribe('changeCurrentFocusedNodeForStepByStep', ({ nodeId }) => {
            const currentThreadName = this.data.currentThreadName;
            if (!currentThreadName) return;
            // find index in this.threadToMethodNodesInOrder for the current nodeId
            this.threadToMethodNodesInOrder.forEach((methodNodes, threadName) => {
                const index = methodNodes.findIndex(node => node.originalId === nodeId);
                if (index !== -1 && threadName === currentThreadName) {
                    this.currentIndexByThread.set(threadName, index);
                }
            });
        });
    }

    // Function to initialize the threadToFocusedBorderColour map
    initFocusedBorderColors() {
        // Generate focused border colors based on the number of threads
        const focusedBorderColors = generateFocusedBorderColors(this.idRangeByThreadMap.size);

        // Assign the colors to each thread
        let colorIndex = 0;
        this.idRangeByThreadMap.forEach((_, threadName) => {
            this.threadToFocusedBorderColour.set(threadName, focusedBorderColors[colorIndex]);
            colorIndex++;
        });
    }

    getMethodLabelById(id) {
        const nodeData = this.data.nodes.get(id).data;
        if (nodeData) {
            return nodeData.label;
        } else {
            console.error(`Node with id ${id} not found`);
            return null;
        }

    }

    changeAllMethodNodesColor(color) {
        this.insertedNodes.forEach((node, _) => {
            if (node) {
                node.style({
                    'background-color': color,
                    'border-color': 'grey',
                });
            }
        });
    }

    changeColorOfNodeById(id, color, bordered = false, borderColor = 'grey') {
        const nodeLabel = this.data.getNodeDataById(id).label;
        const node = this.cy.$id(nodeLabel);
        if (node) {
            const styleOptions = {
                'background-color': color
            };

            if (bordered) {
                styleOptions['border-color'] = borderColor; // Use the provided border color
                styleOptions['border-width'] = '3px';
            } else {
                styleOptions['border-color'] = 'grey';
                styleOptions['border-width'] = '3px';
            }

            node.style(styleOptions);
        }
    }

    findClassNodeByNodeLabel(label) {
        const parenIndex = label.indexOf("(");
        if (parenIndex === -1) return;
        const lastDotBeforeParens = label.lastIndexOf(".", parenIndex);
        if (lastDotBeforeParens === -1) return;
        const classId = label.substring(0, lastDotBeforeParens);
        return this.cy.$id(classId);
    }

    // Updated insertSingleMethodById function
    insertSingleMethodById(id) {
        // Get the node label
        const nodeLabel = this.getMethodLabelById(id);
        if (!nodeLabel) {
            console.error(`Could not get label for node with id ${id}`);
            return;
        }

        // Add to thread method nodes
        this.addToThreadMethodNodes(id, nodeLabel);

        // Create the node
        const addedNode = this.createMethodNode(id, nodeLabel);
        if (!addedNode) return;

        // Create edges for the node
        this.createEdgesForNode(id, nodeLabel);

        // Refresh edge numbering if needed
        if (this.useNumberedEdges) {
            this.switchTraceMode(this.data.traceMode, true);
        }
    }

    // Updated removeSingleMethodById function
    removeSingleMethodById(id) {
        // Get node label
        const nodeLabel = this.getMethodLabelById(id);
        if (!nodeLabel) {
            console.error(`Could not get label for node with id ${id}`);
            return;
        }

        // Remove from thread method nodes
        this.removeFromThreadMethodNodes(id, nodeLabel);

        // Remove the node
        const removed = this.removeMethodNode(id, nodeLabel);
        if (!removed) return;

        // Refresh edge numbering if needed
        if (this.useNumberedEdges) {
            this.switchTraceMode(this.data.traceMode, true);
        }
    }


    /**
     * Create colored edges with calling order number for trace mode 
     * Creates sequential edges with numbering and color spectrum for trace mode
    */
    createNumberedSequentialEdges() {
        // iterate each thread
        this.threadToMethodNodesInOrder.forEach((methodNodes, threadName) => {
            // get inserted nodes
            const selectedNodes = methodNodes.filter(node =>
                this.insertedNodes.has(node.label) &&
                this.data.nodes.get(node.originalId)?.data?.selected
            );

            // No need to create edges if the number of inserted nodes is less than 2
            if (selectedNodes.length < 2) {
                return;
            }

            // clear all the edges relevant to this operation
            selectedNodes.forEach(node => {
                this.removeAllEdgesFromNode(node.originalId);
            });

            // generate color array
            const colorSpectrum = generateColorSpectrum(selectedNodes.length - 1);

            // create edges based on node order (linked list style connection)
            for (let i = 0; i < selectedNodes.length - 1; i++) {
                const currentNode = selectedNodes[i];
                const nextNode = selectedNodes[i + 1];

                // create new edges
                this.createNumberedEdge(
                    currentNode.originalId,
                    currentNode.label,
                    nextNode.originalId,
                    nextNode.label,
                    i + 1, // from number 1
                    colorSpectrum[i] // get color from array
                );
            }
        });
    }

    /**
     * Creates numbered edges with colors for call tree mode, following the existing rebuildCallTreeEdges implementation
     */
    rebuildNumberedCallTreeEdges() {

        // Clear all existing edges
        this.clearAllEdges();

        // Calculate the maximum depth
        const maxDepth = this.calculateMaxDepth();
        const depthColors = this.generateDepthColors(maxDepth);

        // Iterate each thread
        this.threadToMethodNodesInOrder.forEach((_, threadName) => {
            // Get the tree data for this thread
            const treeData = this.data.threadsData[threadName];
            if (!treeData) return;

            // Initialize the root node
            const rootNode = treeData;
            if (!rootNode) return;

            // Traverse the tree and create numbered edges
            this.traverseTreeAndCreateNumberedEdges(rootNode, depthColors);
        });

        // console.log(`Recreated numbered call tree edges for all threads`);
    }

    /**
     * Calculate the maximum depth
     * @returns {number} 
     */
    calculateMaxDepth() {
        let maxDepth = 0;

        // recursively calculate node depth
        const calculateNodeDepth = (node, depth = 0, visited = new Set()) => {
            if (!node || !node.id || visited.has(node.id)) return depth;
            visited.add(node.id);

            // get node data
            const nodeData = this.data.nodes.get(node.id)?.data;
            if (!nodeData) return depth;

            const nodeLabel = this.getMethodLabelById(node.id);
            const isNodeSelected = nodeData.selected && nodeLabel && this.insertedNodes.has(nodeLabel);

            // if it is selected update the maxDepth
            if (isNodeSelected) {
                maxDepth = Math.max(maxDepth, depth);
            }

            // handle the children
            const children = node.children || [];
            for (const child of children) {
                calculateNodeDepth(child, depth + 1, new Set([...visited]));
            }

            return depth;
        };

        // iterate nodes in each thread
        this.threadToMethodNodesInOrder.forEach((_, threadName) => {
            const treeData = this.data.threadsData[threadName];
            if (treeData) {
                calculateNodeDepth(treeData, 0);
            }
        });

        return maxDepth;
    }

    /**
     * Generate color for each depth
     * @param {number} maxDepth maxDepth
     * @returns {Object} depth to color map
     */
    generateDepthColors(maxDepth) {
        const colors = {};

        // Ensure at least one color
        if (maxDepth < 0) maxDepth = 0;

        for (let depth = 0; depth <= maxDepth; depth++) {
            // Distribute colors evenly across the spectrum
            const hue = Math.floor((depth / (maxDepth + 1)) * 360);
            colors[depth] = `hsl(${hue}, 80%, 50%)`;
        }

        return colors;
    }

    /**
     * Traverse the tree and create edges with numbering and colors
     * @param {Object} node - Current tree node
     * @param {Object} depthColors - Mapping of depth to color
     * @param {Set} visited - Set of visited nodes
     * @param {Number} depth - Current depth
     * @param {String|null} lastSelectedParentId - Last selected parent node ID
     * @param {String|null} lastSelectedParentLabel - Last selected parent node label
     */
    traverseTreeAndCreateNumberedEdges(node, depthColors, visited = new Set(), depth = 0, lastSelectedParentId = null, lastSelectedParentLabel = null) {
        if (!node || !node.id || visited.has(node.id)) return;
        visited.add(node.id);

        // Get current node information
        const nodeData = this.data.nodes.get(node.id)?.data;
        if (!nodeData) return; // Skip processing if node doesn't exist

        const nodeLabel = this.getMethodLabelById(node.id);
        const isCurrentNodeSelected = nodeData.selected && nodeLabel && this.insertedNodes.has(nodeLabel);

        // If current node is selected, update "last selected parent node" to current node
        let currentSelectedParentId = lastSelectedParentId;
        let currentSelectedParentLabel = lastSelectedParentLabel;
        let currentDepth = depth;

        if (isCurrentNodeSelected) {
            // Current node is selected, update as new parent node
            currentSelectedParentId = node.id;
            currentSelectedParentLabel = nodeLabel;

            // If there's a previous selected parent node, create edge from parent to current node
            if (lastSelectedParentId && lastSelectedParentLabel) {
                this.createNumberedEdge(
                    lastSelectedParentId,
                    lastSelectedParentLabel,
                    node.id,
                    nodeLabel,
                    depth,  // Use depth as sequence number
                    depthColors[depth - 1] || '#999999' // Use current depth's color
                );
            }
        }

        // Recursively process all child nodes, regardless of whether current node is selected
        const children = node.children || [];
        for (const child of children) {
            this.traverseTreeAndCreateNumberedEdges(
                child,
                depthColors,
                new Set([...visited]), // Create a new visited set to prevent circular reference issues
                isCurrentNodeSelected ? depth + 1 : depth, // Only increase depth if current node is selected
                currentSelectedParentId,
                currentSelectedParentLabel
            );
        }
    }

    /**
    * Create an edge with sequence number and gradient color from source to target
    * @param {String} sourceOriginalId - Source node original ID
    * @param {String} sourceNodeLabel - Source node label
    * @param {String} targetOriginalId - Target node original ID
    * @param {String} targetNodeLabel - Target node label
    * @param {Number} sequenceNumber - Sequence number
    * @param {String} color - Edge color (fallback if node colors unavailable)
    */
    createNumberedEdge(sourceOriginalId, sourceNodeLabel, targetOriginalId, targetNodeLabel, sequenceNumber, color) {
        // Generate a unique ID for the edge
        const edgeId = `edge_${sourceOriginalId}_${targetOriginalId}_${new Date().getTime()}`;

        // Get source and target node colors
        const sourceNodeData = this.data.nodes.get(sourceOriginalId)?.data;
        const targetNodeData = this.data.nodes.get(targetOriginalId)?.data;
        const sourceColour = sourceNodeData?.color || color || '#000000';
        const targetColour = targetNodeData?.color || color || '#000000';

        // Check if edge already exists
        if (this.insertedEdges.has(edgeId)) {
            console.warn(`Edge with potentially duplicate ID ${edgeId} skipped.`);
            return;
        }

        // Create edge data
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

        // Add edge to cytoscape
        const edge = this.cy.add(edgeData);

        // console.log(`Adding edge ${edgeId} with gradient from ${sourceColour} to ${targetColour}`);

        // Apply gradient styling - front half source color, back half target color
        edge.style({
            'width': 3,
            'line-gradient-stop-colors': `${sourceColour} ${targetColour}`,
            'line-gradient-stop-positions': '0% 100%',
            'target-arrow-color': targetColour, // Arrow uses target color
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': `${sequenceNumber}`,
            'font-size': '14px',
            'font-weight': 'bold',
            'text-background-color': '#FFFFFF',
            'text-background-opacity': 0.7,
            'text-background-shape': 'roundrectangle',
            'text-background-padding': '2px',
            'text-margin-y': -10,
            'color': '#000000'
        });

        // Handle self-referential edges
        if (sourceNodeLabel === targetNodeLabel) {
            edge.style({
                'curve-style': 'unbundled-bezier',
                'control-point-distances': [50],
                'control-point-weights': [0.5],
                'loop-direction': '0deg',
                'loop-sweep': '90deg'
            });
        }

        // Store edge in mapping
        this.insertedEdges.set(edgeId, edge);

        // Track this edge in original ID mappings
        if (!this.originalIdToSourceEdges.has(sourceOriginalId)) {
            this.originalIdToSourceEdges.set(sourceOriginalId, new Set());
        }
        this.originalIdToSourceEdges.get(sourceOriginalId).add(edgeId);

        if (!this.originalIdToTargetEdges.has(targetOriginalId)) {
            this.originalIdToTargetEdges.set(targetOriginalId, new Set());
        }
        this.originalIdToTargetEdges.get(targetOriginalId).add(edgeId);

        return edge;
    }

    /**
     * Switch the chart's edge creation mode and recreate all edges
     * @param {boolean} traceMode - Whether to enable sequential mode edge creation
     * @param {boolean} useNumbering - Whether to use numbered and colored edges
     */
    switchTraceMode(traceMode, useNumbering = this.useNumberedEdges) {
        // Update mode settings
        this.data.traceMode = traceMode;
        // console.log(`Switched to ${traceMode ? 'trace' : 'call tree'} mode with ${useNumbering ? 'numbered' : 'standard'} edges`);

        // If not enough nodes, no need to process
        if (this.insertedNodes.size <= 1) {
            console.log("Less than 2 nodes exist, no edges to recreate");
            return;
        }

        // Clear all existing edges
        this.clearAllEdges();

        // Recreate edges based on current mode and numbering option
        if (traceMode) {
            // Sequential mode
            if (useNumbering) {
                // Use numbered and colored sequential edges
                this.createNumberedSequentialEdges();
            } else {
                // Use standard sequential edges
                this.createSequentialEdges();
            }
        } else {
            // Call tree mode
            if (useNumbering) {
                // Use numbered and colored call tree edges
                this.rebuildNumberedCallTreeEdges();
            } else {
                // Use standard call tree edges
                this.rebuildCallTreeEdges();
            }
        }
    }

    /**
     * Toggle edge numbering and coloring mode
     * @param {boolean} useNumbering - Whether to enable numbering mode, if undefined toggle current mode
     * @returns {boolean} - Mode status after toggling
     */
    toggleEdgeNumbering(useNumbering) {
        // If not specified, toggle current state
        if (useNumbering === undefined) {
            this.useNumberedEdges = !this.useNumberedEdges;
        } else {
            this.useNumberedEdges = useNumbering;
        }

        // Recreate edges with current traceMode and new numbering setting
        this.switchTraceMode(this.data.traceMode, this.useNumberedEdges);

        return this.useNumberedEdges;
    }

    /**
     * Clear all edges in the chart
     */
    clearAllEdges() {
        // Collect all edge IDs that need to be removed
        const edgeIds = [];
        this.insertedEdges.forEach((_, id) => {
            edgeIds.push(id);
        });

        // Loop through and remove each edge
        for (const edgeId of edgeIds) {
            if (this.insertedEdges.has(edgeId)) {
                const edge = this.insertedEdges.get(edgeId);
                // Remove edge from cytoscape
                this.cy.remove(edge);
                // Remove edge from our mappings
                this.insertedEdges.delete(edgeId);

                // Get source and target node information
                const sourceOriginalId = edge.data('sourceOriginalId');
                const targetOriginalId = edge.data('targetOriginalId');

                // Remove from source node's edge collection
                if (sourceOriginalId && this.originalIdToSourceEdges.has(sourceOriginalId)) {
                    this.originalIdToSourceEdges.get(sourceOriginalId).delete(edgeId);
                }

                // Remove from target node's edge collection
                if (targetOriginalId && this.originalIdToTargetEdges.has(targetOriginalId)) {
                    this.originalIdToTargetEdges.get(targetOriginalId).delete(edgeId);
                }
            }
        }

        // console.log(`Cleared all ${edgeIds.length} edges`);
    }

    /**
     * Rebuild all edges for call tree mode
     */
    rebuildCallTreeEdges() {
        // Use existing tree structure data to rebuild edges
        this.threadToMethodNodesInOrder.forEach((_, threadName) => {
            // Get tree data for this thread
            const treeData = this.data.threadsData[threadName];
            if (!treeData) return;

            // Get root node of this tree
            const rootNode = treeData;
            if (!rootNode) return;

            // Start traversing tree from root node, creating all edges
            this.traverseTreeAndCreateEdges(rootNode);
        });

        // console.log(`Recreated call tree edges for all threads`);
    }

    /**
     * Traverse tree and create edges
     * @param {Object} node - Current tree node
     * @param {Set} visited - Set of visited nodes (to prevent circular references)
     * @param {String|null} lastSelectedParentId - Last selected parent node ID
     * @param {String|null} lastSelectedParentLabel - Last selected parent node label
     */
    traverseTreeAndCreateEdges(node, visited = new Set(), lastSelectedParentId = null, lastSelectedParentLabel = null) {
        if (!node || visited.has(node.id)) return;
        visited.add(node.id);

        // Get current node information
        const nodeData = this.data.nodes.get(node.id)?.data;
        if (!nodeData) return; // Node doesn't exist, skip processing

        const nodeLabel = this.getMethodLabelById(node.id);
        const isCurrentNodeSelected = nodeData.selected && nodeLabel && this.insertedNodes.has(nodeLabel);

        // If current node is selected, update "last selected parent node" to current node
        let currentSelectedParentId = lastSelectedParentId;
        let currentSelectedParentLabel = lastSelectedParentLabel;

        if (isCurrentNodeSelected) {
            // Current node is selected, update as new parent node
            currentSelectedParentId = node.id;
            currentSelectedParentLabel = nodeLabel;

            // If there's a previous selected parent node, create edge from parent to current node
            if (lastSelectedParentId && lastSelectedParentLabel) {
                this.createEdge(lastSelectedParentId, lastSelectedParentLabel, node.id, nodeLabel);
            }
        }

        // Recursively process all child nodes, regardless of whether current node is selected
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

    // Remove node from thread method node list
    removeFromThreadMethodNodes(id, nodeLabel) {
        const currentThreadName = this.data.currentThreadName;
        if (currentThreadName && this.threadToMethodNodesInOrder.has(currentThreadName)) {
            const threadNodes = this.threadToMethodNodesInOrder.get(currentThreadName);
            const nodeIndex = threadNodes.findIndex(node => node.originalId === id);

            if (nodeIndex !== -1) {
                // Remove node from thread's ordered list
                threadNodes.splice(nodeIndex, 1);
            }
        }
    }

    // Handle node edges and connections
    handleNodeEdges(id, nodeLabel) {
        // Collect parent and children nodes
        const targetChildrenOriginalIds = [];
        let parentOriginalId = null;

        // Process edges where this node is the source
        if (this.originalIdToSourceEdges.has(id)) {
            this.originalIdToSourceEdges.get(id).forEach(edgeId => {
                const edge = this.insertedEdges.get(edgeId);
                if (edge) {
                    const targetOriginalId = edge.data('targetOriginalId');
                    targetChildrenOriginalIds.push(targetOriginalId);

                    // Remove edge
                    this.cy.remove(edge);
                    this.insertedEdges.delete(edgeId);

                    // Update tracking mappings
                    if (this.originalIdToTargetEdges.has(targetOriginalId)) {
                        this.originalIdToTargetEdges.get(targetOriginalId).delete(edgeId);
                    }
                }
            });
        }

        // Process edges where this node is the target
        if (this.originalIdToTargetEdges.has(id)) {
            const parentEdges = Array.from(this.originalIdToTargetEdges.get(id));

            // Ensure only one parent node
            if (parentEdges.length > 1) {
                console.warn(`Method ${nodeLabel} has multiple parents, expected only one in tree structure`);
            }

            // Process parent edge (should be only one in tree structure)
            if (parentEdges.length > 0) {
                const edgeId = parentEdges[0];
                const edge = this.insertedEdges.get(edgeId);
                if (edge) {
                    parentOriginalId = edge.data('sourceOriginalId');

                    // Remove edge
                    this.cy.remove(edge);
                    this.insertedEdges.delete(edgeId);

                    // Update tracking mappings
                    if (this.originalIdToSourceEdges.has(parentOriginalId)) {
                        this.originalIdToSourceEdges.get(parentOriginalId).delete(edgeId);
                    }
                }
            }
        }

        // Create edges between parent and children nodes
        this.reconnectParentToChildren(parentOriginalId, targetChildrenOriginalIds);
    }

    // Reconnect parent node to children nodes
    reconnectParentToChildren(parentOriginalId, targetChildrenOriginalIds) {
        if (parentOriginalId && targetChildrenOriginalIds.length > 0) {
            const parentNodeLabel = this.getMethodLabelById(parentOriginalId);

            if (parentNodeLabel && this.insertedNodes.has(parentNodeLabel)) {
                // Create direct edges from parent to each child node
                targetChildrenOriginalIds.forEach(childId => {
                    const childNodeLabel = this.getMethodLabelById(childId);
                    if (childNodeLabel && this.insertedNodes.has(childNodeLabel)) {
                        this.createEdge(parentOriginalId, parentNodeLabel, childId, childNodeLabel);
                    }
                });
            }
        }
    }

    // Update mappings and decide whether to delete node
    updateMappingsAndRemoveNode(id, nodeLabel, methodNode) {
        // Check if this is a library method
        const isLibraryMethod = this.ALLOWED_LIB_METHODS.includes(nodeLabel) || !methodNode.parent().length;

        // If this isn't a library method, get the class node
        let classId = null;
        if (!isLibraryMethod) {
            const classNode = this.findClassNodeByNodeLabel(nodeLabel);
            if (!classNode || classNode.length === 0) {
                console.warn(`Class node for method ${nodeLabel} not found`);
                return;
            }
            classId = classNode.id();
        }

        // Update methodLabelToOriginalIds mapping
        this.methodLabelToOriginalIds.get(nodeLabel).delete(id);

        // Only delete node when no more original IDs are associated with it
        const shouldRemoveNode = this.methodLabelToOriginalIds.get(nodeLabel).size === 0;

        if (shouldRemoveNode) {
            // Remove the node itself from cytoscape
            this.cy.remove(methodNode);

            // Update our tracking data structures
            this.insertedNodes.delete(nodeLabel);
            this.methodLabelToOriginalIds.delete(nodeLabel);

            // If this isn't a library method, update class-to-methods mapping
            if (!isLibraryMethod && classId && this.classToMethodsMap.has(classId)) {
                this.classToMethodsMap.get(classId).delete(nodeLabel);

                // If this is the last method in the class, restore original dimensions
                if (this.classToMethodsMap.get(classId).size === 0) {
                    this.restoreClassOriginalDimensions(classId);
                } else {
                    // Otherwise, adjust class size based on remaining methods
                    this.adjustClassSize(classId);
                }
            }
        }

        // Clean up tracking mappings regardless of whether we deleted the node
        this.originalIdToSourceEdges.delete(id);
        this.originalIdToTargetEdges.delete(id);
    }

    // Helper method to restore class to original dimensions
    restoreClassOriginalDimensions(classId) {
        const classNode = this.cy.$id(classId);
        if (!classNode || classNode.length === 0) return;

        const originalDim = this.originalDimensions[classId];
        if (originalDim) {
            classNode.style({
                'width': originalDim.width,
                'height': originalDim.height,
                'text-valign': originalDim.textValign,
                'text-halign': originalDim.textHalign,
                'text-margin-y': originalDim.textMarginY
            });

            // Reset position if needed
            if (originalDim.position) {
                classNode.position(originalDim.position);
            }
        }
    }

    // Helper method to adjust class size based on number of methods
    adjustClassSize(classId) {
        const classNode = this.cy.$id(classId);
        if (!classNode || classNode.length === 0) return;

        const methodCount = classNode.children().length;
        const newHeight = Math.max(150, 80 + (methodCount * 110));
        const newWidth = Math.max(
            parseInt(this.originalDimensions[classId]?.width || 150),
            800
        );

        const currentPosition = classNode.position();

        classNode.style({
            'width': newWidth,
            'height': newHeight
        });

        // Explicitly reset position to avoid offset
        classNode.position(currentPosition);

        // Reposition the remaining methods
        this.repositionMethodsInClass(classId);
    }

    // Helper method to reposition methods after one is removed
    repositionMethodsInClass(classId) {
        const classNode = this.cy.$id(classId);
        if (!classNode || classNode.length === 0) return;

        const children = classNode.children();
        const methodCount = children.length;
        const parentCenter = classNode.position();
        const newHeight = parseInt(classNode.style('height'));
        const parentTopY = parentCenter.y - (newHeight / 2);

        children.forEach((methodNode, index) => {
            // Recalculate position for each method
            const offsetY = 60 + (index * 40);
            const methodAbsoluteY = parentTopY + offsetY;

            // Horizontal centering with variance for many methods
            const horizontalVariance = methodCount > 4 ? (index % 2) * 20 - 10 : 0;
            const methodAbsoluteX = parentCenter.x + horizontalVariance;

            // Set new position
            methodNode.position({
                x: methodAbsoluteX,
                y: methodAbsoluteY
            });
        });
    }

    createEdgesForNode(id, nodeLabel) {
        // Get node data from original data source
        const nodeData = this.data.nodes.get(id).data;
        if (!nodeData) {
            console.error(`Node data not found for id ${id}`);
            return;
        }

        // Decide edge creation method based on traceMode
        if (!this.data.traceMode) {
            // Original non-traceMode logic
            // Find parent node by traversing up the call tree
            const parentInfo = this.findFirstSelectedParent(id);

            if (parentInfo) {
                const { parentId, parentNodeLabel } = parentInfo;

                // Remove all edges from parent node
                this.removeAllEdgesFromNode(parentId);

                // Now traverse down from parent to create new edges
                this.traverseDownAndCreateEdges(parentId, parentNodeLabel);
            }
            // If no selected parent node is found, just handle connections for current node
            this.traverseDownAndCreateEdges(id, nodeLabel);
        } else {
            // Handle edge creation in traceMode
            this.createSequentialEdges();
        }
    }

    // Create edges sequentially in order of thread nodes in traceMode
    createSequentialEdges() {
        // Iterate each thread
        this.threadToMethodNodesInOrder.forEach((methodNodes, threadName) => {
            // Get inserted nodes (selected nodes)
            const selectedNodes = methodNodes.filter(node =>
                this.insertedNodes.has(node.label) &&
                this.data.nodes.get(node.originalId)?.data?.selected
            );

            // If thread has fewer than 2 selected nodes, no need to create edges
            if (selectedNodes.length < 2) {
                return;
            }

            // Clear all existing edges to prepare for rebuilding
            // We only need to clear edges related to nodes in this thread
            selectedNodes.forEach(node => {
                this.removeAllEdgesFromNode(node.originalId);
            });

            // Create edges in order of nodes in the list (linked list style)
            for (let i = 0; i < selectedNodes.length - 1; i++) {
                const currentNode = selectedNodes[i];
                const nextNode = selectedNodes[i + 1];

                // Create edge from current node to next node
                this.createEdge(
                    currentNode.originalId,
                    currentNode.label,
                    nextNode.originalId,
                    nextNode.label
                );
            }
        });
    }

    // Helper method to remove all edges that originate from the given node
    removeAllEdgesFromNode(originalId) {
        if (this.originalIdToSourceEdges.has(originalId)) {
            const edgeIds = this.originalIdToSourceEdges.get(originalId);
            for (const edgeId of edgeIds) {
                // Remove the edge from Cytoscape if it exists
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
            // Clear the set of source edges
            this.originalIdToSourceEdges.set(originalId, new Set());
        }
    }

    // Helper method to find the first selected parent node in the call tree
    findFirstSelectedParent(originalId) {
        let currentId = originalId;
        // console.log("Current Id, looking for parent node", currentId)

        while (currentId) {
            const currentNode = this.data.nodes.get(currentId);
            if (!currentNode) break;

            const parentId = currentNode.data.parentId;
            if (!parentId) break;

            const parentNode = this.data.nodes.get(parentId);
            if (!parentNode) break;

            // Check if the parent is selected
            if (parentNode.data.selected) {
                // Found a selected parent, return its information
                const parentNodeLabel = this.getMethodLabelById(parentId);
                if (parentNodeLabel && this.insertedNodes.has(parentNodeLabel)) {
                    return { parentId, parentNodeLabel };
                }
            }

            // Move up to the parent
            currentId = parentId;
        }

        // No selected parent found
        return null;
    }

    // Helper method to traverse down and create edges from the source node
    // Uses DFS traversal to create edges
    traverseDownAndCreateEdges(originalId, sourceNodeLabel) {
        const visited = new Set();

        // Helper function using DFS traversal
        const dfs = (currentId) => {
            if (visited.has(currentId)) return;
            visited.add(currentId);

            const currentNode = this.data.nodes.get(currentId);
            if (!currentNode) return;

            // Create edges for selected nodes that aren't the source node
            if (currentId !== originalId && currentNode.data.selected) {
                const targetNodeLabel = this.getMethodLabelById(currentId);
                if (targetNodeLabel && this.insertedNodes.has(targetNodeLabel)) {
                    this.createEdge(originalId, sourceNodeLabel, currentId, targetNodeLabel);
                    // Stop traversing deeper after finding a selected node
                    return;
                }
            }

            // Traverse child nodes
            const children = currentNode.data.children || [];
            for (const child of children) {
                // Extract ID from child object
                // Adjust this logic based on your data structure
                const childId = child.id || child.nodeId || child;

                // Ensure a valid ID was extracted
                if (childId && (typeof childId === 'string' || typeof childId === 'number')) {
                    dfs(childId);
                } else {
                    console.error(`Cannot extract valid ID from child:`, child);
                }
            }
        };

        // Start traversal from source node, but don't create edges for source node
        dfs(originalId);
    }

    // Helper method to create an edge between two nodes
    createEdge(sourceOriginalId, sourceNodeLabel, targetOriginalId, targetNodeLabel) {
        // Generate a unique ID for the edge
        const edgeId = `edge_${sourceOriginalId}_${targetOriginalId}_${new Date().getTime()}`;

        // Check if this edge already exists
        if (this.insertedEdges.has(edgeId)) {
            return;
        }

        // Create the edge data
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

        // Add the edge to cytoscape
        const edge = this.cy.add(edgeData);

        // Style the edge
        edge.style({
            'width': 2,
            'line-color': '#999',
            'target-arrow-color': '#999',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier'
        });

        // For self-referential edges, adjust the curve style to make them visible
        if (sourceNodeLabel === targetNodeLabel) {
            edge.style({
                'curve-style': 'unbundled-bezier',
                'control-point-distances': [50],
                'control-point-weights': [0.5],
                'loop-direction': '0deg',
                'loop-sweep': '90deg'
            });
        }

        // Store the edge in our map
        this.insertedEdges.set(edgeId, edge);

        // Track this edge in our original ID maps
        if (!this.originalIdToSourceEdges.has(sourceOriginalId)) {
            this.originalIdToSourceEdges.set(sourceOriginalId, new Set());
        }
        this.originalIdToSourceEdges.get(sourceOriginalId).add(edgeId);

        if (!this.originalIdToTargetEdges.has(targetOriginalId)) {
            this.originalIdToTargetEdges.set(targetOriginalId, new Set());
        }
        this.originalIdToTargetEdges.get(targetOriginalId).add(edgeId);
    }

    // Core node creation function
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

    // Create a library method node
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

        // Calculate position
        const positions = this.cy.nodes().map(n => n.position());
        let posX = 100, posY = 100;

        // If there are other nodes, position relative to them
        if (positions.length > 0) {
            // Find average position of all nodes
            const avgX = positions.reduce((sum, pos) => sum + pos.x, 0) / positions.length;
            const avgY = positions.reduce((sum, pos) => sum + pos.y, 0) / positions.length;

            // Calculate position with some offset from average
            posX = avgX + (Math.random() * 200 - 100);
            posY = avgY + (Math.random() * 200 - 100);

            // Avoid overlapping
            let overlap = true;
            let attempts = 0;
            while (overlap && attempts < 10) {
                overlap = false;
                for (const pos of positions) {
                    const distance = Math.sqrt(Math.pow(posX - pos.x, 2) + Math.pow(posY - pos.y, 2));
                    if (distance < 150) { // Minimum distance to avoid overlap
                        overlap = true;
                        break;
                    }
                }
                if (overlap) {
                    posX = avgX + (Math.random() * 400 - 200);
                    posY = avgY + (Math.random() * 400 - 200);
                    attempts++;
                }
            }
        }

        // Set the library method node's position
        addedNode.position({ x: posX, y: posY });

        // Set specialized styles for library method nodes
        const color = nodeData.color || nodeData.nodeColor || '#D3D3D3';
        addedNode.style({
            'label': nodeData.properties?.simpleName || nodeLabel.split('.').pop(),
            'color': 'black',
            'font-size': '12px',
            'text-valign': 'center',
            'text-halign': 'center',
            'background-color': color,
            'border-width': '2px',
            'border-color': '#666',
            'border-style': 'dashed',
            'border-opacity': 1,
            'shape': 'round-rectangle',
            'width': '140px',
            'height': '35px',
            'text-wrap': 'ellipsis',
            'text-max-width': '130px'
        });

        return addedNode;
    }

    // Create a regular method node with parent class
    createRegularMethodNode(id, nodeLabel, nodeData, classNode) {
        const classId = classNode.id();
        const currentPosition = classNode.position();

        // Store original dimensions if not already stored
        if (!this.originalDimensions[classId]) {
            this.originalDimensions[classId] = {
                width: classNode.style('width'),
                height: classNode.style('height'),
                textValign: classNode.style('text-valign'),
                textHalign: classNode.style('text-halign'),
                textMarginY: classNode.style('text-margin-y'),
                position: { x: currentPosition.x, y: currentPosition.y }
            };
        }

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
        if (!this.classToMethodsMap.has(classId)) {
            this.classToMethodsMap.set(classId, new Set());
        }
        this.classToMethodsMap.get(classId).add(nodeLabel);

        // Adjust class node style and size
        const methodCount = classNode.children().length;
        const newHeight = Math.max(150, 80 + (methodCount * 110));
        const newWidth = Math.max(parseInt(this.originalDimensions[classId].width), 800);

        classNode.style({
            'width': newWidth,
            'height': newHeight,
            'text-valign': 'top',
            'text-halign': 'center',
            'text-margin-y': 18
        });

        // Reset class node position
        classNode.position(currentPosition);

        // Calculate method node position
        const methodIndex = classNode.children().length - 1;
        const parentCenter = currentPosition;
        const parentTopY = parentCenter.y - (newHeight / 2);
        const offsetY = 60 + (methodIndex * 40);
        const methodAbsoluteY = parentTopY + offsetY;
        const horizontalVariance = methodCount > 4 ? (methodIndex % 2) * 20 - 10 : 0;
        const methodAbsoluteX = parentCenter.x + horizontalVariance;

        // Set the method node's position
        addedNode.position({
            x: methodAbsoluteX,
            y: methodAbsoluteY
        });

        // Set style for the method node
        const color = nodeData.color || nodeData.nodeColor || '#D3D3D3';
        addedNode.style({
            'label': nodeData.properties?.simpleName || nodeLabel.split('.').pop(),
            'color': 'black',
            'font-size': '12px',
            'text-valign': 'center',
            'text-halign': 'center',
            'background-color': color,
            'border-width': '1px',
            'border-color': '#999',
            'border-opacity': 0.8,
            'shape': 'round-rectangle',
            'width': '120px',
            'height': '30px',
            'text-wrap': 'ellipsis',
            'text-max-width': '110px'
        });

        return addedNode;
    }

    // Core node removal function
    removeMethodNode(id, nodeLabel) {
        // check if node and ID mapping exist
        if (!this.insertedNodes.has(nodeLabel) ||
            !this.methodLabelToOriginalIds.has(nodeLabel) ||
            !this.methodLabelToOriginalIds.get(nodeLabel).has(id)) {
            console.warn(`Node ${nodeLabel} with ID ${id} not found or not properly mapped`);
            return false;
        }

        const methodNode = this.insertedNodes.get(nodeLabel);
        if (!methodNode) return false;

        // Handle edges for this node
        this.handleNodeEdges(id, nodeLabel);

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
            if (!isLibraryMethod && classId && this.classToMethodsMap.has(classId)) {
                this.classToMethodsMap.get(classId).delete(nodeLabel);

                // Adjust class size or restore original dimensions
                if (this.classToMethodsMap.get(classId).size === 0) {
                    this.restoreClassOriginalDimensions(classId);
                } else {
                    this.adjustClassSize(classId);
                }
            }
        }

        // Clean up tracking mappings
        this.originalIdToSourceEdges.delete(id);
        this.originalIdToTargetEdges.delete(id);

        return true;
    }

    // Add node to thread method list
    addToThreadMethodNodes(id, nodeLabel) {
        const currentThreadName = this.data.currentThreadName;
        if (!currentThreadName) return;

        if (!this.threadToMethodNodesInOrder.has(currentThreadName)) {
            this.threadToMethodNodesInOrder.set(currentThreadName, []);
        }

        // Check if already in thread list
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

    // ===== multi node management
    // Updated insertMultipleMethodByIds function
    insertMultipleMethodByIds(ids) {
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            console.warn("No valid IDs provided for batch insertion");
            return [];
        }

        // console.log(`Batch inserting ${ids.length} method nodes`);
        const insertedLabels = [];

        // Process each ID
        for (const id of ids) {
            // Get the node label
            const nodeLabel = this.getMethodLabelById(id);
            if (!nodeLabel) {
                console.warn(`Could not get label for node with id ${id}, skipping`);
                continue;
            }

            // Add to thread method nodes
            this.addToThreadMethodNodes(id, nodeLabel);

            // Create the node
            const addedNode = this.createMethodNode(id, nodeLabel);
            if (!addedNode) continue;

            insertedLabels.push(nodeLabel);
        }

        // After all nodes are created, recreate edges in a single operation
        // if (insertedLabels.length > 0) {
        this.switchTraceMode(this.data.traceMode, this.useNumberedEdges);
        // }

        return insertedLabels;
    }

    //removeMultipleMethodByIds function
    removeMultipleMethodByIds(ids) {
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            console.warn("No valid IDs provided for batch removal");
            return [];
        }

        // console.log(`Batch removing ${ids.length} method nodes`);
        const removedLabels = [];

        for (const id of ids) {
            // Get node label
            const nodeLabel = this.getMethodLabelById(id);
            if (!nodeLabel) {
                console.warn(`Could not get label for node with id ${id}, skipping`);
                continue;
            }

            // check existence of node and ID mapping
            // if (!this.insertedNodes.has(nodeLabel) ||
            //     !this.methodLabelToOriginalIds.has(nodeLabel) ||
            //     !this.methodLabelToOriginalIds.get(nodeLabel).has(id)) {
            //     console.warn(`Node ${nodeLabel} with ID ${id} not found or not properly mapped`);
            //     continue;
            // }

            const methodNode = this.insertedNodes.get(nodeLabel);
            if (!methodNode) continue;

            // Remove from thread method nodes
            this.removeFromThreadMethodNodes(id, nodeLabel);

            // Handle node edges and connections
            this.handleNodeEdges(id, nodeLabel);

            // Update mappings and decide whether to delete node
            this.updateMappingsAndRemoveNode(id, nodeLabel, methodNode);

            removedLabels.push(nodeLabel);
        }


        this.switchTraceMode(this.data.traceMode, this.useNumberedEdges);


        return removedLabels;
    }

    //     /**
    //  * Clean up all inserted method nodes and edges, and restore parent class nodes
    //  */
    //     cleanUp() {
    //     console.log(`Cleaning up ${this.insertedNodes.size} nodes and ${this.insertedEdges.size} edges`);

    //     // Step 1: Collect all affected class nodes before removing method nodes
    //     const affectedClassIds = new Set();
    //     this.insertedNodes.forEach((methodNode, nodeLabel) => {
    //         // Check if this method node has a parent (class node)
    //         if (methodNode.parent && methodNode.parent().length > 0) {
    //             const classId = methodNode.parent().id();
    //             affectedClassIds.add(classId);
    //         }
    //     });

    //     // Step 2: Remove all edges first
    //     this.insertedEdges.forEach((edge, edgeId) => {
    //         try {
    //             if (edge && this.cy.getElementById(edgeId).length > 0) {
    //                 this.cy.remove(edge);
    //             }
    //         } catch (e) {
    //             console.warn(`Failed to remove edge ${edgeId}:`, e);
    //         }
    //     });

    //     // Step 3: Remove all method nodes
    //     this.insertedNodes.forEach((node, nodeLabel) => {
    //         try {
    //             if (node && this.cy.getElementById(nodeLabel).length > 0) {
    //                 this.cy.remove(node);
    //             }
    //         } catch (e) {
    //             console.warn(`Failed to remove node ${nodeLabel}:`, e);
    //         }
    //     });

    //     // Step 4: Restore all affected class nodes to their original dimensions
    //     affectedClassIds.forEach(classId => {
    //         try {
    //             this.restoreClassOriginalDimensions(classId);
    //         } catch (e) {
    //             console.warn(`Failed to restore class ${classId}:`, e);
    //         }
    //     });

    //     // Step 5: Clear all the maps and data structures
    //     this.insertedNodes.clear();
    //     this.insertedEdges.clear();
    //     this.classToMethodsMap.clear();
    //     this.methodLabelToOriginalIds.clear();
    //     this.originalIdToSourceEdges.clear();
    //     this.originalIdToTargetEdges.clear();

    //     // Step 6: Reset thread-related data structures
    //     this.threadToMethodNodesInOrder.forEach((_, threadName) => {
    //         this.threadToMethodNodesInOrder.set(threadName, []);
    //         this.currentIndexByThread.set(threadName, 0);
    //     });

    //     // Step 7: Clear original dimensions cache
    //     this.originalDimensions = {};

    //     // Step 8: Force garbage collection if available (optional)
    //     if (window.gc && typeof window.gc === 'function') {
    //         try {
    //             window.gc();
    //         } catch (e) {
    //             // Ignore if gc is not available
    //         }
    //     }

    //     console.log("ClassvizManager cleanup completed");
    // }
}