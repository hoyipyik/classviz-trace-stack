import { callTreeRender } from "./callTreeRender.js";

// Helper function to handle view switching - defined outside to be accessible to multiple functions
const switchView = (viewType) => {
    const cyElement = document.getElementById('cy');
    const callTreeElement = document.getElementById('calltree');
    const sidebarElement = document.getElementById('sidebar');
    const infoboxElement = document.getElementById('infobox');
    
    if (viewType === 'calltree') {
        // Hide class diagram elements
        cyElement.style.display = 'none';
        sidebarElement.style.display = 'none';
        infoboxElement.style.display = 'none';

        // Show call tree
        callTreeElement.style.display = 'flex';
       
        const graph = window.graph;
        if (graph) {
            callTreeRender(graph);
        } else {
            callTreeElement.innerHTML = 
                'Please upload a call trace XML file using the tree icon in the toolbar';
        }
    } else {
        // Show class diagram elements
        cyElement.style.display = 'block';
        sidebarElement.style.display = 'block';
        infoboxElement.style.display = 'block';
        infoboxElement.removeAttribute('style');

        // Hide call tree
        callTreeElement.style.display = 'none';
    }
};

// Initialize view and set up event listeners
export const renderView = () => {
    const viewModeSelector = document.getElementById('view-mode');
    
    // Initialize view mode selector event listener
    viewModeSelector.addEventListener('change', function() {
        switchView(this.value);
    });
};

// Function to trigger re-rendering based on current selection
export const rerender = () => {
    const currentViewMode = document.getElementById('view-mode').value;
    switchView(currentViewMode);
};

// Initialize the view when DOM is loaded
export const viewSwitcher = () => {
    document.addEventListener('DOMContentLoaded', renderView);
};