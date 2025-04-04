import { colorUtils } from "../utils/colorChanger.js";
import { mapMethodDataToLogicalFlameGraph, mapMethodDataToTemporalFlameGraph } from "../utils/dataTransformer.js";
import { CONSTANTS } from "./contants.js";


/**
 * FlameGraph Renderer component
 */
export class FlameGraphRenderer {
    constructor(chartSelector, selectionManager) {
        this.showLogical = true;
        this.chartSelector = chartSelector;
        this.selectionManager = selectionManager;
        this.flameGraph = null;
        this.onNodeClick = null;
        this.onSelectionChange = null;
        this.data = null;
    }

    getNodeColor(nodeData) {
        if (!nodeData) return "#cccccc";

        const baseColor = nodeData.color ||
            nodeData._originalColor ||
            d3.scaleOrdinal(d3.schemeCategory10)(nodeData.name || "unknown");

        const isSelected = nodeData.selected || this.selectionManager.isNodeSelected(nodeData);
        const color = isSelected ? colorUtils.darkenColor(baseColor) : baseColor;

        // If no special status, return regular color without texture
        if (!nodeData.status?.fanOut &&
            !nodeData.status?.implementationEntryPoint &&
            !nodeData.status?.recursiveEntryPoint) {
            return color;
        }

        // Create patterns container only once and store them
        if (!this._patterns) {
            this._patterns = new Map();
        }

        function createSafeId(color, patternType) {
            return 'pattern-' + patternType + '-' + color.toString()
                .replace(/[^a-zA-Z0-9]/g, '')
                .toLowerCase();
        }

        // Determine pattern type
        let patternType = "default";
        if (nodeData.status?.fanOut) {
            patternType = "fanout";
        } else if (nodeData.status?.implementationEntryPoint) {
            patternType = "implementation";
        } else if (nodeData.status?.recursiveEntryPoint) {
            patternType = "recursive";
        }

        const patternId = createSafeId(color, patternType);

        // Check if pattern already exists in our Map
        if (!this._patterns.has(patternId)) {
            const svg = d3.select('.d3-flame-graph');
            let defs = svg.select('defs');
            if (defs.empty()) {
                defs = svg.insert('defs', ':first-child');
            }

            // Remove existing pattern if it somehow exists in DOM but not in our Map
            defs.select(`#${patternId}`).remove();

            // Create pattern based on node status type
            if (patternType === "implementation") {
                // The original dot pattern for implementationEntryPoint
                defs.append('pattern')
                    .attr('id', patternId)
                    .attr('patternUnits', 'userSpaceOnUse')
                    .attr('width', 4)
                    .attr('height', 4)
                    .html(`
                        <rect width="4" height="4" fill="${color}"/>
                        <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" 
                            style="stroke:#fff; stroke-width:0.5; stroke-opacity:0.3"/>
                    `);
            }
            if (patternType === "fanout") {
                // Star dot pattern for fanOut
                defs.append('pattern')
                    .attr('id', patternId)
                    .attr('patternUnits', 'userSpaceOnUse')
                    .attr('width', 8)
                    .attr('height', 8)
                    .html(`
                        <rect width="8" height="8" fill="${color}"/>
                        <circle cx="2" cy="2" r="0.7" fill="#fff" fill-opacity="0.6"/>
                        <circle cx="6" cy="2" r="0.7" fill="#fff" fill-opacity="0.6"/>
                        <circle cx="2" cy="6" r="0.7" fill="#fff" fill-opacity="0.6"/>
                        <circle cx="6" cy="6" r="0.7" fill="#fff" fill-opacity="0.6"/>
                        <circle cx="4" cy="4" r="0.9" fill="#fff" fill-opacity="0.7"/>
                    `);
            }
            if (patternType === "recursive") {
                // Diagonal lines pattern for recursiveEntryPoint
                defs.append('pattern')
                    .attr('id', patternId)
                    .attr('patternUnits', 'userSpaceOnUse')
                    .attr('width', 8)
                    .attr('height', 8)
                    .html(`
                    <rect width="8" height="8" fill="${color}"/>
                    <path d="M-2,2 l8,-8 M0,8 l8,-8 M6,10 l8,-8" 
                        style="stroke:#fff; stroke-width:1.2; stroke-opacity:0.4"/>
                `);
            }

            // Store in our Map
            this._patterns.set(patternId, true);
        }

        return `url(#${patternId})`;
    }

    getNodeColorClassic(nodeData) {
        if (!nodeData) return "#cccccc"; // Default color for null data

        const baseColor = nodeData.color ||
            nodeData._originalColor ||
            d3.scaleOrdinal(d3.schemeCategory10)(nodeData.name || "unknown");

        return (nodeData.selected || this.selectionManager.isNodeSelected(nodeData))
            ? colorUtils.darkenColor(baseColor)
            : baseColor;
    }

    createFlameGraph() {
        this.flameGraph = flamegraph()
            .cellHeight(CONSTANTS.CELL_HEIGHT)
            .transitionDuration(CONSTANTS.TRANSITION_DURATION)
            .minFrameSize(CONSTANTS.MIN_FRAME_SIZE)
            .transitionEase(d3.easeCubic)
            .inverted(true)
            .sort(true)
            .title("")
            .onClick(d => this.handleNodeClick(d))
            // .differential(false)
            .selfValue(false)
            .color(d => this.getNodeColor(d.data));

        return this.flameGraph;
    }

    handleNodeClick(d) {
        if (!d || !d.data) return;

        console.info("Clicked on:", d.data);

        if (this.selectionManager.isEnabled()) {
            const isSelected = this.selectionManager.toggleNodeSelection(d.data);
            this.updateNodeAppearance(d);

            if (typeof this.onSelectionChange === 'function') {
                this.onSelectionChange(this.selectionManager.getSelectionCount());
            }
        }

        if (typeof this.onNodeClick === 'function') {
            this.onNodeClick(d.data);
        }
    }

    updateNodeAppearance(d) {
        if (!d || !d.data) return;

        const allRects = d3.select(this.chartSelector).selectAll("rect");
        const self = this;

        allRects.each(function (nodeData) {
            if (nodeData === d) {
                d3.select(this).style("fill", self.getNodeColor(d.data));
            }
        });
    }

    switchWidthMode(showLogical) {
        this.showLogical = showLogical;
        if (this.data)
            this.applyWidthMode();
    }

    applyWidthMode() {
        this.updateData(this.data, true);
    }


    resetZoom() {
        if (this.flameGraph) {
            this.flameGraph.resetZoom();
        }
    }

    renderData(data) {
        if (!data) {
            this.showError("No data available");
            return;
        }

        this.data = data;

        const transformedData = this.showLogical ? mapMethodDataToLogicalFlameGraph(data) : mapMethodDataToTemporalFlameGraph(data, true);
        const chartSelection = d3.select(this.chartSelector);

        // Optimize rendering by clearing previous content first
        chartSelection.html("");

        chartSelection
            .datum(transformedData)
            .call(this.flameGraph);

        // Optimize by using requestAnimationFrame for timing-sensitive operations
        requestAnimationFrame(() => {
            d3.selectAll(`${this.chartSelector} rect`).style("fill-opacity", "1");
            this.setupReflowHandler();
        });
    }


    /**
     * Updates the flame graph with new data
     * 
     * @param {Object} newData - The new data to visualize
     * @param {boolean} resetZoomAfterUpdate - Whether to reset zoom after update (default: true)
     * @return {void}
     */
    updateData(newData, resetZoomAfterUpdate = true) {
        if (!newData) {
            this.showError("No data available for update");
            return;
        }

        this.data = newData;

        // Store current zoom state if we want to preserve it
        let currentZoom = null;
        if (!resetZoomAfterUpdate && this.flameGraph) {
            // Some implementations of d3-flamegraph expose the current zoom state
            // If yours doesn't, you may need to track this separately
            currentZoom = this.flameGraph.currentZoom ? this.flameGraph.currentZoom() : null;
        }

        // Transform the new data based on current mode
        const transformedData = this.showLogical
            ? mapMethodDataToLogicalFlameGraph(newData)
            : mapMethodDataToTemporalFlameGraph(newData, true);

        const chartSelection = d3.select(this.chartSelector);

        // Apply the update
        chartSelection
            .datum(transformedData)
            .call(this.flameGraph);

        // Apply stored zoom state if we're preserving it
        if (!resetZoomAfterUpdate && currentZoom) {
            // If the flame graph library has a method to set zoom state
            if (typeof this.flameGraph.setZoom === 'function') {
                this.flameGraph.setZoom(currentZoom);
            }
        }

        // Ensure selected nodes maintain their appearance
        requestAnimationFrame(() => {
            d3.selectAll(`${this.chartSelector} rect`).style("fill-opacity", "1");

            // Update colors for selected nodes
            chartSelection.selectAll("rect").each(d => {
                if (d && d.data && (d.data.selected || this.selectionManager.isNodeSelected(d.data))) {
                    d3.select(this).style("fill", this.getNodeColor(d.data));
                }
            });

            // Reset the reflow handler
            this.setupReflowHandler();
        });

        // If we need to reset zoom after update
        if (resetZoomAfterUpdate) {
            this.resetZoom();
        }
    }

    setupReflowHandler() {
        const self = this;
        const chartSelection = d3.select(this.chartSelector);

        chartSelection.on("d3-flamegraph-reflow", function () {
            chartSelection.selectAll("rect").each(function (d) {
                if (d && d.data && (d.data.selected || self.selectionManager.isNodeSelected(d.data))) {
                    d3.select(this).style("fill", self.getNodeColor(d.data));
                }
            });
        });
    }

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
}
