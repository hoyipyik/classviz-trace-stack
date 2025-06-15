/**
 * Event listener management for search functionality
 */
export class SearchEventManager {
  constructor(search) {
    this.search = search;
    this.eventListenersInitialized = false;
    this.handlers = {};
  }

  /**
   * Set up search functionality event listeners
   */
  setupSearch() {
    if (this.eventListenersInitialized) {
      return;
    }

    const searchInput = document.getElementById('searchInput');
    const searchNextBtn = document.getElementById('searchNext');
    const searchPrevBtn = document.getElementById('searchPrev');
    const highlightAllCheckbox = document.getElementById('highlightAll');

    highlightAllCheckbox.checked = this.search.highlightAll;

    if (!searchInput || !searchNextBtn || !searchPrevBtn) {
      console.error("Search elements not found!");
      return;
    }

    this.handlers = {
      onInput: () => this.search.find(searchInput.value),
      onClear: () => {
        if (!searchInput.value || searchInput.value.trim() === '') {
          this.search.clearSearch();
        }
      },
      onNext: () => this.search.navigateNext(),
      onPrev: () => this.search.navigatePrev(),
      onHighlightAll: () => {
        this.search.highlightAll = highlightAllCheckbox.checked;
        if (this.search.searchResults.length > 0) {
          this.search.highlighter.clearAllHighlights();
          if (this.search.highlightAll) {
            this.search.highlighter.highlightAllResults();
          }
          this.search.navigator.navigateToCurrentResult(this.search.highlightAll);
        }
      },
      onKeydown: (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (searchInput.value && searchInput.value.trim() !== '') {
            this.search.navigateNext();
          } else {
            this.search.clearSearch();
          }
        } else if (e.key === 'Escape') {
          searchInput.value = '';
          this.search.clearSearch();
        }
      }
    };

    // Attach event listeners
    searchInput.addEventListener('input', this.handlers.onInput);
    searchInput.addEventListener('change', this.handlers.onClear);
    searchInput.addEventListener('blur', this.handlers.onClear);
    searchNextBtn.addEventListener('click', this.handlers.onNext);
    searchPrevBtn.addEventListener('click', this.handlers.onPrev);
    if (highlightAllCheckbox) {
      highlightAllCheckbox.addEventListener('change', this.handlers.onHighlightAll);
    }
    searchInput.addEventListener('keydown', this.handlers.onKeydown);

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
}
