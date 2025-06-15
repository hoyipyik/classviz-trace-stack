import { DEEPSEEK_API_KEY, DEEPSEEK_URL } from "../../../../../config.js";

/**
 * Controller for LLM Explanation UI
 * Manages explanation options and display of results
 */
export class ExplanationUIController {
    constructor(explainer, eventBus, regionFocusManager, containerId = 'llmExplanation') {
        this.explainer = explainer;
        this.eventBus = eventBus;
        this.regionFocusManager = regionFocusManager;

        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container with ID '${containerId}' not found`);
            return;
        }

        // Base container styles
        this.applyStyles(this.container, {
            overflow: 'visible',
            maxHeight: 'none',
            width: '240px',
            boxSizing: 'border-box',
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            wordBreak: 'break-word',
            position: 'static',
            display: 'block'
        });

        this.initUI();


        this.eventBus.subscribe('stopRegionFocusMode', () => {
            const highlightInput = document.getElementById('highlightInputElement');
            if (highlightInput) {
                highlightInput.checked = false;
                this.regionFocusManager.regionFocusMode = false;
                this.updateHighlightSwitchUI(false);
                this.eventBus.publish('refreshRegionFocus', { stopStepByStepMode: false });
            }
        });

        // Subscribe to the explanationCompleted event
        this.eventBus.subscribe('explanationCompleted', ({ backData }) => {
            this.loadingContainer.style.display = 'none';
            this.loadExplanations();
        });

        // Subscribe to the changeRegionFocus event
        this.eventBus.subscribe('changeRegionFocus', ({ focusedRegionId }) => {
            this.handleRegionFocus(focusedRegionId);
            console.log(`Explanation: Region focus changed to ${focusedRegionId}`)
        });

        // Check for current LLM settings if available
        if (this.explainer.llmService) {
            setTimeout(() => {
                if (this.modelSelector && this.explainer.llmService.model) {
                    this.modelSelector.value = this.explainer.llmService.model;
                }
                if (this.apiUrlInput && this.explainer.llmService.apiUrl) {
                    this.apiUrlInput.value = this.explainer.llmService.apiUrl;
                }
                if (this.apiKeyInput && this.explainer.llmService.apiKey) {
                    this.apiKeyInput.placeholder = "API key is set";
                }
            }, 100);
        }
    }

    /**
     * Handles external region focus events by switching to the specified region if it exists
     * @param {string} focusedRegionId - The ID of the region to focus on
     */
    handleRegionFocus(focusedRegionId) {
        if (!focusedRegionId) return;

        // Check if the region exists in our available regions
        const regionData = this.explainer.regions.get(focusedRegionId);
        if (!regionData || !regionData.explained) {
            this.eventBus.publish('refreshRegionFocus', { stopStepByStepMode: false });
            // console.warn(`Region ${focusedRegionId} not found or not explained yet`);
            return;
        }

        // Find which tree this region belongs to
        let foundTreeId = null;
        for (const [treeId, regionIds] of this.explainer.traceToRegion.entries()) {
            if (regionIds.includes(focusedRegionId)) {
                foundTreeId = treeId;
                break;
            }
        }

        if (!foundTreeId) {
            console.warn(`Could not find tree containing region ${focusedRegionId}`);
            return;
        }

        // Change tree selection if needed
        if (foundTreeId !== this.regionFocusManager.currentSelectedTreeId) {
            this.regionFocusManager.currentSelectedTreeId = foundTreeId;
            this.treeSelector.value = foundTreeId;
            this.loadRegionsForTree();
        }

        // Change region selection
        this.regionSelector.value = focusedRegionId;
        this.regionFocusManager.currentSelectedRegionId = focusedRegionId;
        this.updateDisplayedRegionData();
        this.eventBus.publish('refreshRegionFocus', { stopStepByStepMode: true });
    }

    applyStyles(element, styles) {
        Object.assign(element.style, styles);
    }

    createElement(tag, className, styles = {}, textContent = null) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        this.applyStyles(element, styles);
        if (textContent !== null) element.textContent = textContent;
        return element;
    }



    createCheckboxOption(id, label, checked, title, changeHandler) {
        const container = this.createElement('div', 'option-item', {
            marginBottom: '8px'
        });

        const checkbox = this.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = id;
        checkbox.checked = checked;
        checkbox.addEventListener('change', changeHandler);

        const labelElement = this.createElement('label', null, {
            marginLeft: '8px'
        }, label);
        labelElement.htmlFor = id;
        labelElement.title = title;

        container.appendChild(checkbox);
        container.appendChild(labelElement);
        return container;
    }

    createCollapsibleSection(title, styles = {}) {
        const section = this.createElement('div', 'result-section', {
            display: 'none',
            border: '1px solid #ddd',
            borderRadius: '4px',
            overflow: 'visible',
            maxHeight: 'none',
            maxWidth: '250px',
            height: 'auto',
            width: '100%',
            wordBreak: 'break-word',
            whiteSpace: 'normal',
            ...styles
        });

        const header = this.createElement('div', 'summary-header', {
            padding: '10px 15px',
            backgroundColor: '#f5f5f5',
            borderBottom: '1px solid #ddd',
            borderTopLeftRadius: '4px',
            borderTopRightRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        });

        const headerTitle = this.createElement('h5', null, {
            margin: '0',
            color: '#333'
        }, title);

        const toggle = this.createElement('span', null, {
            transition: 'transform 0.3s'
        });
        toggle.innerHTML = '&#9660;';

        header.appendChild(headerTitle);
        header.appendChild(toggle);

        const contentWrapper = this.createElement('div', 'summary-content-wrapper', {
            padding: '15px',
            display: 'block',
            maxHeight: 'none',
            height: 'auto',
            overflow: 'visible'
        });

        const content = this.createElement('div', 'summary-content');
        contentWrapper.appendChild(content);

        section.appendChild(header);
        section.appendChild(contentWrapper);

        header.addEventListener('click', () => {
            if (contentWrapper.style.display === 'none') {
                contentWrapper.style.display = 'block';
                toggle.style.transform = 'rotate(0deg)';
            } else {
                contentWrapper.style.display = 'none';
                toggle.style.transform = 'rotate(-90deg)';
            }
        });

        return { section, content, contentWrapper };
    }

    updateHighlightSwitchUI(enabled) {
        const highlightInput = document.getElementById('highlightInputElement');
        if (highlightInput) {
            const highlightSlider = highlightInput.nextElementSibling;
            const highlightSliderButton = highlightSlider?.querySelector('span');

            if (highlightSlider && highlightSliderButton) {
                highlightSlider.style.backgroundColor = enabled ? '#4a86e8' : '#ccc';
                highlightSliderButton.style.transform = enabled ? 'translateX(16px)' : 'translateX(0px)';
            }
        }
    }


    initUI() {
        // Options container
        const optionsContainer = this.createElement('div', 'explanation-options', {
            marginBottom: '15px',
            overflow: 'visible',
            maxHeight: 'none',
            height: 'auto',
            width: '100%'
        });

        // LLM Settings section
        const llmSettingsContainer = this.createElement('div', 'llm-settings-container', {
            marginBottom: '15px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            overflow: 'hidden'
        });

        const llmSettingsHeader = this.createElement('div', 'llm-settings-header', {
            padding: '8px 12px',
            backgroundColor: '#f5f5f5',
            borderBottom: '1px solid #ddd',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        });

        const llmSettingsTitle = this.createElement('span', null, {
            fontSize: '12px'
        }, 'LLM Settings');

        const llmSettingsToggle = this.createElement('span', null, {
            transition: 'transform 0.3s'
        });
        llmSettingsToggle.innerHTML = '&#9660;';

        llmSettingsHeader.appendChild(llmSettingsTitle);
        llmSettingsHeader.appendChild(llmSettingsToggle);

        const llmSettingsContent = this.createElement('div', 'llm-settings-content', {
            padding: '12px',
            display: 'none'
        });

        // Model selection
        const modelContainer = this.createElement('div', 'model-selection', {
            marginBottom: '10px'
        });

        const modelLabel = this.createElement('label', null, {
            display: 'block',
            marginBottom: '4px',
            fontSize: '13px'
        }, 'Model:');
        modelLabel.htmlFor = 'modelSelector';

        const modelSelector = this.createElement('select', null, {
            width: '100%',
            padding: '6px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            fontSize: '13px'
        });
        modelSelector.id = 'modelSelector';

        // Add model options
        const deepseekOption = document.createElement('option');
        deepseekOption.value = 'deepseek-chat';
        deepseekOption.textContent = 'DeepSeek Chat';

        const gemmaOption = document.createElement('option');
        gemmaOption.value = 'gemma3';
        gemmaOption.textContent = 'Gemma 3';

        modelSelector.appendChild(deepseekOption);
        modelSelector.appendChild(gemmaOption);
        modelSelector.value = 'deepseek-chat';

        modelContainer.appendChild(modelLabel);
        modelContainer.appendChild(modelSelector);

        // API URL input
        const urlContainer = this.createElement('div', 'api-url-container', {
            marginBottom: '10px'
        });

        const urlLabel = this.createElement('label', null, {
            display: 'block',
            marginBottom: '4px',
            fontSize: '13px'
        }, 'API URL:');
        urlLabel.htmlFor = 'apiUrlInput';

        const urlInput = this.createElement('input', null, {
            width: '100%',
            padding: '6px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            boxSizing: 'border-box',
            fontSize: '13px'
        });
        urlInput.id = 'apiUrlInput';
        urlInput.type = 'text';
        urlInput.placeholder = 'Enter API URL';
        urlInput.value = DEEPSEEK_URL;

        urlContainer.appendChild(urlLabel);
        urlContainer.appendChild(urlInput);

        // API Key input
        const keyContainer = this.createElement('div', 'api-key-container', {
            marginBottom: '10px'
        });

        const keyLabel = this.createElement('label', null, {
            display: 'block',
            marginBottom: '4px',
            fontSize: '13px'
        }, 'API Key:');
        keyLabel.htmlFor = 'apiKeyInput';

        const keyInput = this.createElement('input', null, {
            width: '100%',
            padding: '6px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            boxSizing: 'border-box',
            fontSize: '13px'
        });
        keyInput.id = 'apiKeyInput';
        keyInput.type = 'password';
        keyInput.placeholder = 'Enter API Key';
        keyInput.value = DEEPSEEK_API_KEY;

        keyContainer.appendChild(keyLabel);
        keyContainer.appendChild(keyInput);

        // Apply settings button
        const applyButton = this.createElement('button', null, {
            padding: '6px 12px',
            backgroundColor: '#4a86e8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            width: '100%'
        }, 'Apply Settings');

        applyButton.addEventListener('click', () => {
            const model = modelSelector.value;
            const url = urlInput.value;
            const key = keyInput.value;

            this.eventBus.publish('changeLLMServiceProvider', { model, url, key });
            this.explainer.model = model;
            alert('LLM settings updated successfully!');
        });

        llmSettingsContent.appendChild(modelContainer);
        llmSettingsContent.appendChild(urlContainer);
        llmSettingsContent.appendChild(keyContainer);
        llmSettingsContent.appendChild(applyButton);

        llmSettingsHeader.addEventListener('click', () => {
            if (llmSettingsContent.style.display === 'none') {
                llmSettingsContent.style.display = 'block';
                llmSettingsToggle.style.transform = 'rotate(0deg)';
            } else {
                llmSettingsContent.style.display = 'none';
                llmSettingsToggle.style.transform = 'rotate(-90deg)';
            }
        });

        llmSettingsContainer.appendChild(llmSettingsHeader);
        llmSettingsContainer.appendChild(llmSettingsContent);
        optionsContainer.appendChild(llmSettingsContainer);

        this.modelSelector = modelSelector;
        this.apiUrlInput = urlInput;
        this.apiKeyInput = keyInput;

        // Quick Mode checkbox
        const quickModeContainer = this.createCheckboxOption(
            'quickMode',
            'Quick Mode',
            this.explainer.quickMode,
            'Enable Quick Mode for faster explanations with less detail',
            (e) => { this.explainer.quickMode = e.target.checked; }
        );

        // Parallel checkbox
        // const parallelContainer = this.createCheckboxOption(
        //     'parallel',
        //     'Parallel Processing',
        //     this.explainer.parallel,
        //     (e) => { this.explainer.parallel = e.target.checked; }
        // );
        // this.applyStyles(parallelContainer, { marginBottom: '15px' });

        optionsContainer.appendChild(quickModeContainer);
        // optionsContainer.appendChild(parallelContainer);

        // Explain button
        const explainButton = this.createElement('button', 'explain-button', {
            padding: '8px 16px',
            backgroundColor: '#4a86e8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            width: '100%',
            marginBottom: '15px'
        });

        const playIcon = this.createElement('span', null, { marginRight: '8px' });
        playIcon.innerHTML = '▶';
        explainButton.appendChild(playIcon);
        explainButton.appendChild(document.createTextNode('Explain'));

        // Tree selection container
        const treeSelectionContainer = this.createElement('div', 'tree-selection-container', {
            marginBottom: '15px',
            display: 'none'
        });

        const treeSelectionLabel = this.createElement('label', null, {
            display: 'block',
            marginBottom: '5px',
            fontWeight: 'bold',
            fontSize: '14px'
        }, 'Select Tree:');
        treeSelectionLabel.htmlFor = 'treeSelector';

        const treeSelector = this.createElement('select', null, {
            width: '250px',
            maxWidth: '250px',
            padding: '6px',
            borderRadius: '4px',
            border: '1px solid #ddd'
        });
        treeSelector.id = 'treeSelector';

        treeSelector.addEventListener('change', (e) => {
            this.regionFocusManager.currentSelectedTreeId = e.target.value;
            this.updateDisplayedData();
            this.loadRegionsForTree();
            this.eventBus.publish('refreshRegionFocus', {
                stopStepByStepMode: true
            });
        });

        treeSelectionContainer.appendChild(treeSelectionLabel);
        treeSelectionContainer.appendChild(treeSelector);

        // Region selection container
        const regionSelectionContainer = this.createElement('div', 'region-selection-container', {
            marginBottom: '15px',
            display: 'none'
        });

        const regionSelectionLabel = this.createElement('label', null, {
            display: 'block',
            marginBottom: '5px',
            fontWeight: 'bold',
            fontSize: '14px'
        }, 'Select Region:');
        regionSelectionLabel.htmlFor = 'regionSelector';

        const regionSelector = this.createElement('select', null, {
            width: '250px',
            maxWidth: '250px',
            padding: '6px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            marginBottom: '10px'
        });
        regionSelector.id = 'regionSelector';

        regionSelector.addEventListener('change', (e) => {
            this.regionFocusManager.currentSelectedRegionId = e.target.value;
            this.updateDisplayedRegionData();
            this.updateHighlightDescription();
            this.eventBus.publish('refreshRegionFocus', {
                stopStepByStepMode: true
            });
        });

        regionSelectionContainer.appendChild(regionSelectionLabel);
        regionSelectionContainer.appendChild(regionSelector);

        // Highlight switch container
        const highlightSwitchContainer = this.createElement('div', 'highlight-switch-container', {
            display: 'flex',
            alignItems: 'center',
            marginBottom: '8px'
        });

        const highlightSwitch = this.createElement('label', 'switch', {
            position: 'relative',
            display: 'inline-block',
            width: '36px',
            height: '18px',
            marginRight: '8px',
            flexShrink: '0'
        });

        const highlightInput = this.createElement('input');
        highlightInput.type = 'checkbox';
        highlightInput.id = 'highlightInputElement';
        highlightInput.checked = this.regionFocusManager.regionFocusMode;
        this.applyStyles(highlightInput, {
            opacity: '0',
            width: '0',
            height: '0',
            position: 'absolute'
        });

        const highlightSlider = this.createElement('span', 'slider', {
            position: 'absolute',
            cursor: 'pointer',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            backgroundColor: this.regionFocusManager.regionFocusMode ? '#4a86e8' : '#ccc',
            transition: 'background-color 0.3s',
            borderRadius: '18px',
            border: '1px solid #ddd'
        });

        const highlightSliderButton = this.createElement('span', null, {
            position: 'absolute',
            height: '14px',
            width: '14px',
            left: '1px',
            top: '1px',
            backgroundColor: 'white',
            transition: 'transform 0.3s',
            borderRadius: '50%',
            transform: this.regionFocusManager.regionFocusMode ? 'translateX(16px)' : 'translateX(0px)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
        });

        highlightSlider.appendChild(highlightSliderButton);
        highlightSwitch.appendChild(highlightInput);
        highlightSwitch.appendChild(highlightSlider);

        const highlightLabel = this.createElement('span', null, {
            fontSize: '13px',
            fontWeight: 'normal',
            flexShrink: '0'
        }, 'Focus Nodes');

        highlightSwitchContainer.appendChild(highlightSwitch);
        highlightSwitchContainer.appendChild(highlightLabel);

        // Highlight description
        const highlightDescription = this.createElement('div', 'highlight-description', {
            fontSize: '11px',
            color: '#666',
            fontStyle: 'italic',
            marginBottom: '0',
            lineHeight: '1.3',
            wordWrap: 'break-word',
            whiteSpace: 'normal',
            maxWidth: '100%',
            overflow: 'hidden'
        });

        highlightInput.addEventListener('change', (e) => {
            this.regionFocusManager.regionFocusMode = e.target.checked;
            if (e.target.checked) {
                highlightSlider.style.backgroundColor = '#4a86e8';
                highlightSliderButton.style.transform = 'translateX(16px)';
            } else {
                highlightSlider.style.backgroundColor = '#ccc';
                highlightSliderButton.style.transform = 'translateX(0px)';
            }
            // Publish highlight toggle event
            this.regionFocusManager.regionFocusMode = e.target.checked;
            this.eventBus.publish('refreshRegionFocus', {
                stopStepByStepMode: true
            });

        });

        regionSelectionContainer.appendChild(highlightSwitchContainer);
        regionSelectionContainer.appendChild(highlightDescription);



        // Store reference for later updates
        this.highlightDescription = highlightDescription;

        // Loading bar (hidden by default)
        const loadingContainer = this.createElement('div', 'loading-container', {
            marginTop: '10px',
            display: 'none'
        });

        const loadingBar = this.createElement('div', 'loading-bar', {
            height: '4px',
            backgroundColor: '#f1f1f1',
            borderRadius: '2px',
            overflow: 'hidden'
        });

        const loadingProgress = this.createElement('div', 'loading-progress', {
            width: '0%',
            height: '100%',
            backgroundColor: '#4a86e8',
            transition: 'width 0.3s ease-in-out'
        });

        loadingBar.appendChild(loadingProgress);
        loadingContainer.appendChild(loadingBar);

        // Results container
        const resultsContainer = this.createElement('div', 'results-container', {
            marginTop: '20px',
            width: '100%',
            maxHeight: 'none',
            height: 'auto',
            overflow: 'visible'
        });

        // Create collapsible sections
        const { section: quickSummarySection, content: quickSummaryContent, contentWrapper: quickSummaryContentWrapper } =
            this.createCollapsibleSection('Quick Summary');

        const { section: detailedSummarySection, content: detailedSummaryContent, contentWrapper: detailedSummaryContentWrapper } =
            this.createCollapsibleSection('Summary After Thinking', { marginTop: '6px' });

        const { section: regionSummarySection, content: regionSummaryContent, contentWrapper: regionSummaryContentWrapper } =
            this.createCollapsibleSection('Region Summary', { marginTop: '6px' });

        resultsContainer.appendChild(quickSummarySection);
        resultsContainer.appendChild(detailedSummarySection);
        resultsContainer.appendChild(regionSummarySection);

        this.container.appendChild(optionsContainer);
        this.container.appendChild(explainButton);
        this.container.appendChild(treeSelectionContainer);
        this.container.appendChild(regionSelectionContainer);
        this.container.appendChild(loadingContainer);
        this.container.appendChild(resultsContainer);

        // Store references to elements we'll need to update
        this.explainButton = explainButton;
        this.loadingContainer = loadingContainer;
        this.loadingProgress = loadingProgress;
        this.quickSummarySection = quickSummarySection;
        this.quickSummaryContent = quickSummaryContent;
        this.quickSummaryContentWrapper = quickSummaryContentWrapper;
        this.detailedSummarySection = detailedSummarySection;
        this.detailedSummaryContent = detailedSummaryContent;
        this.detailedSummaryContentWrapper = detailedSummaryContentWrapper;
        this.treeSelectionContainer = treeSelectionContainer;
        this.treeSelector = treeSelector;
        this.regionSelectionContainer = regionSelectionContainer;
        this.regionSelector = regionSelector;
        this.regionSummarySection = regionSummarySection;
        this.regionSummaryContent = regionSummaryContent;
        this.regionSummaryContentWrapper = regionSummaryContentWrapper;

        explainButton.addEventListener('click', () => this.runExplanation());
    }

    /**
     * Updates the highlight description text based on current selection
     */
    updateHighlightDescription() {
        if (!this.highlightDescription) return;

        if (this.regionFocusManager.currentSelectedRegionId === "whole_trace") {
            this.highlightDescription.textContent = "If enabled, key nodes will be highlighted.";
        } else {
            this.highlightDescription.textContent = "If enabled, all nodes in that region will be highlighted.";
        }
    }

    runExplanation() {
        this.explainButton.disabled = true;
        this.loadingContainer.style.display = 'block';
        this.loadingProgress.style.width = '0%';

        this.quickSummarySection.style.display = 'none';
        this.detailedSummarySection.style.display = 'none';
        this.regionSummarySection.style.display = 'none';

        this.loadingProgress.style.transition = 'width 0.5s ease-in-out';

        let direction = 1;
        let position = 0;

        const interval = setInterval(() => {
            position += (5 * direction);

            if (position >= 90) {
                direction = -1;
            } else if (position <= 10) {
                direction = 1;
            }

            this.loadingProgress.style.width = `${position}%`;
        }, 100);

        if (this.modelSelector && this.modelSelector.value) {
            this.explainer.model = this.modelSelector.value;
        }

        this.explainer.explainSelectedTraces({
            quickMode: this.explainer.quickMode,
            parallel: this.explainer.parallel,
            model: this.explainer.model
        }).then(data => {
            clearInterval(interval);
            this.loadingProgress.style.width = '100%';
            this.explainButton.disabled = false;
        }).catch(error => {
            console.error("Error running explanation:", error);
            clearInterval(interval);
            this.loadingContainer.style.display = 'none';
            this.explainButton.disabled = false;
            alert("Error running explanation: " + error.message);
        });
    }

    loadExplanations() {
        const trees = this.explainer.selectedTrees;
        this.treeSelector.innerHTML = '';

        if (trees.size === 0) {
            this.treeSelectionContainer.style.display = 'none';
            alert("No trees found. Please make sure there are selected trees before explaining.");
            return;
        }

        for (const [treeId, treeData] of trees.entries()) {
            const option = document.createElement('option');
            option.value = treeId;
            const treeLabel = treeData.tree ? treeData.tree.label || `Tree ${treeId}` : `Tree ${treeId}`;
            option.textContent = `${treeLabel} (ID: ${treeId})`;
            this.treeSelector.appendChild(option);
        }

        this.regionFocusManager.currentSelectedTreeId = this.treeSelector.options[0].value;
        this.treeSelectionContainer.style.display = 'block';
        this.updateDisplayedData();
        this.loadRegionsForTree();
    }

    updateDisplayedData() {
        if (!this.regionFocusManager.currentSelectedTreeId) return;
        this.regionSummarySection.style.display = 'none';
        this.updateDisplayedTreeData();
    }

    updateDisplayedTreeData() {
        if (!this.regionFocusManager.currentSelectedTreeId) return;

        const treeData = this.explainer.selectedTrees.get(this.regionFocusManager.currentSelectedTreeId);
        if (!treeData) return;

        const quickSummary = this.formatExplanationData(treeData.explanation.quickSummary);
        if (quickSummary) {
            this.renderSummarySection(this.quickSummaryContent, quickSummary);
            this.quickSummarySection.style.display = 'block';
            this.quickSummaryContentWrapper.style.display = 'block';
        } else {
            this.quickSummarySection.style.display = 'none';
        }

        const detailedSummary = this.formatExplanationData(treeData.explanation.summaryAfterThinking);
        if (detailedSummary) {
            this.renderSummarySection(this.detailedSummaryContent, detailedSummary);
            this.detailedSummarySection.style.display = 'block';
            this.detailedSummaryContentWrapper.style.display = 'block';
        } else {
            this.detailedSummarySection.style.display = 'none';
        }
    }

    formatExplanationData(explanation) {
        if (!explanation) return null;

        if (typeof explanation === 'string' && explanation.trim().startsWith('{') && explanation.trim().endsWith('}')) {
            try {
                return JSON.parse(explanation);
            } catch (e) {
                console.warn("Failed to parse explanation as JSON:", e);
            }
        }

        if (typeof explanation === 'string') {
            let detailedBehaviour = "";
            let flowRepresentation = "";
            let briefSummary = "";

            const paragraphs = explanation.split('\n\n');

            if (paragraphs.length >= 3) {
                briefSummary = paragraphs[0];
                flowRepresentation = paragraphs[1];
                detailedBehaviour = paragraphs.slice(2).join('\n\n');
            } else if (paragraphs.length === 2) {
                briefSummary = paragraphs[0];
                detailedBehaviour = paragraphs[1];
            } else {
                briefSummary = explanation;
            }

            return { detailedBehaviour, flowRepresentation, briefSummary };
        }

        return explanation;
    }

    loadRegionsForTree() {
        if (!this.regionFocusManager.currentSelectedTreeId) return;

        this.regionSelector.innerHTML = '';
        this.regionSummarySection.style.display = 'none';

        const regionIds = this.explainer.traceToRegion.get(this.regionFocusManager.currentSelectedTreeId) || [];

        const wholeTraceOption = document.createElement('option');
        wholeTraceOption.value = "whole_trace";
        wholeTraceOption.textContent = "Whole Trace";
        this.regionSelector.appendChild(wholeTraceOption);

        if (regionIds.length > 0) {
            const separatorOption = document.createElement('option');
            separatorOption.disabled = true;
            separatorOption.textContent = "───────────────";
            this.regionSelector.appendChild(separatorOption);
        }

        let regionsAdded = 0;
        for (const regionId of regionIds) {
            const regionData = this.explainer.regions.get(regionId);
            if (regionData && regionData.explained) {
                const option = document.createElement('option');
                option.value = regionId;
                const regionLabel = regionData.data ? regionData.data.label || `Region ${regionId}` : `Region ${regionId}`;
                option.textContent = `${regionLabel} (ID: ${regionId})`;
                this.regionSelector.appendChild(option);
                regionsAdded++;
            }
        }

        this.regionSelectionContainer.style.display = 'block';
        this.regionSelectionContainer.style.maxWidth = '250px';
        this.regionSelector.value = "whole_trace";
        this.regionFocusManager.currentSelectedRegionId = "whole_trace";
        this.updateDisplayedRegionData();
        this.updateHighlightDescription();
    }

    updateDisplayedRegionData() {
        if (!this.regionFocusManager.currentSelectedRegionId) {
            this.regionSummarySection.style.display = 'none';
            return;
        }

        if (this.regionFocusManager.currentSelectedRegionId === "whole_trace") {
            this.updateDisplayedTreeData();
            this.regionSummarySection.style.display = 'none';
            return;
        }

        const regionData = this.explainer.regions.get(this.regionFocusManager.currentSelectedRegionId);
        if (!regionData || !regionData.explained) {
            this.regionSummarySection.style.display = 'none';
            return;
        }

        const regionSummary = {
            briefSummary: regionData.briefSummary || '',
            flowRepresentation: regionData.flowRepresentation || '',
            detailedBehaviour: regionData.detailedBehaviour || ''
        };

        this.renderSummarySection(this.regionSummaryContent, regionSummary);
        this.regionSummarySection.style.display = 'block';
        this.regionSummaryContentWrapper.style.display = 'block';
        this.quickSummarySection.style.display = 'none';
        this.detailedSummarySection.style.display = 'none';
    }

    /**
  * Identifies and marks method references in text with clickable underlined spans.
  * This function handles different patterns of method references:
  * - Method calls with parentheses: method(), ClassName.method(), ClassName$InnerClass.method()
  * - Method references in backticks: `method`, `ClassName.method`
  *
  * @param {string} text - The input text to process
   * @return {string} - HTML formatted text with method references wrapped in clickable spans
  */
    identifyMethodNames(text) {
        if (!text) return text;
        const threadName = this.explainer.selectedTrees.get(this.regionFocusManager.currentSelectedTreeId).threadName;

        // Store reference to this for use in the event handler
        const self = this;

        // Function to create a global click handler with access to eventBus
        // This addresses the 'this' context issue in the inline event handler
        const methodClickHandlerId = `methodClickHandler_${Math.random().toString(36).substr(2, 9)}`;
        window[methodClickHandlerId] = function (methodName, thread) {
            console.log('Method clicked:', methodName, 'Thread:', thread);
            self.eventBus.publish("fuzzySearchFromDetailedBehaviour", {
                name: methodName,
                threadName: thread
            });
        };

        // 1. Handle method references with parentheses: ClassName.method(), method()
        let processedText = text.replace(
            /\b([a-zA-Z][a-zA-Z0-9_]*(?:[$\.][a-zA-Z][a-zA-Z0-9_]*)*)\(\)/g,
            (match) => {
                // Escape any single quotes in the method name to prevent JS errors
                const safeMatch = match.replace(/'/g, "\\'");
                // Escape any single quotes in the thread name to prevent JS errors
                const safeThreadName = threadName ? threadName.replace(/'/g, "\\'") : '';
                return `<span class="method-name" style="text-decoration: underline; cursor: pointer;" 
                   onclick="${methodClickHandlerId}('${safeMatch}', '${safeThreadName}')">${match}</span>`;
            }
        );

        // 2. Handle backtick-wrapped method references: `ClassName.method`, `method`
        processedText = processedText.replace(
            /`([a-zA-Z][a-zA-Z0-9_]*(?:[$\.][a-zA-Z][a-zA-Z0-9_]*)*)`/g,
            (match, methodRef) => {
                // Escape any single quotes in the method name to prevent JS errors
                const safeMethodRef = methodRef.replace(/'/g, "\\'");
                // Escape any single quotes in the thread name to prevent JS errors
                const safeThreadName = threadName ? threadName.replace(/'/g, "\\'") : '';
                return `<span class="method-name" style="text-decoration: underline; cursor: pointer;" 
                   onclick="${methodClickHandlerId}('${safeMethodRef}', '${safeThreadName}')">${match}</span>`;
            }
        );

        return processedText;
    }

    renderSummarySection(container, data) {
        container.innerHTML = '';

        const createSubsection = (title, content, isLast = false) => {
            if (!content) return null;

            const section = this.createElement('div', title.toLowerCase().replace(' ', '-') + '-summary', {
                marginBottom: isLast ? '0' : '15px'
            });

            const sectionTitle = this.createElement('h6', null, {
                margin: '0 0 5px 0',
                fontWeight: 'bold',
                fontSize: '14px'
            }, title);

            // Apply method name parsing for Detailed Behaviour section
            let processedContent = content;
            if (title === 'Detailed Behaviour') {
                processedContent = this.identifyMethodNames(content);

                const sectionContent = document.createElement('p');
                sectionContent.style.margin = '0';
                sectionContent.style.fontSize = '14px';
                sectionContent.style.wordWrap = 'break-word';
                sectionContent.style.whiteSpace = 'normal';
                sectionContent.innerHTML = processedContent; // Use innerHTML to render the HTML

                section.appendChild(sectionTitle);
                section.appendChild(sectionContent);
                return section;
            }

            // For other sections, use regular text content
            const sectionContent = this.createElement('p', null, {
                margin: '0',
                fontSize: '14px',
                wordWrap: 'break-word',
                whiteSpace: 'normal'
            }, content);

            section.appendChild(sectionTitle);
            section.appendChild(sectionContent);
            return section;
        };

        const briefSection = createSubsection('Brief Summary', data.briefSummary);
        if (briefSection) container.appendChild(briefSection);

        const flowSection = createSubsection('Flow Representation', data.flowRepresentation);
        if (flowSection) container.appendChild(flowSection);

        const detailedSection = createSubsection('Detailed Behaviour', data.detailedBehaviour, true);
        if (detailedSection) container.appendChild(detailedSection);
    }
}