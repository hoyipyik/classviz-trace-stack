export class RegionFocusManager {
    constructor(eventBus, data, classvizManager, explainer) {
        this.classvizManager = classvizManager;
        this.data = data;
        this.eventBus = eventBus;
        this.explainer = explainer;
        this.currentSelectedTreeId = null;
        this.currentSelectedRegionId = null;
        this.regionFocusMode = false;

        if (this.eventBus) {
           
            this.eventBus.subscribe('hightlightFocus', ({
                enabled, highlightRegion, regionId
            }) => {
                this.stopStepByStepMode();
                if (highlightRegion) {
                    // region 
                    this.highlightRegion(enabled, regionId);
                } else {
                    // key node
                    this.highlightKeyNode(enabled);
                }
            });

        }
    }

    stopStepByStepMode() {
        this.eventBus.publish('stopStepByStepMode');
        this.eventBus.publish('changeClassvizFocus');
    }

    highlightRegion(enabled, regionId) {
        if (enabled) {
            const regionIdSet = this._getRegionIdSet(regionId);
            for (const [threadName, nodes] of this.classvizManager.threadToMethodNodesInOrder.entries()) {
                nodes.forEach(node => {
                    const nodeId = node.originalId;
                    const nodeData = this.data.getNodeDataByThreadAndId(threadName, nodeId);

                    if (nodeData && regionIdSet.has(nodeData.id)) {
                        this.classvizManager.changeColorOfNodeById(
                            nodeId,
                            nodeData.originalColor,
                            false
                        );
                    } else {
                        this.classvizManager.changeColorOfNodeById(
                            nodeId,
                            "#DDDDDD",
                            true,
                            nodeData.originalColor
                        );
                    }
                });
            }
        } else {
             this.eventBus.publish('stopStepByStepMode');
        }
    }

    highlightKeyNode(enabled) {
        // Logic to highlight a key node
        if (enabled) {
            for (const [threadName, nodes] of this.classvizManager.threadToMethodNodesInOrder.entries()) {
                nodes.forEach(node => {
                    const nodeId = node.originalId;
                    const nodeData = this.data.getNodeDataByThreadAndId(threadName, nodeId);
                    console.log("nodeData", nodeData, nodeId, threadName);
                    if (nodeData && (nodeData.status.fanOut ||
                        nodeData.status.implementationEntryPoint ||
                        nodeData.status.recursiveEntryPoint)
                    ) {
                        this.classvizManager.changeColorOfNodeById(
                            nodeId,
                            nodeData.originalColor,
                            false
                        );
                    } else {
                        this.classvizManager.changeColorOfNodeById(
                            nodeId,
                            "#DDDDDD",
                            true,
                            nodeData.originalColor
                        );
                    }
                });
            }
        } else {
           this.eventBus.publish('stopStepByStepMode');
        }
    }

    _getRegionIdSet(regionId) {
        const region = this.explainer.regions.get(regionId).data;
        const set = new Set();
        const traverseSubTree = (node, set) => {
            if (!node || !node.id) return;
            set.add(node.id);
            if (node.children) {
                node.children.forEach(child => traverseSubTree(child, set));
            }
        }
        traverseSubTree(region, set);
        return set;
    }
}