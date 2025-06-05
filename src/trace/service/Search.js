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

    // Flag to track if event listeners have been initialized
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
        // Use setTimeout to ensure the thread switch is complete
        setTimeout(() => {
          // Manually trigger highlighting
          this.clearAllHighlights();
          this.highlightAllResults();
        }, 200); // Small delay to ensure the thread switch and rendering is complete
      }


    })
  }

  toggleStepByStepMode(enabled) {
    // Find the mode toggle checkbox
    const toggleInput = document.querySelector('#stepByStepPlay input[type="checkbox"]');

    // If the element cannot be found, return failure
    if (!toggleInput) {
      console.error('Step-by-step mode toggle not found in DOM');
      return false;
    }

    // If the current state is already the target state, no change needed
    if (toggleInput.checked === enabled) {
      return true;
    }

    // Update checkbox state
    toggleInput.checked = enabled;

    // Find the slider element and update its visual appearance
    const toggleSlider = toggleInput.nextElementSibling;
    if (toggleSlider) {
      toggleSlider.style.backgroundColor = enabled ? '#337ab7' : '#d1d5db';

      // Find the slider button and update its position
      const sliderButton = toggleSlider.querySelector('span');
      if (sliderButton) {
        sliderButton.style.left = enabled ? '18px' : '2px';
      }
    }

    console.log(`Step-by-step mode ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  }

  // Set up thread switcher 
  /**
   * Function to manually switch threads
   * This function will directly get the thread selector from the DOM and switch to the specified thread
   * 
   * @param {string} threadName - The name of the thread to switch to
   * @returns {boolean} - Whether the switch was successful
   */
  switchThreadUI(threadName) {
    // Get thread selector from DOM
    const threadSelect = document.getElementById('threadSelect');

    // If selector cannot be found, return failure
    if (!threadSelect) {
      console.error('Thread select element not found in DOM');
      return false;
    }

    // Check if already on the current thread
    if (threadSelect.value === threadName) {
      console.log(`Already on thread: ${threadName}`);
      return false;
    }

    // Check if thread name exists in options
    let threadExists = false;
    for (let i = 0; i < threadSelect.options.length; i++) {
      if (threadSelect.options[i].value === threadName) {
        threadExists = true;
        break;
      }
    }

    if (!threadExists) {
      console.error(`Thread "${threadName}" does not exist in options`);
      return false;
    }

    // Set selector value
    threadSelect.value = threadName;
    threadSelect.title = threadName; // Update tooltip

    console.log(`Thread switched to: ${threadName}`);
    return true;
  }


  // Set up search functionality
  setupSearch() {
    // Check if already initialized to prevent duplicate event listeners
    if (this.eventListenersInitialized) {
      return;
    }

    const searchInput = document.getElementById('searchInput');
    const searchNextBtn = document.getElementById('searchNext');
    const searchPrevBtn = document.getElementById('searchPrev');
    const highlightAllCheckbox = document.getElementById('highlightAll');

    highlightAllCheckbox.checked = this.highlightAll;

    if (!searchInput || !searchNextBtn || !searchPrevBtn) {
      console.error("Search elements not found!");
      return;
    }

    // Store event handlers so they can be properly removed later if needed
    this.handlers = {
      onInput: () => this.find(searchInput.value),

      onClear: () => {
        if (!searchInput.value || searchInput.value.trim() === '') {
          this.clearSearch();
        }
      },

      onNext: () => this.navigateNext(),

      onPrev: () => this.navigatePrev(),

      onHighlightAll: () => {
        this.highlightAll = highlightAllCheckbox.checked;

        if (this.searchResults.length > 0) {
          this.clearAllHighlights();

          if (this.highlightAll) {
            this.highlightAllResults();
          }

          this.navigateToCurrentResult(this.highlightAll);
        }
      },

      onKeydown: (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (searchInput.value && searchInput.value.trim() !== '') {
            this.navigateNext();
          } else {
            this.clearSearch();
          }
        } else if (e.key === 'Escape') {
          searchInput.value = '';
          this.clearSearch();
        }
      }
    };

    // Search input event
    searchInput.addEventListener('input', this.handlers.onInput);

    // When search box is cleared
    searchInput.addEventListener('change', this.handlers.onClear);

    // Handle blur event
    searchInput.addEventListener('blur', this.handlers.onClear);

    // Next result button
    searchNextBtn.addEventListener('click', this.handlers.onNext);

    // Previous result button
    searchPrevBtn.addEventListener('click', this.handlers.onPrev);

    // Highlight all checkbox
    if (highlightAllCheckbox) {
      highlightAllCheckbox.addEventListener('change', this.handlers.onHighlightAll);
    }

    // Keyboard shortcuts
    searchInput.addEventListener('keydown', this.handlers.onKeydown);

    // Mark as initialized
    this.eventListenersInitialized = true;
  }

  /**
   * Remove event listeners to prevent duplicates
   */
  cleanupEventListeners() {
    if (!this.eventListenersInitialized || !this.handlers) {
      return;
    }

    const searchInput = document.getElementById('searchInput');
    const searchNextBtn = document.getElementById('searchNext');
    const searchPrevBtn = document.getElementById('searchPrev');
    const highlightAllCheckbox = document.getElementById('highlightAll');

    if (searchInput) {
      searchInput.removeEventListener('input', this.handlers.onInput);
      searchInput.removeEventListener('change', this.handlers.onClear);
      searchInput.removeEventListener('blur', this.handlers.onClear);
      searchInput.removeEventListener('keydown', this.handlers.onKeydown);
    }

    if (searchNextBtn) {
      searchNextBtn.removeEventListener('click', this.handlers.onNext);
    }

    if (searchPrevBtn) {
      searchPrevBtn.removeEventListener('click', this.handlers.onPrev);
    }

    if (highlightAllCheckbox) {
      highlightAllCheckbox.removeEventListener('change', this.handlers.onHighlightAll);
    }

    this.eventListenersInitialized = false;
  }

  /**
   * Search nodes across all threads, prioritizing current thread results
   * @param {string} query - Search query
   * @returns {Array} - Search results with current thread results first
   */
  searchNodes(query) {
    const currentThreadResults = [];
    const otherThreadResults = [];
    const currentThreadName = this.data.getCurrentThreadName();

    // Search all nodes
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

        // Sort results by thread
        (threadName === currentThreadName ? currentThreadResults : otherThreadResults).push(resultItem);
      }
    });

    // Return combined results with current thread first
    return [...currentThreadResults, ...otherThreadResults];
  }

  /**
   * Execute a search with the given query
   * @param {string} query - Search query
   * @returns {Array} - Search results
   */
  find(query) {
    // Ensure call tree view is active
    if (this.data.currentViewMode !== 'callTree') {
      this.viewSwitcher.switchViewMode('callTree');
      this.viewSwitcher.switchTabActive('callTree');
    }

    // Clear existing search results
    this.clearSearch();

    // Skip empty queries
    if (!query || query.trim() === '') {
      this.updateResultsDisplay();
      return [];
    }

    // Perform search
    this.searchResults = this.searchNodes(query.toLowerCase());
    this.currentResultIndex = -1;
    this.updateCounters();

    // Apply highlighting and navigate to first result
    if (this.highlightAll) {
      this.highlightAllResults();
    }

    if (this.searchResults.length > 0) {
      this.navigateNext();
    }

    // Update UI
    this.updateResultsDisplay();
    this.publishSearchEvent();

    return this.searchResults;
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

  /**
   * Highlight all search results in the current thread
   */
  highlightAllResults() {
    if (this.searchResults.length === 0) return;

    const nodeIdsToUpdate = [];
    const currentThread = this.data.getCurrentThreadName();

    this.searchResults.forEach((result) => {
      // Only highlight results in current thread
      if (result.threadName === currentThread) {
        const nodeId = result.id;

        // Ensure node visibility and highlight it
        this.view.ensureNodeVisible(nodeId);
        this.data.highlight(nodeId, true);
        nodeIdsToUpdate.push(nodeId);

        // Add highlight class
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
    this.navigateToCurrentResult(this.highlightAll);
  }

  /**
   * Navigate to previous search result
   */
  navigatePrev() {
    if (this.searchResults.length === 0) return;

    // Move to previous result
    this.currentResultIndex = (this.currentResultIndex - 1 + this.searchResults.length) % this.searchResults.length;
    // Navigate to current result
    this.navigateToCurrentResult(this.highlightAll);
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
    const currentThreadName = this.data.getCurrentThreadName();

    // Check if we need to switch threads
    let threadSwitched = false;
    if (resultThreadName !== currentThreadName) {
      // Switch to thread containing the result
      this.data.switchThread(resultThreadName);
      this.view.renderTree();

      // Update counters after thread switch
      this.updateCounters();

      // Handle highlighting first, then handle the special highlighting for the current node
      // This ensures that highlighting won't be accidentally cleared
      if (this.highlightAll) {
        this.highlightAllResults();
      }

      threadSwitched = true;
    }

    // Ensure node is visible
    this.view.ensureNodeVisible(nodeId);

    // Handle highlighting, maintain parameter consistency
    // When highlightAll is true, ensure true is passed as preserveOtherHighlights
    const shouldPreserveHighlights = this.highlightAll || preserveOtherHighlights;
    this.applyHighlighting(nodeId, shouldPreserveHighlights, threadSwitched);

    // Set as current node and update UI
    this.data.setCurrent(nodeId);
    console.log("!!!!focus changed, start lassviz focus change event")
    this.eventBus.publish('changeCurrentFocusedNodeForStepByStep', {
      nodeId: nodeId
    });
    this.eventBus.publish('changeClassvizFocus', {
      nodeId: nodeId
    });
    this.view.updateCurrentNodeFocusUI(nodeId);
    this.view.updateCurrentMethodDisplay(result.data.label);

    // Update results display
    this.updateResultsDisplay();

    // Scroll to node (with delay after thread switch)
    if (threadSwitched) {
      setTimeout(() => this.view.scrollToNode(nodeId), 100);
    } else {
      this.view.scrollToNode(nodeId);
    }
  }

  /**
   * Apply highlighting to the current node
   */
  applyHighlighting(nodeId, preserveOtherHighlights, threadSwitched) {
    // Only clear all highlights when not preserving other highlights and not during thread switch
    if (!preserveOtherHighlights && !threadSwitched) {
      this.clearAllHighlights();
    }

    // Only clear the current node's highlight state, not all nodes
    // Remove the old current highlight class so it can be applied to the new current node
    document.querySelectorAll('.search-highlight').forEach(el => {
      el.classList.remove('search-highlight');
    });

    // Highlight current result
    this.data.highlight(nodeId, true);
    this.view.updateNodeUI(nodeId);

    // Add highlight class
    const nodeElement = this.data.getNodeElement(nodeId);
    if (nodeElement) {
      nodeElement.classList.add('search-highlight');

      // If highlightAll is enabled, ensure the current node also has search-highlight-all class
      // This ensures that in preserved highlight mode, the current node displays correctly
      if (this.highlightAll && !nodeElement.classList.contains('search-highlight-all')) {
        nodeElement.classList.add('search-highlight-all');
      }
    }
  }

  /**
   * Reset search position to first result in current thread
   */
  resetToFirstResultInCurrentThread() {
    if (this.searchResults.length === 0) return;

    // Update counters for current thread
    this.updateCounters();

    const currentThreadName = this.data.getCurrentThreadName();
    const firstResultIndex = this.searchResults.findIndex(
      result => result.threadName === currentThreadName
    );

    if (firstResultIndex >= 0) {
      // Set to previous index so navigateNext selects the first result
      this.currentResultIndex = firstResultIndex - 1;
      this.navigateNext();
    } else {
      this.currentResultIndex = -1;
      this.updateResultsDisplay();
    }
  }

  /**
   * Clear all highlighted nodes
   */
  clearHighlights() {
    const changedIds = this.data.clearAllHighlights();
    if (changedIds.length > 0) {
      this.view.batchUpdateNodes(changedIds);
    }
  }

  /**
   * Clear all highlights (both states and styles)
   */
  clearAllHighlights() {
    // Clear highlight styles
    document.querySelectorAll('.search-highlight-all, .search-highlight').forEach(el => {
      el.classList.remove('search-highlight-all', 'search-highlight');
    });

    // Clear highlight states
    this.clearHighlights();
  }

  /**
   * Clear all search results and highlights
   */
  clearSearch() {
    // Clear highlights
    this.clearAllHighlights();

    // Reset search state
    this.searchResults = [];
    this.currentResultIndex = -1;
    this.totalResultsCount = 0;
    this.currentThreadResultsCount = 0;

    // Update UI
    this.updateResultsDisplay();
    this.publishSearchEvent();
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

    // Build results display text
    const currentThread = threadName || this.data.getCurrentThreadName();
    let resultText = '';

    if (this.currentResultIndex >= 0) {
      const currentResult = this.searchResults[this.currentResultIndex];
      const isInCurrentThread = currentResult.threadName === currentThread;

      if (isInCurrentThread) {
        // Find position in current thread
        const currentThreadResults = this.searchResults.filter(
          r => r.threadName === currentThread
        );

        const threadIndex = currentThreadResults.findIndex(
          r => r.id === currentResult.id
        );

        if (threadIndex >= 0) {
          resultText = `${threadIndex + 1}/${this.currentThreadResultsCount} in current thread | `;
        }
      } else {
        // Show thread name for results in other threads
        resultText = `In thread: ${currentResult.threadName} | `;
      }

      // Add global position
      resultText += `${this.currentResultIndex + 1}/${this.totalResultsCount} total results`;
    } else if (this.searchResults.length > 0) {
      // No current result selected but we have results
      resultText = `0/${this.currentThreadResultsCount} in current thread | 0/${this.totalResultsCount} total results`;
    }

    resultsElement.textContent = resultText;
  }
}

// Export class
export { Search };