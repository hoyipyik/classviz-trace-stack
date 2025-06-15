/**
 * Search highlighting functionality
 */
export class SearchHighlighter {
  constructor(search) {
    this.search = search;
  }

  /**
   * Highlight all search results in the current thread
   */
  highlightAllResults() {
    if (this.search.searchResults.length === 0) return;

    const nodeIdsToUpdate = [];
    const currentThread = this.search.data.getCurrentThreadName();

    this.search.searchResults.forEach((result) => {
      if (result.threadName === currentThread) {
        const nodeId = result.id;
        this.search.view.ensureNodeVisible(nodeId);
        this.search.data.highlight(nodeId, true);
        nodeIdsToUpdate.push(nodeId);

        const nodeElement = this.search.data.getNodeElement(nodeId);
        if (nodeElement) {
          nodeElement.classList.add('search-highlight-all');
        }
      }
    });

    if (nodeIdsToUpdate.length > 0) {
      this.search.view.batchUpdateNodes(nodeIdsToUpdate);
    }
  }

  /**
   * Apply highlighting to the current node
   */
  applyHighlighting(nodeId, preserveOtherHighlights, threadSwitched) {
    if (!preserveOtherHighlights && !threadSwitched) {
      this.clearAllHighlights();
    }

    document.querySelectorAll('.search-highlight').forEach(el => {
      el.classList.remove('search-highlight');
    });

    this.search.data.highlight(nodeId, true);
    this.search.view.updateNodeUI(nodeId);

    const nodeElement = this.search.data.getNodeElement(nodeId);
    if (nodeElement) {
      nodeElement.classList.add('search-highlight');
      if (this.search.highlightAll && !nodeElement.classList.contains('search-highlight-all')) {
        nodeElement.classList.add('search-highlight-all');
      }
    }
  }

  /**
   * Clear all highlighted nodes
   */
  clearHighlights() {
    const changedIds = this.search.data.clearAllHighlights();
    if (changedIds.length > 0) {
      this.search.view.batchUpdateNodes(changedIds);
    }
  }

  /**
   * Clear all highlights (both states and styles)
   */
  clearAllHighlights() {
    document.querySelectorAll('.search-highlight-all, .search-highlight').forEach(el => {
      el.classList.remove('search-highlight-all', 'search-highlight');
    });
    this.clearHighlights();
  }
}
