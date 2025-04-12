import { CONSTANTS } from "./contants.js";

/**
 * UI Controller for the flame graph container
 */
export class FlameGraphUIController {
    constructor(containerId, renderer, selectionManager, packageColorMap) {
        this.container = document.getElementById(containerId);
        this.renderer = renderer;
        this.selectionManager = selectionManager;
        this.packageColorMap = packageColorMap;
        this.containerState = CONSTANTS.STATES.MINIMIZED; // Start minimized (hidden)

        // Bind methods to preserve 'this' context
        this.toggleSelectionMode = this.toggleSelectionMode.bind(this);
        this.clearAllSelectionHandler = this.clearAllSelectionHandler.bind(this);
        this.handleDragHandleDblClick = this.handleDragHandleDblClick.bind(this);
        this.selectAllHandler = this.selectAllHandler.bind(this);
        this.selectGraphHandler = this.selectGraphHandler.bind(this);
        this.clearGraphSelectionHandler = this.clearGraphSelectionHandler.bind(this);

        console.log("pacakge color map", this.packageColorMap);
    }

    initialize() {
        if (!this.container) {
            console.error("Flame graph container not found");
            return;
        }

        this.setupEventHandlers();
        this.setupDraggableContainer();
    }

    setupEventHandlers() {
        const handlers = {
            'reset-zoom-btn': () => this.renderer.resetZoom(),
            'selection-btn': this.toggleSelectionMode,
            'selection-all-btn': this.selectAllHandler,
            'clear-all-btn': this.clearAllSelectionHandler,
            'select-graph-btn': this.selectGraphHandler,
            'clear-graph-btn': this.clearGraphSelectionHandler
        };

        // Efficiently attach event handlers
        Object.entries(handlers).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', handler);
            }
        });
    }

    toggleSelectionMode() {
        const enabled = this.selectionManager.toggleSelectionMode();

        const button = document.getElementById('selection-btn');
        if (button) {
            button.textContent = enabled ? 'Disable Selection' : 'Enable Selection';
            button.classList.toggle('active', enabled);
        }

        this.updateSelectionCountDisplay();
        console.log(`Selection mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    clearAllSelectionHandler() {
        this.selectionManager.clearAll();
        this.updateSelectionCountDisplay();
    }

    clearGraphSelectionHandler() {
        const data = this.renderer.getGraphData();
        if (!data) return;
        this.selectionManager.clearAllAtCurrentGraph(data);
        this.updateSelectionCountDisplay();
    }

    selectAllHandler() {
        this.selectionManager.selectAll();
        this.updateSelectionCountDisplay();
    }

    selectGraphHandler() {
        const data = this.renderer.getGraphData();
        if (!data) return;
        this.selectionManager.selectAllAtCurrentGraph(data);
        this.updateSelectionCountDisplay();
    }


    updateSelectionCountDisplay() {
        const countDisplay = document.getElementById('selection-count');
        if (countDisplay) {
            countDisplay.textContent = `${this.selectionManager.getSelectionCount()} node(s) selected`;
            // console.log("number updated", this.selectionManager.selectedNodes.size, this.selectionManager.getSelectionCount(), this.selectionManager.selectedNodes);
        }
    }

    // DETAILS PANEL METHODS
    updateDetailsElement(nodeData) {
        if (!nodeData) return;

        const details = document.getElementById("details");
        if (!details) return;

        // Ensure details panel is properly sized
        if (!details.classList.contains('expanded')) {
            details.classList.add('expanded');
            details.style.padding = '10px';
        }

        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        const container = document.createElement('div');

        // Create the header
        const header = document.createElement('h4');
        header.textContent = nodeData.name || 'Unnamed Node';
        container.appendChild(header);

        // Create the content wrapper
        const contentDiv = document.createElement('div');
        contentDiv.className = 'details-content';

        // Create the properties table
        const table = document.createElement('table');
        const tbody = document.createElement('tbody');

        this.addDetailsProperties(tbody, nodeData);

        // Assemble the DOM structure
        table.appendChild(tbody);
        contentDiv.appendChild(table);
        container.appendChild(contentDiv);
        fragment.appendChild(container);

        // Clear and update the details element (more efficient than innerHTML)
        details.innerHTML = '';
        details.appendChild(fragment);
    }

    addDetailsProperties(tbody, nodeData) {
        // Properties to exclude from display
        const excludedProperties = ['children', 'name', 'value', 'selected', '_originalColor', 'parent'];

        // Add properties to table
        Object.keys(nodeData).sort().forEach(key => {
            if (!excludedProperties.includes(key) && nodeData[key] !== undefined && nodeData[key] !== null) {
                this._addPropertyRow(tbody, key, nodeData[key]);
            }
        });

        // Add selection status
        this._addPropertyRow(tbody, 'Selection Status', this.selectionManager.isNodeSelected(nodeData) ? 'Selected' : 'Not Selected');
    }

    _addPropertyRow(tbody, key, value) {
        // Format property name for display
        const formattedKey = key.replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());

        // Format the value safely
        let formattedValue = value;

        if (typeof value === 'object' && value !== null) {
            try {
                // Handle circular references
                const getCircularReplacer = () => {
                    const seen = new WeakSet();
                    return (k, v) => {
                        if (typeof v === 'object' && v !== null) {
                            if (seen.has(v)) {
                                return '[Circular Reference]';
                            }
                            seen.add(v);
                        }
                        return v;
                    };
                };

                formattedValue = JSON.stringify(value, getCircularReplacer());
            } catch (e) {
                formattedValue = "[Complex Object: Cannot Display]";
            }
        }

        // Create the table row
        const row = document.createElement('tr');

        // Add header cell
        const th = document.createElement('th');
        th.textContent = formattedKey;
        row.appendChild(th);

        // Add value cell
        const td = document.createElement('td');

        // Special handling for source code
        if (key === 'sourceCode') {
            const pre = document.createElement('pre');
            const code = document.createElement('code');
            code.textContent = formattedValue;
            pre.appendChild(code);
            td.appendChild(pre);
        } else {
            td.textContent = formattedValue;
        }

        row.appendChild(td);
        tbody.appendChild(row);
    }

    // CONTAINER STATE METHODS
    setupDraggableContainer() {
        const container = this.container;
        const dragHandle = document.getElementById('drag-handle');

        if (!container || !dragHandle) {
            console.warn("Could not find flame container or drag handle");
            return;
        }

        // Initialize container state - scrollable but minimized (hidden)
        container.style.display = 'flex';
        container.classList.add('scrollable');
        this.setContainerMinimized(); // Start with minimized state

        // Set up drag handle events
        this.setupDragHandleEvents(dragHandle);
    }

    setupDragHandleEvents(dragHandle) {
        // Set up double-click event
        dragHandle.addEventListener('dblclick', (e) => {
            e.preventDefault();
            this.handleDragHandleDblClick();
        });

        // Variables for drag functionality
        const dragState = {
            isDragging: false,
            startY: 0,
            startHeight: 0
        };

        // Mouse down handler
        dragHandle.addEventListener('mousedown', (e) => {
            if (e.detail > 1) return; // Skip double-clicks

            e.preventDefault();

            dragState.isDragging = true;
            dragState.startY = e.clientY;
            dragState.startHeight = this.container.offsetHeight;

            this.container.style.transition = 'none';

            // Bind these handlers to preserve context
            const handleMove = this.handleDragMove.bind(this);
            const handleEnd = this.handleDragEnd.bind(this);

            // Use passive event listeners where appropriate
            document.addEventListener('mousemove', 
                (ev) => handleMove(ev, dragState),
                { passive: false });
            document.addEventListener('mouseup', 
                () => {
                    handleEnd(dragState);
                    // Clean up event listeners
                    document.removeEventListener('mousemove', handleMove);
                    document.removeEventListener('mouseup', handleEnd);
                });
        });
    }

    handleDragMove(ev, dragState) {
        if (!dragState.isDragging) return;

        ev.preventDefault();

        const deltaY = dragState.startY - ev.clientY;
        const maxHeight = window.innerHeight - 36;

        // Use requestAnimationFrame for smoother UI updates
        requestAnimationFrame(() => {
            // Update height within constraints
            const newHeight = Math.max(CONSTANTS.MIN_HEIGHT,
                Math.min(dragState.startHeight + deltaY, maxHeight));
            this.container.style.height = `${newHeight}px`;
        });
    }

    handleDragEnd(dragState) {
        if (!dragState.isDragging) return;

        dragState.isDragging = false;
        this.container.style.transition = '';

        // Determine final state
        const currentHeight = this.container.offsetHeight;

        if (currentHeight <= 50) {
            this.setContainerMinimized();
        } else {
            // If dragged to a custom height, keep that height
            // and just update the state
            this.containerState = CONSTANTS.STATES.EXPANDED;
            this.container.classList.add('active');
        }
    }

    handleDragHandleDblClick() {
        if (this.containerState === CONSTANTS.STATES.MINIMIZED) {
            // If minimized, expand to half height
            this.setContainerHalfExpand();
        } else if (this.containerState === CONSTANTS.STATES.EXPANDED) {
            const currentHeight = this.container.offsetHeight;
            if (currentHeight <= Math.ceil(window.innerHeight / 2)) {
                // If more than half height, set to half height
               
                this.setContainerMinimized();
            } else {
                // If at half height or less, minimize
                this.setContainerHalfExpand();
            }
        }
    }

    setContainerFullyExpand() {
        this.container.style.height = `${Math.floor(window.innerHeight)}px`;
        this.container.classList.add('active');
        this.containerState = CONSTANTS.STATES.EXPANDED;
    }

    setContainerHalfExpand() {
        this.container.style.height = `${Math.floor(window.innerHeight / 2)}px`;
        this.container.classList.add('active');
        this.containerState = CONSTANTS.STATES.EXPANDED;
    }


    setContainerMinimized() {
        this.container.style.height = `${CONSTANTS.MIN_HEIGHT}px`;
        this.container.classList.remove('active');
        // Always keep scrollable class
        this.containerState = CONSTANTS.STATES.MINIMIZED;
        this.container.scrollTop = 0;
    }
}