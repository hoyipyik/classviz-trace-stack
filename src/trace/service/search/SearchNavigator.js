
/**
 * Search navigation functionality
 */
export class SearchNavigator {
    constructor(search) {
        this.search = search;
        this.eventBus = search.eventBus;
    }

    /**
     * Navigate to next search result
     */
    navigateNext() {
        if (this.search.searchResults.length === 0) return;
        this.search.currentResultIndex = (this.search.currentResultIndex + 1) % this.search.searchResults.length;
        this.navigateToCurrentResult(this.search.highlightAll);
        this.eventBus.publish('controlTraceDiagram', { on: true });
    }

    /**
     * Navigate to previous search result
     */
    navigatePrev() {
        if (this.search.searchResults.length === 0) return;
        this.search.currentResultIndex = (this.search.currentResultIndex - 1 + this.search.searchResults.length) % this.search.searchResults.length;
        this.navigateToCurrentResult(this.search.highlightAll);
    }

    /**
     * Navigate to the current search result
     */
    navigateToCurrentResult(preserveOtherHighlights = false) {
        if (this.search.searchResults.length === 0 || this.search.currentResultIndex < 0) return;

        const result = this.search.searchResults[this.search.currentResultIndex];
        const nodeId = result.id;
        const resultThreadName = result.threadName;
        const currentThreadName = this.search.data.getCurrentThreadName();

        let threadSwitched = false;
        if (resultThreadName !== currentThreadName) {
            this.search.data.switchThread(resultThreadName);
            this.search.view.renderTree();
            this.search.updateCounters();

            if (this.search.highlightAll) {
                this.search.highlighter.highlightAllResults();
            }
            threadSwitched = true;
        }

        this.search.view.ensureNodeVisible(nodeId);

        const shouldPreserveHighlights = this.search.highlightAll || preserveOtherHighlights;
        this.search.highlighter.applyHighlighting(nodeId, shouldPreserveHighlights, threadSwitched);

        this.search.data.setCurrent(nodeId);
        console.log("!!!!focus changed, start lassviz focus change event")
        this.search.eventBus.publish('changeCurrentFocusedNodeForStepByStep', { nodeId: nodeId });
        this.search.eventBus.publish('changeClassvizFocus', { nodeId: nodeId });
        this.search.view.updateCurrentNodeFocusUI(nodeId);
        this.search.view.updateCurrentMethodDisplay(result.data.label);

        this.search.updateResultsDisplay();

        if (threadSwitched) {
            setTimeout(() => this.search.view.scrollToNode(nodeId), 100);
        } else {
            this.search.view.scrollToNode(nodeId);
        }
    }

    /**
     * Reset search position to first result in current thread
     */
    resetToFirstResultInCurrentThread() {
        if (this.search.searchResults.length === 0) return;

        this.search.updateCounters();
        const currentThreadName = this.search.data.getCurrentThreadName();
        const firstResultIndex = this.search.searchResults.findIndex(
            result => result.threadName === currentThreadName
        );

        if (firstResultIndex >= 0) {
            this.search.currentResultIndex = firstResultIndex - 1;
            this.navigateNext();
        } else {
            this.search.currentResultIndex = -1;
            this.search.updateResultsDisplay();
        }
    }
}
