// SidebarController.js - Manages the responsive sidebar

/**
 * Sidebar Controller
 * Manages the sidebar UI and interactions
 */
export class SidebarController {
    constructor(eventBus) {
      this.eventBus = eventBus;
      this.sidebarElement = document.getElementById('sidebar-container');
      
      // Initialize
      this.init();
    }
    
    /**
     * Initialize the sidebar-container controller
     */
    init() {
      // Setup tab switching
      this.setupTabSwitching();
    }
    
    
    /**
     * Setup tab switching in expanded sidebar-container mode
     */
    setupTabSwitching() {
      const tabs = document.querySelectorAll('.tab[data-view]');
      
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const viewMode = tab.getAttribute('data-view');
          
          // Remove active class from all tabs
          tabs.forEach(t => t.classList.remove('active'));
          
          // Add active class to clicked tab
          tab.classList.add('active');
          
          // Trigger view change
          if (this.eventBus) {
            this.eventBus.publish('viewModeChanged', { mode: viewMode });
          }
        });
      });
    }
    
    /**
     * Update tab/icon states based on the current view mode
     * @param {string} viewMode - The current view mode ('callTree' or 'flameGraph')
     */
    updateViewModeUI(viewMode) {
      // Update tabs in expanded mode
      const tabs = document.querySelectorAll('.tab[data-view]');
      tabs.forEach(tab => {
        if (tab.getAttribute('data-view') === viewMode) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });
      
      // Update icons in collapsed mode
      const icons = document.querySelectorAll('.sidebar-container-icon[data-view]');
      icons.forEach(icon => {
        if (icon.getAttribute('data-view') === viewMode) {
          icon.classList.add('active');
        } else {
          icon.classList.remove('active');
        }
      });
    }
  }