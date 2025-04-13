import { CONSTANTS } from "./contants.js";
import { FlameGraphUIController } from "./flameUIController.js";
import { FlameGraphRenderer } from "./flameRenderer.js";
import { FlameGraphSelectionManager } from "./selectionManager.js";
import { FlameSidebarController } from "./sidebarController.js";
import { TraceDataManager } from "./traceDataManager.js";
import { MethodsDisplayManager } from "./methodDisplayManager.js";

/**
 * FlameGraph service that ties everything together
 */
export class FlameGraphService {
    constructor(cascadeTreeData, nodeMap, rootNode, packageColorMap, idRangeByThreadMap) {
        this.sharedStates = {
            traceMode: false
        }
        // Core data management
        this.methodDisplayManager = new MethodsDisplayManager(window.cy, rootNode, nodeMap, this.sharedStates);
        this.dataManager = new TraceDataManager(this.methodDisplayManager, cascadeTreeData, nodeMap);
        this.selectionManager = new FlameGraphSelectionManager(this.dataManager);
        
        // Visualization components
        this.renderer = new FlameGraphRenderer(CONSTANTS.CHART_SELECTOR, this.selectionManager);
        this.uiController = null;
        this.sidebarController = null;
        this.traceDataMap = null;
        this.packageColorMap = packageColorMap;
     
        this.idRangeByThreadMap = idRangeByThreadMap;

        // Bind methods
        this.initialize = this.initialize.bind(this);

        // Set up callbacks
        this.methodDisplayManager.setThreadClassNamesCallback(() => 
            this.dataManager.getThreadClassNames()
        );
    }

    initialize() {
        console.log("Flame Graph Plugin Loaded");
        
        // Initialize core data
        this.dataManager.initialize();
        
        // Initialize visualization
        this.renderer.createFlameGraph();
        
        // Initialize UI controllers
        this.uiController = new FlameGraphUIController(
            CONSTANTS.CONTAINER_ID, 
            this.renderer, 
            this.selectionManager
        );
        this.uiController.initialize();

        this.sidebarController = new FlameSidebarController(
            CONSTANTS.SIDEBAR_ID, 
            this.dataManager, 
            this.renderer, 
            this.uiController, 
            this.selectionManager,
            this.packageColorMap,
            this.idRangeByThreadMap,
            this.sharedStates
        );
        this.sidebarController.initialize();

        // Set up event handlers
        this.renderer.onNodeClick = (nodeData) => {
            this.uiController.updateDetailsElement(nodeData);
        };

        this.renderer.onSelectionChange = () => {
            this.uiController.updateSelectionCountDisplay();
        };

        this.selectionManager.setDataRefreshCallback(() => {
            this.sidebarController.renderData();
        });

        this.dataManager.subscribe((newData, options) => {
            this.sidebarController.updateFromManager(newData);
            
            if (options.updateSelection) {
                this.selectionManager.updateSelectedNodes(newData);
            }
        });

        this.methodDisplayManager.updateMethodsOnClassviz();
    }
}