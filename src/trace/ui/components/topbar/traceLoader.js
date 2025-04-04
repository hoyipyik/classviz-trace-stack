import { callTreeParser } from "../../../utils/process/callTreeParser.js";
import { xmlFileReader } from "../../../utils/process/xmlFileReader.js";
// import { updateTraceNodesOnClassviz } from "../../../utils/traceNodeOnClassviz/nodeManager.js";
import { renderCallTree } from "../../renderers/callTree/index.js";
import { rerender } from "../../views/index.js";
import {loadFlameGraphPlugin} from "../../../../flame/index.js"

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
                renderCallTree(graph);
                loadFlameGraphPlugin();
                // updateTraceNodesOnClassviz();

            }
        });
    });
}
