/**
 * UI control and thread management
 */
export class SearchUIController {
  constructor(search) {
    this.search = search;
  }

  /**
   * Function to manually switch threads
   */
  switchThreadUI(threadName) {
    const threadSelect = document.getElementById('threadSelect');

    if (!threadSelect) {
      console.error('Thread select element not found in DOM');
      return false;
    }

    if (threadSelect.value === threadName) {
      console.log(`Already on thread: ${threadName}`);
      return false;
    }

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

    threadSelect.value = threadName;
    threadSelect.title = threadName;

    console.log(`Thread switched to: ${threadName}`);
    return true;
  }

  toggleStepByStepMode(enabled) {
    const toggleInput = document.querySelector('#stepByStepPlay input[type="checkbox"]');

    if (!toggleInput) {
      console.error('Step-by-step mode toggle not found in DOM');
      return false;
    }

    if (toggleInput.checked === enabled) {
      return true;
    }

    toggleInput.checked = enabled;

    const toggleSlider = toggleInput.nextElementSibling;
    if (toggleSlider) {
      toggleSlider.style.backgroundColor = enabled ? '#337ab7' : '#d1d5db';
      const sliderButton = toggleSlider.querySelector('span');
      if (sliderButton) {
        sliderButton.style.left = enabled ? '18px' : '2px';
      }
    }

    console.log(`Step-by-step mode ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  }

  /**
   * Update the search results display
   */
  updateResultsDisplay(threadName = null) {
    const resultsElement = document.getElementById('searchResults');
    if (!resultsElement) return;

    if (this.search.searchResults.length === 0) {
      resultsElement.textContent = '';
      return;
    }

    const currentThread = threadName || this.search.data.getCurrentThreadName();
    let resultText = '';

    if (this.search.currentResultIndex >= 0) {
      const currentResult = this.search.searchResults[this.search.currentResultIndex];
      const isInCurrentThread = currentResult.threadName === currentThread;

      if (isInCurrentThread) {
        const currentThreadResults = this.search.searchResults.filter(
          r => r.threadName === currentThread
        );
        const threadIndex = currentThreadResults.findIndex(
          r => r.id === currentResult.id
        );
        if (threadIndex >= 0) {
          resultText = `${threadIndex + 1}/${this.search.currentThreadResultsCount} in current thread | `;
        }
      } else {
        resultText = `In thread: ${currentResult.threadName} | `;
      }
      resultText += `${this.search.currentResultIndex + 1}/${this.search.totalResultsCount} total results`;
    } else if (this.search.searchResults.length > 0) {
      resultText = `0/${this.search.currentThreadResultsCount} in current thread | 0/${this.search.totalResultsCount} total results`;
    }

    resultsElement.textContent = resultText;
  }
}
