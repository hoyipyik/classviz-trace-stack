import { ExplanationStorage } from "./explain/ExplanationStorage.js";
import { RecursiveCallProcessor } from "./explain/RecursiveCallProcessor.js";
import { RegionManager } from "./explain/RegionManager.js";
import { TreeBuilder } from "./explain/TreeBuilder.js";

class Explainer {
    constructor(dataStore, eventBus, aiService) {
        this.quickMode = false;
        this.parallel = true;

        this.data = dataStore;
        this.eventBus = eventBus;
        this.aiService = aiService;

        // Core data structures
        this.selectedTrees = new Map(); // entry method original Id -> { tree: tree data, KNT: KNT, explanation: { quickSummary: "", summaryAfterThinking: ""}, threadName: "" }
        this.traceToRegion = new Map(); // entry original id of a trace -> [region entry original id]

        // Components
        this.storage = new ExplanationStorage(eventBus);
        this.treeBuilder = new TreeBuilder();
        this.recursiveProcessor = new RecursiveCallProcessor();
        this.regionManager = new RegionManager();
    }

    // ============================================================
    // Getter methods for backward compatibility
    // ============================================================
    get regions() {
        return this.regionManager.regions;
    }

    // Legacy method for backward compatibility
    async explainCurrentRegion(regionId) {
        return await this.regionManager.explainRegion(regionId, this.aiService);
    }

    // ============================================================
    // Storage delegation methods
    // ============================================================
    saveToLocalStorage() {
        return this.storage.save(this.selectedTrees, this.traceToRegion, this.regionManager.regions);
    }

    loadFromLocalStorage(timestamp) {
        const result = this.storage.load(timestamp);
        if (result.success) {
            this.selectedTrees = result.data.selectedTrees;
            this.traceToRegion = result.data.traceToRegion;
            this.regionManager.regions = result.data.regions;
        }
        return result;
    }

    getSavedExplanations() {
        return this.storage.getSavedExplanations();
    }

    deleteSavedExplanation(timestamp) {
        return this.storage.delete(timestamp);
    }

    // ============================================================
    // Main API Methods
    // ============================================================
    buildSelectedTrees() {
        this.selectedTrees.clear();
        this.regionManager.regions.clear();
        this.traceToRegion.clear();

        const threadsData = this.data.threadsData;

        Object.entries(threadsData).forEach(([threadName, threadData]) => {
            const selectedRoots = this.treeBuilder.findSelectedRoots(threadData);

            selectedRoots.forEach(rootNode => {
                const tree = this.treeBuilder.buildSelectedSubtree(rootNode);
                if (!tree) return;

                this.recursiveProcessor.compressRecursiveCalls(tree);
                const knt = this.treeBuilder.buildKNT(tree);

                this.selectedTrees.set(rootNode.id, {
                    tree: tree,
                    KNT: knt,
                    explanation: {
                        quickSummary: "",
                        summaryAfterThinking: ""
                    },
                    threadName: threadName
                });

                const currentTraceRegionIds = [];
                this.regionManager.identifyRegions(tree, rootNode.id, currentTraceRegionIds);
                this.traceToRegion.set(rootNode.id, currentTraceRegionIds);
            });
        });

        console.log(`Built ${this.selectedTrees.size} selected trees, ${this.regionManager.regions.size} regions, and ${this.traceToRegion.size} trace-to-region mappings.`);

        if (this.eventBus) {
            this.eventBus.publish('selectedTreesBuilt', {
                treeCount: this.selectedTrees.size,
                regionCount: this.regionManager.regions.size,
                traceToRegionCount: this.traceToRegion.size
            });
        }

        return {
            trees: this.selectedTrees,
            regions: this.regionManager.regions,
            traceToRegion: this.traceToRegion
        };
    }

    async explainSelectedTraces(config = { quickMode: true, parallel: true }) {
        this.buildSelectedTrees();
        let backData = null;

        if (config.quickMode) {
            backData = await this._performQuickExplanation({ parallel: config.parallel });
        } else {
            backData = await this._performDetailedExplanation({
                parallelTraces: config.parallel,
                parallelRegions: config.parallel
            });
        }

        this.eventBus.publish('explanationCompleted', { backData });
        return backData;
    }

    // ============================================================
    // Private explanation methods
    // ============================================================
    async _performQuickExplanation(config = { parallel: false }) {
        console.log(`Starting quick mode explanation in ${config.parallel ? 'PARALLEL' : 'SEQUENTIAL'} mode...`);

        if (config.parallel) {
            const explanationPromises = Array.from(this.selectedTrees.entries()).map(async ([treeId, treeData]) => {
                if (treeData.KNT) {
                    try {
                        const cleanKNT = this._removeStatusFromData(treeData.KNT);
                        const explanationResult = await this.aiService.explainPureKNT(cleanKNT);
                        treeData.explanation.quickSummary = explanationResult;
                        console.log(`Completed quick explanation for tree ${treeId}.`);
                    } catch (error) {
                        console.error(`Error during aiExplainPureKNT for KNT of tree ${treeId}:`, error);
                        treeData.explanation.quickSummary = `Error: Quick explanation failed - ${error.message}`;
                    }
                } else {
                    console.warn(`No KNT found for tree ${treeId}. Skipping quick explanation.`);
                    treeData.explanation.quickSummary = "No KNT available for quick explanation.";
                }
            });

            await Promise.all(explanationPromises);
        } else {
            for (const [treeId, treeData] of this.selectedTrees.entries()) {
                if (treeData.KNT) {
                    try {
                        const cleanKNT = this._removeStatusFromData(treeData.KNT);
                        const explanationResult = await this.aiService.explainPureKNT(cleanKNT);
                        treeData.explanation.quickSummary = explanationResult;
                    } catch (error) {
                        console.error(`Error during aiExplainPureKNT for KNT of tree ${treeId}:`, error);
                        treeData.explanation.quickSummary = `Error: Quick explanation failed - ${error.message}`;
                    }
                } else {
                    console.warn(`No KNT found for tree ${treeId}. Skipping quick explanation.`);
                    treeData.explanation.quickSummary = "No KNT available for quick explanation.";
                }
            }
        }

        console.log("Quick mode explanation finished.");

        return {
            trees: this.selectedTrees,
            regions: this.regionManager.regions,
            explanationStatus: "Quick explanation complete"
        };
    }

    async _performDetailedExplanation(config = {
        parallelTraces: false,
        parallelRegions: false
    }) {
        console.log("Starting detailed mode explanation...");

        if (config.parallelTraces) {
            const tracePromises = Array.from(this.traceToRegion.entries()).map(async ([traceId, regionIds]) => {
                console.log(`\nStarting to process Trace ID: ${traceId}`);

                if (config.parallelRegions) {
                    await Promise.all(regionIds.map(regionId => this.regionManager.explainRegion(regionId, this.aiService)));
                } else {
                    for (const regionId of regionIds) {
                        await this.regionManager.explainRegion(regionId, this.aiService);
                    }
                }

                await this._generateConsolidatedExplanation(traceId);
            });

            await Promise.all(tracePromises);
        } else {
            for (const [traceId, regionIds] of this.traceToRegion.entries()) {
                console.log(`\nProcessing Trace ID: ${traceId}`);

                if (config.parallelRegions) {
                    await Promise.all(regionIds.map(regionId => this.regionManager.explainRegion(regionId, this.aiService)));
                } else {
                    for (const regionId of regionIds) {
                        await this.regionManager.explainRegion(regionId, this.aiService);
                    }
                }

                await this._generateConsolidatedExplanation(traceId);
            }
        }

        console.log("\nDetailed mode explanation finished for all traces.");

        return {
            trees: this.selectedTrees,
            regions: this.regionManager.regions,
            explanationStatus: "Detailed explanation complete"
        };
    }

    async _generateConsolidatedExplanation(traceId) {
        const selectedTreeData = this.selectedTrees.get(traceId);
        if (selectedTreeData && selectedTreeData.KNT) {
            console.log(`  Generating consolidated explanation for trace ${traceId}...`);
            try {
                const augmentedKNT = JSON.parse(JSON.stringify(selectedTreeData.KNT));
                const cleanedAugmentedKNT = this._removeStatusFromData(augmentedKNT);
                this.regionManager.augmentKNTWithRegionSummaries(cleanedAugmentedKNT);

                selectedTreeData.explanation.summaryAfterThinking = await this.aiService.explainKNTWithData(cleanedAugmentedKNT);
                console.log(`  Successfully generated detailed explanation for trace ${traceId}.`);
            } catch (error) {
                console.error(`  Error during aiExplainKNTWithData for trace ${traceId}:`, error);
                selectedTreeData.explanation.summaryAfterThinking = `Error: Detailed trace explanation failed - ${error.message}`;
            }
        } else {
            if (selectedTreeData) {
                selectedTreeData.explanation.summaryAfterThinking = "No KNT available for detailed explanation.";
            }
            console.warn(`  No KNT found for trace ${traceId}. Skipping consolidated trace explanation.`);
        }
    }

    _removeStatusFromData(nodeData) {
        return this.regionManager._removeStatusFromData(nodeData);
    }
}

export { Explainer, ExplanationStorage, TreeBuilder, RecursiveCallProcessor, RegionManager };