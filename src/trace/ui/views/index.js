// ui/views/index.js
// Main entry point for view management

import { setupViewModeListener, switchView } from './viewSwitcher.js';
import { resetViewState } from './viewState.js';

/**
 * Initialize the view system when DOM is loaded
 */
export const viewSwitcher = () => {
    setupViewModeListener();
};

/**
 * Re-render current view or refresh the view system
 * @param {boolean} refresh - Whether to reset all view states
 */
export const rerender = (refresh = false) => {
  const currentViewMode = document.getElementById('view-mode').value;
  
  if (refresh) {
    console.log('Refreshing view...');
    resetViewState();
  } else {
    console.log('Re-rendering view...');
  }
  
  switchView(currentViewMode);
};
