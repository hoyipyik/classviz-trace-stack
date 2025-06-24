
// ============================================================
// Recursive Call Processor - Handles compression of recursive calls
// ============================================================
class RecursiveCallProcessor {
    compressRecursiveCalls(tree) {
        if (!tree) return;

        const findAndCompressRecursive = (node) => {
            if (!node) return;
            if (node.status && node.status.recursiveEntryPoint === true) {
                this.compressRecursiveNode(node);
            }
            if (node.children && node.children.length > 0) {
                node.children.forEach(child => findAndCompressRecursive(child));
            }
        };

        findAndCompressRecursive(tree);
    }

    compressRecursiveNode(node) {
        if (!node || !node.status || !node.status.recursiveEntryPoint) return false;
        const children = node.children || [];
        const recursiveLabel = node.label;
        const mergedDirectChildren = new Map();
        const exitNodes = [];

        const collectNodes = (nodesToScan) => {
            for (const child of nodesToScan) {
                if (!child) continue;
                const isExitNode = (n) => {
                    if (n.label !== recursiveLabel) return false;
                    if (!n.children || n.children.length === 0) return true;
                    for (const childNode of n.children || []) {
                        if (childNode.label === recursiveLabel) return false;
                    }
                    return true;
                };

                if (isExitNode(child)) {
                    const exitNode = this._createEssentialNode(child);
                    exitNode.isExit = true;

                    if (child.children && child.children.length > 0) {
                        child.children.forEach(exitChild => {
                            if (exitChild) {
                                const childCopy = this._createEssentialNode(exitChild);
                                exitNode.children.push(childCopy);

                                if (exitChild.children && exitChild.children.length > 0) {
                                    this._copyChildrenRecursive(exitChild, childCopy);
                                }
                            }
                        });
                    }

                    exitNodes.push(exitNode);
                } else if (child.label === recursiveLabel) {
                    collectNodes(child.children || []);
                } else {
                    const pathSignature = this._generatePathSignature(child, recursiveLabel);
                    const currentNode = this._createEssentialNode(child);

                    if (child.children && child.children.length > 0) {
                        child.children.forEach(grandchild => {
                            if (grandchild) {
                                const simplifiedChild = this._createEssentialNode(grandchild);
                                currentNode.children.push(simplifiedChild);
                            }
                        });
                    }

                    if (mergedDirectChildren.has(pathSignature)) {
                        const existingNode = mergedDirectChildren.get(pathSignature);
                        let targetNode, sourceNode;
                        if (parseInt(existingNode.id) < parseInt(currentNode.id)) {
                            targetNode = existingNode; sourceNode = currentNode;
                        } else {
                            targetNode = currentNode; sourceNode = existingNode;
                            mergedDirectChildren.set(pathSignature, targetNode);
                        }
                        targetNode.freq = (targetNode.freq || 1) + (sourceNode.freq || 1);
                    } else {
                        currentNode.freq = 1;
                        mergedDirectChildren.set(pathSignature, currentNode);
                    }
                }
            }
        };

        collectNodes(children);
        const mergedChildrenArray = Array.from(mergedDirectChildren.values());
        const newChildren = [...mergedChildrenArray, ...exitNodes];
        node.children = newChildren.sort((a, b) => parseInt(a.id) - parseInt(b.id));
        node.compressed = true;
        return true;
    }

    _createEssentialNode(originalNode, preserveStatus = true) {
        const newNode = {
            id: originalNode.id,
            label: originalNode.label,
            description: originalNode.description,
            children: []
        };

        if (preserveStatus && originalNode.status) {
            newNode.status = { ...originalNode.status };
        }

        if (originalNode.freq !== undefined) {
            newNode.freq = originalNode.freq;
        }

        if (originalNode.isExit === true) {
            newNode.isExit = true;
        }

        if (originalNode.compressed === true) {
            newNode.compressed = true;
        }

        return newNode;
    }

    _copyChildrenRecursive(sourceNode, targetNode) {
        if (!sourceNode.children || sourceNode.children.length === 0) return;

        sourceNode.children.forEach(child => {
            if (child) {
                const childCopy = this._createEssentialNode(child);
                targetNode.children.push(childCopy);

                if (child.children && child.children.length > 0) {
                    this._copyChildrenRecursive(child, childCopy);
                }
            }
        });
    }

    _generatePathSignature(node, recursiveLabel) {
        let signature = node.label;
        if (node.children && node.children.length > 0) {
            const childSignatures = [];
            for (const child of node.children) {
                if (child.label === recursiveLabel) continue;
                childSignatures.push(this._generatePathSignature(child, recursiveLabel));
            }
            childSignatures.sort();
            if (childSignatures.length > 0) signature += "[" + childSignatures.join(",") + "]";
        }
        return signature;
    }
}

export { RecursiveCallProcessor };