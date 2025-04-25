/**
 * ViewSwitcher - Manages switching between different view modes
 */
export class ViewSwitcher {
  /**
   * Create a view switcher
   * @param {Object} dataStore - Data store instance
   * @param {Object} flameGraphRenderer - Flame graph renderer instance
   * @param {Object} eventBus - Event bus instance
   */
  constructor(dataStore, flameGraphRenderer, eventBus) {
    this.data = dataStore;
    this.flameGraph = flameGraphRenderer;
    this.eventBus = eventBus;
    
    // Current view mode: 'callTree' or 'flameGraph'
    this.data.currentViewMode = 'callTree';
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the view switcher
   */
  init() {
    // Subscribe to view mode changed events from sidebar
    if (this.eventBus) {
      this.eventBus.subscribe('viewModeChanged', (data) => {
        if (data && data.mode) {
          this.switchViewMode(data.mode);
        }
      });
    }
  }
  
  /**
   * Switch tab active state based on view name
   * @param {string} viewMode - View mode name ('callTree' or 'flameGraph')
   */
  switchTabActive(viewMode) {
    const tabs = document.querySelectorAll('.tab[data-view]');
    
    tabs.forEach(tab => {
      if (tab.getAttribute('data-view') === viewMode) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    // Also update icons in collapsed sidebar
    const icons = document.querySelectorAll('.sidebar-icon[data-view]');
    icons.forEach(icon => {
      if (icon.getAttribute('data-view') === viewMode) {
        icon.classList.add('active');
      } else {
        icon.classList.remove('active');
      }
    });
  }
  
  /**
   * Switch view mode
   * @param {string} mode - View mode name ('callTree' or 'flameGraph')
   */
  switchViewMode(mode) {
    if (this.data.currentViewMode === mode) return;
    
    this.data.currentViewMode = mode;
    
    // Update tab active state
    this.switchTabActive(mode);
    
    // Update UI display
    if (mode === 'flameGraph') {
      // Show flame graph, hide call tree
      this.flameGraph.showFlameGraph();
    } else {
      // Show call tree, hide flame graph
      this.flameGraph.hideFlameGraph();
    }
    
    // Trigger view mode change event
    if (this.eventBus) {
      this.eventBus.publish('viewModeChanged', {
        mode: mode
      });

      if(mode !== 'flameGraph'){
        this.eventBus.publish('scrollToFocusedNode', {});
      }
    }
  }
  
  /**
   * Toggle flame graph mode (logical/temporal)
   */
  toggleFlameGraphMode() {
    // Toggle mode
    this.data.showLogical = !this.data.showLogical;
    
    // Update flame graph
    this.flameGraph.update();
    
    // Trigger view mode change event
    if (this.eventBus) {
      this.eventBus.publish('flameGraphModeChanged', {
        logical: this.data.showLogical
      });
    }
  }
  
  /**
   * Get current view mode
   * @returns {string} Current view mode
   */
  getCurrentViewMode() {
    return this.data.currentViewMode;
  }
}