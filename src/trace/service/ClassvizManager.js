import { ALLOWED_LIB_METHODS } from "../utils/process/callTreeParser.js";
import { CallTreeManager } from "./classviz/CallTreeManager.js";
import { ClassLayoutManager } from "./classviz/ClassLayoutManager.js";
import { EdgeLifter } from "./classviz/EdgeLifter.js";
import { EdgeManager } from "./classviz/EdgeManager.js";
import { NodeFactory } from "./classviz/NodeFactory.js";
import { NodeStyler } from "./classviz/NodeStyler.js";
import { ThreadManager } from "./classviz/ThreadManager.js";


export class ClassvizManager {
    constructor(data, cy, eventBus, idRangeByThreadMap) {
        // Core settings
        this.stepByStepMode = false;
        this.useNumberedEdges = true;
        this.liftedEdgesMode = false;
        this.ALLOWED_LIB_METHODS = ALLOWED_LIB_METHODS;
        
        // Core dependencies
        this.data = data;
        this.cy = cy;
        this.eventBus = eventBus;
        this.idRangeByThreadMap = idRangeByThreadMap; // Map of thread names to ID ranges;

        // Data structures - keeping all original APIs
        this.threadToFocusedBorderColour = new Map(); // threadname -> border color string
        this.threadToMethodNodesInOrder = new Map(); // threadname -> method node list {originalId, label(cy node id)}  in order of orignaiId
        this.currentIndexByThread = new Map(); // threadname -> current index in the method node list

        this.originalDimensions = {}; // class node id -> original dimensions
        this.insertedNodes = new Map(); // cy method node id (nodeData.label) -> cy method node
        this.insertedEdges = new Map(); // edge node id -> cy edge 

        this.classToMethodsMap = new Map(); // class node id -> method node cy ids list (nodeData.label)

        this.methodLabelToOriginalIds = new Map(); // method node label -> original ID set

         // Uses the original ID from call tree as key: stores edge IDs where this original node is the source/target
        this.originalIdToSourceEdges = new Map(); // originalId -> Set(edge id) edges where this original node is the source
        this.originalIdToTargetEdges = new Map(); // originalId -> Set(edge id) edges where this original node is the target

        // Initialize specialized managers
        this.threadManager = new ThreadManager(idRangeByThreadMap);
        this.nodeStyler = new NodeStyler(cy, this.insertedNodes, data);
        this.classLayoutManager = new ClassLayoutManager(cy, this.originalDimensions, this.classToMethodsMap);
        this.nodeFactory = new NodeFactory(cy, data, ALLOWED_LIB_METHODS, this.insertedNodes, this.methodLabelToOriginalIds, this.classLayoutManager, this.nodeStyler);
        this.edgeManager = new EdgeManager(cy, data, this.insertedEdges, this.originalIdToSourceEdges, this.originalIdToTargetEdges, this.nodeFactory, this.nodeStyler);
        this.callTreeManager = new CallTreeManager(data, this.edgeManager, this.nodeFactory);
        this.edgeLifter = new EdgeLifter(cy, data, ALLOWED_LIB_METHODS, this.edgeManager, this.nodeStyler);

        // Copy thread manager data to maintain API compatibility
        this.threadToFocusedBorderColour = this.threadManager.threadToFocusedBorderColour;
        this.threadToMethodNodesInOrder = this.threadManager.threadToMethodNodesInOrder;
        this.currentIndexByThread = this.threadManager.currentIndexByThread;

        this.initializeControls();
        this.setupEventSubscriptions();
    }

    // ====================================================================
    // INITIALIZATION & CONFIGURATION FUNCTIONS
    // ====================================================================

    /**
     * Initialize UI controls
     */
    initializeControls() {
        const numberedEdgeControlInput = document.getElementById('numberedEdges');
        if (numberedEdgeControlInput) {
            numberedEdgeControlInput.checked = this.useNumberedEdges;
            numberedEdgeControlInput.addEventListener('change', (event) => {
                this.toggleEdgeNumbering(event.target.checked);
            });
        }
    }

    /**
     * Setup event bus subscriptions
     */
    setupEventSubscriptions() {
        this.eventBus.subscribe('changeSingleMethodByIdToClassviz', ({ nodeId, selected }) => {
            this.eventBus.publish('refreshRegionFocus', { stopStepByStepMode: false });
            if (selected) {
                this.insertSingleMethodById(nodeId);
            } else {
                this.removeSingleMethodById(nodeId);
            }
            if (this.useNumberedEdges) {
                this.switchTraceMode(this.data.traceMode, true);
            }
            if (this.stepByStepMode) {
                this.eventBus.publish('switchStepByStepMode', { flag: true });
            }
        });

        this.eventBus.subscribe('changeMultiMethodByIdsToClassviz', ({ nodeIds, selected }) => {
            this.eventBus.publish('refreshRegionFocus', { stopStepByStepMode: false });
            if (selected) {
                this.insertMultipleMethodByIds(nodeIds);
            } else {
                nodeIds.forEach((nodeId) => {
                    this.removeSingleMethodById(nodeId);
                });
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
            this.threadManager.updateCurrentIndexByNodeId(currentThreadName, nodeId);
        });
    }

    /**
     * Initialize focused border colors for different threads
     */
    initFocusedBorderColors() {
        // Delegate to thread manager but maintain API
        return this.threadManager.initFocusedBorderColors();
    }

    // ====================================================================
    // UTILITY & HELPER FUNCTIONS (maintaining original API)
    // ====================================================================

    /**
     * Get method label by node ID from the data source
     * @param {string} id - Original node ID
     * @returns {string|null} - Method label or null if not found
     */
    getMethodLabelById(id) {
        return this.nodeFactory.getMethodLabelById(id);
    }

    /**
     * Find class node by method label
     * @param {string} label - Method label
     * @returns {object|null} - Cytoscape class node or null
     */
    findClassNodeByNodeLabel(label) {
        return this.nodeFactory.findClassNodeByNodeLabel(label);
    }

    // ====================================================================
    // NODE STYLING & VISUAL FUNCTIONS (maintaining original API)
    // ====================================================================

    /**
     * Change background color for all inserted method nodes
     * @param {string} color - New background color
     */
    changeAllMethodNodesColor(color) {
        return this.nodeStyler.changeAllMethodNodesColor(color);
    }

    /**
     * Change color of a specific node by its original ID
     * @param {string} id - Original node ID
     * @param {string} color - Background color
     * @param {boolean} bordered - Whether to add border styling
     * @param {string} borderColor - Border color
     */
    changeColorOfNodeById(id, color, bordered = false, borderColor = 'grey') {
        return this.nodeStyler.changeColorOfNodeById(id, color, bordered, borderColor);
    }

    // ====================================================================
    // SINGLE NODE MANAGEMENT FUNCTIONS (maintaining original API)
    // ====================================================================

    /**
     * Insert a single method node by its ID
     * @param {string} id - Original node ID to insert
     */
    insertSingleMethodById(id) {
        const nodeLabel = this.getMethodLabelById(id);
        if (!nodeLabel) {
            console.error(`Could not get label for node with id ${id}`);
            return;
        }

        this.addToThreadMethodNodes(id, nodeLabel);
        const addedNode = this.createMethodNode(id, nodeLabel);
        if (!addedNode) return;

        this.createEdgesForNode(id, nodeLabel);

        if (this.useNumberedEdges) {
            this.switchTraceMode(this.data.traceMode, true);
        }
    }

    /**
     * Remove a single method node by its ID
     * @param {string} id - Original node ID to remove
     */
    removeSingleMethodById(id) {
        const nodeLabel = this.getMethodLabelById(id);
        if (!nodeLabel) {
            console.error(`Could not get label for node with id ${id}`);
            return;
        }

        this.removeFromThreadMethodNodes(id, nodeLabel);
        const removed = this.removeMethodNode(id, nodeLabel);
        if (!removed) return;

        if (this.useNumberedEdges) {
            this.switchTraceMode(this.data.traceMode, true);
        }
    }

    // ====================================================================
    // MULTIPLE NODES MANAGEMENT FUNCTIONS (maintaining original API)
    // ====================================================================

    /**
     * Insert multiple method nodes by their IDs in batch
     * @param {Array} ids - Array of original node IDs to insert
     * @returns {Array} - Array of inserted node labels
     */
    insertMultipleMethodByIds(ids) {
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            console.warn("No valid IDs provided for batch insertion");
            return [];
        }

        const insertedLabels = [];

        for (const id of ids) {
            const nodeLabel = this.getMethodLabelById(id);
            if (!nodeLabel) {
                console.warn(`Could not get label for node with id ${id}, skipping`);
                continue;
            }

            this.addToThreadMethodNodes(id, nodeLabel);
            const addedNode = this.createMethodNode(id, nodeLabel);
            if (!addedNode) continue;

            insertedLabels.push(nodeLabel);
        }

        this.switchTraceMode(this.data.traceMode, this.useNumberedEdges);
        return insertedLabels;
    }

    /**
     * Remove multiple method nodes by their IDs in batch
     * @param {Array} ids - Array of original node IDs to remove
     * @returns {Array} - Array of removed node labels
     */
    removeMultipleMethodByIds(ids) {
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            console.warn("No valid IDs provided for batch removal");
            return [];
        }

        const removedLabels = [];

        for (const id of ids) {
            const nodeLabel = this.getMethodLabelById(id);
            if (!nodeLabel) {
                console.warn(`Could not get label for node with id ${id}, skipping`);
                continue;
            }

            const methodNode = this.insertedNodes.get(nodeLabel);
            if (!methodNode) continue;

            this.removeFromThreadMethodNodes(id, nodeLabel);
            this.handleNodeEdges(id, nodeLabel);
            this.updateMappingsAndRemoveNode(id, nodeLabel, methodNode);

            removedLabels.push(nodeLabel);
        }

        this.switchTraceMode(this.data.traceMode, this.useNumberedEdges);
        return removedLabels;
    }

    // ====================================================================
    // NODE CREATION & REMOVAL CORE FUNCTIONS (maintaining original API)
    // ====================================================================

    /**
     * Core function to create a method node
     * @param {string} id - Original node ID
     * @param {string} nodeLabel - Method label
     * @returns {object|null} - Created Cytoscape node or null
     */
    createMethodNode(id, nodeLabel) {
        return this.nodeFactory.createMethodNode(id, nodeLabel);
    }

    /**
     * Create a standalone library method node without parent class
     * @param {string} id - Original node ID
     * @param {string} nodeLabel - Method label
     * @param {object} nodeData - Node data from source
     * @returns {object} - Created Cytoscape node
     */
    createLibraryMethodNode(id, nodeLabel, nodeData) {
        return this.nodeFactory.createLibraryMethodNode(id, nodeLabel, nodeData);
    }

    /**
     * Create a method node with parent class node
     * @param {string} id - Original node ID
     * @param {string} nodeLabel - Method label
     * @param {object} nodeData - Node data from source
     * @param {object} classNode - Parent class node
     * @returns {object} - Created Cytoscape node
     */
    createRegularMethodNode(id, nodeLabel, nodeData, classNode) {
        return this.nodeFactory.createRegularMethodNode(id, nodeLabel, nodeData, classNode);
    }

    /**
     * Core function to remove a method node
     * @param {string} id - Original node ID
     * @param {string} nodeLabel - Method label
     * @returns {boolean} - Success status
     */
    removeMethodNode(id, nodeLabel) {
        return this.nodeFactory.removeMethodNode(id, nodeLabel);
    }

    // ====================================================================
    // THREAD MANAGEMENT FUNCTIONS (maintaining original API)
    // ====================================================================

    /**
     * Add node to thread's ordered method list
     * @param {string} id - Original node ID
     * @param {string} nodeLabel - Method label
     */
    addToThreadMethodNodes(id, nodeLabel) {
        const currentThreadName = this.data.currentThreadName;
        this.threadManager.addToThreadMethodNodes(currentThreadName, id, nodeLabel);
    }

    /**
     * Remove node from thread's ordered method list
     * @param {string} id - Original node ID
     * @param {string} nodeLabel - Method label
     */
    removeFromThreadMethodNodes(id, nodeLabel) {
        const currentThreadName = this.data.currentThreadName;
        this.threadManager.removeFromThreadMethodNodes(currentThreadName, id);
    }

    // ====================================================================
    // CLASS DIMENSION MANAGEMENT FUNCTIONS (maintaining original API)
    // ====================================================================

    /**
     * Restore class node to its original dimensions
     * @param {string} classId - Class node ID
     */
    restoreClassOriginalDimensions(classId) {
        return this.classLayoutManager.restoreClassOriginalDimensions(classId);
    }

    /**
     * Adjust class size based on number of contained method nodes
     * @param {string} classId - Class node ID
     */
    adjustClassSize(classId) {
        return this.classLayoutManager.adjustClassSize(classId);
    }

    /**
     * Reposition method nodes within a class after changes
     * @param {string} classId - Class node ID
     */
    repositionMethodsInClass(classId) {
        return this.classLayoutManager.repositionMethodsInClass(classId);
    }

    /**
     * Update internal mappings and conditionally remove node
     * @param {string} id - Original node ID
     * @param {string} nodeLabel - Method label
     * @param {object} methodNode - Cytoscape method node
     */
    updateMappingsAndRemoveNode(id, nodeLabel, methodNode) {
        // This logic is now handled in NodeFactory.removeMethodNode
        // but we maintain this method for API compatibility
        return this.nodeFactory.removeMethodNode(id, nodeLabel);
    }

    // ====================================================================
    // EDGE MANAGEMENT FUNCTIONS (maintaining original API)
    // ====================================================================

    /**
     * Handle edge connections when removing a node
     * @param {string} id - Original node ID
     * @param {string} nodeLabel - Method label
     */
    handleNodeEdges(id, nodeLabel) {
        return this.edgeManager.handleNodeEdges(id, nodeLabel);
    }

    /**
     * Reconnect parent node to children nodes after intermediate node removal
     * @param {string} parentOriginalId - Parent node original ID
     * @param {Array} targetChildrenOriginalIds - Array of children node IDs
     */
    reconnectParentToChildren(parentOriginalId, targetChildrenOriginalIds) {
        return this.edgeManager.reconnectParentToChildren(parentOriginalId, targetChildrenOriginalIds);
    }

    /**
     * Create edges for a newly inserted node based on current mode
     * @param {string} id - Original node ID
     * @param {string} nodeLabel - Method label
     */
    createEdgesForNode(id, nodeLabel) {
        if (!this.data.traceMode) {
            this.callTreeManager.createEdgesForNode(id, nodeLabel);
        } else {
            this.createSequentialEdges();
        }
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
        return this.edgeManager.createEdge(sourceOriginalId, sourceNodeLabel, targetOriginalId, targetNodeLabel);
    }

    /**
     * Remove all edges originating from a specific node
     * @param {string} originalId - Original node ID
     */
    removeAllEdgesFromNode(originalId) {
        return this.edgeManager.removeAllEdgesFromNode(originalId);
    }

    /**
     * Clear all edges in the visualization
     */
    clearAllEdges() {
        return this.edgeManager.clearAllEdges();
    }

    // ====================================================================
    // TRACE MODE & SEQUENTIAL EDGE FUNCTIONS (maintaining original API)
    // ====================================================================

    /**
     * Create sequential edges in trace mode
     */
    createSequentialEdges() {
        const isNodeSelected = (originalId) => {
            return this.data.nodes.get(originalId)?.data?.selected;
        };
        return this.edgeManager.createSequentialEdges(this.threadToMethodNodesInOrder, isNodeSelected);
    }

    /**
     * Switch between trace mode and call tree mode
     * Also useful for replotting edges 
     * @param {boolean} traceMode - Whether to enable trace mode
     * @param {boolean} useNumbering - Whether to use numbered edges
     */
    switchTraceMode(traceMode = this.data.traceMode, useNumbering = this.useNumberedEdges) {
        this.data.traceMode = traceMode;

        if (this.insertedNodes.size <= 1) {
            console.log("Less than 2 nodes exist, no edges to recreate");
            return;
        }

        this.clearAllEdges();

        if (traceMode) {
            if (useNumbering) {
                this.createNumberedSequentialEdges();
            } else {
                this.createSequentialEdges();
            }
        } else {
            if (useNumbering) {
                this.rebuildNumberedCallTreeEdges();
            } else {
                this.rebuildCallTreeEdges();
            }
        }
        
        if (this.liftedEdgesMode) {
            this.liftEdges();
        }
    }

    /**
     * Toggle edge numbering and coloring mode
     * @param {boolean} useNumbering - Whether to enable numbering mode
     * @returns {boolean} - Current numbering mode status
     */
    toggleEdgeNumbering(useNumbering) {
        if (useNumbering === undefined) {
            this.useNumberedEdges = !this.useNumberedEdges;
        } else {
            this.useNumberedEdges = useNumbering;
        }

        this.switchTraceMode(this.data.traceMode, this.useNumberedEdges);
        return this.useNumberedEdges;
    }

    // ====================================================================
    // NUMBERED & COLORED EDGE FUNCTIONS (maintaining original API)
    // ====================================================================

    /**
     * Create colored sequential edges with calling order numbers for trace mode 
     */
    createNumberedSequentialEdges() {
        const isNodeSelected = (originalId) => {
            return this.data.nodes.get(originalId)?.data?.selected;
        };
        return this.edgeManager.createNumberedSequentialEdges(this.threadToMethodNodesInOrder, isNodeSelected);
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
        return this.edgeManager.createNumberedEdge(sourceOriginalId, sourceNodeLabel, targetOriginalId, targetNodeLabel, sequenceNumber, color);
    }

    // ====================================================================
    // CALL TREE MODE FUNCTIONS (maintaining original API)
    // ====================================================================

    /**
     * Rebuild all edges for call tree mode with standard styling
     */
    rebuildCallTreeEdges() {
        return this.callTreeManager.rebuildCallTreeEdges(this.threadToMethodNodesInOrder);
    }

    /**
     * Traverse tree structure and create edges between selected nodes
     * @param {object} node - Current tree node
     * @param {Set} visited - Set of visited nodes to prevent cycles
     * @param {string|null} lastSelectedParentId - Last selected parent node ID
     * @param {string|null} lastSelectedParentLabel - Last selected parent node label
     */
    traverseTreeAndCreateEdges(node, visited = new Set(), lastSelectedParentId = null, lastSelectedParentLabel = null) {
        return this.callTreeManager.traverseTreeAndCreateEdges(node, visited, lastSelectedParentId, lastSelectedParentLabel);
    }

    /**
     * Rebuild numbered call tree edges with colors and sequence numbers
     */
    rebuildNumberedCallTreeEdges() {
        return this.callTreeManager.rebuildNumberedCallTreeEdges(this.threadToMethodNodesInOrder);
    }

    /**
     * Calculate maximum depth of selected nodes in the call tree
     * @returns {number} - Maximum depth found
     */
    calculateMaxDepth() {
        return this.callTreeManager.calculateMaxDepth(this.threadToMethodNodesInOrder);
    }

    /**
     * Generate color palette for different call tree depths
     * @param {number} maxDepth - Maximum depth to generate colors for
     * @returns {object} - Mapping of depth to color
     */
    generateDepthColors(maxDepth) {
        return this.callTreeManager.generateDepthColors(maxDepth);
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
        return this.callTreeManager.traverseTreeAndCreateNumberedEdges(node, depthColors, visited, depth, lastSelectedParentId, lastSelectedParentLabel);
    }

    // ====================================================================
    // TREE TRAVERSAL & SEARCH FUNCTIONS (maintaining original API)
    // ====================================================================

    /**
     * Find the first selected parent node in the call tree hierarchy
     * @param {string} originalId - Starting node ID
     * @returns {object|null} - Parent info object or null
     */
    findFirstSelectedParent(originalId) {
        return this.callTreeManager.findFirstSelectedParent(originalId);
    }

    /**
     * Traverse down from source node and create edges using DFS
     * @param {string} originalId - Source node original ID
     * @param {string} sourceNodeLabel - Source node label
     */
    traverseDownAndCreateEdges(originalId, sourceNodeLabel) {
        return this.callTreeManager.traverseDownAndCreateEdges(originalId, sourceNodeLabel);
    }

    // ====================================================================
    // EDGE LIFTING FUNCTIONS (maintaining original API)
    // ====================================================================

    /**
     * Lift edges to parent level when source and target have different parents
     */
    liftEdges() {
        return this.edgeLifter.liftEdges();
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
        const { sourceColor, targetColor } = this.edgeLifter.getParentNodeColors(parentSourceId, parentTargetId, originalSourceId, originalTargetId);
        return this.edgeManager.createParentEdge(parentSourceId, parentTargetId, originalSourceId, originalTargetId, sourceColor, targetColor);
    }

    /**
     * Remove edge from internal mappings
     * @param {string} edgeId - Edge ID to remove
     * @param {string} sourceOriginalId - Source node original ID
     * @param {string} targetOriginalId - Target node original ID
     */
    removeEdgeFromMappings(edgeId, sourceOriginalId, targetOriginalId) {
        return this.edgeManager.removeEdgeFromMappings(edgeId, sourceOriginalId, targetOriginalId);
    }
}