import { LAYER_COLORS } from './constants.js';

/**
 * Get Cytoscape styles for the graph
 * @param {number} nodeSize - Base size for nodes
 * @return {Array} Array of style objects
 */
export function getCytoscapeStyles(nodeSize) {
  return [
    // Base node style for all nodes
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        'label': '',
        'text-valign': 'center',
        'text-halign': 'center',
        'width': nodeSize,
        'height': nodeSize,
        'shape': function (ele) {
          // Determine shape based on node properties
          const data = ele.data();
          const status = data.status || {};

          if (status.recursiveEntryPoint) {
            return 'diamond';
          } else if (status.fanOut) {
            return 'star';
          } else if (status.implementationEntryPoint) {
            return 'round-rectangle';
          } else {
            return 'ellipse'; // Default shape is circle
          }
        },
        'border-width': function (ele) {
          // Increase border width for special nodes
          const data = ele.data();
          const status = data.status || {};

          if (status.recursiveEntryPoint || status.fanOut || status.implementationEntryPoint) {
            return 2;
          } else {
            return 1;
          }
        },
        'border-color': '#333'
      }
    },
    // Root node style
    {
      selector: 'node[?isRoot]',
      style: {
        'background-color': LAYER_COLORS.get('ROOT'),
        'font-weight': 'bold',
        'width': nodeSize * 1.2,
        'height': nodeSize * 1.2
      }
    },
    // Edge style
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#888',
        'target-arrow-color': '#888',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier'
      }
    },
    // Selected node style
    {
      selector: '.selected',
      style: {
        'border-width': 4,
        'border-color': '#FFC107',
        'border-opacity': 1
      }
    }
  ];
}