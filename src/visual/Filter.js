// Filter.js - Filtering functionality
/**
 * Filter Class
 * Responsible for handling node filtering
 */
class Filter {
  constructor(dataStore, renderer, eventBus, search) {
    // Data store reference
    this.data = dataStore;

    // Renderer reference
    this.view = renderer;

    // Event 
    this.eventBus = eventBus;

    // Search reference
    this.search = search;

    // Store current search results
    this.currentSearchResults = [];

    // Subscribe to node selection change events
    if (this.eventBus) {
      this.eventBus.subscribe('nodeSelectionChanged', (data) => {
        // If the changed node has a package name, update package selection status
        if (data.packageName) {
          this.updatePackageCheckboxUI(data.packageName);
        }
        // Update search results selection status
        this.updateSearchedItemsCheckboxUI();
        // Update current thread search results selection status
        this.updateCurrentThreadSearchedItemsCheckboxUI();
      });

      // Subscribe to search results change events
      this.eventBus.subscribe('searchResultsChanged', (data) => {
        // Save search results
        this.currentSearchResults = data.searchResults || [];

        // Update search results selection status
        this.updateSearchedItemsCheckboxUI();
        // Update current thread search results selection status
        this.updateCurrentThreadSearchedItemsCheckboxUI();
      });

      // Subscribe to thread change events
      this.eventBus.subscribe('threadChanged', (data) => {
        // Update thread switcher UI
        this.updateThreadSwitcherUI(data.threadName);

        // Update package filter
        this.setupPackageFilter();

        // Update search results selection status
        this.updateSearchedItemsCheckboxUI();
        // Update current thread search results selection status
        this.updateCurrentThreadSearchedItemsCheckboxUI();
      });
    }
  }

  // Set up filters (including thread filter and package filter)
  setupFilters() {
    // Set up thread filter
    this.setupThreadFilter();

    // Set up FlameChartStyle filter
    this.setupFlameChartStyleFilter();

    // Set up package filter
    this.setupPackageFilter();

    // Set up search results selection event handling
    this.setupSearchedItemsSelection();

    // Set up current thread search results selection event handling
    this.setupCurrentThreadSearchedItemsSelection();

    // Set up trace mode switcher for Classviz
    this.setupTraceModeSwitcher();
  }

  // Set up thread filter
  setupThreadFilter() {
    // Find filter container
    const filterContainer = document.getElementById('threadFilter');
    if (!filterContainer) {
      console.error("Thread filter container not found!");
      return;
    }

    // Get all thread names
    const threadNames = this.data.getAllThreadNames();

    // If there's only one thread, don't display the thread filter
    if (!threadNames || threadNames.length <= 1) {
      filterContainer.style.display = 'none';
      return;
    }

    // Show thread filter
    filterContainer.style.display = '';

    // Create thread filter UI
    this.createThreadFilterUI(filterContainer, threadNames);
  }

  // Set up FlameChartStyle filter
  setupFlameChartStyleFilter() {
    const logicalBtn = document.getElementById('logical');
    const temporalBtn = document.getElementById('temporal');
    // console.log("FlameChart style filter initialized", logicalBtn, temporalBtn);

    logicalBtn.addEventListener('change', (event) => {
      flameStyleHandler(event.target.value);
    });

    temporalBtn.addEventListener('change', (event) => {
      flameStyleHandler(event.target.value);
    });

    const flameStyleHandler = (value) => {
      // console.log("Selected FlameChart style:", value);
      if (value === "logical") {
        this.data.setShowLogical(true);
      } else {
        this.data.setShowLogical(false);
      }
      this.eventBus.publish('changeLogicalStyle', {});
    };
  }

  // setupTraceModeSwitcher();

  setupTraceModeSwitcher() {
    const traceBtn = document.getElementById('trace');
    const graphBtn = document.getElementById('graph');
    // console.log("FlameChart style filter initialized", logicalBtn, temporalBtn);

    traceBtn.addEventListener('change', (event) => {
      traceModeSwitcher(event.target.value);
    });

    graphBtn.addEventListener('change', (event) => {
      traceModeSwitcher(event.target.value);
    });

    const traceModeSwitcher = (value) => {
      // console.log("Selected FlameChart style:", value);
      if (value === "trace") {
        this.data.setTraceMode(true);
      } else {
        this.data.setTraceMode(false);
      }
      this.eventBus.publish('changeTraceMode', {});
    };
  }

  // Update the createThreadFilterUI method in Filter.js

  /**
   * Create thread filter UI - top bar version
   * @param {HTMLElement} container - Container element
   * @param {Array} threadNames - Array of thread names
   */
  createThreadFilterUI(container, threadNames) {
    // Clear container
    container.innerHTML = '';

    // Create select box
    const select = document.createElement('select');
    select.id = 'threadSelect';
    select.className = 'thread-select';

    // Add options
    threadNames.forEach(threadName => {
      const option = document.createElement('option');
      option.value = threadName;
      option.textContent = threadName;

      // If this is the current thread, set as selected
      if (threadName === this.data.getCurrentThreadName()) {
        option.selected = true;
      }

      select.appendChild(option);
    });

    // Add title attribute for tooltip on hover
    select.title = select.value;

    // Add change event
    select.addEventListener('change', () => {
      const selectedThreadName = select.value;
      select.title = selectedThreadName; // Update tooltip
      this.switchThread(selectedThreadName);
      this.search.resetToFirstResultInCurrentThread();
      if (this.search && this.search.highlightAll) {
        // Use setTimeout to ensure the thread switch is complete
        setTimeout(() => {
          // Manually trigger highlighting
          this.search.clearAllHighlights();
          this.search.highlightAllResults();
        }, 200); // Small delay to ensure the thread switch and rendering is complete
      }
    });

    container.appendChild(select);
  }

  // Switch thread
  switchThread(threadName) {
    if (this.data.switchThread(threadName)) {
      console.log(`Thread switched to: ${threadName}`);

      // Re-render the tree (this will trigger the threadChanged event, which will update the UI)
      this.view.renderTree();
    } else {
      console.error(`Failed to switch to thread: ${threadName}`);
    }
  }

  // Update thread switcher UI
  updateThreadSwitcherUI(currentThreadName) {
    const select = document.getElementById('threadSelect');
    if (select) {
      select.value = currentThreadName;
    }
  }

  // Set up package filter
  setupPackageFilter() {
    // Find filter container
    const filterContainer = document.getElementById('packageFilter');
    if (!filterContainer) {
      console.error("Package filter container not found!");
      return;
    }

    // Get all package names
    const packageNames = this.data.getAllPackages();

    // Create package filter UI
    this.createPackageFilterUI(filterContainer, packageNames);
  }

  // Add new method to set up event handling for search results selection
  setupSearchedItemsSelection() {
    // Find existing checkbox
    const checkboxWrapper = document.getElementById('selectAllSearched');
    if (!checkboxWrapper) {
      console.error("Search results selection checkbox not found!");
      return;
    }

    // Add click event
    checkboxWrapper.addEventListener('click', () => {
      this.toggleSearchedItemsSelection();
    });
  }

  // Toggle search results selection state
  toggleSearchedItemsSelection() {
    // Get current search results
    const searchResults = this.getSearchResults();

    if (!searchResults || searchResults.length === 0) return;

    // Check current state
    const selectionState = this.getSearchedItemsSelectionState(searchResults);
    // If all selected or partially selected, then deselect all; if all unselected, then select all
    const newState = selectionState === true ? false : true;

    // Perform selection operation
    const changedIds = [];
    searchResults.forEach(result => {
      if (this.data.select(result.id, newState)) {
        changedIds.push(result.id);
      }
    });

    // Update UI
    if (changedIds.length > 0) {
      this.view.batchUpdateNodes(changedIds);
      this.eventBus.publish('refreshFlame', {});
    }
  }

  // Get current search results
  getSearchResults() {
    return this.currentSearchResults || [];
  }

  // Get selection state of search results
  getSearchedItemsSelectionState(searchResults) {
    if (!searchResults || searchResults.length === 0) return null;

    let selectedCount = 0;

    // Check selection state of each search result
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

  // Update search results selection state UI
  updateSearchedItemsCheckboxUI() {
    const searchResults = this.getSearchResults();
    const checkbox = document.getElementById('selectAllSearched');

    if (!checkbox) return;

    // If no search results, disable checkbox
    if (!searchResults || searchResults.length === 0) {
      checkbox.classList.remove('checked', 'unchecked', 'indeterminate');
      checkbox.classList.add('unchecked');
      checkbox.classList.add('disabled');
      return;
    }

    // Enable checkbox
    checkbox.classList.remove('disabled');

    // Update checkbox state
    const state = this.getSearchedItemsSelectionState(searchResults);

    checkbox.classList.remove('checked', 'unchecked', 'indeterminate');
    if (state === true) {
      checkbox.classList.add('checked');
    } else if (state === false) {
      checkbox.classList.add('unchecked');
    } else {
      checkbox.classList.add('indeterminate');
    }
  }

  // Create package filter UI
  createPackageFilterUI(container, packageNames) {
    // Clear container
    container.innerHTML = '';

    // Create title
    const filterTitle = document.createElement('div');
    filterTitle.className = 'filter-title';
    container.appendChild(filterTitle);

    // If no packages, display message
    if (!packageNames || packageNames.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-message';
      emptyMessage.textContent = 'No package information in current thread';
      container.appendChild(emptyMessage);
      return;
    }

    // Create a wrapper for horizontal scrolling
    const containerWrapper = document.createElement('div');
    containerWrapper.className = 'package-filter-container';

    // Wrap the existing container with the scroll wrapper
    container.parentNode.insertBefore(containerWrapper, container);
    containerWrapper.appendChild(container);

    // Make sure the container has the right class
    container.className = 'package-filter';

    // Create checkbox for each package name
    packageNames.forEach(packageName => {
      const packageItem = document.createElement('div');
      packageItem.className = 'package-item';
      packageItem.dataset.package = packageName;
      const legendColor = this.data.getPackageColor(packageName);

      // Create checkbox container (for custom styling)
      const checkboxWrapper = document.createElement('div');
      checkboxWrapper.className = 'tri-state-checkbox';
      checkboxWrapper.dataset.package = packageName;

      // Add color indicator circle
      const colorIndicator = document.createElement('div');
      colorIndicator.className = 'color-indicator';
      colorIndicator.style.backgroundColor = legendColor || '#999'; // Use package color or default

      // Add click event
      checkboxWrapper.addEventListener('click', () => {
        this.togglePackageSelection(packageName);
      });

      // Create package name label
      const packageLabel = document.createElement('span');
      packageLabel.className = 'package-label';
      packageLabel.textContent = packageName;

      // Add elements to filter item
      packageItem.appendChild(checkboxWrapper);
      packageItem.appendChild(colorIndicator); // Add the color indicator
      packageItem.appendChild(packageLabel);

      // Add filter item to container
      container.appendChild(packageItem);
    });

    // Update all package selection states display
    this.updateAllPackageSelectionStates();
  }

  // Toggle package name selection state
  togglePackageSelection(packageName) {
    // Get current state
    const currentState = this.data.getPackageSelectionState(packageName);

    // Determine new state: if current is true or null, change to false; if current is false, change to true
    const newState = currentState === false;

    // Apply selection state to all related nodes
    const changedIds = this.data.selectByPackage(packageName, newState);

    // Update UI
    this.view.batchUpdateNodes(changedIds);

    // Update package selection state display
    this.updateAllPackageSelectionStates();

    // Update search results selection state
    this.updateSearchedItemsCheckboxUI();

    this.eventBus.publish('refreshFlame', {});
  }

  // Update all package selection states
  updateAllPackageSelectionStates() {
    // Get all package names
    const packageNames = this.data.getAllPackages();

    // Update state display for each package
    packageNames.forEach(packageName => {
      this.updatePackageCheckboxUI(packageName);
    });
  }

  // Update package checkbox UI
  updatePackageCheckboxUI(packageName) {
    // Get package selection state
    const state = this.data.getPackageSelectionState(packageName);

    // Find checkbox for corresponding package name
    const checkbox = document.querySelector(`.tri-state-checkbox[data-package="${packageName}"]`);
    if (checkbox) {
      // Update checkbox display
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

  // Filter nodes by package name
  filterByPackage(packageName, visible = true) {
    // Find all nodes belonging to this package
    const nodeIds = [];

    this.data.nodes.forEach((nodeInfo, nodeId) => {
      if (nodeInfo.data.packageName === packageName) {
        nodeIds.push(nodeId);
      }
    });

    // Apply visibility
    this.setNodesVisibility(nodeIds, visible);

    return nodeIds;
  }

  // Set node visibility
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

  // Filter nodes by method name
  filterByMethodName(query) {
    if (!query || query.trim() === '') {
      // Empty query, show all nodes
      this.resetFilter();
      return;
    }

    const normalizedQuery = query.toLowerCase();
    const matchedIds = [];
    const unmatchedIds = [];

    // Find matching nodes
    this.data.nodes.forEach((nodeInfo, nodeId) => {
      const nodeData = nodeInfo.data;
      const nodeLabel = nodeData.label || '';

      if (nodeLabel.toLowerCase().includes(normalizedQuery)) {
        matchedIds.push(nodeId);
      } else {
        unmatchedIds.push(nodeId);
      }
    });

    // Apply filter
    this.setNodesVisibility(matchedIds, true);
    this.setNodesVisibility(unmatchedIds, false);

    return matchedIds;
  }

  // Reset filter, show all nodes
  resetFilter() {
    const allNodeIds = [];

    this.data.nodes.forEach((_, nodeId) => {
      allNodeIds.push(nodeId);
    });

    this.setNodesVisibility(allNodeIds, true);

    return allNodeIds;
  }

  // Add a new method to set up event handling for current thread search results selection
  setupCurrentThreadSearchedItemsSelection() {
    // Find checkbox
    const checkboxWrapper = document.getElementById('selectAllSearchedCurrentThread');
    if (!checkboxWrapper) {
      console.error("Current thread search results selection checkbox not found!");
      return;
    }

    // Add click event
    checkboxWrapper.addEventListener('click', () => {
      this.toggleCurrentThreadSearchedItemsSelection();
    });
  }

  // Toggle current thread search results selection state
  toggleCurrentThreadSearchedItemsSelection() {
    // Get current search results in current thread only
    const currentThread = this.data.getCurrentThreadName();
    const searchResults = this.getSearchResults().filter(
      result => result.threadName === currentThread
    );

    if (!searchResults || searchResults.length === 0) return;

    // Check current state
    const selectionState = this.getCurrentThreadSearchedItemsSelectionState(searchResults);
    // If all selected or partially selected, then deselect all; if all unselected, then select all
    const newState = selectionState === true ? false : true;

    // Perform selection operation
    const changedIds = [];
    searchResults.forEach(result => {
      if (this.data.select(result.id, newState)) {
        changedIds.push(result.id);
      }
    });

    // Update UI
    if (changedIds.length > 0) {
      this.view.batchUpdateNodes(changedIds);
      this.eventBus.publish('refreshFlame', {});
    }
  }

  // Get selection state of current thread search results
  getCurrentThreadSearchedItemsSelectionState(searchResults) {
    if (!searchResults || searchResults.length === 0) return null;

    let selectedCount = 0;

    // Check selection state of each search result
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

  // Update current thread search results selection state UI
  updateCurrentThreadSearchedItemsCheckboxUI() {
    const currentThread = this.data.getCurrentThreadName();
    const searchResults = this.getSearchResults().filter(
      result => result.threadName === currentThread
    );
    const checkbox = document.getElementById('selectAllSearchedCurrentThread');

    if (!checkbox) return;

    // If no search results, disable checkbox
    if (!searchResults || searchResults.length === 0) {
      checkbox.classList.remove('checked', 'unchecked', 'indeterminate');
      checkbox.classList.add('unchecked');
      checkbox.classList.add('disabled');
      return;
    }

    // Enable checkbox
    checkbox.classList.remove('disabled');

    // Update checkbox state
    const state = this.getCurrentThreadSearchedItemsSelectionState(searchResults);

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

export { Filter };