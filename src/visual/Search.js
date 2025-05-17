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

    // Flag to track if event listeners have been initialized
    this.eventListenersInitialized = false;

    this.eventBus.subscribe('nodeStructureChanged', () => {
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
    // 找到模式切换的复选框
    const toggleInput = document.querySelector('#stepByStepPlay input[type="checkbox"]');

    // 如果找不到元素，返回失败
    if (!toggleInput) {
      console.error('Step-by-step mode toggle not found in DOM');
      return false;
    }

    // 如果当前状态已经是目标状态，不需要改变
    if (toggleInput.checked === enabled) {
      return true;
    }

    // 更新复选框状态
    toggleInput.checked = enabled;

    // 找到滑块元素并更新其视觉效果
    const toggleSlider = toggleInput.nextElementSibling;
    if (toggleSlider) {
      toggleSlider.style.backgroundColor = enabled ? '#337ab7' : '#d1d5db';

      // 找到滑块按钮并更新其位置
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
* 手动切换线程的函数
* 该函数会直接从DOM中获取线程选择器并切换到指定线程
* 
* @param {string} threadName - 要切换到的线程名称
* @returns {boolean} - 切换是否成功
*/
  switchThreadUI(threadName) {
    // 从DOM中获取线程选择器
    const threadSelect = document.getElementById('threadSelect');

    // 如果找不到选择器，返回失败
    if (!threadSelect) {
      console.error('Thread select element not found in DOM');
      return false;
    }

    // 检查是否已经是当前线程
    if (threadSelect.value === threadName) {
      console.log(`Already on thread: ${threadName}`);
      return false;
    }

    // 检查线程名是否存在于选项中
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

    // 设置选择器的值
    threadSelect.value = threadName;
    threadSelect.title = threadName; // 更新工具提示

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

      // 先处理高亮，然后再处理当前节点的特殊高亮
      // 这样可以确保高亮不会被意外清除
      if (this.highlightAll) {
        this.highlightAllResults();
      }

      threadSwitched = true;
    }

    // Ensure node is visible
    this.view.ensureNodeVisible(nodeId);

    // 处理高亮，保持参数一致性
    // 当 highlightAll 为 true 时，确保传递 true 作为 preserveOtherHighlights
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
    // 只有当不保留其他高亮且不是线程切换时，才清除所有高亮
    if (!preserveOtherHighlights && !threadSwitched) {
      this.clearAllHighlights();
    }

    // 仅清除当前节点的高亮状态，而不是所有节点
    // 移除旧的当前高亮类，以便可以应用到新的当前节点
    document.querySelectorAll('.search-highlight').forEach(el => {
      el.classList.remove('search-highlight');
    });

    // 高亮当前结果
    this.data.highlight(nodeId, true);
    this.view.updateNode(nodeId);

    // 添加高亮类
    const nodeElement = this.data.getNodeElement(nodeId);
    if (nodeElement) {
      nodeElement.classList.add('search-highlight');

      // 如果启用了 highlightAll，确保当前节点也有 search-highlight-all 类
      // 这样可以保证在保留高亮模式下，当前节点显示正确
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