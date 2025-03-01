import { runLayout } from "../ui/cytoscapeHandler.js";
import { rerender } from "../ui/viewSwitcher.js";
import { callTreeParser } from "../utils/process/callTreeParser.js";
import { xmlFileReader } from "../utils/process/xmlFileReader.js";

export const traceLoader = () => {
    document.addEventListener('DOMContentLoaded', function () {
        console.log('Trace file loader initialized');
        const traceButton = document.getElementById('trace-btn');
        const fileInput = document.getElementById('call-tree-selector');

        // Add event listener to the button
        traceButton.addEventListener('click', () => {
            fileInput.click(); // Trigger the file input click
            console.log('Button clicked');
        });

        // Add event listener to the file input
        fileInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (file) {
                const parsedXml = await xmlFileReader(file);
                // console.log("context", window.context);
                const { nodes: parsedNodes, edges: parsedEdges, style } = callTreeParser(parsedXml);
                const graph = { nodes: parsedNodes, edges: parsedEdges, style };
                window.graph = graph;
                rerender(true);
                // console.log("parseXML", parsedXml);
            }
        });
    });
}


// Now, implement the fitGraphHandler with both button and dropdown listeners
export const fitGraphHandler = () => {
    document.addEventListener('DOMContentLoaded', function () {
        const fitGraphButton = document.getElementById('btn-fit');
        const fitNameSelector = document.getElementById('fit-mode');
        
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

