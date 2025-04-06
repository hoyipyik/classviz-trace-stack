/**
 * Flame Graph Module
 * A collection of functions for managing the flame graph visualization with a draggable container
 */

import { updateTraceNodesOnClassviz } from "../trace/utils/traceNodeOnClassviz/nodeManager.js";
import { FlameGraphService } from "./services/flameGraphMain.js";
// Export the flame graph plugin loader
export const loadFlameGraphPlugin = () => {
    const service = new FlameGraphService();
    // updateTraceNodesOnClassviz();
    // Use 'DOMContentLoaded' for better performance than document.readyState check
    if (document.readyState === 'loading') {
        document.addEventListener("DOMContentLoaded", service.initialize);
    } else {
        // Document already loaded, run immediately
        service.initialize();
    }
    
    // Return the service for potential external references
    return service;
};