/**
 * NodeStyler - Handles visual styling and appearance of nodes
 */
export class NodeStyler {
    constructor(cy, insertedNodes, data) {
        this.cy = cy;
        this.insertedNodes = insertedNodes;
        this.data = data;
    }

    /**
     * Change background color for all inserted method nodes
     * @param {string} color - New background color
     */
    changeAllMethodNodesColor(color) {
        this.insertedNodes.forEach((node, _) => {
            if (node) {
                node.style({
                    'background-color': color,
                    'border-color': 'grey',
                });
            }
        });
    }

    /**
     * Change color of a specific node by its original ID
     * @param {string} id - Original node ID
     * @param {string} color - Background color
     * @param {boolean} bordered - Whether to add border styling
     * @param {string} borderColor - Border color
     */
    changeColorOfNodeById(id, color, bordered = false, borderColor = 'grey') {
        const nodeLabel = this.data.getNodeDataById(id).label;
        const node = this.cy.$id(nodeLabel);
        if (node) {
            const styleOptions = {
                'background-color': color
            };

            if (bordered) {
                styleOptions['border-color'] = borderColor;
                styleOptions['border-width'] = '3px';
            } else {
                styleOptions['border-color'] = 'grey';
                styleOptions['border-width'] = '3px';
            }

            node.style(styleOptions);
        }
    }

    /**
     * Apply styles to a library method node
     * @param {object} node - Cytoscape node
     * @param {object} nodeData - Node data
     * @param {string} nodeLabel - Node label
     */
    applyLibraryMethodStyle(node, nodeData, nodeLabel) {
        const color = nodeData.color || nodeData.nodeColor || '#D3D3D3';
        node.style({
            'label': nodeData.properties?.simpleName || nodeLabel.split('.').pop(),
            'color': 'black',
            'font-size': '12px',
            'text-valign': 'center',
            'text-halign': 'center',
            'background-color': color,
            'border-width': '2px',
            'border-color': '#666',
            'border-style': 'dashed',
            'border-opacity': 1,
            'shape': 'round-rectangle',
            'width': '140px',
            'height': '35px',
            'text-wrap': 'ellipsis',
            'text-max-width': '130px'
        });
    }

    /**
     * Apply styles to a regular method node
     * @param {object} node - Cytoscape node
     * @param {object} nodeData - Node data
     * @param {string} nodeLabel - Node label
     */
    applyRegularMethodStyle(node, nodeData, nodeLabel) {
        const color = nodeData.color || nodeData.nodeColor || '#D3D3D3';
        node.style({
            'label': nodeData.properties?.simpleName || nodeLabel.split('.').pop(),
            'color': 'black',
            'font-size': '12px',
            'text-valign': 'center',
            'text-halign': 'center',
            'background-color': color,
            'border-width': '1px',
            'border-color': '#999',
            'border-opacity': 0.8,
            'shape': 'round-rectangle',
            'width': '120px',
            'height': '30px',
            'text-wrap': 'ellipsis',
            'text-max-width': '110px'
        });
    }

    /**
     * Apply basic edge styling
     * @param {object} edge - Cytoscape edge
     * @param {string} sourceNodeLabel - Source node label
     * @param {string} targetNodeLabel - Target node label
     */
    applyBasicEdgeStyle(edge, sourceNodeLabel, targetNodeLabel) {
        edge.style({
            'width': 2,
            'line-color': '#999',
            'target-arrow-color': '#999',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier'
        });

        // For self-referential edges, adjust the curve style
        if (sourceNodeLabel === targetNodeLabel) {
            edge.style({
                'curve-style': 'unbundled-bezier',
                'control-point-distances': [50],
                'control-point-weights': [0.5],
                'loop-direction': '0deg',
                'loop-sweep': '90deg'
            });
        }
    }

    /**
     * Apply numbered edge styling with gradient colors
     * @param {object} edge - Cytoscape edge
     * @param {string} sourceNodeLabel - Source node label
     * @param {string} targetNodeLabel - Target node label
     * @param {number} sequenceNumber - Sequence number
     * @param {string} sourceColour - Source color
     * @param {string} targetColour - Target color
     */
    applyNumberedEdgeStyle(edge, sourceNodeLabel, targetNodeLabel, sequenceNumber, sourceColour, targetColour) {
        edge.style({
            'width': 3,
            'line-gradient-stop-colors': `${sourceColour} ${targetColour}`,
            'line-gradient-stop-positions': '0% 100%',
            'target-arrow-color': targetColour,
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': `${sequenceNumber}`,
            'font-size': '14px',
            'font-weight': 'bold',
            'text-background-color': '#FFFFFF',
            'text-background-opacity': 0.7,
            'text-background-shape': 'roundrectangle',
            'text-background-padding': '2px',
            'text-margin-y': -10,
            'color': '#000000'
        });

        // Handle self-referential edges
        if (sourceNodeLabel === targetNodeLabel) {
            edge.style({
                'curve-style': 'unbundled-bezier',
                'control-point-distances': [50],
                'control-point-weights': [0.5],
                'loop-direction': '0deg',
                'loop-sweep': '90deg'
            });
        }
    }

    /**
     * Apply lifted edge styling
     * @param {object} edge - Cytoscape edge
     * @param {string} parentSourceId - Parent source ID
     * @param {string} parentTargetId - Parent target ID
     * @param {string} sourceColor - Source color
     * @param {string} targetColor - Target color
     */
    applyLiftedEdgeStyle(edge, parentSourceId, parentTargetId, sourceColor, targetColor) {
        edge.style({
            'width': 3,
            'line-gradient-stop-colors': `${sourceColor} ${targetColor}`,
            'line-gradient-stop-positions': '0% 100%',
            'target-arrow-color': targetColor,
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'called 1 times',
            'font-size': '12px',
            'font-weight': 'bold',
            'text-background-color': '#FFFFFF',
            'text-background-opacity': 0.8,
            'text-background-shape': 'roundrectangle',
            'text-background-padding': '2px',
            'color': '#000000'
        });

        // Handle self-referential edges
        if (parentSourceId === parentTargetId) {
            edge.style({
                'curve-style': 'unbundled-bezier',
                'control-point-distances': [50],
                'control-point-weights': [0.5],
                'loop-direction': '0deg',
                'loop-sweep': '90deg'
            });
        }
    }

    /**
     * Update lifted edge thickness and label based on call count
     * @param {object} edge - Cytoscape edge
     * @param {number} count - Number of calls
     * @param {string} sourceColor - Source color
     * @param {string} targetColor - Target color
     */
    updateLiftedEdgeThickness(edge, count, sourceColor, targetColor) {
        const newWidth = Math.min(30, 3 + count * 2);
        edge.style({
            'width': newWidth,
            'label': `called ${count} times`
        });

        if (sourceColor && targetColor) {
            edge.style({
                'line-gradient-stop-colors': `${sourceColor} ${targetColor}`,
                'line-gradient-stop-positions': '0% 100%',
                'target-arrow-color': targetColor
            });
        }
    }
}