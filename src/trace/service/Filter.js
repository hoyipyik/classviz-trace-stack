import { PackageFilter } from "./filters/PackageFilter.js";
import { SearchResultsFilter } from "./filters/SearchResultsFilter.js";
import { ThreadFilter } from "./filters/ThreadFilter.js";

class Filter {
  constructor(dataStore, renderer, eventBus, search) {
    this.data = dataStore;
    this.view = renderer;
    this.eventBus = eventBus;
    this.search = search;

    // Initialize sub-filters
    this.threadFilter = new ThreadFilter(dataStore, renderer, eventBus, search);
    this.packageFilter = new PackageFilter(dataStore, renderer, eventBus);
    this.searchResultsFilter = new SearchResultsFilter(dataStore, renderer, eventBus);

    this.setupEventListeners();
  }

  setupEventListeners() {
    if (this.eventBus) {
      this.eventBus.subscribe('nodeSelectionChanged', (data) => {
        if (data.packageName) {
          this.packageFilter.updateCheckboxUI(data.packageName);
        }
        this.searchResultsFilter.updateAllUI();
      });

      this.eventBus.subscribe('searchResultsChanged', (data) => {
        this.searchResultsFilter.setSearchResults(data.searchResults);
      });

      this.eventBus.subscribe('threadChanged', (data) => {
        this.threadFilter.updateUI(data.threadName);
        this.packageFilter.setup();
        this.searchResultsFilter.updateAllUI();
      });
    }
  }

  setupFilters() {
    this.threadFilter.setup();
    this.setupFlameChartStyleFilter();
    this.packageFilter.setup();
    this.searchResultsFilter.setup();
    this.setupTraceModeSwitcher();
  }

  setupFlameChartStyleFilter() {
    const logicalBtn = document.getElementById('logical');
    const temporalBtn = document.getElementById('temporal');

    logicalBtn.addEventListener('change', (event) => {
      this.handleFlameStyleChange(event.target.value);
    });

    temporalBtn.addEventListener('change', (event) => {
      this.handleFlameStyleChange(event.target.value);
    });
  }

  handleFlameStyleChange(value) {
    if (value === "logical") {
      this.data.setShowLogical(true);
    } else {
      this.data.setShowLogical(false);
    }
    this.eventBus.publish('changeLogicalStyle', {});
  }

  setupTraceModeSwitcher() {
    const traceBtn = document.getElementById('trace');
    const graphBtn = document.getElementById('graph');
    traceBtn.checked = this.data.traceMode;
    graphBtn.checked = !this.data.traceMode;

    traceBtn.addEventListener('change', (event) => {
      this.handleTraceModeChange(event.target.value);
      this.eventBus.publish('refreshRegionFocus', {stopStepByStepMode: false});
    });

    graphBtn.addEventListener('change', (event) => {
      this.handleTraceModeChange(event.target.value);
      this.eventBus.publish('refreshRegionFocus', {stopStepByStepMode: false});
    });
  }

  handleTraceModeChange(value) {
    if (value === "trace") {
      this.data.setTraceMode(true);
      this.eventBus.publish('switchTraceMode', { traceMode: true });
    } else {
      this.data.setTraceMode(false);
      this.eventBus.publish('switchTraceMode', { traceMode: false });
    }
    this.eventBus.publish('changeTraceMode', {});
  }

  // Utility methods that don't belong to specific filters
  filterByMethodName(query) {
    if (!query || query.trim() === '') {
      this.resetFilter();
      return;
    }

    const normalizedQuery = query.toLowerCase();
    const matchedIds = [];
    const unmatchedIds = [];

    this.data.nodes.forEach((nodeInfo, nodeId) => {
      const nodeData = nodeInfo.data;
      const nodeLabel = nodeData.label || '';

      if (nodeLabel.toLowerCase().includes(normalizedQuery)) {
        matchedIds.push(nodeId);
      } else {
        unmatchedIds.push(nodeId);
      }
    });

    this.setNodesVisibility(matchedIds, true);
    this.setNodesVisibility(unmatchedIds, false);

    return matchedIds;
  }

  resetFilter() {
    const allNodeIds = [];
    this.data.nodes.forEach((_, nodeId) => {
      allNodeIds.push(nodeId);
    });
    this.setNodesVisibility(allNodeIds, true);
    return allNodeIds;
  }

  setNodesVisibility(nodeIds, visible) {
    nodeIds.forEach(nodeId => {
      const element = this.data.getNodeElement(nodeId);
      if (element) {
        const li = element.closest('li');
        if (li) {
          li.style.display = visible ? '' : 'none';
        }
      }
    });
  }
}

export { Filter };