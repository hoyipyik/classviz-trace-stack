/**
 * Flame Graph Module
 * A collection of functions for managing the flame graph visualization with a draggable container
 */
import { TraceStackApp } from "../visual/TraceStackApp.js";
import { FlameGraphService } from "./services/flameGraphMain.js";
// Export the flame graph plugin loader
export const loadFlameGraphPlugin = (cascadeTree, nodeMap, rootNode, packageColorMap, idRangeByThreadMap) => {
    // const service = new FlameGraphService(cascadeTree, nodeMap, rootNode, packageColorMap, idRangeByThreadMap);
    const traceStackApp = new TraceStackApp(cascadeTree, nodeMap, rootNode);
    document.getElementById('mainContent').style.display = 'block'; // Show the main content
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