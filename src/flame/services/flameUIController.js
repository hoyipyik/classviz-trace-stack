import { CONSTANTS } from "./contants.js";

/**
 * UI Controller for the flame graph container
 */
export class FlameGraphUIController {
    constructor(containerId, renderer, selectionManager) {
        this.container = document.getElementById(containerId);
        this.renderer = renderer;
        this.selectionManager = selectionManager;
        this.containerState = CONSTANTS.STATES.MINIMIZED;
        
        // Bind methods to preserve 'this' context
        this.toggleSelectionMode = this.toggleSelectionMode.bind(this);
        this.clearSelection = this.clearSelection.bind(this);
        this.toggleScrollableMode = this.toggleScrollableMode.bind(this);
        this.handleDragHandleDblClick = this.handleDragHandleDblClick.bind(this);
        this.cycleContainerState = this.cycleContainerState.bind(this);
    }

    initialize() {
        this.ensureContainer();
        this.setupEventHandlers();
        this.setupDraggableContainer();
    }

    ensureContainer() {
        if (!this.container) {
            console.log("Creating flame graph container");
            this.createContainer();
        }
    }

    createContainer() {
        const container = document.createElement('div');
        container.id = CONSTANTS.CONTAINER_ID;
        container.className = 'flame-container';

        // Create elements using a more efficient approach
        const elements = {
            dragHandle: this._createElement('div', { id: 'drag-handle', className: 'drag-handle' }),
            dragIndicator: this._createElement('div', { className: 'drag-indicator' }),
            controls: this._createElement('div', { id: 'controls', className: 'controls' }),
            content: this._createElement('div', { className: 'content' }),
            chart: this._createElement('div', { id: 'chart' }),
            details: this._createElement('div', { id: 'details' })
        };

        // Add controls content
        elements.controls.innerHTML = `
          <input type="text" id="term" class="search-box" placeholder="Search...">
          <button class="control-btn" id="search-btn">Search</button>
          <button class="control-btn" id="clear-btn">Clear</button>
          <button class="control-btn" id="reset-zoom-btn">Reset Zoom</button>
          <button class="control-btn" id="selection-btn">Enable Selection</button>
          <button class="control-btn" id="clear-selection-btn">Clear Selection</button>
          <span id="selection-count">0 node(s) selected</span>
        `;

        // Assemble the structure efficiently
        elements.dragHandle.appendChild(elements.dragIndicator);
        elements.content.appendChild(elements.chart);
        elements.content.appendChild(elements.details);

        container.appendChild(elements.dragHandle);
        container.appendChild(elements.controls);
        container.appendChild(elements.content);

        document.body.appendChild(container);
        
        this.container = container;
    }

    _createElement(tagName, attributes = {}) {
        const element = document.createElement(tagName);
        Object.entries(attributes).forEach(([key, value]) => {
            element[key] = value;
        });
        return element;
    }

    setupEventHandlers() {
        const handlers = {
            'reset-zoom-btn': () => this.renderer.resetZoom(),
            'selection-btn': this.toggleSelectionMode,
            'clear-selection-btn': this.clearSelection
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

    clearSelection() {
        // Optimize by first updating the visual state
        if (this.renderer.flameGraph) {
            d3.select(CONSTANTS.CHART_SELECTOR).selectAll("rect").each(d => {
                if (d && d.data) {
                    d.data._selected = false;
                }
            });
        }

        // Then clear the data state
        this.selectionManager.clearSelection();

        // Update the visuals
        if (this.renderer.flameGraph) {
            d3.select(CONSTANTS.CHART_SELECTOR).selectAll("rect").style("fill", d => {
                if (d && d.data) {
                    return this.renderer.getNodeColor(d.data);
                }
                return "#cccccc"; // Default color
            });
        }
        
        this.updateSelectionCountDisplay();
    }

    updateSelectionCountDisplay() {
        const countDisplay = document.getElementById('selection-count');
        if (countDisplay) {
            countDisplay.textContent = `${this.selectionManager.getSelectionCount()} node(s) selected`;
        }
    }

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
        
        // Properties to exclude from display
        const excludedProperties = ['children', 'name', 'value', '_selected', '_originalColor', 'parent'];
        
        // Add properties to table
        Object.keys(nodeData).sort().forEach(key => {
            if (!excludedProperties.includes(key) && nodeData[key] !== undefined && nodeData[key] !== null) {
                this._addPropertyRow(tbody, key, nodeData[key]);
            }
        });
        
        // Add selection status
        this._addPropertyRow(tbody, 'Selection Status', this.selectionManager.isNodeSelected(nodeData) ? 'Selected' : 'Not Selected');
        
        // Assemble the DOM structure
        table.appendChild(tbody);
        contentDiv.appendChild(table);
        container.appendChild(contentDiv);
        fragment.appendChild(container);
        
        // Clear and update the details element (more efficient than innerHTML)
        details.innerHTML = '';
        details.appendChild(fragment);
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

    setupDraggableContainer() {
        const container = this.container;
        const dragHandle = document.getElementById('drag-handle');

        if (!container || !dragHandle) {
            console.warn("Could not find flame container or drag handle");
            return;
        }

        // Initialize container state
        container.style.display = 'flex';

        // Create state indicator
        const stateIndicator = this._createElement('div', {
            className: 'flame-state-indicator',
            textContent: 'Minimized'
        });
        container.appendChild(stateIndicator);

        // Create toggle button
        const toggleScrollBtn = this._createElement('button', {
            id: 'toggle-scroll-btn',
            className: 'control-btn toggle-scroll',
            textContent: 'Enable Scrolling'
        });

        // Add the toggle button to controls
        const controls = document.getElementById('controls');
        if (controls) {
            controls.insertBefore(toggleScrollBtn, controls.firstChild);
            toggleScrollBtn.addEventListener('click', () => this.toggleScrollableMode(stateIndicator, toggleScrollBtn));
        }

        // Set up drag handle events
        dragHandle.addEventListener('dblclick', (e) => {
            e.preventDefault();
            this.handleDragHandleDblClick(stateIndicator, toggleScrollBtn);
        });

        // Variables for drag functionality (use a state object for better organization)
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
            dragState.startHeight = container.offsetHeight;
            
            container.style.transition = 'none';
            
            // Use the more efficient passive event listeners where appropriate
            document.addEventListener('mousemove', handleDragMove, { passive: false });
            document.addEventListener('mouseup', handleDragEnd);
        });

        // Handle drag movement
        const handleDragMove = (ev) => {
            if (!dragState.isDragging) return;
            
            ev.preventDefault();
            
            const deltaY = dragState.startY - ev.clientY;
            const maxHeight = window.innerHeight - 36;
            
            // Use requestAnimationFrame for smoother UI updates
            requestAnimationFrame(() => {
                // Update height within constraints
                const newHeight = Math.max(CONSTANTS.MIN_HEIGHT, 
                    Math.min(dragState.startHeight + deltaY, maxHeight));
                container.style.height = `${newHeight}px`;
                
                // Update indicator text
                if (newHeight <= 50) {
                    stateIndicator.textContent = 'Minimized (dragging)';
                } else if (newHeight >= maxHeight - 100) {
                    stateIndicator.textContent = 'Expanded (dragging)';
                } else {
                    stateIndicator.textContent = 'Scrollable (dragging)';
                }
            });
        };

        // Handle end of drag
        const handleDragEnd = () => {
            if (!dragState.isDragging) return;
            
            dragState.isDragging = false;
            container.style.transition = '';
            
            // Determine final state
            const currentHeight = container.offsetHeight;
            const maxHeight = window.innerHeight - 36;
            
            if (currentHeight <= 50) {
                this.setMinimizedState(stateIndicator, toggleScrollBtn);
            } else if (currentHeight >= maxHeight - 100) {
                this.setExpandedState(stateIndicator, toggleScrollBtn);
            } else {
                this.setScrollableState(stateIndicator, toggleScrollBtn);
            }
            
            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', handleDragEnd);
        };

        // Handle wheel event for expanding from minimized state
        dragHandle.addEventListener('wheel', (e) => {
            if (this.containerState === CONSTANTS.STATES.MINIMIZED) {
                e.preventDefault();
                this.toggleScrollableMode(stateIndicator, toggleScrollBtn);
            }
        });

        // Add keyboard shortcuts (use a more efficient approach)
        const keydownHandler = (e) => {
            if (e.altKey && e.key === 'f') {
                e.preventDefault();
                this.cycleContainerState(stateIndicator, toggleScrollBtn);
            }
        };
        
        document.addEventListener('keydown', keydownHandler);
    }

    toggleScrollableMode(stateIndicator, toggleScrollBtn) {
        const isScrollable = this.containerState === CONSTANTS.STATES.SCROLLABLE;
        
        // Use classList methods for better performance
        if (isScrollable) {
            this.container.classList.remove('scrollable');
        } else {
            this.container.classList.add('scrollable');
        }
        this.container.classList.remove('active');
        
        this.containerState = isScrollable ? CONSTANTS.STATES.MINIMIZED : CONSTANTS.STATES.SCROLLABLE;
        
        stateIndicator.textContent = isScrollable ? 'Minimized' : 'Scrollable';
        toggleScrollBtn.textContent = isScrollable ? 'Enable Scrolling' : 'Disable Scrolling';
        
        toggleScrollBtn.classList.toggle('active', !isScrollable);
        
        if (isScrollable) {
            this.container.scrollTop = 0;
        }
    }

    handleDragHandleDblClick(stateIndicator, toggleScrollBtn) {
        if (this.containerState === CONSTANTS.STATES.EXPANDED) {
            this.setMinimizedState(stateIndicator, toggleScrollBtn);
        } else {
            this.setExpandedState(stateIndicator, toggleScrollBtn);
        }
    }

    cycleContainerState(stateIndicator, toggleScrollBtn) {
        switch (this.containerState) {
            case CONSTANTS.STATES.MINIMIZED:
                this.setScrollableState(stateIndicator, toggleScrollBtn);
                break;
            case CONSTANTS.STATES.SCROLLABLE:
                this.setExpandedState(stateIndicator, toggleScrollBtn);
                break;
            case CONSTANTS.STATES.EXPANDED:
                this.setMinimizedState(stateIndicator, toggleScrollBtn);
                break;
        }
    }

    setMinimizedState(stateIndicator, toggleScrollBtn) {
        this.container.style.height = `${CONSTANTS.MIN_HEIGHT}px`;
        this.container.classList.remove('active', 'scrollable');
        this.containerState = CONSTANTS.STATES.MINIMIZED;
        stateIndicator.textContent = 'Minimized';
        toggleScrollBtn.textContent = 'Enable Scrolling';
        toggleScrollBtn.classList.remove('active');
        this.container.scrollTop = 0;
    }

    setScrollableState(stateIndicator, toggleScrollBtn) {
        this.container.style.height = `${Math.floor(window.innerHeight / 2)}px`;
        this.container.classList.add('scrollable');
        this.container.classList.remove('active');
        this.containerState = CONSTANTS.STATES.SCROLLABLE;
        stateIndicator.textContent = 'Scrollable';
        toggleScrollBtn.textContent = 'Disable Scrolling';
        toggleScrollBtn.classList.add('active');
    }

    setExpandedState(stateIndicator, toggleScrollBtn) {
        this.container.style.height = `${window.innerHeight - 36}px`;
        this.container.classList.add('active');
        this.container.classList.remove('scrollable');
        this.containerState = CONSTANTS.STATES.EXPANDED;
        stateIndicator.textContent = 'Expanded';
        toggleScrollBtn.textContent = 'Enable Scrolling';
        toggleScrollBtn.classList.remove('active');
    }
}