/**
 * ClassLayoutManager - Handles class node sizing, positioning, and layout
 */
export class ClassLayoutManager {
    constructor(cy, originalDimensions, classToMethodsMap) {
        this.cy = cy;
        this.originalDimensions = originalDimensions;
        this.classToMethodsMap = classToMethodsMap;
    }

    /**
     * Store original dimensions of a class node
     * @param {string} classId - Class node ID
     * @param {object} classNode - Cytoscape class node
     */
    storeOriginalDimensions(classId, classNode) {
        if (!this.originalDimensions[classId]) {
            const currentPosition = classNode.position();
            this.originalDimensions[classId] = {
                width: classNode.style('width'),
                height: classNode.style('height'),
                textValign: classNode.style('text-valign'),
                textHalign: classNode.style('text-halign'),
                textMarginY: classNode.style('text-margin-y'),
                position: { x: currentPosition.x, y: currentPosition.y }
            };
        }
    }

    /**
     * Adjust class node style and size based on method count
     * @param {string} classId - Class node ID
     * @param {object} classNode - Cytoscape class node
     * @param {number} methodCount - Number of methods in class
     * @returns {object} - New dimensions and position
     */
    adjustClassForMethods(classId, classNode, methodCount) {
        const currentPosition = classNode.position();
        
        // Store original dimensions if not already stored
        this.storeOriginalDimensions(classId, classNode);

        // Calculate new dimensions
        const newHeight = Math.max(150, 80 + (methodCount * 110));
        const newWidth = Math.max(parseInt(this.originalDimensions[classId].width), 800);

        // Apply new style
        classNode.style({
            'width': newWidth,
            'height': newHeight,
            'text-valign': 'top',
            'text-halign': 'center',
            'text-margin-y': 18
        });

        // Reset class node position
        classNode.position(currentPosition);

        return { newHeight, newWidth, currentPosition };
    }

    /**
     * Calculate method node position within class
     * @param {number} methodIndex - Index of method in class
     * @param {number} methodCount - Total number of methods
     * @param {object} parentCenter - Parent class center position
     * @param {number} newHeight - New height of parent class
     * @returns {object} - Method position {x, y}
     */
    calculateMethodPosition(methodIndex, methodCount, parentCenter, newHeight) {
        const parentTopY = parentCenter.y - (newHeight / 2);
        const offsetY = 60 + (methodIndex * 40);
        const methodAbsoluteY = parentTopY + offsetY;
        const horizontalVariance = methodCount > 4 ? (methodIndex % 2) * 20 - 10 : 0;
        const methodAbsoluteX = parentCenter.x + horizontalVariance;

        return {
            x: methodAbsoluteX,
            y: methodAbsoluteY
        };
    }

    /**
     * Calculate position for library method node
     * @returns {object} - Position {x, y}
     */
    calculateLibraryMethodPosition() {
        const positions = this.cy.nodes().map(n => n.position());
        let posX = 100, posY = 100;

        // If there are other nodes, position relative to them
        if (positions.length > 0) {
            // Find average position of all nodes
            const avgX = positions.reduce((sum, pos) => sum + pos.x, 0) / positions.length;
            const avgY = positions.reduce((sum, pos) => sum + pos.y, 0) / positions.length;

            // Calculate position with some offset from average
            posX = avgX + (Math.random() * 200 - 100);
            posY = avgY + (Math.random() * 200 - 100);

            // Avoid overlapping
            let overlap = true;
            let attempts = 0;
            while (overlap && attempts < 10) {
                overlap = false;
                for (const pos of positions) {
                    const distance = Math.sqrt(Math.pow(posX - pos.x, 2) + Math.pow(posY - pos.y, 2));
                    if (distance < 150) { // Minimum distance to avoid overlap
                        overlap = true;
                        break;
                    }
                }
                if (overlap) {
                    posX = avgX + (Math.random() * 400 - 200);
                    posY = avgY + (Math.random() * 400 - 200);
                    attempts++;
                }
            }
        }

        return { x: posX, y: posY };
    }

    /**
     * Restore class node to its original dimensions
     * @param {string} classId - Class node ID
     */
    restoreClassOriginalDimensions(classId) {
        const classNode = this.cy.$id(classId);
        if (!classNode || classNode.length === 0) return;

        const originalDim = this.originalDimensions[classId];
        if (originalDim) {
            classNode.style({
                'width': originalDim.width,
                'height': originalDim.height,
                'text-valign': originalDim.textValign,
                'text-halign': originalDim.textHalign,
                'text-margin-y': originalDim.textMarginY
            });

            // Reset position if needed
            if (originalDim.position) {
                classNode.position(originalDim.position);
            }
        }
    }

    /**
     * Adjust class size based on number of contained method nodes
     * @param {string} classId - Class node ID
     */
    adjustClassSize(classId) {
        const classNode = this.cy.$id(classId);
        if (!classNode || classNode.length === 0) return;

        const methodCount = classNode.children().length;
        const newHeight = Math.max(150, 80 + (methodCount * 110));
        const newWidth = Math.max(
            parseInt(this.originalDimensions[classId]?.width || 150),
            800
        );

        const currentPosition = classNode.position();

        classNode.style({
            'width': newWidth,
            'height': newHeight
        });

        // Explicitly reset position to avoid offset
        classNode.position(currentPosition);

        // Reposition the remaining methods
        this.repositionMethodsInClass(classId);
    }

    /**
     * Reposition method nodes within a class after changes
     * @param {string} classId - Class node ID
     */
    repositionMethodsInClass(classId) {
        const classNode = this.cy.$id(classId);
        if (!classNode || classNode.length === 0) return;

        const children = classNode.children();
        const methodCount = children.length;
        const parentCenter = classNode.position();
        const newHeight = parseInt(classNode.style('height'));
        const parentTopY = parentCenter.y - (newHeight / 2);

        children.forEach((methodNode, index) => {
            // Recalculate position for each method
            const offsetY = 60 + (index * 40);
            const methodAbsoluteY = parentTopY + offsetY;

            // Horizontal centering with variance for many methods
            const horizontalVariance = methodCount > 4 ? (index % 2) * 20 - 10 : 0;
            const methodAbsoluteX = parentCenter.x + horizontalVariance;

            // Set new position
            methodNode.position({
                x: methodAbsoluteX,
                y: methodAbsoluteY
            });
        });
    }

    /**
     * Update class-to-methods mapping when adding a method
     * @param {string} classId - Class node ID
     * @param {string} nodeLabel - Method node label
     */
    addMethodToClass(classId, nodeLabel) {
        if (!this.classToMethodsMap.has(classId)) {
            this.classToMethodsMap.set(classId, new Set());
        }
        this.classToMethodsMap.get(classId).add(nodeLabel);
    }

    /**
     * Update class-to-methods mapping when removing a method
     * @param {string} classId - Class node ID
     * @param {string} nodeLabel - Method node label
     * @returns {boolean} - Whether the class is now empty
     */
    removeMethodFromClass(classId, nodeLabel) {
        if (this.classToMethodsMap.has(classId)) {
            this.classToMethodsMap.get(classId).delete(nodeLabel);
            return this.classToMethodsMap.get(classId).size === 0;
        }
        return false;
    }
}