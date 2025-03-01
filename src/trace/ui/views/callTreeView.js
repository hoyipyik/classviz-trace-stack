// ui/views/callTreeView.js
// Handles call tree view specific functionality

import { renderCallTree } from "../renderers/callTree/index.js";
import { getElements, restoreViewState } from "./viewState.js";
import { displayError, displayLoadingMessage } from "../components/error/errorMessages.js";

/**
 * Show UI elements for call tree view
 */
function showCallTreeElements() {
  const { cy, calltree, sidebar, infobox } = getElements();
  
  // Hide graph elements
  cy.style.display = 'none';
  sidebar.style.display = 'none';
  infobox.style.display = 'none';
  
  // Show call tree
  calltree.style.display = 'flex';
}

/**
 * Show call tree control elements
 */
function showCallTreeControls() {
  const { refitBtn, fitSelectionBar } = getElements();
  
  // Show call tree controls
  refitBtn.style.display = 'inline';
  fitSelectionBar.style.display = 'block';
}

/**
 * Display a placeholder message when no graph data is available
 */
function displayCallTreePlaceholder() {
  const { calltree } = getElements();
  
  calltree.innerHTML = '<div style="padding: 20px;">Please upload a call trace XML file using the tree icon in the toolbar</div>';
}

/**
 * Render the call tree with the current graph data
 */
function renderCallTreeView() {
  const { calltree } = getElements();
  const graph = window.graph;
  
  if (graph) {
    try {
      console.log('Rendering call tree...');
    //   displayLoadingMessage(calltree, 'Rendering call tree...');
      
      // Clear the loading message before rendering
    //   setTimeout(() => {
        calltree.innerHTML = '';
        const cy = renderCallTree(graph);
        
        if (!cy) {
          throw new Error('Failed to initialize call tree renderer');
        }
    //   }, 10); // Slight delay to allow loading message to appear
    } catch (error) {
      console.error('Error rendering call tree:', error);
      displayError(calltree, error);
    }
  } else {
    displayCallTreePlaceholder();
  }
}

/**
 * Set up the call tree view
 */
export function setupCallTreeView() {
  showCallTreeElements();
  showCallTreeControls();
  renderCallTreeView();
  
  // Restore view state after a short delay to ensure the call tree is rendered
//   setTimeout(() => {
    restoreViewState('calltree');
//   }, 100);
}