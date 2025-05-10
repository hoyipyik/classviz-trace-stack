class Explainer {
    constructor(dataStore, eventBus, aiService) {
        this.data = dataStore;
        this.eventBus = eventBus;
        this.aiService = aiService;

        this.selectedTrees = new Map(); // entry method original Id -> { tree: tree data, KNT: KNT, explanation: { highlevelSummary: "", moreDetailedSummary: ""} }
        this.traceToRegion = new Map(); // entry original id of a trace -> [region entry original id]
        this.regions = new Map(); // entry special method original Id -> { data: subtree, explained: false, detailedBehaviour: "", flowRepresentation: "", briefSummary: "" }
    }

    // ============================================================
    // Main Public API Methods
    // ============================================================

    buildSelectedTrees() {
        // Clear existing data
        this.selectedTrees.clear();
        this.regions.clear();
        this.traceToRegion.clear();

        const threadsData = this.data.threadsData;

        Object.entries(threadsData).forEach(([threadName, threadData]) => {
            const selectedRoots = this.findSelectedRoots(threadData);

            selectedRoots.forEach(rootNode => {
                const tree = this.buildSelectedSubtree(rootNode);
                if (!tree) return;

                this.compressRecursiveCalls(tree);
                const knt = this.buildKNT(tree);

                this.selectedTrees.set(rootNode.id, {
                    tree: tree,
                    KNT: knt,
                    explanation: {
                        highlevelSummary: "",
                        moreDetailedSummary: ""
                    }
                });

                // Identify regions and populate traceToRegion mapping
                const currentTraceRegionIds = [];
                this.identifyRegions(tree, rootNode.id, currentTraceRegionIds);
                this.traceToRegion.set(rootNode.id, currentTraceRegionIds);
            });
        });

        console.log(`Built ${this.selectedTrees.size} selected trees, ${this.regions.size} regions, and ${this.traceToRegion.size} trace-to-region mappings.`);

        if (this.eventBus) {
            this.eventBus.publish('selectedTreesBuilt', {
                treeCount: this.selectedTrees.size,
                regionCount: this.regions.size,
                traceToRegionCount: this.traceToRegion.size
            });
        }

        return {
            trees: this.selectedTrees,
            regions: this.regions,
            traceToRegion: this.traceToRegion
        };
    }

    async explainSelectedTraces(config = { quickMode: false }) {
        this.buildSelectedTrees(); // Ensures all necessary data structures are populated

        if (config.quickMode) {
            return await this.performQuickExplanation();
        } else {
            return await this.performDetailedExplanation();
        }
    }

    async explainCurrentRegion(regionId) {
        const region = this.regions.get(regionId);
        if (region && !region.explained) {
            try {
                const explanationResult = await this.aiService.explainRegion(region.data); // External AI function

                region.briefSummary = explanationResult.briefSummary || "";
                region.detailedBehaviour = explanationResult.detailedBehaviour || "";
                region.flowRepresentation = explanationResult.flowRepresentation || "";
                region.explained = true;
            } catch (error) {
                console.error(`    Error explaining Region ID: ${regionId}:`, error);
                region.briefSummary = `Error explaining region: ${error.message}`;
            }
        } else if (region && region.explained) {
            console.log(`    Region ID: ${regionId} has already been explained. Skipping.`);
        } else {
            console.warn(`    Region ID: ${regionId} not found for explanation.`);
        }
    }

    // ============================================================
    // Explanation Processing Methods
    // ============================================================
    
    async performQuickExplanation() {
        console.log("Starting quick mode explanation...");
        for (const [treeId, treeData] of this.selectedTrees.entries()) {
            if (treeData.KNT) {
                try {
                    const explanationResult = await this.aiService.explainPureKNT(treeData.KNT); // External AI function
                    treeData.explanation.highlevelSummary = explanationResult;
                } catch (error) {
                    console.error(`Error during aiExplainPureKNT for KNT of tree ${treeId}:`, error);
                    treeData.explanation.highlevelSummary = `Error: Quick explanation failed - ${error.message}`;
                }
            } else {
                console.warn(`No KNT found for tree ${treeId}. Skipping quick explanation.`);
                treeData.explanation.highlevelSummary = "No KNT available for quick explanation.";
            }
        }
        console.log("Quick mode explanation finished.");
        
        return {
            trees: this.selectedTrees,
            regions: this.regions,
            explanationStatus: "Quick explanation complete"
        };
    }
    
    async performDetailedExplanation() {
        console.log("Starting detailed mode explanation (processing trace by trace)...");
        for (const [traceId, regionIds] of this.traceToRegion.entries()) {
            console.log(`\nProcessing Trace ID: ${traceId}`);
            
            // Step 1: Explain all regions belonging to the current trace
            console.log(`  Explaining regions for trace ${traceId}...`);
            for (const regionId of regionIds) {
                await this.explainCurrentRegion(regionId);
            }
            console.log(`  Finished explaining regions for trace ${traceId}.`);
            
            // Step 2: Explain the trace itself using its KNT and accumulated region summaries
            await this.generateConsolidatedExplanation(traceId);
        }
        console.log("\nDetailed mode explanation finished for all traces.");
        
        return {
            trees: this.selectedTrees,
            regions: this.regions,
            explanationStatus: "Detailed explanation complete"
        };
    }
    
    async generateConsolidatedExplanation(traceId) {
        const selectedTreeData = this.selectedTrees.get(traceId);
        if (selectedTreeData && selectedTreeData.KNT) {
            console.log(`  Generating consolidated explanation for trace ${traceId}...`);
            try {
                const augmentedKNT = JSON.parse(JSON.stringify(selectedTreeData.KNT)); // Deep copy
                this.augmentKNTWithRegionSummaries(augmentedKNT); // Add region summaries to KNT nodes

                selectedTreeData.explanation.moreDetailedSummary = await this.aiService.explainKNTWithData(augmentedKNT); // External AI function
                console.log(`  Successfully generated detailed explanation for trace ${traceId}.`);
            } catch (error) {
                console.error(`  Error during aiExplainKNTWithData for trace ${traceId}:`, error);
                selectedTreeData.explanation.moreDetailedSummary = `Error: Detailed trace explanation failed - ${error.message}`;
            }
        } else {
            if (selectedTreeData) {
                selectedTreeData.explanation.moreDetailedSummary = "No KNT available for detailed explanation.";
            }
            console.warn(`  No KNT found for trace ${traceId}. Skipping consolidated trace explanation.`);
        }
    }

    // ============================================================
    // Tree Building and Processing Methods
    // ============================================================

    findSelectedRoots(threadData) {
        const selectedRoots = [];
        const rootOfThread = threadData;
        if (!rootOfThread) return selectedRoots;
        
        const findRootsRecursive = (node, isAncestorSelected) => {
            if (!node) return;
            const isNodeSelected = node.selected === true;
            if (isNodeSelected && !isAncestorSelected) selectedRoots.push(node);
            if (node.children && node.children.length > 0) {
                node.children.forEach(child => findRootsRecursive(child, isAncestorSelected || isNodeSelected));
            }
        };
        
        findRootsRecursive(rootOfThread, false);
        return selectedRoots;
    }

    buildSelectedSubtree(rootNode) {
        if (!rootNode || rootNode.selected !== true) return null;
        
        const buildRecursive = (originalNode) => {
            const newNode = { ...originalNode };
            newNode.children = [];
            if (originalNode.children && originalNode.children.length > 0) {
                originalNode.children.forEach(child => {
                    if (child.selected === true) {
                        const newChild = buildRecursive(child);
                        if (newChild) newNode.children.push(newChild);
                    }
                });
            }
            return newNode;
        };
        
        return buildRecursive(rootNode);
    }

    buildKNT(tree) {
        if (!tree) return null;
        const kntRoot = this.createKNTNode(tree);
        
        const findSpecialChildrenRecursive = (originalNode, kntParentNode) => {
            if (!originalNode.children) return;
            for (const child of originalNode.children) {
                if (!child) continue;
                if (this.isSpecialNode(child)) {
                    const specialKNTNode = this.createKNTNode(child);
                    kntParentNode.children.push(specialKNTNode);
                    findSpecialChildrenRecursive(child, specialKNTNode);
                } else {
                    findSpecialChildrenRecursive(child, kntParentNode);
                }
            }
        };
        
        findSpecialChildrenRecursive(tree, kntRoot);
        return kntRoot;
    }

    createKNTNode(node) {
        if (!node) return null;
        const kntNode = { ...node };
        kntNode.children = [];
        if (!kntNode.status) kntNode.status = {};
        kntNode.isSpecialNode = true;
        return kntNode;
    }

    // ============================================================
    // Region Identification and Processing Methods
    // ============================================================

    identifyRegions(tree, traceId, regionIdCollector) {
        if (!tree) return;

        const processNodeForRegion = (node, isNodeSpecialRoot, currentTraceId, collector) => {
            if (!node) return;
            const isSpecial = this.isSpecialNode(node, isNodeSpecialRoot);

            if (isSpecial) {
                if (node.children && node.children.length > 0) {
                    const regionData = this.extractRegion(node);
                    if (regionData) {
                        this.regions.set(node.id, {
                            data: regionData,
                            explained: false,
                            detailedBehaviour: "",
                            flowRepresentation: "",
                            briefSummary: ""
                        });
                        collector.push(node.id);
                    }
                }
            }
            if (node.children && node.children.length > 0) {
                node.children.forEach(child => {
                    processNodeForRegion(child, false, currentTraceId, collector);
                });
            }
        };
        
        processNodeForRegion(tree, true, traceId, regionIdCollector);
    }

    extractRegion(rootNodeOfRegion) {
        if (!rootNodeOfRegion) return null;
        const regionRootCopy = { ...rootNodeOfRegion };
        regionRootCopy.children = [];
        
        const copyNodesUntilSpecial = (originalParentNode, regionParentCopy) => {
            if (!originalParentNode.children) return;
            for (const originalChild of originalParentNode.children) {
                if (!originalChild) continue;
                const childCopy = { ...originalChild };
                childCopy.children = [];
                regionParentCopy.children.push(childCopy);
                if (!this.isSpecialNode(originalChild) && originalChild.children && originalChild.children.length > 0) {
                    copyNodesUntilSpecial(originalChild, childCopy);
                }
            }
        };
        
        copyNodesUntilSpecial(rootNodeOfRegion, regionRootCopy);
        return regionRootCopy;
    }

    isSpecialNode(node, isTreeRoot = false) {
        if (isTreeRoot) return true;
        return node.status && (
            node.status.fanOut === true ||
            node.status.implementationEntryPoint === true ||
            node.status.recursiveEntryPoint === true
        );
    }

    // ============================================================
    // Recursive Call Processing Methods
    // ============================================================

    compressRecursiveCalls(tree) {
        if (!tree) return;
        
        const findAndCompressRecursive = (node) => {
            if (!node) return;
            if (node.status && node.status.recursiveEntryPoint === true) {
                this.compressRecursiveNode(node);
            }
            if (node.children && node.children.length > 0) {
                node.children.forEach(child => findAndCompressRecursive(child));
            }
        };
        
        findAndCompressRecursive(tree);
    }

    compressRecursiveNode(node) {
        if (!node || !node.status || !node.status.recursiveEntryPoint) return false;
        const children = node.children || [];
        const recursiveLabel = node.label;
        const mergedDirectChildren = new Map();
        const exitNodes = [];

        const collectNodes = (nodesToScan) => {
            for (const child of nodesToScan) {
                if (!child) continue;
                const isExitNode = (n) => {
                    if (n.label !== recursiveLabel) return false;
                    if (!n.children || n.children.length === 0) return true;
                    for (const childNode of n.children || []) {
                        if (childNode.label === recursiveLabel) return false;
                    }
                    return true;
                };

                if (isExitNode(child)) {
                    const exitNode = JSON.parse(JSON.stringify(child));
                    exitNode.isExit = true;
                    exitNode.parentId = node.id;
                    exitNodes.push(exitNode);
                } else if (child.label === recursiveLabel) {
                    collectNodes(child.children || []);
                } else {
                    const pathSignature = this.generatePathSignature(child, recursiveLabel);
                    const currentNode = JSON.parse(JSON.stringify(child));
                    currentNode.parentId = node.id;

                    if (mergedDirectChildren.has(pathSignature)) {
                        const existingNode = mergedDirectChildren.get(pathSignature);
                        let targetNode, sourceNode;
                        if (parseInt(existingNode.id) < parseInt(currentNode.id)) {
                            targetNode = existingNode; sourceNode = currentNode;
                        } else {
                            targetNode = currentNode; sourceNode = existingNode;
                            mergedDirectChildren.set(pathSignature, targetNode);
                        }
                        targetNode.freq = (targetNode.freq || 1) + (sourceNode.freq || 1);
                    } else {
                        currentNode.freq = currentNode.freq || 1;
                        mergedDirectChildren.set(pathSignature, currentNode);
                    }
                }
            }
        };
        
        collectNodes(children);
        const mergedChildrenArray = Array.from(mergedDirectChildren.values());
        const newChildren = [...mergedChildrenArray, ...exitNodes];
        node.children = newChildren.sort((a, b) => parseInt(a.id) - parseInt(b.id));
        node.compressed = true;
        return true;
    }

    generatePathSignature(node, recursiveLabel) {
        let signature = node.label;
        if (node.children && node.children.length > 0) {
            const childSignatures = [];
            for (const child of node.children) {
                if (child.label === recursiveLabel) continue;
                childSignatures.push(this.generatePathSignature(child, recursiveLabel));
            }
            childSignatures.sort();
            if (childSignatures.length > 0) signature += "[" + childSignatures.join(",") + "]";
        }
        return signature;
    }

    // ============================================================
    // KNT Augmentation Methods
    // ============================================================

    augmentKNTWithRegionSummaries(kntNode) {
        if (!kntNode) return;

        const regionInfo = this.regions.get(kntNode.id); // KNT node ID might correspond to a region ID
        if (regionInfo && regionInfo.explained && regionInfo.briefSummary) {
            kntNode.briefSummary = regionInfo.briefSummary;
        }

        if (kntNode.children && kntNode.children.length > 0) {
            kntNode.children.forEach(child => this.augmentKNTWithRegionSummaries(child));
        }
    }
}

export { Explainer };

// --- Assumed External AI Helper Functions (placeholders) ---
// async function explainPureKNT(KNT) { /* ... */ return `Quick summary for ${KNT.id}`; }
// async function explainRegion(regionData) { /* ... */ return { briefSummary: `Brief for ${regionData.id}`, detailedBehaviour: `Detail for ${regionData.id}`, flowRepresentation: `Flow for ${regionData.id}` }; }
// async function explainKNTWithData(augmentedKNT) { /* ... */ return `Detailed trace summary for ${augmentedKNT.id}`; }