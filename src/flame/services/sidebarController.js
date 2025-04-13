import { mapMethodDataToLogicalFlameGraph, mapMethodDataToTemporalFlameGraph } from "../utils/dataTransformer.js";
import { CONSTANTS } from "./contants.js";

export class FlameSidebarController {
    constructor(containerId, dataManager, flameRenderer, flameChartContainer,
        selectionManager, packageColorMap, idRangeByThreadMap) {
        this.dataManager = dataManager;
        this.renderer = flameRenderer;
        this.container = document.getElementById(containerId);
        this.flameChartContainer = flameChartContainer;
        this.selectionManager = selectionManager;
        this.packageColorMap = packageColorMap;
        this.idRangeByThreadMap = idRangeByThreadMap;
        this.traceMode = false;

        // Initialize selection values with defaults
        this.dataMap = this.dataManager.getData();
        this.threadSelectionValue = Object.keys(this.dataMap)[0] || null;
        this.graphStyleSelectionValue = 'logical';
        this.showLogical = true;

    }

    initialize() {

        this.createSidebarContentUI();
        // this.selectAllByDefault();
    }

    updateFromManager(newData) {
        this.dataMap = newData;
    }

    // selectAllByDefault() {
    //     console.log("Selecting all nodes by default");
    //     this.selectionManager.selectAll(this.dataMap);
    //     this.flameChartContainer.updateSelectionCountDisplay();
    // }

    createSidebarContentUI() {
        this.container.innerHTML = '';
        this.container.style.width = '100%';
        this.container.style.boxSizing = 'border-box';
        this.container.style.border = '1px solid #ccc';

        this.createToggleButtonsUI();
        this.createThreadSelectorUI();
        this.createFlameWidthStyleSelectorUI();
        this.createPackageFilterSelectorUI();
        this.createSliderFilterUI();
    }

    createSliderFilterUI() {
        const sectionContainer = document.createElement('div');
        sectionContainer.className = 'package-filter-section';
        sectionContainer.id = 'slider-filter-section';
        sectionContainer.style.cssText = 'margin-top: 10px; padding: 5px; border-top: 1px solid #eee;';

        const h2Element = document.createElement('h2');
        h2Element.textContent = 'DFS Trace Range Filter';
        h2Element.style.marginBottom = '15px';
        sectionContainer.appendChild(h2Element);

        // Slider container
        const sliderContainer = document.createElement('div');
        sliderContainer.style.cssText = 'position: relative; width: 100%; height: 40px; margin: 10px 0 3px 0;';

        // Display for percentages
        const percentageDisplay = document.createElement('div');
        percentageDisplay.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 2px;';

        const startPercentDisplay = document.createElement('span');
        startPercentDisplay.textContent = 'Start: 0%';
        startPercentDisplay.id = 'start-percent-display';

        const endPercentDisplay = document.createElement('span');
        endPercentDisplay.textContent = 'End: 100%';
        endPercentDisplay.id = 'end-percent-display';

        percentageDisplay.appendChild(startPercentDisplay);
        percentageDisplay.appendChild(endPercentDisplay);

        // Track for the slider
        const sliderTrack = document.createElement('div');
        sliderTrack.style.cssText = 'position: absolute; width: 100%; height: 4px; background-color: #ddd; top: 8px; border-radius: 2px;';

        // Selected range visualization
        const selectedRange = document.createElement('div');
        selectedRange.id = 'selected-range';
        selectedRange.style.cssText = 'position: absolute; height: 4px; background-color: #4a86e8; top: 8px; border-radius: 2px; left: 0%; width: 100%;';

        // Start slider thumb
        const startSlider = document.createElement('input');
        startSlider.type = 'range';
        startSlider.min = '0';
        startSlider.max = '100';
        startSlider.value = '0';
        startSlider.id = 'start-percent-slider';
        startSlider.style.cssText = 'position: absolute; width: 100%; top: -1px; -webkit-appearance: none; pointer-events: none; background: transparent; z-index: 3;';

        // Customize the thumb appearance
        startSlider.style.cssText += `
            -webkit-appearance: none;
            pointer-events: none;
            width: 100%;
            height: 20px;
            background: transparent;
            outline: none;
        `;

        // End slider thumb
        const endSlider = document.createElement('input');
        endSlider.type = 'range';
        endSlider.min = '0';
        endSlider.max = '100';
        endSlider.value = '100';
        endSlider.id = 'end-percent-slider';
        endSlider.style.cssText = 'position: absolute; width: 100%; top: -1px; -webkit-appearance: none; pointer-events: none; background: transparent; z-index: 3;';

        // Custom CSS for slider thumbs
        const thumbCSS = `
            input[type=range]::-webkit-slider-thumb {
                -webkit-appearance: none;
                pointer-events: auto;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #4a86e8;
                cursor: pointer;
                border: none;
                margin-top: -6px;
            }
            input[type=range]::-moz-range-thumb {
                pointer-events: auto;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #4a86e8;
                cursor: pointer;
                border: none;
            }
        `;

        // Add custom CSS to document
        const style = document.createElement('style');
        style.textContent = thumbCSS;
        document.head.appendChild(style);

        // Results section
        const resultsSection = document.createElement('div');
        resultsSection.style.cssText = 'margin-top: 5px; padding: 10px; background-color: #f5f5f5; border-radius: 4px;';

        const selectedIdsTitle = document.createElement('div');
        selectedIdsTitle.textContent = 'Selected Trace Range:';
        selectedIdsTitle.style.fontWeight = 'bold';

        const selectedIdsRange = document.createElement('div');
        selectedIdsRange.id = 'selected-ids-range';
        selectedIdsRange.textContent = 'Calculating...';

        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = 'margin-top: 10px; display: flex; gap: 10px;';

        // Apply button
        const applyButton = document.createElement('button');
        applyButton.textContent = 'Select';
        applyButton.style.cssText = 'padding: 5px 15px; background-color: white;  border: 1px solid #888; border-radius: 4px; cursor: pointer;';

        // Clear button
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Unselect Range';
        clearButton.style.cssText = 'padding: 5px 15px; background-color: white;  border: 1px solid #888; border-radius: 4px; cursor: pointer;';

        // Assemble the components
        sliderContainer.appendChild(sliderTrack);
        sliderContainer.appendChild(selectedRange);
        sliderContainer.appendChild(startSlider);
        sliderContainer.appendChild(endSlider);

        resultsSection.appendChild(selectedIdsTitle);
        resultsSection.appendChild(selectedIdsRange);

        // Add buttons to the container
        buttonsContainer.appendChild(applyButton);
        buttonsContainer.appendChild(clearButton);
        resultsSection.appendChild(buttonsContainer);

        sectionContainer.appendChild(percentageDisplay);
        sectionContainer.appendChild(sliderContainer);
        sectionContainer.appendChild(resultsSection);

        this.container.appendChild(sectionContainer);

        // Store references for later removal
        this.sliderSection = sectionContainer;
        this.sliderStyle = style;

        // Event listeners for the sliders
        let startPercent = 0;
        let endPercent = 100;

        const updateSliderUI = () => {
            // Update the visual representation
            selectedRange.style.left = startPercent + '%';
            selectedRange.style.width = (endPercent - startPercent) + '%';

            // Update text displays
            startPercentDisplay.textContent = 'Start: ' + startPercent + '%';
            endPercentDisplay.textContent = 'End: ' + endPercent + '%';

            // Calculate selected IDs from thread map
            if (this.threadSelectionValue && this.idRangeByThreadMap.has(this.threadSelectionValue)) {
                const [startId, endId] = this.idRangeByThreadMap.get(this.threadSelectionValue);
                this.currentIdRangeStore = [startId, endId];
                const totalRange = endId - startId + 1;

                const calculatedStartId = Math.round(startId + (startPercent / 100) * (totalRange - 1));
                const calculatedEndId = Math.round(startId + (endPercent / 100) * (totalRange - 1));

                // Display the ID range
                selectedIdsRange.innerHTML = `Start ID: ${calculatedStartId}, End ID: ${calculatedEndId} <br>
                  Start Step: ${calculatedStartId - startId}, End Step: ${calculatedEndId - startId} <br>
                  Total: ${calculatedEndId - calculatedStartId + 1} Nodes`;

                // Store the selected range for use when applying the filter
                this.selectedIdRange = [calculatedStartId, calculatedEndId];
            } else {
                selectedIdsRange.textContent = 'No thread selected or range available';
                this.selectedIdRange = null;
            }
        };

        // Initialize UI
        updateSliderUI();

        startSlider.addEventListener('input', (e) => {
            startPercent = parseInt(e.target.value, 10);
            // Ensure start doesn't go past end
            if (startPercent > endPercent) {
                startPercent = endPercent;
                startSlider.value = endPercent;
            }
            updateSliderUI();
        });

        endSlider.addEventListener('input', (e) => {
            endPercent = parseInt(e.target.value, 10);
            // Ensure end doesn't go before start
            if (endPercent < startPercent) {
                endPercent = startPercent;
                endSlider.value = startPercent;
            }
            updateSliderUI();
        });

        // Apply filter button event listener
        applyButton.addEventListener('click', () => {
            if (this.selectedIdRange) {
                // Generate the full list of IDs
                const [originalStartId, originalEndId] = this.currentIdRangeStore;
                const [startId, endId] = this.selectedIdRange;
                this.selectionManager.selectOrClearByIdRange(originalStartId, startId - 1, false);
                this.selectionManager.selectOrClearByIdRange(startId, endId, true);
                this.selectedIdRange.selectOrClearByIdRange(endId + 1, originalEndId, false);
            }
        });

        // Clear button event listener
        clearButton.addEventListener('click', () => {
            // Reset the sliders to their default positions
            // startSlider.value = 0;
            // endSlider.value = 100;
            // startPercent = 0;
            // endPercent = 100;
            // updateSliderUI();

            if (this.selectedIdRange) {
                // const [originalStartId, originalEndId] = this.currentIdRangeStore;
                const [startId, endId] = this.selectedIdRange;
                // this.selectionManager.selectOrClearByIdRange(originalStartId, startId - 1, true);
                this.selectionManager.selectOrClearByIdRange(startId, endId, false);
                // this.selectedIdRange.selectOrClearByIdRange(endId + 1, originalEndId, false);
            }
        });

        // Return the container for reference
        return sectionContainer;
    }

    // Function to remove the slider filter UI
    removeSliderFilterUI() {
        if (this.sliderSection) {
            // Remove the slider section from DOM
            if (this.sliderSection.parentNode) {
                this.sliderSection.parentNode.removeChild(this.sliderSection);
            }

            // Remove the custom style element if it exists
            if (this.sliderStyle && this.sliderStyle.parentNode) {
                this.sliderStyle.parentNode.removeChild(this.sliderStyle);
            }

            // Clear references
            this.sliderSection = null;
            this.sliderStyle = null;
            this.selectedIdRange = null;
        }
    }

    createPackageFilterSelectorUI() {
        // Create a section container for package filter
        const sectionContainer = document.createElement('div');
        sectionContainer.className = 'package-filter-section';
        sectionContainer.style.cssText = 'margin-top: 10px; padding: 5px; border-top: 1px solid #eee;';
        const h2Element = document.createElement('h2');
        h2Element.textContent = 'Package Filters';
        sectionContainer.appendChild(h2Element);

        // Create the details element for collapsible functionality
        const details = document.createElement('details');
        details.open = true; // Start expanded by default
        details.style.cssText = 'width: 100%;';

        // Style to remove the default disclosure triangle
        const style = document.createElement('style');
        style.textContent = `
            details.package-filter-details > summary {
                list-style: none;
            }
            details.package-filter-details > summary::-webkit-details-marker {
                display: none;
            }
        `;
        document.head.appendChild(style);
        details.className = 'z';

        // Create the summary element (clickable header)
        const summary = document.createElement('summary');
        summary.style.cssText = 'cursor: pointer; padding: 2px 0; user-select: none; display: flex; align-items: center; justify-content: space-between;';

        // Create the h2 with the original styling
        const header = document.createElement('h2');
        header.textContent = 'Packages';
        header.style.margin = '5px 0';

        // Add a custom toggle icon
        const toggleIcon = document.createElement('span');
        toggleIcon.textContent = '▼';
        toggleIcon.style.cssText = 'font-size: 12px; margin-right: 10px;';

        // Add event to rotate icon when details is toggled
        details.addEventListener('toggle', () => {
            if (details.open) {
                toggleIcon.textContent = '▼';
                toggleIcon.style.transform = 'rotate(0deg)';
            } else {
                toggleIcon.textContent = '▶';
                toggleIcon.style.transform = 'rotate(-90deg)';
            }
        });

        summary.appendChild(header);
        summary.appendChild(toggleIcon);

        details.appendChild(summary);

        // Create a wrapper div to hold all package items
        const wrapper = document.createElement('div');
        wrapper.className = 'package-filter-wrapper';
        wrapper.style.cssText = 'display: flex; flex-direction: column; gap: 4px; margin-top: 5px;';

        // Iterate through the packageColorMap (using Map's forEach)
        this.packageColorMap.forEach((color, packageName) => {
            // Create an item container for each package
            const packageItem = document.createElement('div');
            packageItem.className = 'package-item';
            packageItem.style.cssText = 'display: flex; flex-direction: column; padding: 4px; border: 1px solid #ddd; border-radius: 4px;';

            // Create left side with package name and color circle
            const packageInfo = document.createElement('div');
            packageInfo.style.cssText = 'display: flex; align-items: center;';

            // Create color circle
            const colorCircle = document.createElement('span');
            colorCircle.style.cssText = `
                display: inline-block;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background-color: ${color};
                margin-right: 8px;
            `;

            // Create package name label
            const packageNameLabel = document.createElement('span');
            packageNameLabel.textContent = packageName;
            packageNameLabel.style.cssText = 'font-weight: bold; font-size: 14px;';

            // Add color circle and package name to the info div
            packageInfo.appendChild(colorCircle);
            packageInfo.appendChild(packageNameLabel);

            // Create button container - now on the next line
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = 'display: flex; gap: 4px; margin-top: 3px;';

            // Create Select button - gray bordered style
            const selectButton = document.createElement('button');
            selectButton.textContent = 'Select';
            selectButton.style.cssText = `
                padding: 4px 8px;
                background-color: white;
                color: #555;
                border: 1px solid #ccc;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
            `;
            selectButton.addEventListener('click', () => {
                this.onFilterButtonClicked(packageName, true);
            });

            // Create Clear button - gray bordered style
            const clearButton = document.createElement('button');
            clearButton.textContent = 'Clear';
            clearButton.style.cssText = `
                padding: 4px 8px;
                background-color: white;
                color: #555;
                border: 1px solid #ccc;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
            `;
            clearButton.addEventListener('click', () => {
                this.onFilterButtonClicked(packageName, false);
            });

            // Add buttons to button container
            buttonContainer.appendChild(selectButton);
            buttonContainer.appendChild(clearButton);

            // Add package info and button container to the package item
            packageItem.appendChild(packageInfo);
            packageItem.appendChild(buttonContainer);

            // Add the package item to the wrapper
            wrapper.appendChild(packageItem);
        });

        // Append the wrapper to the details element
        details.appendChild(wrapper);

        // Append the details element to the section container
        sectionContainer.appendChild(details);

        // Append the section container to the main container
        this.container.appendChild(sectionContainer);
    }

    onFilterButtonClicked(packageName, selectedFlag) {
        this.selectionManager.selectOrClearByPackageName(packageName, selectedFlag);
    }

    createToggleButtonsUI() {
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'flame-toggle-buttons';

        const style = document.createElement('style');
        style.textContent = `
            .flame-toggle-buttons {
                padding: 5px;
                box-sizing: border-box;
                width: 100%;
            }
            .expand-collapse-button {
                width: 100%;
                padding: 6px 10px;
                background-color: #f5f5f5;
                border: 1px solid #ddd;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .expand-collapse-button:hover {
                background-color: #e9e9e9;
            }
            .expand-collapse-icon {
                font-size: 16px;
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);

        const toggleButton = document.createElement('button');
        toggleButton.className = 'expand-collapse-button';

        const buttonText = document.createElement('span');
        buttonText.textContent = 'Toggle Flame Chart';
        toggleButton.appendChild(buttonText);

        const iconElement = document.createElement('span');
        iconElement.className = 'expand-collapse-icon';
        iconElement.textContent = '⇕';
        toggleButton.appendChild(iconElement);

        toggleButton.addEventListener('click', () => {
            if (this.flameChartContainer.containerState === CONSTANTS.STATES.MINIMIZED) {
                this.flameChartContainer.setContainerFullyExpand();
                buttonText.textContent = 'Minimize Flame Chart';
            } else {
                this.flameChartContainer.setContainerMinimized();
                buttonText.textContent = 'Expand Flame Chart';
            }
        });

        toggleContainer.appendChild(toggleButton);
        this.container.appendChild(toggleContainer);
    }

    createThreadSelectorUI() {
        const selectorContainer = document.createElement('div');
        selectorContainer.className = 'thread-selector';

        const header = document.createElement('h2');
        header.textContent = 'Thread Selection';
        selectorContainer.appendChild(header);

        const form = document.createElement('form');
        form.className = 'thread-selector-form';

        const style = document.createElement('style');
        style.textContent = `
            .radio-container {
                margin-bottom: 6px;
            }
            .thread-label {
                display: inline-block;
                word-break: break-word;
                max-width: calc(100% - 30px);
                vertical-align: top;
                line-height: 1.4;
                margin-left: 5px;
            }
            .thread-selector {
                width: 100%;
                padding: 5px;
                box-sizing: border-box;
            }
            .thread-selector-form, .style-selector-form {
                margin: 5px 0;
            }
        `;
        document.head.appendChild(style);

        const threadKeys = Object.keys(this.dataManager.getData());

        threadKeys.forEach((key, index) => {
            const radioContainer = document.createElement('div');
            radioContainer.className = 'radio-container';

            const radioInput = document.createElement('input');
            radioInput.type = 'radio';
            radioInput.id = `thread-${key}`;
            radioInput.name = 'thread-selection';
            radioInput.style.cursor = "pointer";
            radioInput.value = key;
            radioInput.style.verticalAlign = 'top';

            // Check if this is the currently selected thread
            radioInput.checked = key === this.threadSelectionValue;

            radioInput.addEventListener('change', () => {
                if (radioInput.checked) {
                    this.threadSelectionValue = key;
                    this.removeSliderFilterUI();
                    this.createSliderFilterUI();
                    this.renderData();
                }
            });

            const label = document.createElement('label');
            label.htmlFor = `thread-${key}`;
            label.textContent = key;
            label.className = 'thread-label';
            label.style.cursor = "pointer";

            radioContainer.appendChild(radioInput);
            radioContainer.appendChild(label);
            form.appendChild(radioContainer);
        });

        selectorContainer.appendChild(form);
        this.container.appendChild(selectorContainer);

        // Initialize with the selected thread
        if (this.threadSelectionValue) {
            setTimeout(() => {
                this.renderData();
            }, 10);
        }
    }

    renderData() {
        const dataMap = this.dataManager.getData();
        const currentDisplayData = dataMap[this.threadSelectionValue];
        const newData = this.showLogical
            ? mapMethodDataToLogicalFlameGraph(currentDisplayData)
            : mapMethodDataToTemporalFlameGraph(currentDisplayData, true);

        this.renderer.updateData(newData, true);
        this.flameChartContainer.updateSelectionCountDisplay();
        console.log("Flame graph data updated:", newData);
    }


    createFlameWidthStyleSelectorUI() {
        const styleContainer = document.createElement('div');
        styleContainer.className = 'style-selector';

        const header = document.createElement('h2');
        header.textContent = 'Flame Graph Style';
        styleContainer.appendChild(header);

        const form = document.createElement('form');
        form.className = 'style-selector-form';

        const styleOptions = [
            { id: 'logical', text: 'Logical', value: true, description: 'Ignores time information, focuses on method call relationships' },
            { id: 'temporal', text: 'Temporal', value: false, description: 'Sets block widths based on actual time usage' }
        ];

        styleOptions.forEach((option) => {
            const radioContainer = document.createElement('div');
            radioContainer.className = 'radio-container';

            const radioInput = document.createElement('input');
            radioInput.type = 'radio';
            radioInput.id = `style-${option.id}`;
            radioInput.name = 'style-selection';
            radioInput.value = option.id;
            radioInput.checked = option.id === this.graphStyleSelectionValue;
            radioInput.style.verticalAlign = 'top';
            radioInput.style.cursor = "pointer";

            radioInput.addEventListener('change', () => {
                if (radioInput.checked) {
                    this.graphStyleSelectionValue = option.id;
                    this.showLogical = option.value;
                    this.renderData();
                }
            });

            const labelContainer = document.createElement('div');
            labelContainer.className = 'label-container';

            const label = document.createElement('label');
            label.htmlFor = `style-${option.id}`;
            label.textContent = option.text;
            label.className = 'style-label';
            label.style.cursor = "pointer";

            labelContainer.appendChild(label);

            const description = document.createElement('div');
            description.className = 'style-description';
            description.textContent = option.description;
            labelContainer.appendChild(description);

            radioContainer.appendChild(radioInput);
            radioContainer.appendChild(labelContainer);
            form.appendChild(radioContainer);
        });

        const style = document.createElement('style');
        style.textContent = `
            .style-selector {
                margin-top: 10px;
                padding: 5px;
                border-top: 1px solid #eee;
            }
            .style-description {
                font-size: 12px;
                color: #666;
                margin-left: 5px;
                margin-top: 2px;
            }
            .label-container {
                display: inline-block;
                vertical-align: top;
                margin-left: 5px;
                max-width: calc(100% - 30px);
            }
            .style-label {
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);

        styleContainer.appendChild(form);
        this.container.appendChild(styleContainer);

        // Set the initial style based on the selected value
        const selectedOption = styleOptions.find(option => option.id === this.graphStyleSelectionValue);
        if (selectedOption) {
            this.showLogical = selectedOption.value;
            this.renderData();
        }
    }
}