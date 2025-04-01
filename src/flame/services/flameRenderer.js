import { colorUtils } from "../utils/colorChanger.js";
import { mapMethodDataToFlameGraph } from "../utils/dataTransformer.js";
import { CONSTANTS } from "./contants.js";


/**
 * FlameGraph Renderer component
 */
export class FlameGraphRenderer {
    constructor(chartSelector, selectionManager) {
        this.chartSelector = chartSelector;
        this.selectionManager = selectionManager;
        this.flameGraph = null;
        this.onNodeClick = null;
        this.onSelectionChange = null;
    }

    getNodeColor(nodeData) {
        if (!nodeData) return "#cccccc"; // Default color for null data
        
        const baseColor = nodeData.color || 
            nodeData._originalColor || 
            d3.scaleOrdinal(d3.schemeCategory10)(nodeData.name || "unknown");

        return (nodeData._selected || this.selectionManager.isNodeSelected(nodeData)) 
            ? colorUtils.darkenColor(baseColor) 
            : baseColor;
    }

    createFlameGraph() {
        this.flameGraph = d3.flamegraph()
            .cellHeight(CONSTANTS.CELL_HEIGHT)
            .transitionDuration(CONSTANTS.TRANSITION_DURATION)
            .minFrameSize(CONSTANTS.MIN_FRAME_SIZE)
            .transitionEase(d3.easeCubic)
            .inverted(true)
            .sort(true)
            .title("")
            .onClick(d => this.handleNodeClick(d))
            .differential(false)
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
        
        allRects.each(function(nodeData) {
            if (nodeData === d) {
                d3.select(this).style("fill", self.getNodeColor(d.data));
            }
        });
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

        const transformedData = mapMethodDataToFlameGraph(data, true);
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

    setupReflowHandler() {
        const self = this;
        const chartSelection = d3.select(this.chartSelector);
        
        chartSelection.on("d3-flamegraph-reflow", function() {
            chartSelection.selectAll("rect").each(function(d) {
                if (d && d.data && (d.data._selected || self.selectionManager.isNodeSelected(d.data))) {
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
