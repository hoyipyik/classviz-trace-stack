// ui/views/viewSwitcher.js
// Handles view switching logic

import { getElements, saveViewState } from "./viewState.js";
import { setupCallTreeView } from "./callTreeView.js";
import { setupGraphView } from "./graphView.js";

/**
 * Switch between different visualization views
 * @param {string} viewType - The view type to switch to ('calltree' or 'graph')
 */
export function switchView(viewType) {
  console.log(`Switching view to: ${viewType}`);
  
  const els = getElements();
  
  // Update selector if needed
  if (els.viewModeSelector.value !== viewType) {
    els.viewModeSelector.value = viewType;
  }
  
  // Save current view state before switching
  if(window.cytrace)
  saveViewState(els.viewModeSelector.value);
  
  // Set up the appropriate view
  if (viewType === 'calltree') {
    setupCallTreeView();
  } else {
    setupGraphView();
  }
  
  console.log(`View switched to: ${viewType}`);
}

/**
 * Set up event listener for the view mode selector
 */
export function setupViewModeListener() {
  const { viewModeSelector } = getElements();
  
  viewModeSelector.addEventListener('change', function() {
    switchView(this.value);
  });
}