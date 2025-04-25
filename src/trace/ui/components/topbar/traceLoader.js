import { callTreeParser } from "../../../utils/process/callTreeParser.js";
import { xmlFileReader } from "../../../utils/process/xmlFileReader.js";

import { loadFlameGraphPlugin } from "../../../../flame/index.js"

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
                console.log("context", window.context);
                const { cascadeTree, nodeMap, nodes: parsedNodes, rootNode,
                    edges: parsedEdges, cytoscapeStyles: style, packageColorMap, idRangeByThreadMap } = callTreeParser(parsedXml);
                // const graph = { nodes: parsedNodes, edges: parsedEdges, style };
                // renderCallTree(graph);
                loadFlameGraphPlugin(cascadeTree, nodeMap, rootNode, packageColorMap, idRangeByThreadMap);
                // download cascadeTree as json
                // const cascadeTreeJson = JSON.stringify(cascadeTree, null, 2); // Added null and 2 for pretty printing
                // const blob = new Blob([cascadeTreeJson], { type: 'application/json' });
                // const url = URL.createObjectURL(blob);
                // const a = document.createElement('a');
                // a.href = url;
                // a.download = 'cascadeTree.json';
                // a.click();
                // URL.revokeObjectURL(url);

            }
        });
    });
}
