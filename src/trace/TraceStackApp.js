// TraceStackApp.js - Main application entry point
import { DataStore } from './data/DataStore.js';
import { Renderer } from './ui/components/diagram/Renderer.js';
import { Actions } from './ui/components/widgets/Actions.js';
import { Search } from './service/Search.js';
import { Filter } from './service/Filter.js';
import { EventBus } from './events/EventBus.js';
import { MethodDetails } from './ui/components/widgets/MethodDetails.js';
import { FlameGraphRenderer } from './ui/components/diagram/FlameGraphRenderer.js';
import { ViewSwitcher } from './ui/components/diagram/ViewSwitcher.js'; // Add new import
import { ResizeManager } from './ui/components/widgets/ResizeManager.js';
import { SidebarController } from './ui/components/widgets/SidebarController.js';
import { ClassvizManager } from './service/ClassvizManager.js'; // Import ClassvizManager
import { StepByStepPlayController } from './service/StepByStepPlayController.js';
import { Explainer } from './service/Explainer.js';
import { AiService } from './service/AiService.js';
import { ExplanationUIController } from './ui/components/widgets/ExplanationUIController.js';
import { RegionFocusManager } from './service/RegionFocusManager.js';

/**
 * Call Tree Visualization Application Main Entry
 */
class TraceStackApp {
  constructor(rawThreadData, idRangeByThreadMap) {
    this.rawData = rawThreadData || null; // Raw data from external source
    this.idRangeByThreadMap = idRangeByThreadMap || null; // ID range map for threads  
    //   this.sharedStates = {
    //     traceMode: false
    // }
    // this.methodDisplayManager = new MethodsDisplayManager(window.cy, rootNode, nodeMap, this.sharedStates);

    // Module instances
    this.data = null;    // DataStore instance
    this.view = null;    // Renderer instance
    this.actions = null; // Actions instance
    this.search = null;  // Search instance
    this.filter = null;  // Filter instance
    this.methodDetails = null; // MethodDetails instance
    this.flameGraph = null; // FlameGraphRenderer instance
    this.viewSwitcher = null; // ViewSwitcher instance]
    this.sidebar = null; // SidebarController instance
    this.aiService = null; // AiService instance
    this.explainer = null; // Explainer instance
    this.resizeManager = new ResizeManager(); // Draggable resize manager
    this.explanationUIController = null; // ExplanationUIController instance
    this.regionFocusManager = null;  // Region focus manager

    // Create event bus
    this.eventBus = new EventBus();

    // Initialize
    this.init();
  }

  // Initialize application
  init() {
    // Wait for DOM to complete loading
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  // Setup application
  setup() {
    console.log("Setting up trace stack app...");

    // Load data
    // const threadsData = this.loadData();
    const threadsData = this.rawData;

    // Initialize data store
    this.data = new DataStore(threadsData, this.eventBus);

    // Initialize ai service and explainer
    this.aiService = new AiService(this.eventBus);
    this.explainer = new Explainer(this.data, this.eventBus, this.aiService);

    // Initialize methods display manager
    this.classvizManager = new ClassvizManager(this.data, window.cy, this.eventBus, this.idRangeByThreadMap);

    // Initialize StepByStepPlayController
    this.stepByStepPlayController = new StepByStepPlayController(this.eventBus, this.data, this.classvizManager);

    this.stepByStepPlayController.init();

    this.regionFocusManager = new RegionFocusManager(this.eventBus, this.data, this.classvizManager, this.explainer);

    // Get DOM container
    const container = document.getElementById('callTree');
    if (!container) {
      console.error("Call tree container not found!");
      return;
    }

    // Initialize sidebar controller 
    this.sidebar = new SidebarController(this.eventBus);

    // Initialize renderer
    this.view = new Renderer(this.data, container, this.eventBus, this.explainer, this.classvizManager);

    // Initialize flame graph renderer
    this.flameGraph = new FlameGraphRenderer(this.data, container, this.eventBus, this.explainer);

    // Initialize other modules
    this.actions = new Actions(this.data, this.view, this.eventBus);
    this.viewSwitcher = new ViewSwitcher(this.data, this.flameGraph, this.eventBus);
    this.search = new Search(this.data, this.view, this.eventBus, this.viewSwitcher);
    this.filter = new Filter(this.data, this.view, this.eventBus, this.search);
    this.methodDetails = new MethodDetails(this.data, this.eventBus);

    this.explanationUIController = new ExplanationUIController(this.explainer, this.eventBus, this.regionFocusManager);

    // Subscribe to view mode changes to update sidebar UI (new)
    this.eventBus.subscribe('viewModeChanged', (data) => {
      if (data && data.mode && this.sidebar) {
        this.sidebar.updateViewModeUI(data.mode);
      }
    });

    // Render tree
    this.view.renderTree();

    // Setup event listeners
    this.setupEvents();
  }

  // Setup event listeners
  setupEvents() {
    // Initialize button click events
    this.actions.setupButtons();

    // Initialize search functionality
    this.search.setupSearch();

    // Initialize filters (including thread filter and package filter)
    this.filter.setupFilters();

    // Initialize auto expand option
    this.setupAutoExpand();
  }

  // Setup auto expand functionality
  setupAutoExpand() {
    const checkbox = document.getElementById('autoExpandToSelect');
    if (checkbox) {
      checkbox.checked = this.data.settings.autoExpand

      // Add change listener
      checkbox.addEventListener('change', () => {
        this.data.settings.autoExpand = checkbox.checked;
        console.log(`Auto expand to select: ${this.data.settings.autoExpand}`);
      });
    }
  }

  // Load data
  loadData() {
    // Load from external data source
    try {
      // Check if new format (object with thread names as keys)
      if (window.traceData && typeof window.traceData === 'object') {
        // Check if new thread format or old single thread format
        if (window.traceData.id && window.traceData.children) {
          // Old format, convert to new format using "main" as default thread name
          return { "main": window.traceData };
        } else {
          // Already new format, return directly
          return window.traceData;
        }
      }

      // If no data, return empty object
      return {};
    } catch (error) {
      console.error("Failed to load trace data:", error);
      return {};
    }
  }

}

// Export class
export { TraceStackApp };