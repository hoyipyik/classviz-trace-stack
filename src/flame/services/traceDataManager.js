import { getAllDescendants, getAllDescendantsAsTree, getChildNodes } from "../../trace/ui/components/cytoscape/nodeTraversal.js";
import { updateTraceNodesOnClassviz } from "../../trace/utils/traceNodeOnClassviz/nodeManager.js";

export class TraceDataManager {
    constructor(methodDisplayManager, cy) {
        this._data = null;
        this._subscribers = new Set();
        this.cy = cy;
        this.methodDisplayManager = methodDisplayManager;
        this.initialize();
    }

    initialize() {
        this._data = this.extractTraceByThread();
        console.log("TraceDataManager initialized with data:", this._data);
        this.notifySubscribers();
    }

    getData() {
        return this._data;
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

    extractTraceByThread() {
        const cytrace = this.cy;
        const tree = getAllDescendantsAsTree(cytrace, 1);
        const list = Array.from(tree.children);

        const result = {};
        list.forEach(item => {
            result[item.className] = item;
        });

        return result;
    }

    updateSelectionForSingleNode(id, selected) {
        const cytrace = this.cy;
        const nodes = cytrace.nodes();
        nodes.forEach(node => {
            if (node.data('id') === id) {
                node.data('selected', selected);
            }
        });
        this.refreshData(false);
    }

    updateSelectionForMultiNodes(ids, selected) {
        const cytrace = this.cy;
        const nodes = cytrace.nodes();
        nodes.forEach(node => {
            if (ids.includes(node.data('id'))) {
                node.data('selected', selected);
            }
        });
        this.refreshData(true);
    }

    updateSelectionForAllNodes(selected) {
        const cytrace = this.cy;
        const nodes = cytrace.nodes();
        nodes.forEach(node => {
            node.data('selected', selected);
        });
        this.refreshData(true);
    }

    updateSelectionForSubTree(entryId, selected) {
        const cytrace = this.cy;
        const descendants = getAllDescendants(cytrace, entryId);
        descendants.forEach(node => {
            node.data('selected', selected);
        });
        this.refreshData(true);
    }

    updateSelectionForDirectChildren(entryId, selected) {
        const cytrace = this.cy;
        const children = getChildNodes(cytrace, entryId);
        children.forEach(node => {
            node.data('selected', selected);
        });
        this.refreshData(true);
    }

    refreshData(updateFlag = true) {
        this._data = this.extractTraceByThread();
        this.notifySubscribers({updateSelection: updateFlag});
        this.methodDisplayManager.updateMethodsOnClassviz();
        // updateTraceNodesOnClassviz();
    }

    getCytrace() {
        return this.cy;
    }
}