/**
 * Manages region and tree selection state and UI updates
 */
class RegionSelectionManager {
    constructor(explainer, regionFocusManager, eventBus, contentRenderer) {
        this.explainer = explainer;
        this.regionFocusManager = regionFocusManager;
        this.eventBus = eventBus;
        this.contentRenderer = contentRenderer;
    }

    setupSelectors(treeSelector, regionSelector, summaryElements) {
        this.treeSelector = treeSelector;
        this.regionSelector = regionSelector;
        this.summaryElements = summaryElements;
    }

    loadExplanations() {
        const trees = this.explainer.selectedTrees;
        this.treeSelector.innerHTML = '';

        if (trees.size === 0) {
            alert("No trees found. Please make sure there are selected trees before explaining.");
            return false;
        }

        for (const [treeId, treeData] of trees.entries()) {
            const option = document.createElement('option');
            option.value = treeId;
            const treeLabel = treeData.tree ? treeData.tree.label || `Tree ${treeId}` : `Tree ${treeId}`;
            option.textContent = `${treeLabel} (ID: ${treeId})`;
            this.treeSelector.appendChild(option);
        }

        this.regionFocusManager.currentSelectedTreeId = this.treeSelector.options[0].value;
        return true;
    }

    loadRegionsForTree() {
        if (!this.regionFocusManager.currentSelectedTreeId) return;

        this.regionSelector.innerHTML = '';

        const regionIds = this.explainer.traceToRegion.get(this.regionFocusManager.currentSelectedTreeId) || [];

        const wholeTraceOption = document.createElement('option');
        wholeTraceOption.value = "whole_trace";
        wholeTraceOption.textContent = "Whole Trace";
        this.regionSelector.appendChild(wholeTraceOption);

        if (regionIds.length > 0) {
            const separatorOption = document.createElement('option');
            separatorOption.disabled = true;
            separatorOption.textContent = "───────────────";
            this.regionSelector.appendChild(separatorOption);
        }

        for (const regionId of regionIds) {
            const regionData = this.explainer.regions.get(regionId);
            if (regionData && regionData.explained) {
                const option = document.createElement('option');
                option.value = regionId;
                const regionLabel = regionData.data ? regionData.data.label || `Region ${regionId}` : `Region ${regionId}`;
                option.textContent = `${regionLabel} (ID: ${regionId})`;
                this.regionSelector.appendChild(option);
            }
        }

        this.regionSelector.value = "whole_trace";
        this.regionFocusManager.currentSelectedRegionId = "whole_trace";
    }

    updateDisplayedData() {
        if (!this.regionFocusManager.currentSelectedTreeId) return;
        this.summaryElements.regionSummarySection.style.display = 'none';
        this.updateDisplayedTreeData();
    }

    updateDisplayedTreeData() {
        if (!this.regionFocusManager.currentSelectedTreeId) return;

        const treeData = this.explainer.selectedTrees.get(this.regionFocusManager.currentSelectedTreeId);
        if (!treeData) return;

        const quickSummary = this.contentRenderer.formatExplanationData(treeData.explanation.quickSummary);
        if (quickSummary) {
            this.contentRenderer.renderSummarySection(this.summaryElements.quickSummaryContent, quickSummary);
            this.summaryElements.quickSummarySection.style.display = 'block';
            this.summaryElements.quickSummaryContentWrapper.style.display = 'block';
        } else {
            this.summaryElements.quickSummarySection.style.display = 'none';
        }

        const detailedSummary = this.contentRenderer.formatExplanationData(treeData.explanation.summaryAfterThinking);
        if (detailedSummary) {
            this.contentRenderer.renderSummarySection(this.summaryElements.detailedSummaryContent, detailedSummary);
            this.summaryElements.detailedSummarySection.style.display = 'block';
            this.summaryElements.detailedSummaryContentWrapper.style.display = 'block';
        } else {
            this.summaryElements.detailedSummarySection.style.display = 'none';
        }
    }

    updateDisplayedRegionData() {
        if (!this.regionFocusManager.currentSelectedRegionId) {
            this.summaryElements.regionSummarySection.style.display = 'none';
            return;
        }

        if (this.regionFocusManager.currentSelectedRegionId === "whole_trace") {
            this.updateDisplayedTreeData();
            this.summaryElements.regionSummarySection.style.display = 'none';
            return;
        }

        const regionData = this.explainer.regions.get(this.regionFocusManager.currentSelectedRegionId);
        if (!regionData || !regionData.explained) {
            this.summaryElements.regionSummarySection.style.display = 'none';
            return;
        }

        const regionSummary = {
            briefSummary: regionData.briefSummary || '',
            flowRepresentation: regionData.flowRepresentation || '',
            detailedBehaviour: regionData.detailedBehaviour || ''
        };

        this.contentRenderer.renderSummarySection(this.summaryElements.regionSummaryContent, regionSummary);
        this.summaryElements.regionSummarySection.style.display = 'block';
        this.summaryElements.regionSummaryContentWrapper.style.display = 'block';
        this.summaryElements.quickSummarySection.style.display = 'none';
        this.summaryElements.detailedSummarySection.style.display = 'none';
    }

    handleRegionFocus(focusedRegionId) {
        if (!focusedRegionId) return;

        const regionData = this.explainer.regions.get(focusedRegionId);
        if (!regionData || !regionData.explained) {
            this.eventBus.publish('refreshRegionFocus', { stopStepByStepMode: false });
            return;
        }

        let foundTreeId = null;
        for (const [treeId, regionIds] of this.explainer.traceToRegion.entries()) {
            if (regionIds.includes(focusedRegionId)) {
                foundTreeId = treeId;
                break;
            }
        }

        if (!foundTreeId) {
            console.warn(`Could not find tree containing region ${focusedRegionId}`);
            return;
        }

        if (foundTreeId !== this.regionFocusManager.currentSelectedTreeId) {
            this.regionFocusManager.currentSelectedTreeId = foundTreeId;
            this.treeSelector.value = foundTreeId;
            this.loadRegionsForTree();
        }

        this.regionSelector.value = focusedRegionId;
        this.regionFocusManager.currentSelectedRegionId = focusedRegionId;
        this.updateDisplayedRegionData();
        this.eventBus.publish('refreshRegionFocus', { stopStepByStepMode: true });
    }
}

export { RegionSelectionManager };