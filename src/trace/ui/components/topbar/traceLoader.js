import { callTreeParser } from "../../../utils/process/callTreeParser.js";
import { xmlFileReader } from "../../../utils/process/xmlFileReader.js";

import { loadFlameGraphPlugin } from "../../../cmd/index.js"
// 全局變量來追踪當前的應用實例
let currentTraceStackApp = null;

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
                if (currentTraceStackApp) {
                    currentTraceStackApp = null;
                    const llmContainer = document.getElementById('llmExplanation');
                    if (llmContainer) {
                        llmContainer.innerHTML = '';
                        console.log('LLM explanation container cleared');
                    }

                    console.log('Previous TraceStackApp instance cleared');
                }

                const parsedXml = await xmlFileReader(file);
                console.log("context", window.context);
                const { cascadeTree, nodeMap, rootNode, packageColorMap, idRangeByThreadMap } = callTreeParser(parsedXml);

                currentTraceStackApp = loadFlameGraphPlugin(cascadeTree, nodeMap, rootNode, packageColorMap, idRangeByThreadMap);
            }
        });
    });
}
