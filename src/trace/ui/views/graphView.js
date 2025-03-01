// ui/views/graphView.js
// Handles graph view specific functionality

import { getElements, restoreViewState } from "./viewState.js";

/**
 * Show UI elements for graph view
 */
function showGraphElements() {
  const { cy, calltree, sidebar, infobox } = getElements();
  
  // Show graph elements
  cy.style.display = 'block';
  sidebar.style.display = 'block';
  infobox.style.display = 'block';
  
  // Hide call tree
  calltree.style.display = 'none';
}

/**
 * Hide call tree control elements
 */
function hideCallTreeControls() {
  const { refitBtn, fitSelectionBar } = getElements();
  
  // Hide call tree controls
  refitBtn.style.display = 'none';
  fitSelectionBar.style.display = 'none';
}

/**
 * Reset any styles that might have been modified
 */
function resetStyles() {
  const { infobox } = getElements();
  
  // Reset infobox style to default
  infobox.removeAttribute('style');
}

/**
 * Set up the graph view
 */
export function setupGraphView() {
  showGraphElements();
  hideCallTreeControls();
  resetStyles();
  restoreViewState('graph');
}