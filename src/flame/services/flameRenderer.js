import { colorUtils } from "../utils/colorChanger.js";
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

        this.graphData = null;
    }

    getGraphData() {
        return this.graphData;
    }

    getNodeColor(nodeData) {
        if (!nodeData) return "#cccccc";
    
        const baseColor = nodeData.color ||
            d3.scaleOrdinal(d3.schemeCategory10)(nodeData.name || "unknown");
    
        const isSelected = this.selectionManager.isNodeSelected(nodeData);
        // console.log(isSelected, "!!!!")
        const color = isSelected ? baseColor : colorUtils.lightenColor(baseColor);
    
        // If no special status, return regular color without texture
        if (!nodeData.status?.fanOut &&
            !nodeData.status?.implementationEntryPoint &&
            !nodeData.status?.recursiveEntryPoint) {
            return color;
        }
    
        // Create patterns container only once and store them
        if (!this._patterns) {
            this._patterns = new Map();
            // Clear all existing patterns to avoid mixed sizes
            const svg = d3.select('.d3-flame-graph');
            let defs = svg.select('defs');
            if (!defs.empty()) {
                defs.selectAll('pattern[id^="pattern-"]').remove();
            }
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
    
        // For patterns, use the darkened color to compensate for the visual lightening effect
        // caused by the white elements in the pattern
        const patternBaseColor = isSelected ? colorUtils.darkenColor(color, 0.16) : colorUtils.darkenColor(color, 0.16);
    
        const patternId = createSafeId(color, patternType);
    
        // Check if pattern already exists in our Map
        if (!this._patterns.has(patternId)) {
            const svg = d3.select('.d3-flame-graph');
            let defs = svg.select('defs');
            if (defs.empty()) {
                defs = svg.insert('defs', ':first-child');
            }
    
            // Remove existing pattern if it exists
            defs.select(`#${patternId}`).remove();
    
            // 保持高度为16，但显著增加宽度以减少边界干扰
            const patternHeight = 16;
            const patternWidth = 2048; // 非常宽，以确保几乎不会有边界交叉
    
            // Create pattern based on node status type - 保持原始图案设计
            if (patternType === "implementation") {
                // 水平密集单行大点的图案
                let dotsHtml = '';
                const dotRadius = 2.2;       // 更大的点
                const opacity = 0.5;         // 更高的不透明度以增强可见性
                const dotsPerRow = 160;       // 水平更密集
                const y = patternHeight / 2; // 垂直居中，只有一行
                
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
            else if (patternType === "fanout") {
                // 星形点状图案 - 保持原始设计但横向扩展
                const dotRadius = patternHeight / 8;
                const centerDotRadius = dotRadius * 1.5;
    
                // 创建一个基本单元
                function createStarUnit(offsetX) {
                    return `
                        <circle cx="${offsetX + patternHeight / 4}" cy="${patternHeight / 4}" r="${dotRadius}" fill="#fff" fill-opacity="0.5"/>
                        <circle cx="${offsetX + patternHeight * 3 / 4}" cy="${patternHeight / 4}" r="${dotRadius}" fill="#fff" fill-opacity="0.5"/>
                        <circle cx="${offsetX + patternHeight / 4}" cy="${patternHeight * 3 / 4}" r="${dotRadius}" fill="#fff" fill-opacity="0.5"/>
                        <circle cx="${offsetX + patternHeight * 3 / 4}" cy="${patternHeight * 3 / 4}" r="${dotRadius}" fill="#fff" fill-opacity="0.5"/>
                        <circle cx="${offsetX + patternHeight / 2}" cy="${patternHeight / 2}" r="${centerDotRadius}" fill="#fff" fill-opacity="0.6"/>
                    `;
                }
    
                // 计算可以放多少个完整单元
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
            else if (patternType === "recursive") {
                // 粗线条对角线图案 - 保持原始设计但用更宽的重复单元
                defs.append('pattern')
                    .attr('id', patternId)
                    .attr('patternUnits', 'userSpaceOnUse')
                    .attr('width', patternWidth)
                    .attr('height', patternHeight)
                    .html(`
                        <rect width="${patternWidth}" height="${patternHeight}" fill="${patternBaseColor}"/>
                        <path d="M0,0 L${patternHeight},${patternHeight} M${patternHeight},0 L0,${patternHeight} M${patternHeight},0 L${patternHeight*2},${patternHeight} M${patternHeight*2},0 L${patternHeight},${patternHeight} M${patternHeight*2},0 L${patternHeight*3},${patternHeight} M${patternHeight*3},0 L${patternHeight*2},${patternHeight} M${patternHeight*4},0 L${patternHeight*3},${patternHeight} M${patternHeight*5},0 L${patternHeight*4},${patternHeight} M${patternHeight*6},0 L${patternHeight*5},${patternHeight} M${patternHeight*7},0 L${patternHeight*6},${patternHeight}" 
                            style="stroke:#fff; stroke-width:2.2; stroke-opacity:0.4"/>
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
            ? colorUtils.lightenColor(baseColor)
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


    resetZoom() {
        if (this.flameGraph) {
            this.flameGraph.resetZoom();
        }
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

        this.graphData = newData;

        // Store current zoom state if we want to preserve it
        let currentZoom = null;
        if (!resetZoomAfterUpdate && this.flameGraph) {
            // Some implementations of d3-flamegraph expose the current zoom state
            // If yours doesn't, you may need to track this separately
            currentZoom = this.flameGraph.currentZoom ? this.flameGraph.currentZoom() : null;
        }
        const chartSelection = d3.select(this.chartSelector);
        // Apply the update
        chartSelection
            .datum(newData)
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
            // 首先重置所有矩形的透明度
            d3.selectAll(`${this.chartSelector} rect`).style("fill-opacity", "1");
    
            // 更新所有节点的颜色以确保一致性
            const self = this; // 保存FlameGraphRenderer实例的引用
    
            chartSelection.selectAll("rect").each(function (d) { // 使用function()而不是箭头函数以访问this
                if (d && d.data) {
                    // 不论是否选中，都重新应用颜色
                    d3.select(this).style("fill", self.getNodeColor(d.data));
                }
            });
    
            // 重置reflow处理程序
            this.setupReflowHandler();
        });

        // If we need to reset zoom after update
        if (resetZoomAfterUpdate) {
            console.log("Resetting zoom after update");
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
