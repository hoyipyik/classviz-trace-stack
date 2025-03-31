import { colorUtils } from "./colorChanger.js";

  /**
   * Maps method call data to flame graph compatible format
   * @param {Object} methodNode - The method call data node
   * @param {boolean} useTimeTotals - Whether to use total time (true) or self time (false) for node values
   * @return {Object} A flame graph compatible data structure
   */
  export function mapMethodDataToFlameGraph(methodNode, useTimeTotals = true) {
    if (!methodNode) return null;

    const node = {
      name: methodNode.label || `${methodNode.className}.${methodNode.methodName}()`,
      value: Math.max(parseInt(useTimeTotals ? methodNode.time : methodNode.selfTime) || 1, 1),
      selected: false
    };

    // Add children if any
    if (methodNode.children && methodNode.children.length > 0) {
      node.children = methodNode.children.map(child => mapMethodDataToFlameGraph(child, useTimeTotals));
    }

   

    // Copy all properties from methodNode to the transformed node for metadata
    Object.keys(methodNode).forEach(key => {
      if (key !== 'children' && !(key in node)) {
        node[key] = methodNode[key];
      }
    });

    // Ensure key timing properties are correctly formatted as integers
    if (methodNode.time) node.totalTime = parseInt(methodNode.time);
    if (methodNode.selfTime) node.selfTime = parseInt(methodNode.selfTime);
    // lighten colour
    if(methodNode.color) node.color = colorUtils.lightenColor(methodNode.color);

    return node;
  }
