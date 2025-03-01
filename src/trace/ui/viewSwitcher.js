import { callTreeRender } from "./callTreeRender.js";

// Variables to store graph position state
let graphPosition = null;
let graphZoom = null;
let calltreePosition = null;
let calltreeZoom = null;

// Helper function to handle view switching - defined outside to be accessible to multiple functions
const switchView = (viewType) => {
    console.log(`Switching view to: ${viewType}`);

    const cyElement = document.getElementById('cy');
    const callTreeElement = document.getElementById('calltree');
    const sidebarElement = document.getElementById('sidebar');
    const infoboxElement = document.getElementById('infobox');

    // Update the selector value if it doesn't match the requested view type
    const viewModeSelector = document.getElementById('view-mode');
    if (viewModeSelector.value !== viewType) {
        viewModeSelector.value = viewType;
    }

    if (viewType === 'calltree') {
        console.log('Switching to call tree view');
        const refitBtn = document.getElementById('btn-fit');
        refitBtn.style.display = 'inline';
        const fitSelectionBar = document.getElementsByClassName('fit-switcher')[0];
        fitSelectionBar.style.display = 'block';

        // Save current graph position and zoom before hiding
        if (window.cytrace) {
            // Deep clone the position object to avoid reference issues
            graphPosition = { ...window.cytrace.pan() };
            graphZoom = window.cytrace.zoom();
            console.log('Saved graph position:', JSON.stringify(graphPosition), 'zoom:', graphZoom);
        }

        // Hide class diagram elements
        cyElement.style.display = 'none';
        sidebarElement.style.display = 'none';
        infoboxElement.style.display = 'none';

        // Show call tree
        callTreeElement.style.display = 'flex';

        const graph = window.graph;
        console.log('Graph available:', !!graph);

        if (graph) {
            try {
                // Always call callTreeRender when switching to call tree view
                console.log('Rendering call tree...');
                callTreeRender(graph);

                // Restore call tree position if available - use a longer timeout to ensure rendering completes
                if (window.cytrace && calltreePosition && calltreeZoom) {
                    // setTimeout(() => {
                    try {
                        console.log('About to restore calltree position:', JSON.stringify(calltreePosition), 'zoom:', calltreeZoom);

                        // First set zoom
                        window.cytrace.zoom(calltreeZoom);

                        // Then pan to position - explicitly pass x and y coordinates
                        window.cytrace.pan({
                            x: calltreePosition.x,
                            y: calltreePosition.y
                        });

                        console.log('Restored calltree position successfully');
                    } catch (err) {
                        console.error('Error while restoring calltree position:', err);
                    }
                    // }, 1000);
                }
            } catch (error) {
                console.error('Error rendering call tree:', error);
                callTreeElement.innerHTML = `
                    <div class="error-message" style="padding: 20px; color: red;">
                        <h3>Error rendering call tree</h3>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        } else {
            callTreeElement.innerHTML =
                '<div style="padding: 20px;">Please upload a call trace XML file using the tree icon in the toolbar</div>';
        }
    } else {
        console.log('Switching to graph view');
        const refitBtn = document.getElementById('btn-fit');
        refitBtn.style.display = 'none';
        const fitSelectionBar = document.getElementsByClassName('fit-switcher')[0];
        fitSelectionBar.style.display = 'none';

        // Save call tree position and zoom if available
        if (window.cytrace) {
            // Deep clone the position object to avoid reference issues
            calltreePosition = { ...window.cytrace.pan() };
            calltreeZoom = window.cytrace.zoom();
            console.log('Saved calltree position:', JSON.stringify(calltreePosition), 'zoom:', calltreeZoom);
        }

        // Show class diagram elements
        cyElement.style.display = 'block';
        sidebarElement.style.display = 'block';
        infoboxElement.style.display = 'block';
        infoboxElement.removeAttribute('style');

        // Hide call tree
        callTreeElement.style.display = 'none';

        // Restore graph position and zoom if available - use a longer timeout
        if (window.cytrace && graphPosition && graphZoom) {
            try {
                // setTimeout(() => {
                try {
                    console.log('About to restore graph position:', JSON.stringify(graphPosition), 'zoom:', graphZoom);

                    // First set zoom
                    window.cytrace.zoom(graphZoom);

                    // Then pan to position - explicitly pass x and y coordinates
                    window.cytrace.pan({
                        x: graphPosition.x,
                        y: graphPosition.y
                    });

                    console.log('Restored graph position successfully');
                } catch (err) {
                    console.error('Error while restoring graph position:', err);
                }
                // }, 200); // Increased delay to ensure UI has updated
            } catch (error) {
                console.error('Error restoring graph position:', error);
            }
        }
    }

    console.log(`View switched to: ${viewType}`);
}

// Initialize view and set up event listeners
export const renderView = () => {
    const viewModeSelector = document.getElementById('view-mode');

    // Initialize view mode selector event listener
    viewModeSelector.addEventListener('change', function () {
        switchView(this.value);
    });
};

// Function to trigger re-rendering based on current selection
export const rerender = (refresh = false) => {
    const currentViewMode = document.getElementById('view-mode').value;
    if (refresh) {
        console.log('Refreshing view...');
        graphPosition = null;
        graphZoom = null;
        calltreePosition = null;
        calltreeZoom = null;
    } else {
        console.log('Re-rendering view...');
    }
    switchView(currentViewMode);
};

// Initialize the view when DOM is loaded
export const viewSwitcher = () => {
    document.addEventListener('DOMContentLoaded', renderView);
};