
import { TraceStackApp } from "../TraceStackApp.js";
import { $ } from "../../shorthands.js";

export const loadFlameGraphPlugin = (cascadeTree, nodeMap, rootNode, packageColorMap, idRangeByThreadMap) => {
    // const service = new FlameGraphService(cascadeTree, nodeMap, rootNode, packageColorMap, idRangeByThreadMap);
    const traceStackApp = new TraceStackApp(cascadeTree, idRangeByThreadMap);
    document.getElementById('mainContent').style.display = 'block'; // Show the main content
    $("#btn-relayout").click();
    // updateTraceNodesOnClassviz();
    // Use 'DOMContentLoaded' for better performance than document.readyState check
    // if (document.readyState === 'loading') {
    //     document.addEventListener("DOMContentLoaded", service.initialize);
    // } else {
    //     // Document already loaded, run immediately
    //     service.initialize();
    // }

    // Return the service for potential external references
    return traceStackApp;
};