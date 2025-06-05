
// FlameGraphPatternManager.js - Manages SVG patterns for flame graph nodes

import { colorUtils } from "../../../../utils/colour/colorChanger.js";


export class FlameGraphPatternManager {
    constructor() {
        this.patterns = new Map();
        this._patternContainer = null;
    }

    init(svgSelection) {
        this.initPatternContainer(svgSelection);
    }

    initPatternContainer(svgSelection) {
        if (!svgSelection) return;

        let defs = svgSelection.select('defs');
        if (defs.empty()) {
            defs = svgSelection.insert('defs', ':first-child');
        }

        // Clear existing patterns to avoid conflicts
        defs.selectAll('pattern[id^="pattern-"]').remove();
        this._patternContainer = defs;
        this.patterns.clear();
    }

    getPatternForNode(nodeData, baseColor, isSelected) {
        if (!this.hasSpecialStatus(nodeData)) {
            return baseColor;
        }

        const patternType = this.determinePatternType(nodeData);
        const patternBaseColor = isSelected ?
            colorUtils.darkenColor(baseColor, 0.16) :
            colorUtils.darkenColor(baseColor, 0.16);

        const patternId = this.createSafePatternId(baseColor, patternType);

        if (!this.patterns.has(patternId)) {
            this.createPattern(patternType, patternId, patternBaseColor);
        }

        return `url(#${patternId})`;
    }

    hasSpecialStatus(nodeData) {
        return nodeData?.status?.fanOut ||
            nodeData?.status?.implementationEntryPoint ||
            nodeData?.status?.recursiveEntryPoint;
    }

    determinePatternType(nodeData) {
        if (nodeData.status?.fanOut) return "fanout";
        if (nodeData.status?.implementationEntryPoint) return "implementation";
        if (nodeData.status?.recursiveEntryPoint) return "recursive";
        return "default";
    }

    createSafePatternId(color, patternType) {
        return 'pattern-' + patternType + '-' + color.toString()
            .replace(/[^a-zA-Z0-9]/g, '')
            .toLowerCase();
    }

    createPattern(patternType, patternId, patternBaseColor) {
        if (!this._patternContainer) return;

        // Remove existing pattern if it exists
        this._patternContainer.select(`#${patternId}`).remove();

        const patternHeight = 16;
        const patternWidth = 2048;

        const patternCreators = {
            'implementation': () => this.createImplementationPattern(patternId, patternWidth, patternHeight, patternBaseColor),
            'fanout': () => this.createFanoutPattern(patternId, patternWidth, patternHeight, patternBaseColor),
            'recursive': () => this.createRecursivePattern(patternId, patternWidth, patternHeight, patternBaseColor)
        };

        const creator = patternCreators[patternType];
        if (creator) {
            creator();
            this.patterns.set(patternId, true);
        }
    }

    createImplementationPattern(patternId, patternWidth, patternHeight, patternBaseColor) {
        let dotsHtml = '';
        const dotRadius = 2.2;
        const opacity = 0.5;
        const dotsPerRow = 160;
        const y = patternHeight / 2;

        for (let col = 0; col < dotsPerRow; col++) {
            const x = patternWidth * (col + 0.5) / dotsPerRow;
            dotsHtml += `<circle cx="${x}" cy="${y}" r="${dotRadius}" fill="#fff" fill-opacity="${opacity}"/>`;
        }

        this._patternContainer.append('pattern')
            .attr('id', patternId)
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', patternWidth)
            .attr('height', patternHeight)
            .html(`
                <rect width="${patternWidth}" height="${patternHeight}" fill="${patternBaseColor}"/>
                ${dotsHtml}
            `);
    }

    createFanoutPattern(patternId, patternWidth, patternHeight, patternBaseColor) {
        const dotRadius = patternHeight / 8;
        const centerDotRadius = dotRadius * 1.5;

        const createStarUnit = (offsetX) => `
            <circle cx="${offsetX + patternHeight / 4}" cy="${patternHeight / 4}" r="${dotRadius}" fill="#fff" fill-opacity="0.5"/>
            <circle cx="${offsetX + patternHeight * 3 / 4}" cy="${patternHeight / 4}" r="${dotRadius}" fill="#fff" fill-opacity="0.5"/>
            <circle cx="${offsetX + patternHeight / 4}" cy="${patternHeight * 3 / 4}" r="${dotRadius}" fill="#fff" fill-opacity="0.5"/>
            <circle cx="${offsetX + patternHeight * 3 / 4}" cy="${patternHeight * 3 / 4}" r="${dotRadius}" fill="#fff" fill-opacity="0.5"/>
            <circle cx="${offsetX + patternHeight / 2}" cy="${patternHeight / 2}" r="${centerDotRadius}" fill="#fff" fill-opacity="0.6"/>
        `;

        const unitsCount = Math.floor(patternWidth / patternHeight);
        let unitsHtml = '';

        for (let i = 0; i < unitsCount; i++) {
            unitsHtml += createStarUnit(i * patternHeight);
        }

        this._patternContainer.append('pattern')
            .attr('id', patternId)
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', patternWidth)
            .attr('height', patternHeight)
            .html(`
                <rect width="${patternWidth}" height="${patternHeight}" fill="${patternBaseColor}"/>
                ${unitsHtml}
            `);
    }

    createRecursivePattern(patternId, patternWidth, patternHeight, patternBaseColor) {
        this._patternContainer.append('pattern')
            .attr('id', patternId)
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', patternWidth)
            .attr('height', patternHeight)
            .html(`
                <rect width="${patternWidth}" height="${patternHeight}" fill="${patternBaseColor}"/>
                <path d="M0,0 L${patternHeight},${patternHeight} M${patternHeight},0 L0,${patternHeight} M${patternHeight},0 L${patternHeight * 2},${patternHeight} M${patternHeight * 2},0 L${patternHeight},${patternHeight} M${patternHeight * 2},0 L${patternHeight * 3},${patternHeight} M${patternHeight * 3},0 L${patternHeight * 2},${patternHeight} M${patternHeight * 4},0 L${patternHeight * 3},${patternHeight} M${patternHeight * 5},0 L${patternHeight * 4},${patternHeight} M${patternHeight * 6},0 L${patternHeight * 5},${patternHeight} M${patternHeight * 7},0 L${patternHeight * 6},${patternHeight}" 
                    style="stroke:#fff; stroke-width:2.2; stroke-opacity:0.4"/>
            `);
    }

    clear() {
        this.patterns.clear();
        if (this._patternContainer) {
            this._patternContainer.selectAll('pattern[id^="pattern-"]').remove();
        }
    }
}