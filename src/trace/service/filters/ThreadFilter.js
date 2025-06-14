// ThreadFilter.js - Handle thread switching and filtering
export class ThreadFilter {
  constructor(dataStore, renderer, eventBus, search) {
    this.data = dataStore;
    this.view = renderer;
    this.eventBus = eventBus;
    this.search = search;
  }

  setup() {
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
    this.createUI(filterContainer, threadNames);
  }

  createUI(container, threadNames) {
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

  switchThread(threadName) {
    if (this.data.switchThread(threadName)) {
      console.log(`Thread switched to: ${threadName}`);

      // Re-render the tree (this will trigger the threadChanged event, which will update the UI)
      this.view.renderTree();
    } else {
      console.error(`Failed to switch to thread: ${threadName}`);
    }
  }

  updateUI(currentThreadName) {
    const select = document.getElementById('threadSelect');
    if (select) {
      select.value = currentThreadName;
    }
  }
}
