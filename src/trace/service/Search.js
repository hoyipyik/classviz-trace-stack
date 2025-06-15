import { SearchEventManager } from "./search/SearchEventManager.js";
import { SearchHighlighter } from "./search/SearchHighlighter.js";
import { SearchNavigator } from "./search/SearchNavigator.js";
import { SearchUIController } from "./search/SearchUIController.js";

class Search {
  constructor(dataStore, renderer, eventBus, viewSwitcher) {
    // Data store reference
    this.data = dataStore;

    // Renderer reference
    this.view = renderer;
    this.viewSwitcher = viewSwitcher;

    // Search state
    this.searchResults = [];
    this.currentResultIndex = -1;

    // Results counters
    this.totalResultsCount = 0;
    this.currentThreadResultsCount = 0;

    // Highlight all flag
    this.highlightAll = false;

    // event bus
    this.eventBus = eventBus;

    // Initialize helper classes
    this.eventManager = new SearchEventManager(this);
    this.highlighter = new SearchHighlighter(this);
    this.navigator = new SearchNavigator(this);
    this.uiController = new SearchUIController(this);

    // Keep old API compatibility
    this.eventListenersInitialized = false;

    this.eventBus.subscribe('nodeCompressionTriggered', () => {
      const searchInput = document.getElementById('searchInput');
      if (searchInput && searchInput.value && searchInput.value.trim() !== '') {
        this.find(searchInput.value)
      }
    });

    this.eventBus.subscribe('fuzzySearchFromDetailedBehaviour', ({ name, threadName }) => {
      this.switchThreadUI(threadName);
      this.data.switchThread(threadName);
      this.view.renderTree();

      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        searchInput.value = name;
        this.find(searchInput.value);
      }

      this.resetToFirstResultInCurrentThread();
      this.toggleStepByStepMode(true);
      this.eventBus.publish('switchStepByStepMode', {flag: true});

      if (this.highlightAll) {
        setTimeout(() => {
          this.highlighter.clearAllHighlights();
          this.highlighter.highlightAllResults();
        }, 200);
      }
    })
  }

  // ========================================
  // OLD API COMPATIBILITY - Delegate to helper classes
  // ========================================

  setupSearch() {
    this.eventManager.setupSearch();
    this.eventListenersInitialized = this.eventManager.eventListenersInitialized;
  }

  cleanupEventListeners() {
    this.eventManager.cleanupEventListeners();
    this.eventListenersInitialized = this.eventManager.eventListenersInitialized;
  }

  navigateNext() {
    this.navigator.navigateNext();
  }

  navigatePrev() {
    this.navigator.navigatePrev();
  }

  navigateToCurrentResult(preserveOtherHighlights = false) {
    this.navigator.navigateToCurrentResult(preserveOtherHighlights);
  }

  resetToFirstResultInCurrentThread() {
    this.navigator.resetToFirstResultInCurrentThread();
  }

  highlightAllResults() {
    this.highlighter.highlightAllResults();
  }

  applyHighlighting(nodeId, preserveOtherHighlights, threadSwitched) {
    this.highlighter.applyHighlighting(nodeId, preserveOtherHighlights, threadSwitched);
  }

  clearHighlights() {
    this.highlighter.clearHighlights();
  }

  clearAllHighlights() {
    this.highlighter.clearAllHighlights();
  }

  switchThreadUI(threadName) {
    return this.uiController.switchThreadUI(threadName);
  }

  toggleStepByStepMode(enabled) {
    return this.uiController.toggleStepByStepMode(enabled);
  }

  updateResultsDisplay(threadName = null) {
    this.uiController.updateResultsDisplay(threadName);
  }

  // ========================================
  // CORE SEARCH FUNCTIONALITY - Keep in main class
  // ========================================

  /**
   * Search nodes across all threads, prioritizing current thread results
   */
  searchNodes(query) {
    const currentThreadResults = [];
    const otherThreadResults = [];
    const currentThreadName = this.data.getCurrentThreadName();

    this.data.nodes.forEach((nodeInfo, nodeId) => {
      const nodeData = nodeInfo.data;
      const nodeLabel = nodeData.label || '';

      if (nodeLabel.toLowerCase().includes(query)) {
        const threadName = this.data.getThreadForNodeId(nodeId);
        const resultItem = {
          id: nodeId,
          data: nodeData,
          ancestors: this.data.getAncestorIds(nodeId),
          threadName: threadName
        };

        (threadName === currentThreadName ? currentThreadResults : otherThreadResults).push(resultItem);
      }
    });

    return [...currentThreadResults, ...otherThreadResults];
  }

  /**
   * Execute a search with the given query
   */
  find(query) {
    if (this.data.currentViewMode !== 'callTree') {
      this.viewSwitcher.switchViewMode('callTree');
      this.viewSwitcher.switchTabActive('callTree');
    }

    this.clearSearch();

    if (!query || query.trim() === '') {
      this.updateResultsDisplay();
      return [];
    }

    this.searchResults = this.searchNodes(query.toLowerCase());
    this.currentResultIndex = -1;
    this.updateCounters();

    if (this.highlightAll) {
      this.highlighter.highlightAllResults();
    }

    if (this.searchResults.length > 0) {
      this.navigateNext();
    }

    this.updateResultsDisplay();
    this.publishSearchEvent();

    return this.searchResults;
  }

  /**
   * Clear all search results and highlights
   */
  clearSearch() {
    this.highlighter.clearAllHighlights();
    this.searchResults = [];
    this.currentResultIndex = -1;
    this.totalResultsCount = 0;
    this.currentThreadResultsCount = 0;
    this.updateResultsDisplay();
    this.publishSearchEvent();
  }

  /**
   * Update search result counters
   */
  updateCounters() {
    this.totalResultsCount = this.searchResults.length;
    const currentThread = this.data.getCurrentThreadName();
    this.currentThreadResultsCount = this.searchResults.filter(
      result => result.threadName === currentThread
    ).length;
  }

  /**
   * Publish search results event
   */
  publishSearchEvent() {
    if (this.eventBus) {
      this.eventBus.publish('searchResultsChanged', {
        searchResults: this.searchResults,
        totalResultsCount: this.totalResultsCount,
        currentThreadResultsCount: this.currentThreadResultsCount
      });
    }
  }
}

// Export classes
export { Search };