import { DEEPSEEK_API_KEY, DEEPSEEK_URL } from "../../../../../config.js";
import { ExplanationContentRenderer } from "./explanationUI/ExplanationContentRenderer.js";
import { RegionSelectionManager } from "./explanationUI/RegionSelectionManager.js";
import { UIElementFactory } from "./explanationUI/UIElementFactory.js";

/**
 *  Controller for LLM Explanation UI
 * Coordinates between different components and manages overall UI state
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

        // Initialize sub-components
        this.contentRenderer = new ExplanationContentRenderer(explainer, regionFocusManager, eventBus);
        this.selectionManager = new RegionSelectionManager(explainer, regionFocusManager, eventBus, this.contentRenderer);

        this.setupContainerStyles();
        this.initUI();
        this.setupEventSubscriptions();
        this.setupLLMSettings();
    }

    setupContainerStyles() {
        UIElementFactory.applyStyles(this.container, {
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
    }

    setupEventSubscriptions() {
        this.eventBus.subscribe('stopRegionFocusMode', () => {
            const highlightInput = document.getElementById('highlightInputElement');
            if (highlightInput) {
                highlightInput.checked = false;
                this.regionFocusManager.regionFocusMode = false;
                this.updateHighlightSwitchUI(false);
                this.eventBus.publish('refreshRegionFocus', { stopStepByStepMode: false });
            }
        });

        this.eventBus.subscribe('explanationCompleted', ({ backData }) => {
            this.loadingContainer.style.display = 'none';
            if (this.selectionManager.loadExplanations()) {
                this.treeSelectionContainer.style.display = 'block';
                this.selectionManager.updateDisplayedData();
                this.selectionManager.loadRegionsForTree();
                this.regionSelectionContainer.style.display = 'block';
                this.updateHighlightDescription();
            }
        });

        this.eventBus.subscribe('changeRegionFocus', ({ focusedRegionId }) => {
            this.selectionManager.handleRegionFocus(focusedRegionId);
            console.log(`Explanation: Region focus changed to ${focusedRegionId}`)
        });
    }

    setupLLMSettings() {
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

    initUI() {
        this.createOptionsSection();
        this.createControlButtons();
        this.createSelectionContainers();
        this.createLoadingIndicator();
        this.createResultsSections();
        this.assembleUI();
        this.setupEventHandlers();
    }

    createOptionsSection() {
        this.optionsContainer = UIElementFactory.createElement('div', 'explanation-options', {
            marginBottom: '15px',
            overflow: 'visible',
            maxHeight: 'none',
            height: 'auto',
            width: '100%'
        });

        this.createLLMSettingsSection();
        this.createQuickModeOption();
    }

    createLLMSettingsSection() {
        const llmSettingsContainer = UIElementFactory.createElement('div', 'llm-settings-container', {
            marginBottom: '15px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            overflow: 'hidden'
        });

        const llmSettingsHeader = UIElementFactory.createElement('div', 'llm-settings-header', {
            padding: '8px 12px',
            backgroundColor: '#f5f5f5',
            borderBottom: '1px solid #ddd',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        });

        const llmSettingsTitle = UIElementFactory.createElement('span', null, { fontSize: '12px' }, 'LLM Settings');
        const llmSettingsToggle = UIElementFactory.createElement('span', null, { transition: 'transform 0.3s' });
        llmSettingsToggle.innerHTML = '&#9660;';

        llmSettingsHeader.appendChild(llmSettingsTitle);
        llmSettingsHeader.appendChild(llmSettingsToggle);

        const llmSettingsContent = UIElementFactory.createElement('div', 'llm-settings-content', {
            padding: '12px',
            display: 'none'
        });

        this.createModelSelector(llmSettingsContent);
        this.createAPIInputs(llmSettingsContent);
        this.createApplyButton(llmSettingsContent);

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
        this.optionsContainer.appendChild(llmSettingsContainer);
    }

    createModelSelector(container) {
        const modelContainer = UIElementFactory.createElement('div', 'model-selection', { marginBottom: '10px' });
        const modelLabel = UIElementFactory.createElement('label', null, {
            display: 'block',
            marginBottom: '4px',
            fontSize: '13px'
        }, 'Model:');
        modelLabel.htmlFor = 'modelSelector';

        this.modelSelector = UIElementFactory.createElement('select', null, {
            width: '100%',
            padding: '6px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            fontSize: '13px'
        });
        this.modelSelector.id = 'modelSelector';

        const deepseekOption = document.createElement('option');
        deepseekOption.value = 'deepseek-chat';
        deepseekOption.textContent = 'DeepSeek Chat';

        const gemmaOption = document.createElement('option');
        gemmaOption.value = 'gemma3';
        gemmaOption.textContent = 'Gemma 3';

        this.modelSelector.appendChild(deepseekOption);
        this.modelSelector.appendChild(gemmaOption);
        this.modelSelector.value = 'deepseek-chat';

        modelContainer.appendChild(modelLabel);
        modelContainer.appendChild(this.modelSelector);
        container.appendChild(modelContainer);
    }

    createAPIInputs(container) {
        // API URL
        const urlContainer = UIElementFactory.createElement('div', 'api-url-container', { marginBottom: '10px' });
        const urlLabel = UIElementFactory.createElement('label', null, {
            display: 'block',
            marginBottom: '4px',
            fontSize: '13px'
        }, 'API URL:');
        urlLabel.htmlFor = 'apiUrlInput';

        this.apiUrlInput = UIElementFactory.createElement('input', null, {
            width: '100%',
            padding: '6px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            boxSizing: 'border-box',
            fontSize: '13px'
        });
        this.apiUrlInput.id = 'apiUrlInput';
        this.apiUrlInput.type = 'text';
        this.apiUrlInput.placeholder = 'Enter API URL';
        this.apiUrlInput.value = DEEPSEEK_URL;

        urlContainer.appendChild(urlLabel);
        urlContainer.appendChild(this.apiUrlInput);
        container.appendChild(urlContainer);

        // API Key
        const keyContainer = UIElementFactory.createElement('div', 'api-key-container', { marginBottom: '10px' });
        const keyLabel = UIElementFactory.createElement('label', null, {
            display: 'block',
            marginBottom: '4px',
            fontSize: '13px'
        }, 'API Key:');
        keyLabel.htmlFor = 'apiKeyInput';

        this.apiKeyInput = UIElementFactory.createElement('input', null, {
            width: '100%',
            padding: '6px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            boxSizing: 'border-box',
            fontSize: '13px'
        });
        this.apiKeyInput.id = 'apiKeyInput';
        this.apiKeyInput.type = 'password';
        this.apiKeyInput.placeholder = 'Enter API Key';
        this.apiKeyInput.value = DEEPSEEK_API_KEY;

        keyContainer.appendChild(keyLabel);
        keyContainer.appendChild(this.apiKeyInput);
        container.appendChild(keyContainer);
    }

    createApplyButton(container) {
        const applyButton = UIElementFactory.createElement('button', null, {
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
            const model = this.modelSelector.value;
            const url = this.apiUrlInput.value;
            const key = this.apiKeyInput.value;

            this.eventBus.publish('changeLLMServiceProvider', { model, url, key });
            this.explainer.model = model;
            alert('LLM settings updated successfully!');
        });

        container.appendChild(applyButton);
    }

    createQuickModeOption() {
        const quickModeContainer = UIElementFactory.createCheckboxOption(
            'quickMode',
            'Quick Mode',
            this.explainer.quickMode,
            'Enable Quick Mode for faster explanations with less detail',
            (e) => { this.explainer.quickMode = e.target.checked; }
        );
        this.optionsContainer.appendChild(quickModeContainer);
    }

    createControlButtons() {
        this.explainButton = UIElementFactory.createElement('button', 'explain-button', {
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

        const playIcon = UIElementFactory.createElement('span', null, { marginRight: '8px' });
        playIcon.innerHTML = '▶';
        this.explainButton.appendChild(playIcon);
        this.explainButton.appendChild(document.createTextNode('Explain'));
    }

    createSelectionContainers() {
        this.createTreeSelectionContainer();
        this.createRegionSelectionContainer();
    }

    createTreeSelectionContainer() {
        this.treeSelectionContainer = UIElementFactory.createElement('div', 'tree-selection-container', {
            marginBottom: '15px',
            display: 'none'
        });

        const treeSelectionLabel = UIElementFactory.createElement('label', null, {
            display: 'block',
            marginBottom: '5px',
            fontWeight: 'bold',
            fontSize: '14px'
        }, 'Select Tree:');
        treeSelectionLabel.htmlFor = 'treeSelector';

        this.treeSelector = UIElementFactory.createElement('select', null, {
            width: '250px',
            maxWidth: '250px',
            padding: '6px',
            borderRadius: '4px',
            border: '1px solid #ddd'
        });
        this.treeSelector.id = 'treeSelector';

        this.treeSelectionContainer.appendChild(treeSelectionLabel);
        this.treeSelectionContainer.appendChild(this.treeSelector);
    }

    createRegionSelectionContainer() {
        this.regionSelectionContainer = UIElementFactory.createElement('div', 'region-selection-container', {
            marginBottom: '15px',
            display: 'none'
        });

        const regionSelectionLabel = UIElementFactory.createElement('label', null, {
            display: 'block',
            marginBottom: '5px',
            fontWeight: 'bold',
            fontSize: '14px'
        }, 'Select Region:');
        regionSelectionLabel.htmlFor = 'regionSelector';

        this.regionSelector = UIElementFactory.createElement('select', null, {
            width: '250px',
            maxWidth: '250px',
            padding: '6px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            marginBottom: '10px'
        });
        this.regionSelector.id = 'regionSelector';

        this.regionSelectionContainer.appendChild(regionSelectionLabel);
        this.regionSelectionContainer.appendChild(this.regionSelector);

        this.createHighlightControls();
    }

    createHighlightControls() {
        const highlightSwitchContainer = UIElementFactory.createElement('div', 'highlight-switch-container', {
            display: 'flex',
            alignItems: 'center',
            marginBottom: '8px'
        });

        const highlightSwitch = UIElementFactory.createElement('label', 'switch', {
            position: 'relative',
            display: 'inline-block',
            width: '36px',
            height: '18px',
            marginRight: '8px',
            flexShrink: '0'
        });

        const highlightInput = UIElementFactory.createElement('input');
        highlightInput.type = 'checkbox';
        highlightInput.id = 'highlightInputElement';
        highlightInput.checked = this.regionFocusManager.regionFocusMode;
        UIElementFactory.applyStyles(highlightInput, {
            opacity: '0',
            width: '0',
            height: '0',
            position: 'absolute'
        });

        const highlightSlider = UIElementFactory.createElement('span', 'slider', {
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

        const highlightSliderButton = UIElementFactory.createElement('span', null, {
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

        const highlightLabel = UIElementFactory.createElement('span', null, {
            fontSize: '13px',
            fontWeight: 'normal',
            flexShrink: '0'
        }, 'Focus Nodes');

        highlightSwitchContainer.appendChild(highlightSwitch);
        highlightSwitchContainer.appendChild(highlightLabel);

        this.highlightDescription = UIElementFactory.createElement('div', 'highlight-description', {
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

        this.regionSelectionContainer.appendChild(highlightSwitchContainer);
        this.regionSelectionContainer.appendChild(this.highlightDescription);
    }

    createLoadingIndicator() {
        this.loadingContainer = UIElementFactory.createElement('div', 'loading-container', {
            marginTop: '10px',
            display: 'none'
        });

        const loadingBar = UIElementFactory.createElement('div', 'loading-bar', {
            height: '4px',
            backgroundColor: '#f1f1f1',
            borderRadius: '2px',
            overflow: 'hidden'
        });

        this.loadingProgress = UIElementFactory.createElement('div', 'loading-progress', {
            width: '0%',
            height: '100%',
            backgroundColor: '#4a86e8',
            transition: 'width 0.3s ease-in-out'
        });

        loadingBar.appendChild(this.loadingProgress);
        this.loadingContainer.appendChild(loadingBar);
    }

    createResultsSections() {
        this.resultsContainer = UIElementFactory.createElement('div', 'results-container', {
            marginTop: '20px',
            width: '100%',
            maxHeight: 'none',
            height: 'auto',
            overflow: 'visible'
        });

        const { section: quickSummarySection, content: quickSummaryContent, contentWrapper: quickSummaryContentWrapper } =
            UIElementFactory.createCollapsibleSection('Quick Summary');

        const { section: detailedSummarySection, content: detailedSummaryContent, contentWrapper: detailedSummaryContentWrapper } =
            UIElementFactory.createCollapsibleSection('Summary After Thinking', { marginTop: '6px' });

        const { section: regionSummarySection, content: regionSummaryContent, contentWrapper: regionSummaryContentWrapper } =
            UIElementFactory.createCollapsibleSection('Region Summary', { marginTop: '6px' });

        this.resultsContainer.appendChild(quickSummarySection);
        this.resultsContainer.appendChild(detailedSummarySection);
        this.resultsContainer.appendChild(regionSummarySection);

        // Store summary elements for selection manager
        this.summaryElements = {
            quickSummarySection,
            quickSummaryContent,
            quickSummaryContentWrapper,
            detailedSummarySection,
            detailedSummaryContent,
            detailedSummaryContentWrapper,
            regionSummarySection,
            regionSummaryContent,
            regionSummaryContentWrapper
        };
    }

    assembleUI() {
        this.container.appendChild(this.optionsContainer);
        this.container.appendChild(this.explainButton);
        this.container.appendChild(this.treeSelectionContainer);
        this.container.appendChild(this.regionSelectionContainer);
        this.container.appendChild(this.loadingContainer);
        this.container.appendChild(this.resultsContainer);

        // Setup selection manager with UI elements
        this.selectionManager.setupSelectors(this.treeSelector, this.regionSelector, this.summaryElements);
    }

    setupEventHandlers() {
        this.explainButton.addEventListener('click', () => this.runExplanation());

        this.treeSelector.addEventListener('change', (e) => {
            this.regionFocusManager.currentSelectedTreeId = e.target.value;
            this.selectionManager.updateDisplayedData();
            this.selectionManager.loadRegionsForTree();
            this.updateHighlightDescription();
            this.eventBus.publish('refreshRegionFocus', { stopStepByStepMode: true });
        });

        this.regionSelector.addEventListener('change', (e) => {
            this.regionFocusManager.currentSelectedRegionId = e.target.value;
            this.selectionManager.updateDisplayedRegionData();
            this.updateHighlightDescription();
            this.eventBus.publish('refreshRegionFocus', { stopStepByStepMode: true });
        });

        const highlightInput = document.getElementById('highlightInputElement');
        if (highlightInput) {
            highlightInput.addEventListener('change', (e) => {
                this.regionFocusManager.regionFocusMode = e.target.checked;
                this.updateHighlightSwitchUI(e.target.checked);
                this.eventBus.publish('refreshRegionFocus', { stopStepByStepMode: true });
            });
        }
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

        this.summaryElements.quickSummarySection.style.display = 'none';
        this.summaryElements.detailedSummarySection.style.display = 'none';
        this.summaryElements.regionSummarySection.style.display = 'none';

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
}