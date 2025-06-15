
// FlameGraphRenderer.js 
import { colorUtils } from "../../../utils/colour/colorChanger.js";
import { mapMethodDataToLogicalFlameGraph, mapMethodDataToTemporalFlameGraph } from '../../../utils/process/dataTransformer.js';
import { FlameGraphEventHandler } from "./flame/FlameGraphEventHandler.js";
import { FlameGraphPatternManager } from "./flame/FlameGraphPatternManager.js";


export const CONSTANTS = {
    CELL_HEIGHT: 18,
    TRANSITION_DURATION: 750,
    MIN_FRAME_SIZE: 0.003,
    DEFAULT_COLOR: "#337ab7",
    SELECTED_OPACITY: 1.0,
    UNSELECTED_OPACITY: 0.6,
    MAX_LABEL_LENGTH: 60
};

export class FlameGraphRenderer {
    constructor(dataStore, container, eventBus, explainer) {
        this.data = dataStore;
        this.container = container;
        this.explainer = explainer;
        this.chartSelector = "#flameGraph";
        this.flameGraph = null;
        this.graphData = null;

        // Initialize components
        this.patternManager = new FlameGraphPatternManager();
        this.eventHandler = new FlameGraphEventHandler(eventBus, this);

        this.init();
    }

    init() {
        this.createContainer();
        this.createFlameGraph();
    }

    createContainer() {
        if (!document.querySelector(this.chartSelector)) {
            const flameGraphDiv = document.createElement('div');
            flameGraphDiv.id = 'flameGraph';
            flameGraphDiv.className = 'flame-graph-container';
            flameGraphDiv.style.display = 'none';
            this.container.parentNode.insertBefore(flameGraphDiv, this.container.nextSibling);
        }
    }

    createFlameGraph() {
        try {
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
                .onHover(d => this.handleOnHover(d))
                .color(d => this.getNodeColor(d.data));

            this.update();
        } catch (err) {
            console.error('Error creating flame graph:', err);
        }
    }

    handleNodeClick(d) {
        if (!d || !d.data || !d.data.id) return;

        const nodeId = d.data.id;
        
        
        this.eventHandler.publishEvent('changeCurrentFocusedNode', { nodeId: nodeId });
        this.eventHandler.publishEvent('changeClassvizFocus', { nodeId: nodeId });
        this.eventHandler.publishEvent('changeRegionFocus', { focusedRegionId: nodeId });

        console.info("Clicked on:", d.data);
        this.data.setCurrent(nodeId);
    }

    handleOnHover(d) {
        if (!d || !d.data || !d.data.id) {
            this.removeHoverCards();
            return;
        }

        const nodeData = this.data.nodes.get(d.data.id);
        if (!nodeData || !nodeData.data) return;

        const itemData = nodeData.data;
        const isSpecialNode = itemData.status && (
            itemData.status.fanOut ||
            itemData.status.implementationEntryPoint ||
            itemData.status.recursiveEntryPoint
        );

        const regionText = this.explainer?.regions?.get(d.data.id)?.briefSummary;

        if (!isSpecialNode || !regionText) return;

        this.createHoverCard(itemData, regionText);
    }

    removeHoverCards() {
        const existingCards = document.querySelectorAll('.flame-hover-card');
        existingCards.forEach(card => card.remove());
    }

    createHoverCard(itemData, regionText) {
        this.removeHoverCards();

        const hoverCard = document.createElement('div');
        hoverCard.className = 'flame-hover-card';
        
        // Set styles
        Object.assign(hoverCard.style, {
            position: 'fixed',
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '8px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            width: '450px',
            zIndex: '10000'
        });

        hoverCard.innerHTML = `
            <div><strong>${itemData.label}</strong></div>
            <div>${regionText}</div>
        `;

        this.positionHoverCard(hoverCard);
        document.body.appendChild(hoverCard);

        // Auto-hide after 3.5 seconds
        setTimeout(() => {
            if (hoverCard.parentNode) {
                hoverCard.style.display = 'none';
            }
        }, 3500);
    }

    positionHoverCard(hoverCard) {
        const event = d3.event || window.event;
        if (!event) return;

        const mouseX = event.clientX;
        const mouseY = event.clientY;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const cardWidth = 450;
        const cardHeight = 100;

        let leftPos = mouseX + 10;
        let topPos = mouseY;

        if (leftPos + cardWidth > viewportWidth) {
            leftPos = Math.max(0, mouseX - cardWidth - 10);
        }

        if (topPos + cardHeight > viewportHeight) {
            topPos = Math.max(0, mouseY - cardHeight);
        }

        hoverCard.style.left = `${leftPos}px`;
        hoverCard.style.top = `${topPos}px`;
    }

    getNodeColor(nodeData) {
        if (!nodeData) return "#cccccc";

        const baseColor = nodeData.color ||
            d3.scaleOrdinal(d3.schemeCategory10)(nodeData.name || "unknown");

        const isSelected = this.data.getNodeState(nodeData.id)?.selected;
        const color = isSelected ? baseColor : colorUtils.lightenColor(baseColor);

        return this.patternManager.getPatternForNode(nodeData, color, isSelected);
    }

    update() {
        try {
            if (!this.data.tree) {
                this.showError("No data available");
                return;
            }

            const data = this.data.showLogical
                ? mapMethodDataToLogicalFlameGraph(this.data.tree)
                : mapMethodDataToTemporalFlameGraph(this.data.tree, true);

            this.graphData = data;

            // Store current zoom state
            let currentZoom = null;
            if (this.flameGraph && this.flameGraph.currentZoom) {
                currentZoom = this.flameGraph.currentZoom();
            }

            // Update chart
            const chartSelection = d3.select(this.chartSelector);
            chartSelection.datum(data).call(this.flameGraph);

            // Initialize patterns after chart is rendered
            this.patternManager.init(chartSelection.select('svg'));

            // Restore zoom state
            if (currentZoom && typeof this.flameGraph.setZoom === 'function') {
                this.flameGraph.setZoom(currentZoom);
            }

            this.updateNodeAppearance(chartSelection);
        } catch (err) {
            console.error('Error updating flame graph:', err);
            this.showError("Error updating flame graph");
        }
    }

    updateNodeAppearance(chartSelection) {
        requestAnimationFrame(() => {
            chartSelection.selectAll("rect").style("fill-opacity", "1");

            const self = this;
            chartSelection.selectAll("rect").each(function (d) {
                if (d && d.data) {
                    d3.select(this).style("fill", self.getNodeColor(d.data));
                }
            });

            this.setupReflowHandler(chartSelection);
        });
    }

    setupReflowHandler(chartSelection) {
        const self = this;
        chartSelection.on("d3-flamegraph-reflow", function () {
            chartSelection.selectAll("rect").each(function (d) {
                if (d && d.data) {
                    const nodeState = self.data.getNodeState(d.data.id);
                    if (nodeState && nodeState.selected) {
                        d3.select(this).style("fill", self.getNodeColor(d.data));
                    }
                }
            });
        });
    }

    show() {
        const flameGraphEl = document.querySelector(this.chartSelector);
        const callTreeEl = document.querySelector('#callTree')?.closest('.call-tree-container');

        if (flameGraphEl) {
            flameGraphEl.style.display = '';
            setTimeout(() => this.adjustLayout(flameGraphEl), 100);
        }

        if (callTreeEl) callTreeEl.style.display = 'none';
    }

    hide() {
        const flameGraphEl = document.querySelector(this.chartSelector);
        const callTreeEl = document.querySelector('#callTree')?.closest('.call-tree-container');

        if (flameGraphEl) flameGraphEl.style.display = 'none';
        if (callTreeEl) callTreeEl.style.display = '';
    }

    adjustLayout(flameGraphEl) {
        const svg = flameGraphEl.querySelector('svg');
        if (svg) {
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
        }
        this.update();
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

    resetZoom() {
        if (this.flameGraph) {
            this.flameGraph.resetZoom();
        }
    }

    toggleViewMode() {
        this.data.showLogical = !this.data.showLogical;
        this.update();
        
        this.eventHandler.publishEvent('viewModeChanged', {
            logical: this.data.showLogical
        });
    }

    updateNodeSelection(nodeId, selected) {
        try {
            const chartSelection = d3.select(this.chartSelector);
            chartSelection.selectAll("rect").each((d) => {
                if (d && d.data && d.data.id === nodeId && d3.event.currentTarget) {
                    d3.select(d3.event.currentTarget).style("fill", this.getNodeColor(d.data));
                }
            });
        } catch (err) {
            console.error('Error updating node selection:', err);
        }
    }

    // Backward compatibility methods
    showFlameGraph() {
        this.show();
    }

    hideFlameGraph() {
        this.hide();
    }

    destroy() {
        this.eventHandler.destroy();
        this.patternManager.clear();
        this.removeHoverCards();
    }
}