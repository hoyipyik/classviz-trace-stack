import { getAllDescendantsAsTree, getSubTreeForSummaryAsTree } from "./nodeTraversal.js";

export function exportSubTree(cy, nodeId) {
    const properties = [
        // "id",
        // "methodName",
        // "className",
        "label",
        "description",
        // "reason",
        // "subtreeSummary",
        // "subtreeDetailedExplanation",
        // "sourceCode",
    ];
    const subTreeData = getAllDescendantsAsTree(cy, nodeId, properties);
    // const subTreeData = getSubTreeForSummaryAsTree(cy, nodeId, properties);
    const subTreeId = subTreeData.id + '.' + subTreeData.className + '.' + subTreeData.methodName;
    const subTreeJson = JSON.stringify(subTreeData, null, 2);
    const subTreeBlob = new Blob([subTreeJson], { type: 'application/json' });
    const subTreeUrl = URL.createObjectURL(subTreeBlob);
    const subTreeFilename = `${subTreeId}.json`;
    // Create a download link and click it
    const downloadLink = document.createElement('a');
    downloadLink.href = subTreeUrl;
    downloadLink.download = subTreeFilename;
    downloadLink.click();
    // Clean up
    URL.revokeObjectURL(subTreeUrl);
}


export function exportRegion(cy, nodeId) {
    const properties = [
        // "id",
        // "methodName",
        // "className",
        "label",
        "description",
        // "reason",
        // "subtreeSummary",
        // "subtreeDetailedExplanation",
        // "sourceCode",
    ];
    // const subTreeData = getAllDescendantsAsTree(cy, nodeId, properties);
    const subTreeData = getSubTreeForSummaryAsTree(cy, nodeId, properties);
    const subTreeId = subTreeData.id + '.' + subTreeData.className + '.' + subTreeData.methodName;
    const subTreeJson = JSON.stringify(subTreeData, null, 2);
    const subTreeBlob = new Blob([subTreeJson], { type: 'application/json' });
    const subTreeUrl = URL.createObjectURL(subTreeBlob);
    const subTreeFilename = `${subTreeId}.json`;
    // Create a download link and click it
    const downloadLink = document.createElement('a');
    downloadLink.href = subTreeUrl;
    downloadLink.download = subTreeFilename;
    downloadLink.click();
    // Clean up
    URL.revokeObjectURL(subTreeUrl);
}