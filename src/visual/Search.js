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
    // const searchResultsDisplay = document.getElementById('searchResults');
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
  
  // Execute search
  find(query) {
    if(this.data.currentViewMode !== 'callTree') {
      this.viewSwitcher.switchViewMode('callTree');
      this.viewSwitcher.switchTabActive('callTree');
    }
    // Clear existing search results
    this.clearSearch();
    
    // Don't execute search for empty query
    if (!query || query.trim() === '') {
      this.updateResultsDisplay();
      return [];
    }
    
    const normalizedQuery = query.toLowerCase();
    
    // Execute search
    this.searchResults = this.searchNodes(normalizedQuery);
    this.currentResultIndex = -1;
    
    // Update results display
    this.updateResultsDisplay();
    
    // Decide highlighting method based on settings
    if (this.highlightAll) {
      this.highlightAllResults();
    }
    if (this.searchResults.length > 0) {
      // Navigate to first result if results exist
      this.navigateNext();
    }

    if (this.eventBus) {
      this.eventBus.publish('searchResultsChanged', {
        searchResults: this.searchResults
      });
    }
    
    return this.searchResults;
  }
  
  // Search nodes
  searchNodes(query) {
    const results = [];
    
    // Traverse all nodes
    this.data.nodes.forEach((nodeInfo, nodeId) => {
      const nodeData = nodeInfo.data;
      const nodeLabel = nodeData.label || '';
      
      if (nodeLabel.toLowerCase().includes(query)) {
        // Add to results
        results.push({
          id: nodeId,
          data: nodeData,
          ancestors: this.data.getAncestorIds(nodeId)
        });
      }
    });
    
    return results;
  }
  
  // Highlight all search results
  highlightAllResults() {
    if (this.searchResults.length === 0) return;
    
    const nodeIdsToUpdate = [];
    
    // Add highlighting for all search results
    this.searchResults.forEach((result) => {
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
    });
    
    // Batch update highlighted nodes
    if (nodeIdsToUpdate.length > 0) {
      this.view.batchUpdateNodes(nodeIdsToUpdate);
    }
  }
  
  // Navigate to next search result
  navigateNext() {
    if (this.searchResults.length === 0) return;
    
    // Move to next result
    this.currentResultIndex = (this.currentResultIndex + 1) % this.searchResults.length;
    
    // Navigate to current result
    const preserveHighlight = this.highlightAll; // Preserve other highlights if in highlight all mode
    this.navigateToCurrentResult(preserveHighlight);
    
    // Ensure scroll to current node
    const currentResult = this.searchResults[this.currentResultIndex];
    this.view.scrollToNode(currentResult.id);
  }

  // Navigate to previous search result
  navigatePrev() {
    if (this.searchResults.length === 0) return;
    
    // Move to previous result
    this.currentResultIndex = (this.currentResultIndex - 1 + this.searchResults.length) % this.searchResults.length;
    
    // Navigate to current result
    const preserveHighlight = this.highlightAll; // Preserve other highlights if in highlight all mode
    this.navigateToCurrentResult(preserveHighlight);
    
    // Ensure scroll to current node
    const currentResult = this.searchResults[this.currentResultIndex];
    this.view.scrollToNode(currentResult.id);
  }

  // Navigate to current result
  navigateToCurrentResult(preserveOtherHighlights = false) {
    if (this.searchResults.length === 0 || this.currentResultIndex < 0) return;
    
    const result = this.searchResults[this.currentResultIndex];
    const nodeId = result.id;
    
    // Ensure result node is visible (expand all parent nodes)
    this.view.ensureNodeVisible(nodeId);
    
    // Clear all highlights if not preserving other highlights
    if (!preserveOtherHighlights) {
      this.clearAllHighlights();
    }
    
    // Highlight current result
    this.data.highlight(nodeId, true);
    this.view.updateNode(nodeId);
    
    // Set as current node
    this.data.setCurrent(nodeId);
    this.view.updateCurrentNodeFocusUI(nodeId);
    this.view.updateCurrentMethodDisplay(result.data.label);
    
    // Update results display
    this.updateResultsDisplay();
  }
  
  // Clear highlights and highlight styles
  clearHighlights() {
    // Clear all highlight states
    const changedIds = this.data.clearAllHighlights();
    
    // Update UI
    if (changedIds.length > 0) {
      this.view.batchUpdateNodes(changedIds);
    }
  }
  
  // Clear all highlights and highlight styles
  clearAllHighlights() {
    // Clear highlight styles
    this.clearAllHighlightsStyle();
    
    // Clear highlight states
    this.clearHighlights();
  }
  
  // Clear only highlight styles
  clearAllHighlightsStyle() {
    // Only remove search-highlight-all class, don't clear data.highlight state
    document.querySelectorAll('.search-highlight-all').forEach(el => {
      el.classList.remove('search-highlight-all');
    });
  }
  
  // Clear search
  clearSearch() {
    // Clear highlights (including special styles and node states)
    this.clearAllHighlights();
    
    // Reset search state
    this.searchResults = [];
    this.currentResultIndex = -1;
    
    // Update results display
    this.updateResultsDisplay();
  
    if (this.eventBus) {
      this.eventBus.publish('searchResultsChanged', {
        searchResults: this.searchResults
      });
    }
  }
  
  // Update results display
  updateResultsDisplay() {
    const resultsElement = document.getElementById('searchResults');
    if (!resultsElement) return;
    
    if (this.searchResults.length === 0) {
      resultsElement.textContent = '';
    } else {
      resultsElement.textContent = `${this.currentResultIndex + 1} of ${this.searchResults.length} results`;
    }
  }
}

// Export class
export { Search };