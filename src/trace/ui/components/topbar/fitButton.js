import { getElements } from "../../views/viewState.js";
import { runLayout } from "../cytoscape/layoutManager.js";

// Now, implement the fitGraphHandler with both button and dropdown listeners
export const fitGraphHandler = () => {
    const viewModeSelector = getElements().viewModeSelector;
    // get value 
    const viewType = viewModeSelector.value;

    document.addEventListener('DOMContentLoaded', function () {
        const fitGraphButton = document.getElementById('btn-fit');
        const fitNameSelector = document.getElementById('fit-mode');
        // console.log(fitGraphButton)
        if(viewType !== "calltree")
            return;
        // Variable to store the current layout name
        let currentLayoutName = fitNameSelector.value;
        
        console.log('Fit graph button initialized with layout:', currentLayoutName);
        
        // Listen for changes to the dropdown selection
        fitNameSelector.addEventListener('change', (event) => {
            currentLayoutName = event.target.value;
            console.log('Layout selection changed to:', currentLayoutName);
            
            // Optionally, apply the new layout immediately (without fitting)
            if (window.cytrace) {
                // Apply layout but don't fit to view (preserve positions)
                runLayout(window.cytrace, currentLayoutName, false);
            }
        });
        
        // Listen for button clicks - this will apply fit
        fitGraphButton.addEventListener('click', () => {
            if (window.cytrace) {
                console.log('Applying layout with fit:', currentLayoutName);
                // When button is clicked, apply layout AND fit to view
                runLayout(window.cytrace, currentLayoutName, true);
            } else {
                console.error('Error: window.cytrace is not available');
            }
        });
    });
};

