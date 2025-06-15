import { generateColorSpectrum } from "../utils/colour/colourUtils.js";

export class RegionFocusManager {
    constructor(eventBus, data, classvizManager, explainer) {
        this.classvizManager = classvizManager;
        this.data = data;
        this.eventBus = eventBus;
        this.explainer = explainer;
        this.currentSelectedTreeId = null;
        this.currentSelectedRegionId = null;
        this.regionFocusMode = false;

        this.initEventListeners();
    }

    initEventListeners() {
        if (!this.eventBus) return;

        this.eventBus.subscribe('stopRegionFocusModeAndRender', () => {
            this.regionFocusMode = false;
            this.eventBus.publish('stopRegionFocusMode');
            this.resetNodeColours();

        });

        this.eventBus.subscribe('refreshRegionFocus', ({ stopStepByStepMode }) => {
            const enabled = this.regionFocusMode;
            const highlightRegion = this.currentSelectedRegionId !== "whole_trace";
            const regionId = this.currentSelectedRegionId;
            this.highlightFocusHandler(enabled, highlightRegion, regionId, stopStepByStepMode);
        });
    }

    highlightFocusHandler(enabled, highlightRegion, regionId, stopStepByStepMode) {
        this.stopStepByStepMode(stopStepByStepMode);
        this.classvizManager.switchTraceMode(this.data.traceMode, this.classvizManager.useNumberedEdges);
        if (!enabled) {
            // this.stopEdgeLifting();
            console.log("turned off region focus mode");
            return
        }
        this.stopEdgeLifting();
        if (highlightRegion) {
            this.highlightRegion(regionId);
        } else {
            this.highlightKeyNode();
        }
    }

    stopEdgeLifting() {
       this.eventBus.publish('refreshLiftEdges', { newLiftedEdgeMode: false });
    }

    stopStepByStepMode(stopStepByStepMode) {
        if (stopStepByStepMode) {
            this.classvizManager.stepByStepMode = false;
            this.eventBus.publish('changeClassvizFocus');
        }

    }

    highlightRegion(regionId) {
        // Clear all edges and get region nodes
        this.classvizManager.clearAllEdges();
        const regionIdSet = this.getRegionIdSet(regionId);

        // Build edges based on mode
        if (this.data.traceMode) {
            this.createTraceEdgesForRegion(regionIdSet);
        } else {
            this.classvizManager.traverseTreeAndCreateNumberedEdges(this.explainer.regions.get(regionId).data);
        }

        // Color nodes in the region
        this.colorNodesInRegion(regionIdSet);
    }

    createTraceEdgesForRegion(regionIdSet) {
        this.classvizManager.threadToMethodNodesInOrder.forEach((methodNodes, threadName) => {
            // Filter nodes that are both inserted and in the current region
            const selectedNodes = methodNodes.filter(node => {
                const nodeData = this.data.getNodeDataByThreadAndId(threadName, node.originalId);
                return this.classvizManager.insertedNodes.has(node.label) &&
                    this.data.nodes.get(node.originalId)?.data?.selected &&
                    nodeData && regionIdSet.has(nodeData.id);
            });

            if (selectedNodes.length < 2) return;

            // Clear edges for selected nodes
            selectedNodes.forEach(node => {
                this.classvizManager.removeAllEdgesFromNode(node.originalId);
            });

            // Create sequential edges with colors
            const colorSpectrum = generateColorSpectrum(selectedNodes.length - 1);
            for (let i = 0; i < selectedNodes.length - 1; i++) {
                const currentNode = selectedNodes[i];
                const nextNode = selectedNodes[i + 1];

                this.classvizManager.createNumberedEdge(
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

    colorNodesInRegion(regionIdSet) {
        console.log("Coloring nodes in region", regionIdSet);
        
        const regionNodeColors = new Map(); // Store region node color information
        
        // First pass: process all nodes and collect region node colors
        for (const [threadName, nodes] of this.classvizManager.threadToMethodNodesInOrder.entries()) {
            nodes.forEach(node => {
                const nodeId = node.originalId;
                const nodeData = this.data.getNodeDataByThreadAndId(threadName, nodeId);
              
                if (nodeData && regionIdSet.has(nodeId)) {
                    console.log("Collecting region node:", nodeId);
                    console.log("Original color:", nodeData.originalColor);
                    // Store region node color information for later application
                    regionNodeColors.set(nodeId, nodeData.originalColor);
                } else {
                    console.log("Dimming node outside region:", nodeId);
                    if (nodeData) {
                        console.log("Original color:", nodeData.originalColor);
                        // Dim nodes outside region
                        this.classvizManager.changeColorOfNodeById(nodeId, "#DDDDDD", true, nodeData.originalColor);
                    }
                }
            });
        }
        
        // Second pass: apply colors to region nodes to ensure they aren't overridden
        console.log("Applying final colors to region nodes");
        for (const [nodeId, originalColor] of regionNodeColors) {
            console.log("Final coloring for region node:", nodeId, "color:", originalColor);
            this.classvizManager.changeColorOfNodeById(nodeId, originalColor, false);
        }
    }

    highlightKeyNode() {
        console.log("Highlighting key nodes");
        
        const keyNodeColors = new Map(); // Store key node color information
        
        // First pass: process all nodes and collect key node colors
        for (const [threadName, nodes] of this.classvizManager.threadToMethodNodesInOrder.entries()) {
            nodes.forEach(node => {
                const nodeId = node.originalId;
                const nodeData = this.data.getNodeDataByThreadAndId(threadName, nodeId);

                const isKeyNode = nodeData && (
                    nodeData.status.fanOut ||
                    nodeData.status.implementationEntryPoint ||
                    nodeData.status.recursiveEntryPoint
                );

                if (isKeyNode) {
                    console.log("Collecting key node:", nodeId);
                    // Store key node color information for later application
                    keyNodeColors.set(nodeId, nodeData.originalColor);
                } else if (nodeData) {
                    console.log("Dimming non-key node:", nodeId);
                    // Dim non-key nodes
                    this.classvizManager.changeColorOfNodeById(nodeId, "#DDDDDD", true, nodeData.originalColor);
                }
            });
        }
        
        // Second pass: apply colors to key nodes to ensure they aren't overridden
        console.log("Applying final colors to key nodes");
        for (const [nodeId, originalColor] of keyNodeColors) {
            console.log("Final coloring for key node:", nodeId, "color:", originalColor);
            this.classvizManager.changeColorOfNodeById(nodeId, originalColor, false);
        }
    }

    getRegionIdSet(regionId) {
        const region = this.explainer.regions.get(regionId).data;
        const idSet = new Set();

        const traverseSubTree = (node) => {
            if (!node || !node.id) return;
            idSet.add(node.id);
            if (node.children) {
                node.children.forEach(child => traverseSubTree(child));
            }
        };

        traverseSubTree(region);
        return idSet;
    }

    resetNodeColours() {
        for (const [threadName, nodes] of this.classvizManager.threadToMethodNodesInOrder.entries()) {
            nodes.forEach(node => {
                const nodeId = node.originalId;
                const nodeData = this.data.getNodeDataByThreadAndId(threadName, nodeId);

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