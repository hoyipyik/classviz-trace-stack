// SearchResultsFilter.js - Handle search results selection
export class SearchResultsFilter {
    constructor(dataStore, renderer, eventBus) {
        this.data = dataStore;
        this.view = renderer;
        this.eventBus = eventBus;
        this.currentSearchResults = [];
    }

    setup() {
        this.setupAllSearchedItems();
        this.setupCurrentThreadSearchedItems();
    }

    setSearchResults(searchResults) {
        this.currentSearchResults = searchResults || [];
        this.updateAllUI();
    }

    setupAllSearchedItems() {
        const checkboxWrapper = document.getElementById('selectAllSearched');
        if (!checkboxWrapper) {
            console.error("Search results selection checkbox not found!");
            return;
        }

        checkboxWrapper.addEventListener('click', () => {
            this.toggleAllSelection();
        });
    }

    setupCurrentThreadSearchedItems() {
        const checkboxWrapper = document.getElementById('selectAllSearchedCurrentThread');
        if (!checkboxWrapper) {
            console.error("Current thread search results selection checkbox not found!");
            return;
        }

        checkboxWrapper.addEventListener('click', () => {
            this.toggleCurrentThreadSelection();
        });
    }

    toggleAllSelection() {
        const searchResults = this.getSearchResults();
        if (!searchResults || searchResults.length === 0) return;

        const selectionState = this.getSelectionState(searchResults);
        const newState = selectionState === true ? false : true;

        const changedIds = [];
        searchResults.forEach(result => {
            if (this.data.select(result.id, newState)) {
                changedIds.push(result.id);
            }
        });

        if (changedIds.length > 0) {
            this.view.batchUpdateNodes(changedIds);
            this.eventBus.publish('refreshFlame', {});
        }
    }

    toggleCurrentThreadSelection() {
        const currentThread = this.data.getCurrentThreadName();
        const searchResults = this.getSearchResults().filter(
            result => result.threadName === currentThread
        );

        if (!searchResults || searchResults.length === 0) return;

        const selectionState = this.getSelectionState(searchResults);
        const newState = selectionState === true ? false : true;

        const changedIds = [];
        searchResults.forEach(result => {
            if (this.data.select(result.id, newState)) {
                changedIds.push(result.id);
            }
        });

        if (changedIds.length > 0) {
            this.view.batchUpdateNodes(changedIds);
            this.eventBus.publish('refreshFlame', {});
        }
    }

    getSearchResults() {
        return this.currentSearchResults || [];
    }

    getSelectionState(searchResults) {
        if (!searchResults || searchResults.length === 0) return null;

        let selectedCount = 0;
        searchResults.forEach(result => {
            const nodeState = this.data.getNodeState(result.id);
            if (nodeState && nodeState.selected) {
                selectedCount++;
            }
        });

        if (selectedCount === 0) {
            return false; // All unselected
        } else if (selectedCount === searchResults.length) {
            return true;  // All selected
        } else {
            return null;  // Partially selected
        }
    }

    updateAllUI() {
        this.updateAllSearchedItemsUI();
        this.updateCurrentThreadSearchedItemsUI();
    }

    updateAllSearchedItemsUI() {
        const searchResults = this.getSearchResults();
        const checkbox = document.getElementById('selectAllSearched');

        if (!checkbox) return;

        if (!searchResults || searchResults.length === 0) {
            checkbox.classList.remove('checked', 'unchecked', 'indeterminate');
            checkbox.classList.add('unchecked');
            checkbox.classList.add('disabled');
            return;
        }

        checkbox.classList.remove('disabled');
        const state = this.getSelectionState(searchResults);

        checkbox.classList.remove('checked', 'unchecked', 'indeterminate');
        if (state === true) {
            checkbox.classList.add('checked');
        } else if (state === false) {
            checkbox.classList.add('unchecked');
        } else {
            checkbox.classList.add('indeterminate');
        }
    }

    updateCurrentThreadSearchedItemsUI() {
        const currentThread = this.data.getCurrentThreadName();
        const searchResults = this.getSearchResults().filter(
            result => result.threadName === currentThread
        );
        const checkbox = document.getElementById('selectAllSearchedCurrentThread');

        if (!checkbox) return;

        if (!searchResults || searchResults.length === 0) {
            checkbox.classList.remove('checked', 'unchecked', 'indeterminate');
            checkbox.classList.add('unchecked');
            checkbox.classList.add('disabled');
            return;
        }

        checkbox.classList.remove('disabled');
        const state = this.getSelectionState(searchResults);

        checkbox.classList.remove('checked', 'unchecked', 'indeterminate');
        if (state === true) {
            checkbox.classList.add('checked');
        } else if (state === false) {
            checkbox.classList.add('unchecked');
        } else {
            checkbox.classList.add('indeterminate');
        }
    }
}
