import { getNodeAttributes, createNodeLabel } from './nodeDataProcessor.js';
import { calculateTreeMetrics } from './treeMetricsCalculator.js';
import { computeNodeStatus } from './nodeStatusUtils.js';
import { createNodeFilter, getFilteredChildNodes } from './nodeFilter.js';
import { fetchNodeData } from './nodeDataProcessor.js';
import { createCytoscapeNode, createCytoscapeEdge } from './graphBuilder.js';
import { calculateNodePosition } from './layoutCalculator.js';
import { LAYOUT } from './constants.js';
import { getCytoscapeStyles } from './cytoscapeStyles.js';

export const EXCEPT_METHODS = [
  'java.awt.EventDispatchThread.run()', 
  'java.util.concurrent.ThreadPoolExecutor$Worker.run()'
];

/**
 * 将XML文档解析为多种格式：级联结构、节点映射和nodes/edges数组
 * @param {Document} xmlDoc - 要解析的XML文档
 * @param {Object} options - 配置选项
 * @param {Array<string>} [options.excludeMethods=[]] - 要排除的方法名称 (例如 ['<init>', '<clinit>'])
 * @param {boolean} [options.allowExcludedMethodsAtRoot=false] - 如果位于根节点则允许排除的方法
 * @param {boolean} [options.onlyPackages=false] - 仅包括特定包中的节点
 * @param {Array<string>} [options.includedPackages=[]] - 要包含的包 (例如 ['nl.tudelft.jpacman'])
 * @param {Array<string>} [options.exceptMethods=[]] - 即使来自排除的包也要包含的特定方法路径
 * @return {Object} 包含多种数据表示的结果对象
 */
export const callTreeParser = (xmlDoc, options = {}) => {
  // 带有合理默认值的默认选项
  const config = {
    excludeMethods: ['<init>', '<clinit>'],
    allowExcludedMethodsAtRoot: false,
    onlyPackages: true,
    includedPackages: ['nl.tudelft.jpacman'],
    exceptMethods: EXCEPT_METHODS,
    ...options
  };

  // 用于直接访问的节点映射
  const nodeMap = {};
  
  // 保存节点和边的数组（用于图形表示）
  const nodes = [];
  const edges = [];
  
  // 节点ID计数器（从0开始）
  let nodeIdCounter = 0;
  
  // 创建节点过滤器
  const shouldIncludeNode = createNodeFilter(config);

  /**
   * 使用DFS处理节点并构建级联结构
   * @param {Element} xmlNode - 要遍历的XML节点
   * @param {string|null} parentId - 父节点的ID，根节点为null
   * @param {number} depth - 树中的当前深度
   * @param {number} leftBound - 计算节点位置的左边界
   * @param {Map} visitedPaths - 用于跟踪递归检测的访问路径映射
   * @param {boolean} parentIsFanout - 父节点是否有扇出
   * @return {Object} 节点数据和新的左边界
   */
  const processNodeDFS = (xmlNode, parentId = null, depth = 0, leftBound = 0, visitedPaths = new Map(), parentIsFanout = false) => {
    const isRoot = !parentId;
    const attributes = getNodeAttributes(xmlNode);

    // 跳过排除的方法（除非在根节点且允许）
    if (config.excludeMethods.includes(attributes.methodName) && !(isRoot && config.allowExcludedMethodsAtRoot)) {
      return { nodeData: null, newLeftBound: leftBound };
    }

    // 为节点创建唯一的数字ID（从0开始）
    const nodeId = (nodeIdCounter++).toString();
    
    // 根据配置筛选子节点
    const childNodes = getFilteredChildNodes(xmlNode, shouldIncludeNode, isRoot);

    // 创建节点标签
    const label = createNodeLabel(isRoot, attributes.className, attributes.methodName);

    // 计算节点位置
    const position = calculateNodePosition(xmlNode, shouldIncludeNode, depth, leftBound, childNodes);

    // 计算节点状态
    const { status, visitedPaths: updatedVisitedPaths } = computeNodeStatus(
      isRoot,
      childNodes,
      attributes.className,
      attributes.methodName,
      visitedPaths,
      parentIsFanout,
      nodeId
    );

    // 计算树度量
    const treeMetrics = calculateTreeMetrics(xmlNode, shouldIncludeNode);

    // 获取和处理节点数据
    const processedData = fetchNodeData(attributes.className, attributes.methodName, isRoot);

    // 创建包含所有信息的节点数据
    const nodeData = {
      id: nodeId,
      parentId: parentId, // 包含父节点ID
      label,
      className: attributes.className,
      methodName: attributes.methodName,
      ...processedData,
      time: attributes.time,
      selfTime: attributes.selfTime,
      isRoot,
      collapsed: false,
      selected: false,
      // 树统计
      treeStats: {
        directChildrenCount: treeMetrics.directChildrenCount,
        totalDescendants: treeMetrics.totalDescendants,
        subtreeDepth: treeMetrics.subtreeDepth,
        level: depth
      },
      // 节点状态
      status,
      // 初始化子节点数组
      children: []
    };

    // 将节点添加到映射中以便直接访问
    nodeMap[nodeId] = nodeData;
    
    // 创建Cytoscape节点并添加到nodes数组
    nodes.push(createCytoscapeNode(nodeData, position));
    
    // 如果有父节点，创建边并添加到edges数组
    if (parentId !== null) {
      edges.push(createCytoscapeEdge(parentId, nodeId));
    }

    // 更新leftBound用于子节点布局
    let newLeftBound = leftBound;
    
    // 处理子节点并将它们添加到当前节点
    if (childNodes.length > 0) {
      childNodes.forEach(childNode => {
        const { nodeData: childData, newLeftBound: childLeftBound } = processNodeDFS(
          childNode,
          nodeId, // 传递当前节点ID作为子节点的父ID
          depth + 1,
          newLeftBound,
          new Map(updatedVisitedPaths),
          status.fanOut
        );
        
        if (childData) {
          nodeData.children.push(childData);
          newLeftBound = childLeftBound;
        }
      });
    } else {
      // 如果没有子节点，仅递增leftBound
      newLeftBound += LAYOUT.NODE_SIZE;
    }

    return { nodeData, newLeftBound };
  };

  // 获取根节点并开始处理
  const rootNode = xmlDoc.getElementsByTagName('tree')[0];
  if (!rootNode) {
    console.error("XML文档中未找到根'tree'元素");
    return { 
      cascadeTree: {}, 
      nodeMap: {}, 
      nodes: [], 
      edges: [],
      rootNode: null
    };
  }

  // 从根节点开始处理
  const { nodeData: rootData } = processNodeDFS(rootNode, null, 0, 0, new Map(), false);
  
  // 如果处理失败，返回空结果
  if (!rootData) {
    return { 
      cascadeTree: {}, 
      nodeMap: {}, 
      nodes: [], 
      edges: [],
      rootNode: null
    };
  }

  // 创建以root子节点的label为key的结构
  const labelBasedTree = {};
  
  // 将根节点的子节点作为顶层条目添加到labelBasedTree
  if (rootData.children && rootData.children.length > 0) {
    rootData.children.forEach(child => {
      labelBasedTree[child.label] = child;
    });
  } else {
    // 如果根节点没有子节点，则使用根节点本身
    labelBasedTree[rootData.label] = rootData;
  }

  // 获取Cytoscape样式
  const styles = getCytoscapeStyles(LAYOUT.NODE_SIZE);

  // 返回综合结果
  return { 
    cascadeTree: labelBasedTree,  // 以label为key的级联树
    nodeMap: nodeMap,             // 节点ID映射
    rootNode: rootData,           // 原始根节点
    nodes: nodes,                 // 用于图形表示的节点数组
    edges: edges,                 // 用于图形表示的边数组
    cytoscapeStyles: styles                // Cytoscape样式
  };
};