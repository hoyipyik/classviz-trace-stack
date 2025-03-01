import { callTreeRender } from "./callTreeRender.js";

// View state management
const viewState = {
  graph: { position: null, zoom: null },
  calltree: { position: null, zoom: null }
};

// DOM element cache to avoid repeated lookups
let elements = null;

/**
 * Cache DOM elements for faster access
 * @returns {Object} Object containing DOM elements
 */
function cacheElements() {
  if (elements) return elements;
  
  elements = {
    cy: document.getElementById('cy'),
    calltree: document.getElementById('calltree'),
    sidebar: document.getElementById('sidebar'),
    infobox: document.getElementById('infobox'),
    viewModeSelector: document.getElementById('view-mode'),
    refitBtn: document.getElementById('btn-fit'),
    fitSelectionBar: document.getElementsByClassName('fit-switcher')[0]
  };
  
  return elements;
}

/**
 * Save current view state
 * @param {string} viewType - The view type being switched from
 */
function saveViewState(viewType) {
  if (!window.cytrace) return;
  
  // Determine which state to save based on the current view
  const stateKey = viewType === 'calltree' ? 'graph' : 'calltree';
  
  // Deep clone position to avoid reference issues
  viewState[stateKey].position = { ...window.cytrace.pan() };
  viewState[stateKey].zoom = window.cytrace.zoom();
  
  console.log(`Saved ${stateKey} position:`, 
    JSON.stringify(viewState[stateKey].position), 
    'zoom:', viewState[stateKey].zoom);
}

/**
 * Restore view state for the target view
 * @param {string} viewType - The view type to restore
 */
function restoreViewState(viewType) {
  if (!window.cytrace) return;
  
  const state = viewState[viewType];
  if (!state.position || !state.zoom) return;
  
  try {
    console.log(`Restoring ${viewType} position:`, 
      JSON.stringify(state.position), 'zoom:', state.zoom);
    
    // Apply zoom first, then position
    window.cytrace.zoom(state.zoom);
    window.cytrace.pan({
      x: state.position.x,
      y: state.position.y
    });
    
    console.log(`Restored ${viewType} position successfully`);
  } catch (err) {
    console.error(`Error restoring ${viewType} position:`, err);
  }
}

/**
 * Configure the UI for call tree view
 */
function setupCallTreeView() {
  const { calltree, refitBtn, fitSelectionBar } = cacheElements();
  
  // Show call tree controls
  refitBtn.style.display = 'inline';
  fitSelectionBar.style.display = 'block';
  
  // Render call tree if graph data is available
  const graph = window.graph;
  
  if (graph) {
    try {
      console.log('Rendering call tree...');
      callTreeRender(graph);
      restoreViewState('calltree');
    } catch (error) {
      console.error('Error rendering call tree:', error);
      calltree.innerHTML = `
        <div class="error-message" style="padding: 20px; color: red;">
          <h3>Error rendering call tree</h3>
          <p>${error.message}</p>
        </div>
      `;
    }
  } else {
    calltree.innerHTML = '<div style="padding: 20px;">Please upload a call trace XML file using the tree icon in the toolbar</div>';
  }
}

/**
 * Configure the UI for graph view
 */
function setupGraphView() {
  const { refitBtn, fitSelectionBar, infobox } = cacheElements();
  
  // Hide call tree controls
  refitBtn.style.display = 'none';
  fitSelectionBar.style.display = 'none';
  
  // Reset infobox style
  infobox.removeAttribute('style');
  
  // Restore graph position
  restoreViewState('graph');
}

/**
 * Switch between different visualization views
 * @param {string} viewType - The view type to switch to ('calltree' or 'graph')
 */
const switchView = (viewType) => {
  console.log(`Switching view to: ${viewType}`);
  
  const els = cacheElements();
  
  // Update selector if needed
  if (els.viewModeSelector.value !== viewType) {
    els.viewModeSelector.value = viewType;
  }
  
  // Save current view state before switching
  saveViewState(els.viewModeSelector.value);
  
  if (viewType === 'calltree') {
    // Hide graph elements
    els.cy.style.display = 'none';
    els.sidebar.style.display = 'none';
    els.infobox.style.display = 'none';
    
    // Show call tree
    els.calltree.style.display = 'flex';
    
    setupCallTreeView();
  } else {
    // Show graph elements
    els.cy.style.display = 'block';
    els.sidebar.style.display = 'block';
    els.infobox.style.display = 'block';
    
    // Hide call tree
    els.calltree.style.display = 'none';
    
    setupGraphView();
  }
  
  console.log(`View switched to: ${viewType}`);
};

/**
 * Initialize view and set up event listeners
 */
export const renderView = () => {
  const viewModeSelector = document.getElementById('view-mode');
  viewModeSelector.addEventListener('change', function() {
    switchView(this.value);
  });
};

/**
 * Function to trigger re-rendering based on current selection
 * @param {boolean} refresh - Whether to reset view states
 */
export const rerender = (refresh = false) => {
  const currentViewMode = document.getElementById('view-mode').value;
  
  if (refresh) {
    console.log('Refreshing view...');
    viewState.graph = { position: null, zoom: null };
    viewState.calltree = { position: null, zoom: null };
  } else {
    console.log('Re-rendering view...');
  }
  
  switchView(currentViewMode);
};

/**
 * Initialize the view when DOM is loaded
 */
export const viewSwitcher = () => {
  document.addEventListener('DOMContentLoaded', renderView);
};