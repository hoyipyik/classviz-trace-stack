import { LAYER_COLORS } from './constants.js';

/**
 * Get Cytoscape styles for the graph
 * @param {number} nodeSize - Base size for nodes
 * @return {Array} Array of style objects
 */
export function getCytoscapeStyles(nodeSize) {
  return [
    // 基本節點樣式 - 普通方法節點
    {
      selector: 'node',
      style: {
        'background-color': function(ele) {
          return ele.data('color'); // 保留顏色表示package
        },
        'background-opacity': 0.85,
        'label': '',
        'width': nodeSize,
        'height': nodeSize,
        'shape': 'ellipse', // 所有普通節點都使用橢圓形
        'border-width': 1,
        'border-color': '#333'
      }
    },

    // 特殊節點共用樣式
    {
      selector: 'node[?status.recursiveEntryPoint], node[?status.implementationEntryPoint], node[?status.fanOut]',
      style: {
        'border-width': 2, // 統一的較粗邊框
        'border-color': '#000',
        'background-opacity': 0.95,
        'width': nodeSize * 1.15, // 稍微放大，但不要差異太大
        'height': nodeSize * 1.15
      }
    },

    // Fan Out節點 - 使用星形
    {
      selector: 'node[?status.fanOut]',
      style: {
        'shape': 'star', // 改為星形，更加突出
        'width': nodeSize * 1.25,
        'height': nodeSize * 1.25,
        'z-index': 10
      }
    },

    // 遞歸入口點 - 使用菱形形狀 (已修改)
    {
      selector: 'node[?status.recursiveEntryPoint]',
      style: {
        'shape': 'diamond', // 改為菱形
        'border-width': 3
      }
    },

    // Implementation入口點 - 使用較粗邊框
    {
      selector: 'node[?status.implementationEntryPoint]',
      style: {
        'border-width': 4,
        'border-opacity': 0.9
      }
    },

    // 根節點樣式
    {
      selector: 'node[?isRoot]',
      style: {
        'background-color': LAYER_COLORS.get('ROOT'),
        'background-opacity': 1,
        'shape': 'ellipse',
        'width': nodeSize * 1.35,
        'height': nodeSize * 1.35,
        'border-width': 3.5,
        'border-color': '#000',
        'z-index': 20
      }
    },

    // 邊緣樣式
    {
      selector: 'edge',
      style: {
        'width': function(ele) {
          return ele.data('callCount') ? 
                 Math.min(1 + ele.data('callCount') * 0.3, 3) : 1;
        },
        'line-color': '#aaa',
        'target-arrow-color': '#aaa',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'opacity': 0.85
      }
    },

    // 選中節點樣式
    {
      selector: '.selected',
      style: {
        'border-width': 4,
        'border-color': '#FFC107',
        'border-opacity': 1,
        'z-index': 999
      }
    },

    // 選中節點的相鄰邊
    {
      selector: '.selected-edge',
      style: {
        'width': 2.5,
        'line-color': '#FFC107',
        'target-arrow-color': '#FFC107',
        'opacity': 1,
        'z-index': 900
      }
    }
  ];
}