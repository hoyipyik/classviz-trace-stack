
// ============================================================
// Tree Builder - Handles tree construction and processing
// ============================================================
class TreeBuilder {
    findSelectedRoots(threadData) {
        const selectedRoots = [];
        const rootOfThread = threadData;
        if (!rootOfThread) return selectedRoots;

        const findRootsRecursive = (node, isAncestorSelected) => {
            if (!node) return;
            const isNodeSelected = node.selected === true;
            if (isNodeSelected && !isAncestorSelected) selectedRoots.push(node);
            if (node.children && node.children.length > 0) {
                node.children.forEach(child => findRootsRecursive(child, isAncestorSelected || isNodeSelected));
            }
        };

        findRootsRecursive(rootOfThread, false);
        return selectedRoots;
    }

    buildSelectedSubtree(rootNode) {
        if (!rootNode || rootNode.selected !== true) return null;

        const buildRecursive = (originalNode) => {
            const newNode = this._createEssentialNode(originalNode);

            if (originalNode.selected !== undefined) {
                newNode.selected = originalNode.selected;
            }

            if (originalNode.children && originalNode.children.length > 0) {
                originalNode.children.forEach(child => {
                    if (child.selected === true) {
                        const newChild = buildRecursive(child);
                        if (newChild) newNode.children.push(newChild);
                    }
                });
            }
            return newNode;
        };

        return buildRecursive(rootNode);
    }

    buildKNT(tree) {
        if (!tree) return null;
        const kntRoot = this._createKNTNode(tree);

        const findSpecialChildrenRecursive = (originalNode, kntParentNode) => {
            if (!originalNode.children) return;
            for (const child of originalNode.children) {
                if (!child) continue;
                if (this._isSpecialNode(child)) {
                    const specialKNTNode = this._createKNTNode(child);
                    kntParentNode.children.push(specialKNTNode);
                    findSpecialChildrenRecursive(child, specialKNTNode);
                } else {
                    findSpecialChildrenRecursive(child, kntParentNode);
                }
            }
        };

        findSpecialChildrenRecursive(tree, kntRoot);
        return kntRoot;
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

    _createKNTNode(node) {
        if (!node) return null;

        const kntNode = this._createEssentialNode(node);

        if (!kntNode.status) {
            kntNode.status = {};
        }

        kntNode.isSpecialNode = true;
        return kntNode;
    }

    _isSpecialNode(node, isTreeRoot = false) {
        if (isTreeRoot) return true;
        return node.status && (
            node.status.fanOut === true ||
            node.status.implementationEntryPoint === true ||
            node.status.recursiveEntryPoint === true
        );
    }
}

export { TreeBuilder };