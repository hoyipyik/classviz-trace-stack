
export class TraceDataManager {
    constructor(methodDisplayManager, data, nodeMap) {
        this._data = data;
        this._nodeMap = nodeMap;
        this._subscribers = new Set();
        this.methodDisplayManager = methodDisplayManager;
        this.initialize();
    }

    initialize() {
        console.log("TraceDataManager initialized with data:", this._data);
        this.notifySubscribers();
    }

    getData() {
        return this._data;
    }

    getNodeMap() {
        return this._nodeMap;
    }

    setData(newData) {
        this._data = newData;
        this.notifySubscribers();
    }

    getThreadClassNames() {
        const dataMap = this.getData();
        const classNames = Object.keys(dataMap);
        return classNames;
    }

    subscribe(callback) {
        this._subscribers.add(callback);
        return () => this._subscribers.delete(callback);
    }

    notifySubscribers(options = {}) {
        const defaultOptions = { updateSelection: true };
        const finalOptions = { ...defaultOptions, ...options };

        for (const callback of this._subscribers) {
            callback(this._data, finalOptions);
        }
    }

    /**
     * 为单个节点更新选择状态
     * @param {string} id - 节点ID
     * @param {boolean} selected - 选择状态
     */
    updateSelectionForSingleNode(id, selected) {
        const nodeMap = this.getNodeMap();
        const node = nodeMap[id]; // 使用对象索引而不是Map的get方法
        if (node) {
            // 直接更新node对象的selected属性，而不是使用data方法
            node.selected = selected;
        }
        this.refreshData(false);
    }

    /**
     * 为多个节点更新选择状态
     * @param {Array<string>} ids - 节点ID数组
     * @param {boolean} selected - 选择状态
     */
    updateSelectionForMultiNodes(ids, selected) {
        const nodeMap = this.getNodeMap();
        ids.forEach(id => {
            const node = nodeMap[id]; // 使用对象索引
            if (node) {
                node.selected = selected;
            }
        });
        this.refreshData(true);
    }

    /**
     * 为所有节点更新选择状态
     * @param {boolean} selected - 选择状态
     */
    updateSelectionForAllNodes(selected) {
        const nodeMap = this.getNodeMap();
        // 使用Object.values遍历对象的所有值
        Object.values(nodeMap).forEach(node => {
            node.selected = selected;
        });
        this.refreshData(true);
    }

    /**
     * 为子树中的所有节点更新选择状态（包括入口节点本身）
     * @param {string} entryId - 入口节点ID
     * @param {boolean} selected - 选择状态
     */
    updateSelectionForSubTree(entryId, selected) {
        const nodeMap = this.getNodeMap();
        const entryNode = nodeMap[entryId];

        if (entryNode) {
            // 首先更新入口节点自身
            entryNode.selected = selected;

            // 递归函数，更新所有子节点的选择状态
            function updateChildrenSelection(node) {
                if (node.children && node.children.length > 0) {
                    node.children.forEach(childNode => {
                        // 更新子节点
                        childNode.selected = selected;
                        // 递归处理子节点的子节点
                        updateChildrenSelection(childNode);
                    });
                }
            }

            // 从入口节点开始递归更新
            updateChildrenSelection(entryNode);
        }

        this.refreshData(true);
    }

    /**
     * 为直接子节点更新选择状态（仅一级子节点）
     * @param {string} entryId - 父节点ID
     * @param {boolean} selected - 选择状态
     */
    updateSelectionForDirectChildren(entryId, selected) {
        const nodeMap = this.getNodeMap();
        const entryNode = nodeMap[entryId];

        if (entryNode && entryNode.children) {
            // 更新所有直接子节点
            entryNode.children.forEach(childNode => {
                childNode.selected = selected;
            });
        }

        this.refreshData(true);
    }

    refreshData(updateFlag = true) {
        this.notifySubscribers({ updateSelection: updateFlag });
        this.methodDisplayManager.updateMethodsOnClassviz();
    }
}