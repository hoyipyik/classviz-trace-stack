// FlameGraphRenderer.js - Flame Graph visualization module
import { colorUtils } from './colorChanger.js';
import { mapMethodDataToLogicalFlameGraph, mapMethodDataToTemporalFlameGraph } from './dataTransformer.js';

/**
 * Application Constants
 */
export const CONSTANTS = {
    // Flame graph related constants
    CELL_HEIGHT: 18,            // Cell height
    TRANSITION_DURATION: 750,   // Transition animation duration (milliseconds)
    MIN_FRAME_SIZE: 0.003,      // Minimum frame size
    
    // Color related constants
    DEFAULT_COLOR: "#337ab7",   // Default color
    SELECTED_OPACITY: 1.0,      // Selected node opacity
    UNSELECTED_OPACITY: 0.6,    // Unselected node opacity
    
    // Other constants
    MAX_LABEL_LENGTH: 60        // Maximum label length
};

/**
 * Flame Graph Renderer
 * Responsible for creating and updating Flame Graph visualization
 */
class FlameGraphRenderer {
    constructor(dataStore, container, eventBus) {
        // Data store reference
        this.data = dataStore;
        
        // DOM container
        this.container = container;
        
        // Event bus
        this.eventBus = eventBus;
        
        // D3 Flame Graph instance
        this.flameGraph = null;
        
        // Chart selector
        this.chartSelector = "#flameGraph";
        
        // Chart data
        this.graphData = null;
        
        // Pattern settings
        this.patterns = new Map();
        this._patterns = new Map();
        
        // Initialize
        this.init();
    }
    
    // Initialize
    init() {
        // Create Flame Graph base container
        this.createContainer();
        
        // Create Flame Graph instance
        this.createFlameGraph();
        
        // Subscribe to events
        this.subscribeToEvents();
    }
    
    // Subscribe to events
    subscribeToEvents() {
        if (!this.eventBus) return;
        
        // Subscribe to view mode change event
        this.eventBus.subscribe('viewModeChanged', (data) => {
            if (data.mode === 'flameGraph') {
                this.showFlameGraph();
            } else {
                this.hideFlameGraph();
            }
        });
        
        // Subscribe to thread change event
        this.eventBus.subscribe('threadChanged', () => {
            this.update();
        });

        this.eventBus.subscribe('refreshFlame', () =>{
            this.update();
        });

        this.eventBus.subscribe('changeLogicalStyle', () => {
            this.update();
        });
    }
    
    // Create container
    createContainer() {
        // If container doesn't exist, create a new one
        if (!document.querySelector(this.chartSelector)) {
            const flameGraphDiv = document.createElement('div');
            flameGraphDiv.id = 'flameGraph';
            flameGraphDiv.className = 'flame-graph-container';
            flameGraphDiv.style.display = 'none'; // Initially hidden
            this.container.parentNode.insertBefore(flameGraphDiv, this.container.nextSibling);
        }
    }
    
    // Create Flame Graph
    createFlameGraph() {
        try {
            // Ensure D3 and FlameGraph libraries are loaded
            if (typeof d3 === 'undefined' || typeof flamegraph !== 'function') {
                console.error('D3 or FlameGraph library not loaded');
                return;
            }
            
            this.flameGraph = flamegraph()
                .cellHeight(CONSTANTS.CELL_HEIGHT)
                .transitionDuration(CONSTANTS.TRANSITION_DURATION)
                .minFrameSize(CONSTANTS.MIN_FRAME_SIZE)
                .transitionEase(d3.easeCubic)
                .width(1000)
                .height(1100)
                .inverted(true)
                .title("")
                .onClick(d => this.handleNodeClick(d))
                .selfValue(false)
                .color(d => this.getNodeColor(d.data));
                
            // Initial update
            this.update();
        } catch (err) {
            console.error('Error creating flame graph:', err);
        }
    }

    // Get node color
    getNodeColor(nodeData) {
        if (!nodeData) return "#cccccc";

        const baseColor = nodeData.color ||
            d3.scaleOrdinal(d3.schemeCategory10)(nodeData.name || "unknown");

        const isSelected = this.data.getNodeState(nodeData.id)?.selected;
        const color = isSelected ? baseColor : colorUtils.lightenColor(baseColor);

        // If no special status, return normal color
        if (!nodeData.status?.fanOut &&
            !nodeData.status?.implementationEntryPoint &&
            !nodeData.status?.recursiveEntryPoint) {
            return color;
        }

        return this.getPatternForNode(nodeData, color, isSelected);
    }
    
    // Create and get pattern for node
    getPatternForNode(nodeData, color, isSelected) {
        // Create pattern container (if it doesn't exist)
        this.initPatterns();

        // Determine pattern type
        let patternType = this.determinePatternType(nodeData);
        
        // Use darker color as pattern base color to compensate for visual lightening due to white elements in pattern
        const patternBaseColor = isSelected ? 
            colorUtils.darkenColor(color, 0.16) : 
            colorUtils.darkenColor(color, 0.16);

        // Create safe pattern ID
        const patternId = this.createSafePatternId(color, patternType);

        // Check if pattern already exists
        if (!this._patterns.has(patternId)) {
            this.createPattern(patternType, patternId, patternBaseColor);
        }

        return `url(#${patternId})`;
    }
    
    // Initialize pattern container
    initPatterns() {
        if (!this._patterns) {
            this._patterns = new Map();
            // Clear all existing patterns to avoid mixing sizes
            const svg = d3.select('.d3-flame-graph');
            let defs = svg.select('defs');
            if (!defs.empty()) {
                defs.selectAll('pattern[id^="pattern-"]').remove();
            }
        }
    }
    
    // Determine pattern type for node
    determinePatternType(nodeData) {
        if (nodeData.status?.fanOut) {
            return "fanout";
        } else if (nodeData.status?.implementationEntryPoint) {
            return "implementation";
        } else if (nodeData.status?.recursiveEntryPoint) {
            return "recursive";
        }
        return "default";
    }
    
    // Create safe pattern ID
    createSafePatternId(color, patternType) {
        return 'pattern-' + patternType + '-' + color.toString()
            .replace(/[^a-zA-Z0-9]/g, '')
            .toLowerCase();
    }
    
    // Create pattern
    createPattern(patternType, patternId, patternBaseColor) {
        const svg = d3.select('.d3-flame-graph');
        let defs = svg.select('defs');
        if (defs.empty()) {
            defs = svg.insert('defs', ':first-child');
        }

        // Delete existing pattern (if exists)
        defs.select(`#${patternId}`).remove();

        // Keep height at 16, but significantly increase width to reduce border interference
        const patternHeight = 16;
        const patternWidth = 2048; // Very wide to ensure almost no border crossings

        // Create pattern based on node status type
        if (patternType === "implementation") {
            this.createImplementationPattern(defs, patternId, patternWidth, patternHeight, patternBaseColor);
        }
        else if (patternType === "fanout") {
            this.createFanoutPattern(defs, patternId, patternWidth, patternHeight, patternBaseColor);
        }
        else if (patternType === "recursive") {
            this.createRecursivePattern(defs, patternId, patternWidth, patternHeight, patternBaseColor);
        }

        // Store in map
        this._patterns.set(patternId, true);
    }
    
    // Create implementation entry point pattern
    createImplementationPattern(defs, patternId, patternWidth, patternHeight, patternBaseColor) {
        // Horizontal dense single row of large dots pattern
        let dotsHtml = '';
        const dotRadius = 2.2;       // Larger dots
        const opacity = 0.5;         // Higher opacity for better visibility
        const dotsPerRow = 160;      // Horizontally denser
        const y = patternHeight / 2; // Vertically centered, single row

        for (let col = 0; col < dotsPerRow; col++) {
            const x = patternWidth * (col + 0.5) / dotsPerRow;
            dotsHtml += `<circle cx="${x}" cy="${y}" r="${dotRadius}" fill="#fff" fill-opacity="${opacity}"/>`;
        }

        defs.append('pattern')
            .attr('id', patternId)
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', patternWidth)
            .attr('height', patternHeight)
            .html(`
                <rect width="${patternWidth}" height="${patternHeight}" fill="${patternBaseColor}"/>
                ${dotsHtml}
            `);
    }
    
    // Create fan-out point pattern
    createFanoutPattern(defs, patternId, patternWidth, patternHeight, patternBaseColor) {
        // Star-shaped dot pattern
        const dotRadius = patternHeight / 8;
        const centerDotRadius = dotRadius * 1.5;

        // Create basic unit function
        function createStarUnit(offsetX) {
            return `
                <circle cx="${offsetX + patternHeight / 4}" cy="${patternHeight / 4}" r="${dotRadius}" fill="#fff" fill-opacity="0.5"/>
                <circle cx="${offsetX + patternHeight * 3 / 4}" cy="${patternHeight / 4}" r="${dotRadius}" fill="#fff" fill-opacity="0.5"/>
                <circle cx="${offsetX + patternHeight / 4}" cy="${patternHeight * 3 / 4}" r="${dotRadius}" fill="#fff" fill-opacity="0.5"/>
                <circle cx="${offsetX + patternHeight * 3 / 4}" cy="${patternHeight * 3 / 4}" r="${dotRadius}" fill="#fff" fill-opacity="0.5"/>
                <circle cx="${offsetX + patternHeight / 2}" cy="${patternHeight / 2}" r="${centerDotRadius}" fill="#fff" fill-opacity="0.6"/>
            `;
        }

        // Calculate how many complete units can fit
        const unitsCount = Math.floor(patternWidth / patternHeight);
        let unitsHtml = '';

        for (let i = 0; i < unitsCount; i++) {
            unitsHtml += createStarUnit(i * patternHeight);
        }

        defs.append('pattern')
            .attr('id', patternId)
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', patternWidth)
            .attr('height', patternHeight)
            .html(`
                <rect width="${patternWidth}" height="${patternHeight}" fill="${patternBaseColor}"/>
                ${unitsHtml}
            `);
    }
    
    // Create recursive entry point pattern
    createRecursivePattern(defs, patternId, patternWidth, patternHeight, patternBaseColor) {
        // Thick diagonal line pattern
        defs.append('pattern')
            .attr('id', patternId)
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', patternWidth)
            .attr('height', patternHeight)
            .html(`
                <rect width="${patternWidth}" height="${patternHeight}" fill="${patternBaseColor}"/>
                <path d="M0,0 L${patternHeight},${patternHeight} M${patternHeight},0 L0,${patternHeight} M${patternHeight},0 L${patternHeight * 2},${patternHeight} M${patternHeight * 2},0 L${patternHeight},${patternHeight} M${patternHeight * 2},0 L${patternHeight * 3},${patternHeight} M${patternHeight * 3},0 L${patternHeight * 2},${patternHeight} M${patternHeight * 4},0 L${patternHeight * 3},${patternHeight} M${patternHeight * 5},0 L${patternHeight * 4},${patternHeight} M${patternHeight * 6},0 L${patternHeight * 5},${patternHeight} M${patternHeight * 7},0 L${patternHeight * 6},${patternHeight}" 
                    style="stroke:#fff; stroke-width:2.2; stroke-opacity:0.4"/>
            `);
    }
    
    // Handle node click
    handleNodeClick(d) {
        if (!d || !d.data || !d.data.id) return;
        
        const nodeId = d.data.id;
        console.info("Clicked on:", d.data);
        
        // Set current node
        this.data.setCurrent(nodeId);
        
        this.eventBus.publish('changeCurrentFocusedNode', {
            nodeId: nodeId
        });
    }
    
    // Update node selection state
    updateNodeSelection(nodeId, selected) {
        try {
            const chartSelection = d3.select(this.chartSelector);
            
            // Refresh display of specified node in flame graph
            chartSelection.selectAll("rect").each((d) => {
                if (d && d.data && d.data.id === nodeId && d3.event.currentTarget) {
                    d3.select(d3.event.currentTarget).style("fill", this.getNodeColor(d.data));
                }
            });
        } catch (err) {
            console.error('Error updating node selection:', err);
        }
    }
    
    // Reset zoom
    resetZoom() {
        if (this.flameGraph) {
            this.flameGraph.resetZoom();
        }
    }
    
    // Update data
    update() {
        try {
            if (!this.data.tree) {
                this.showError("No data available");
                return;
            }
            
            // Choose mapping function based on view mode
            const data = this.data.showLogical
                ? mapMethodDataToLogicalFlameGraph(this.data.tree)
                : mapMethodDataToTemporalFlameGraph(this.data.tree, true);
            
            this.graphData = data;
            
            // Store current zoom state to preserve it
            let currentZoom = null;
            if (this.flameGraph && this.flameGraph.currentZoom) {
                currentZoom = this.flameGraph.currentZoom();
            }
            
            // Update chart
            const chartSelection = d3.select(this.chartSelector);
            chartSelection
                .datum(data)
                .call(this.flameGraph);
            
            // Apply stored zoom state if available
            if (currentZoom && typeof this.flameGraph.setZoom === 'function') {
                this.flameGraph.setZoom(currentZoom);
            }
            
            // Ensure selected nodes maintain appearance
            this.updateNodeAppearance(chartSelection);
        } catch (err) {
            console.error('Error updating flame graph:', err);
            this.showError("Error updating flame graph");
        }
    }
    
    // Update node appearance
    updateNodeAppearance(chartSelection) {
        requestAnimationFrame(() => {
            // Reset opacity for all rectangles
            chartSelection.selectAll("rect").style("fill-opacity", "1");
            
            // Update colors for all nodes
            const self = this;
            chartSelection.selectAll("rect").each(function(d) {
                if (d && d.data) {
                    d3.select(this).style("fill", self.getNodeColor(d.data));
                }
            });
            
            // Set up reflow handler
            this.setupReflowHandler();
        });
    }
    
    // Set up reflow handler
    setupReflowHandler() {
        const self = this;
        const chartSelection = d3.select(this.chartSelector);
        
        chartSelection.on("d3-flamegraph-reflow", function() {
            chartSelection.selectAll("rect").each(function(d) {
                if (d && d.data) {
                    const nodeState = self.data.getNodeState(d.data.id);
                    if (nodeState && nodeState.selected) {
                        d3.select(this).style("fill", self.getNodeColor(d.data));
                    }
                }
            });
        });
    }
    
    // Show error message
    showError(message) {
        const chartElement = document.querySelector(this.chartSelector);
        if (chartElement) {
            chartElement.innerHTML = `
              <div style="padding: 20px; text-align: center; color: #666;">
                <h3>Flame Graph Data Not Available</h3>
                <p>${message}</p>
              </div>
            `;
        }
    }
    
    // Show flame graph
    showFlameGraph() {
        const flameGraphEl = document.querySelector(this.chartSelector);
        const callTreeEl = document.querySelector('#callTree').closest('.call-tree-container');
        
        if (flameGraphEl) {
            flameGraphEl.style.display = '';
            
            // Force layout recalculation
            setTimeout(() => {
                this.adjustFlameGraphLayout(flameGraphEl);
            }, 100);
        }
        
        if (callTreeEl) callTreeEl.style.display = 'none';
    }
    
    // Adjust flame graph layout
    adjustFlameGraphLayout(flameGraphEl) {
        // Check if flame graph SVG already exists, redraw if it does
        const svg = flameGraphEl.querySelector('svg');
        if (svg) {
            // Adjust SVG size to fit container
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
        }
        
        // Refresh flame graph
        this.update();
        
        // Redraw on window resize
        window.addEventListener('resize', this.handleResize.bind(this));
    }
    
    // Hide flame graph
    hideFlameGraph() {
        const flameGraphEl = document.querySelector(this.chartSelector);
        const callTreeEl = document.querySelector('#callTree').closest('.call-tree-container');
        
        if (flameGraphEl) flameGraphEl.style.display = 'none';
        if (callTreeEl) callTreeEl.style.display = '';
        
        // Remove window resize event
        window.removeEventListener('resize', this.handleResize.bind(this));
    }
    
    // Handle window resize
    handleResize() {
        // Debounce to avoid frequent redraws
        if (this._resizeTimer) clearTimeout(this._resizeTimer);
        
        this._resizeTimer = setTimeout(() => {
            // Only redraw when flame graph is visible
            const flameGraphEl = document.querySelector(this.chartSelector);
            if (flameGraphEl && flameGraphEl.style.display !== 'none') {
                this.update();
            }
        }, 250);
    }
    
    // Toggle view mode
    toggleViewMode() {
        this.data.showLogical = !this.data.showLogical;
        this.update();
        
        // Trigger view mode change event
        if (this.eventBus) {
            this.eventBus.publish('viewModeChanged', {
                logical: this.data.showLogical
            });
        }
    }
}

// Export class
export { FlameGraphRenderer };