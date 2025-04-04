import { getAllDescendantsAsTree } from "../../trace/ui/components/cytoscape/nodeTraversal.js";

export const extractTraceByThread = () => {
    const cytrace = window.cytrace;
    const tree = getAllDescendantsAsTree(cytrace, 1);
    const list = Array.from(tree.children);
    
    // Create a plain object instead of a Map
    const result = {};
    
    list.forEach(item => {
        result[item.className] = item;
    });
    
    return result;
}