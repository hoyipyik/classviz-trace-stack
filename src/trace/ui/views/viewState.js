// ui/views/viewState.js
// Handles view state management and DOM element caching

// View state storage
const viewState = {
    graph: { position: null, zoom: null },
    calltree: { position: null, zoom: null }
  };
  
  // DOM element cache
  let elements = null;
  
  /**
   * Cache DOM elements for faster access
   * @returns {Object} Object containing DOM elements
   */
  export function getElements() {
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
   * Save current position and zoom state
   * @param {string} viewType - The view type being switched from
   */
  export function saveViewState(viewType) {
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
   * Restore view position and zoom for the target view
   * @param {string} viewType - The view type to restore
   */
  export function restoreViewState(viewType) {
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
   * Reset all view states
   */
  export function resetViewState() {
    viewState.graph = { position: null, zoom: null };
    viewState.calltree = { position: null, zoom: null };
  }