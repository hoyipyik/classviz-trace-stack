// ============================================================
// Region Manager - Handles region identification and processing
// ============================================================
class RegionManager {
    constructor() {
        this.regions = new Map(); // entry special method original Id -> { data: subtree, explained: false, detailedBehaviour: "", flowRepresentation: "", briefSummary: "" }
    }

    identifyRegions(tree, traceId, regionIdCollector) {
        if (!tree) return;

        const processNodeForRegion = (node, isNodeSpecialRoot, currentTraceId, collector) => {
            if (!node) return;
            const isSpecial = this._isSpecialNode(node, isNodeSpecialRoot);

            if (isSpecial) {
                if (node.children && node.children.length > 0) {
                    const regionData = this._extractRegion(node);
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

    async explainRegion(regionId, aiService) {
        const region = this.regions.get(regionId);
        if (region && !region.explained) {
            try {
                const cleanData = this._removeStatusFromData(region.data);
                const explanationResult = await aiService.explainRegion(cleanData);

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

    augmentKNTWithRegionSummaries(kntNode) {
        if (!kntNode) return;

        const regionInfo = this.regions.get(kntNode.id);
        if (regionInfo && regionInfo.explained && regionInfo.briefSummary) {
            kntNode.description = regionInfo.briefSummary;
        }

        if (kntNode.children && kntNode.children.length > 0) {
            kntNode.children.forEach(child => this.augmentKNTWithRegionSummaries(child));
        }
    }

    _extractRegion(rootNodeOfRegion) {
        if (!rootNodeOfRegion) return null;

        const regionRootCopy = this._createEssentialNode(rootNodeOfRegion);

        const copyNodesUntilSpecial = (originalParentNode, regionParentCopy) => {
            if (!originalParentNode.children) return;
            for (const originalChild of originalParentNode.children) {
                if (!originalChild) continue;

                const childCopy = this._createEssentialNode(originalChild);

                regionParentCopy.children.push(childCopy);
                if (!this._isSpecialNode(originalChild) && originalChild.children && originalChild.children.length > 0) {
                    copyNodesUntilSpecial(originalChild, childCopy);
                }
            }
        };

        copyNodesUntilSpecial(rootNodeOfRegion, regionRootCopy);
        return regionRootCopy;
    }

    _isSpecialNode(node, isTreeRoot = false) {
        if (isTreeRoot) return true;
        return node.status && (
            node.status.fanOut === true ||
            node.status.implementationEntryPoint === true ||
            node.status.recursiveEntryPoint === true
        );
    }

    _createEssentialNode(originalNode, preserveStatus = true) {
        const newNode = {
            id: originalNode.id,
            label: originalNode.label,
            description: originalNode.description,
            children: []
        };

        if (preserveStatus && originalNode.status) {
            newNode.status = { ...originalNode.status };
        }

        if (originalNode.freq !== undefined) {
            newNode.freq = originalNode.freq;
        }

        if (originalNode.isExit === true) {
            newNode.isExit = true;
        }

        if (originalNode.compressed === true) {
            newNode.compressed = true;
        }

        return newNode;
    }

    _removeStatusFromData(nodeData) {
        if (!nodeData) return null;

        const cleanNode = (node) => {
            const cleanedNode = {
                id: node.id,
                label: node.label,
                description: node.description,
                children: []
            };

            if (node.freq !== undefined) {
                cleanedNode.freq = node.freq;
            }

            if (node.isExit === true) {
                cleanedNode.isExit = true;
            }

            if (node.compressed === true) {
                cleanedNode.compressed = true;
            }

            if (node.briefSummary) {
                cleanedNode.briefSummary = node.briefSummary;
            }

            if (node.isSpecialNode === true) {
                cleanedNode.isSpecialNode = true;
            }

            if (node.children && node.children.length > 0) {
                node.children.forEach(child => {
                    if (child) {
                        cleanedNode.children.push(cleanNode(child));
                    }
                });
            }

            return cleanedNode;
        };

        return cleanNode(nodeData);
    }
}

export { RegionManager }