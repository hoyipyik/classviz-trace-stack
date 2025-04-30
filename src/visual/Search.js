// Search.js - Search functionality
/**
 * Search functionality class
 * Responsible for handling search and result navigation
 */
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
  }

  // Set up search functionality
  setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchNextBtn = document.getElementById('searchNext');
    const searchPrevBtn = document.getElementById('searchPrev');
    const highlightAllCheckbox = document.getElementById('highlightAll');

    if (!searchInput || !searchNextBtn || !searchPrevBtn) {
      console.error("Search elements not found!");
      return;
    }

    // Search input event
    searchInput.addEventListener('input', () => {
      this.find(searchInput.value);
    });

    // When search box is cleared
    searchInput.addEventListener('change', () => {
      if (!searchInput.value || searchInput.value.trim() === '') {
        this.clearSearch();
      }
    });

    // Handle blur event
    searchInput.addEventListener('blur', () => {
      if (!searchInput.value || searchInput.value.trim() === '') {
        this.clearSearch();
      }
    });

    // Next result button
    searchNextBtn.addEventListener('click', () => {
      this.navigateNext();
    });

    // Previous result button
    searchPrevBtn.addEventListener('click', () => {
      this.navigatePrev();
    });

    // Highlight all checkbox
    if (highlightAllCheckbox) {
      highlightAllCheckbox.addEventListener('change', () => {
        this.highlightAll = highlightAllCheckbox.checked;

        // If there are search results, update highlighting based on new settings
        if (this.searchResults.length > 0) {
          // First clear all highlights and styles
          this.clearAllHighlights();

          if (this.highlightAll) {
            // Highlight all results
            this.highlightAllResults();
          }

          // Ensure current result is highlighted and visible regardless of highlight all setting
          this.navigateToCurrentResult(true);
        }
      });
    }

    // Keyboard shortcuts
    this._setupKeyboardShortcuts(searchInput);
  }

  /**
   * Setup keyboard shortcuts for search
   * @private
   */
  _setupKeyboardShortcuts(searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (searchInput.value && searchInput.value.trim() !== '') {
          this.navigateNext();
        } else {
          this.clearSearch();
        }
      }

      // Escape key clears search
      if (e.key === 'Escape') {
        searchInput.value = '';
        this.clearSearch();
      }
    });
  }

  /**
   * Search nodes across all threads, prioritizing current thread results
   * @param {string} query - Search query
   * @returns {Array} - Search results with current thread results first
   */
  searchNodes(query) {
    const currentThreadResults = [];
    const otherThreadResults = [];

    // Get current thread name
    const currentThreadName = this.data.getCurrentThreadName();

    // Traverse all nodes in all threads
    this.data.nodes.forEach((nodeInfo, nodeId) => {
      const nodeData = nodeInfo.data;
      const nodeLabel = nodeData.label || '';

      if (nodeLabel.toLowerCase().includes(query)) {
        // Get the thread this node belongs to
        const threadName = this.data.getThreadForNodeId(nodeId);

        const resultItem = {
          id: nodeId,
          data: nodeData,
          ancestors: this.data.getAncestorIds(nodeId),
          threadName: threadName
        };

        // Sort results into current thread and other threads
        if (threadName === currentThreadName) {
          currentThreadResults.push(resultItem);
        } else {
          otherThreadResults.push(resultItem);
        }
      }
    });

    // Combine results with current thread first
    return [...currentThreadResults, ...otherThreadResults];
  }

  /**
   * Execute a search with the given query
   * @param {string} query - Search query
   * @returns {Array} - Search results
   */
  find(query) {
    // Switch to call tree view if not already active
    this._ensureCallTreeView();

    // Clear existing search results
    this.clearSearch();

    // Don't execute search for empty query
    if (!query || query.trim() === '') {
      this.updateResultsDisplay();
      return [];
    }

    const normalizedQuery = query.toLowerCase();

    // Execute search - results will now be prioritized with current thread first
    this.searchResults = this.searchNodes(normalizedQuery);
    this.currentResultIndex = -1;

    // Update result counters
    this._updateResultCounters();

    // Update results display
    this.updateResultsDisplay();

    // Apply highlighting and navigate to first result
    this._applyInitialHighlighting();

    // Publish search results event
    this._publishSearchResultsEvent();

    return this.searchResults;
  }

  /**
   * Ensure call tree view is active
   * @private
   */
  _ensureCallTreeView() {
    if (this.data.currentViewMode !== 'callTree') {
      this.viewSwitcher.switchViewMode('callTree');
      this.viewSwitcher.switchTabActive('callTree');
    }
  }

  /**
   * Update result counters
   * @private
   */
  _updateResultCounters() {
    // Count total results
    this.totalResultsCount = this.searchResults.length;

    // Count results in current thread
    const currentThread = this.data.getCurrentThreadName();
    this.currentThreadResultsCount = this.searchResults.filter(
      result => result.threadName === currentThread
    ).length;
  }

  /**
   * Apply initial highlighting based on settings
   * @private
   */
  _applyInitialHighlighting() {
    if (this.highlightAll) {
      this.highlightAllResults();
    }

    if (this.searchResults.length > 0) {
      // Navigate to first result if results exist
      this.navigateNext();
    }
  }

  /**
   * Publish search results event
   * @private
   */
  _publishSearchResultsEvent() {
    if (this.eventBus) {
      this.eventBus.publish('searchResultsChanged', {
        searchResults: this.searchResults,
        totalResultsCount: this.totalResultsCount,
        currentThreadResultsCount: this.currentThreadResultsCount
      });
    }
  }

  /**
   * Highlight all search results in the current thread
   */
  highlightAllResults() {
    if (this.searchResults.length === 0) return;

    const nodeIdsToUpdate = [];

    // Add highlighting for all search results in current thread only
    const currentThread = this.data.getCurrentThreadName();

    this.searchResults.forEach((result) => {
      // Only highlight results in current thread
      if (result.threadName === currentThread) {
        const nodeId = result.id;

        // Ensure result node is visible (expand all parent nodes)
        this.view.ensureNodeVisible(nodeId);

        // Highlight node
        this.data.highlight(nodeId, true);
        nodeIdsToUpdate.push(nodeId);

        // Get node DOM element and add special highlight class
        const nodeElement = this.data.getNodeElement(nodeId);
        if (nodeElement) {
          nodeElement.classList.add('search-highlight-all');
        }
      }
    });

    // Batch update highlighted nodes
    if (nodeIdsToUpdate.length > 0) {
      this.view.batchUpdateNodes(nodeIdsToUpdate);
    }
  }

  /**
   * Navigate to next search result
   */
  navigateNext() {
    if (this.searchResults.length === 0) return;

    // Move to next result
    this.currentResultIndex = (this.currentResultIndex + 1) % this.searchResults.length;
    // Navigate to current result
    const preserveHighlight = this.highlightAll;
    this.navigateToCurrentResult(preserveHighlight);
  }

  /**
   * Navigate to previous search result
   */
  navigatePrev() {
    if (this.searchResults.length === 0) return;
    // Move to previous result
    this.currentResultIndex = (this.currentResultIndex - 1 + this.searchResults.length) % this.searchResults.length;
    // Navigate to current result
    const preserveHighlight = this.highlightAll;
    this.navigateToCurrentResult(preserveHighlight);
  }

  /**
   * Navigate to the current search result
   * @param {boolean} preserveOtherHighlights - Whether to preserve other highlights
   */
  navigateToCurrentResult(preserveOtherHighlights = false) {
    if (this.searchResults.length === 0 || this.currentResultIndex < 0) return;

    const result = this.searchResults[this.currentResultIndex];
    const nodeId = result.id;
    const resultThreadName = result.threadName;

    // Handle thread switching if needed
    const threadSwitched = this._handleThreadSwitchIfNeeded(resultThreadName);

    // Ensure result node is visible (expand all parent nodes)
    this.view.ensureNodeVisible(nodeId);

    // Manage highlights
    this._manageHighlights(nodeId, preserveOtherHighlights, threadSwitched);

    // Set as current node and update UI
    this._updateCurrentNodeAndUI(nodeId, result.data.label);

    // Update results display with thread information
    this.updateResultsDisplay(threadSwitched ? resultThreadName : null);

    // Ensure scroll to current node
    this._scrollToCurrentNode(nodeId, threadSwitched);
  }

  /**
   * Handle switching threads if needed
   * @param {string} resultThreadName - Thread name of the result
   * @returns {boolean} - Whether a thread switch occurred
   * @private
   */
  _handleThreadSwitchIfNeeded(resultThreadName) {
    const currentThreadName = this.data.getCurrentThreadName();

    if (resultThreadName !== currentThreadName) {
      // Remember the highlightAll setting
      const wasHighlightAll = this.highlightAll;

      // Switch to the thread containing the search result
      this.data.switchThread(resultThreadName);

      // Render the new thread's tree
      this.view.renderTree();

      // Update count of results in current thread after switching
      this.currentThreadResultsCount = this.searchResults.filter(
        result => result.threadName === resultThreadName
      ).length;

      // Apply highlight all to the new thread if it was enabled
      if (wasHighlightAll) {
        this.highlightAllResults();
      }

      return true;
    }

    return false;
  }

  /**
   * Manage highlights for the current result
   * @param {string} nodeId - ID of the current node
   * @param {boolean} preserveOtherHighlights - Whether to preserve other highlights
   * @param {boolean} threadSwitched - Whether a thread switch occurred
   * @private
   */
  _manageHighlights(nodeId, preserveOtherHighlights, threadSwitched) {
    // Clear all highlights if not preserving other highlights and we didn't switch threads
    if (!preserveOtherHighlights && !threadSwitched) {
      this.clearAllHighlights();
    }

    // Clear current highlight class from all nodes
    document.querySelectorAll('.search-highlight').forEach(el => {
      el.classList.remove('search-highlight');
    });

    // Highlight current result in data model
    this.data.highlight(nodeId, true);
    this.view.updateNode(nodeId);

    // Add search-highlight class to current search result node
    const nodeElement = this.data.getNodeElement(nodeId);
    if (nodeElement) {
      nodeElement.classList.add('search-highlight');
    }
  }

  /**
   * Update current node focus and UI
   * @param {string} nodeId - ID of the current node
   * @param {string} label - Label of the node
   * @private
   */
  _updateCurrentNodeAndUI(nodeId, label) {
    // Set as current node
    this.data.setCurrent(nodeId);
    this.view.updateCurrentNodeFocusUI(nodeId);
    this.view.updateCurrentMethodDisplay(label);
  }

  /**
   * Scroll to the current node
   * @param {string} nodeId - ID of the node to scroll to
   * @param {boolean} threadSwitched - Whether a thread switch occurred
   * @private
   */
  _scrollToCurrentNode(nodeId, threadSwitched) {
    if (threadSwitched) {
      // Give the DOM a moment to update before scrolling
      setTimeout(() => {
        this.view.scrollToNode(nodeId);
      }, 100);
    } else {
      this.view.scrollToNode(nodeId);
    }
  }

  /**
   * Clear all highlighted nodes
   */
  clearHighlights() {
    // Clear all highlight states
    const changedIds = this.data.clearAllHighlights();

    // Update UI
    if (changedIds.length > 0) {
      this.view.batchUpdateNodes(changedIds);
    }
  }

  /**
   * Clear all highlights (both states and styles)
   */
  clearAllHighlights() {
    // Clear highlight styles
    this.clearAllHighlightsStyle();

    // Clear highlight states
    this.clearHighlights();
  }

  /**
   * Clear all highlight styles from DOM elements
   */
  clearAllHighlightsStyle() {
    // Clear all search results highlight styles
    document.querySelectorAll('.search-highlight-all').forEach(el => {
      el.classList.remove('search-highlight-all');
    });

    // Clear current search result highlight styles
    document.querySelectorAll('.search-highlight').forEach(el => {
      el.classList.remove('search-highlight');
    });
  }

  /**
   * Clear all search results and highlights
   */
  clearSearch() {
    // Clear highlights (including special styles and node states)
    this.clearAllHighlights();

    // Reset search state
    this.searchResults = [];
    this.currentResultIndex = -1;
    this.totalResultsCount = 0;
    this.currentThreadResultsCount = 0;

    // Update results display
    this.updateResultsDisplay();

    // Publish event
    this._publishSearchResultsEvent();
  }

  /**
   * Update the search results display
   * @param {string|null} threadName - Thread name to use (optional)
   */
  updateResultsDisplay(threadName = null) {
    const resultsElement = document.getElementById('searchResults');
    if (!resultsElement) return;

    if (this.searchResults.length === 0) {
      resultsElement.textContent = '';
      return;
    }

    const currentThread = threadName || this.data.getCurrentThreadName();
    const currentThreadResults = this.searchResults.filter(
      result => result.threadName === currentThread
    );

    // Calculate position information
    const positionInfo = this._calculatePositionInfo(currentThread, currentThreadResults);

    // Format and display result text
    resultsElement.textContent = this._formatResultText(positionInfo);
  }

  /**
   * Calculate position information for results display
   * @param {string} currentThread - Current thread name
   * @param {Array} currentThreadResults - Results in the current thread
   * @returns {Object} - Position information
   * @private
   */
  _calculatePositionInfo(currentThread, currentThreadResults) {
    // Check if we have a valid current result
    if (this.currentResultIndex < 0) {
      return { isInCurrentThread: false };
    }

    const currentResult = this.searchResults[this.currentResultIndex];
    const isInCurrentThread = currentResult.threadName === currentThread;

    let currentThreadIndex = -1;
    if (isInCurrentThread) {
      currentThreadIndex = currentThreadResults.findIndex(
        result => result.id === currentResult.id
      );
    }

    return {
      isInCurrentThread,
      currentThreadIndex,
      currentResult
    };
  }

  /**
   * Format result text based on position information
   * @param {Object} positionInfo - Position information
   * @returns {string} - Formatted result text
   * @private
   */
  _formatResultText(positionInfo) {
    let resultText = '';

    if (positionInfo.isInCurrentThread && positionInfo.currentThreadIndex >= 0) {
      // Show current thread position if we're viewing a result in the current thread
      resultText = `${positionInfo.currentThreadIndex + 1}/${this.currentThreadResultsCount} in current thread | `;
    } else if (this.currentResultIndex >= 0) {
      // If we're viewing a result in another thread, indicate that
      resultText = `In thread: ${positionInfo.currentResult.threadName} | `;
    }

    // Always show global position and total
    resultText += `${this.currentResultIndex + 1}/${this.totalResultsCount} total results`;

    return resultText;
  }
}

// Export class
export { Search };