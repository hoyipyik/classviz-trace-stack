import { CONSTANTS } from "./contants.js";
import { FlameGraphUIController } from "./flameUIController.js";
import { FlameGraphRenderer } from "./flameRenderer.js";
import { FlameGraphSelectionManager } from "./selectionManager.js";
import { extractTraceByThread } from "../utils/extractDataFromCytrace.js";
import { FlameSidebarController } from "./sidebarController.js";


/**
 * FlameGraph service that ties everything together
 */
export class FlameGraphService {
    constructor() {
        this.selectionManager = new FlameGraphSelectionManager();
        this.renderer = new FlameGraphRenderer(CONSTANTS.CHART_SELECTOR, this.selectionManager);
        this.uiController = null;
        this.traceDataMap = null;
        this.sidebarController = null;
        
        // Bind methods
        this.initialize = this.initialize.bind(this);
    }
    
    initialize() {
        console.log("Flame Graph Plugin Loaded");
        
        // Create the flame graph
        this.renderer.createFlameGraph();
        
        // Set up UI controller
        this.uiController = new FlameGraphUIController(CONSTANTS.CONTAINER_ID, this.renderer, this.selectionManager);
        this.uiController.initialize();
        
        // Set up callback handlers
        this.renderer.onNodeClick = (nodeData) => {
            this.uiController.updateDetailsElement(nodeData);
        };
        
        this.renderer.onSelectionChange = (count) => {
            this.uiController.updateSelectionCountDisplay();
        };

        // load data from cytrace
        this.traceDataMap = extractTraceByThread();

        // set up sidebar ui
        this.sidebarController = new FlameSidebarController(CONSTANTS.SIDEBAR_ID, this.traceDataMap, this.renderer, this.uiController);
        this.sidebarController.initialize();
        
        // Load data (use promise-based approach for better error handling)
        // this.loadData();
    }


    
    // loadDataFromJson() {
    //     // Use Fetch API for better Promise support
    //     fetch("stacks.json")
    //         .then(response => {
    //             if (!response.ok) {
    //                 throw new Error(`HTTP error! Status: ${response.status}`);
    //             }
    //             return response.json();
    //         })
    //         .then(data => {
    //             this.renderer.renderData(data);
    //         })
    //         .catch(error => {
    //             console.warn("Failed to load stacks.json:", error);
    //             this.renderer.showError(`The stacks.json file could not be loaded. Error: ${error.message || 'Unknown error'}`);
    //         });
    // }
}