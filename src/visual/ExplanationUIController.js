import { DEEPSEEK_API_KEY, DEEPSEEK_URL } from "../../config.js";

/**
 * Controller for LLM Explanation UI
 * Manages the explanation options and display of results
 * Optimized version with no scroll restrictions
 */
export class ExplanationUIController {
    constructor(explainer, eventBus, containerId = 'llmExplanation') {
        this.explainer = explainer;
        this.eventBus = eventBus;
        this.currentSelectedTreeId = null;
        this.currentSelectedRegionId = null;

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

        // Initialize UI
        this.initUI();

        // Subscribe to the explanationCompleted event
        this.eventBus.subscribe('explanationCompleted', ({ backData }) => {
            this.loadingContainer.style.display = 'none';
            this.loadExplanations();
        });
        
        // Check for current LLM settings if available
        if (this.explainer.llmService) {
            // Initialize the input fields with current values if they exist
            setTimeout(() => {
                if (this.modelSelector && this.explainer.llmService.model) {
                    this.modelSelector.value = this.explainer.llmService.model;
                }
                if (this.apiUrlInput && this.explainer.llmService.apiUrl) {
                    this.apiUrlInput.value = this.explainer.llmService.apiUrl;
                }
                if (this.apiKeyInput && this.explainer.llmService.apiKey) {
                    // For security reasons, we don't populate the actual key but indicate it's set
                    this.apiKeyInput.placeholder = "API key is set";
                }
            }, 100);
        }
    }

    /**
     * Apply multiple styles to an element
     */
    applyStyles(element, styles) {
        Object.assign(element.style, styles);
    }

    /**
     * Create an element with styles
     */
    createElement(tag, className, styles = {}, textContent = null) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        this.applyStyles(element, styles);
        if (textContent !== null) element.textContent = textContent;
        return element;
    }

    /**
     * Create a checkbox option
     */
    createCheckboxOption(id, label, checked, changeHandler) {
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

        container.appendChild(checkbox);
        container.appendChild(labelElement);
        return container;
    }

    /**
     * Create a collapsible section
     */
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
        toggle.innerHTML = '&#9660;'; // Down arrow

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

        // Add collapse/expand functionality
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

    /**
     * Initialize the UI components
     */
    initUI() {
        // Options container
        const optionsContainer = this.createElement('div', 'explanation-options', {
            marginBottom: '15px',
            overflow: 'visible',
            maxHeight: 'none',
            height: 'auto',
            width: '100%'
        });
        
        // LLM Settings section (initially collapsed)
        const llmSettingsContainer = this.createElement('div', 'llm-settings-container', {
            marginBottom: '15px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            overflow: 'hidden'
        });
        
        // LLM Settings header
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
            // fontWeight: 'bold',
            fontSize: '12px'
        }, 'LLM Settings');
        
        const llmSettingsToggle = this.createElement('span', null, {
            transition: 'transform 0.3s'
        });
        llmSettingsToggle.innerHTML = '&#9660;'; // Down arrow
        
        llmSettingsHeader.appendChild(llmSettingsTitle);
        llmSettingsHeader.appendChild(llmSettingsToggle);
        
        // LLM Settings content (initially hidden)
        const llmSettingsContent = this.createElement('div', 'llm-settings-content', {
            padding: '12px',
            display: 'none' // Initially hidden
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
        
        // Set default model
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
        
        // Add event listener for Apply button
        applyButton.addEventListener('click', () => {
            const model = modelSelector.value;
            const url = urlInput.value;
            const key = keyInput.value;
            
            // Trigger event to update LLM service settings
            this.eventBus.publish('changeLLMServiceProvider', { model, url, key });
            
            // Store the selected model
            this.explainer.model = model;
            
            // Provide feedback
            alert('LLM settings updated successfully!');
        });
        
        // Add all settings elements to the content container
        llmSettingsContent.appendChild(modelContainer);
        llmSettingsContent.appendChild(urlContainer);
        llmSettingsContent.appendChild(keyContainer);
        llmSettingsContent.appendChild(applyButton);
        
        // Add toggle functionality to the header
        llmSettingsHeader.addEventListener('click', () => {
            if (llmSettingsContent.style.display === 'none') {
                llmSettingsContent.style.display = 'block';
                llmSettingsToggle.style.transform = 'rotate(0deg)';
            } else {
                llmSettingsContent.style.display = 'none';
                llmSettingsToggle.style.transform = 'rotate(-90deg)';
            }
        });
        
        // Add header and content to the settings container
        llmSettingsContainer.appendChild(llmSettingsHeader);
        llmSettingsContainer.appendChild(llmSettingsContent);
        
        // Add the LLM settings container to the options container
        optionsContainer.appendChild(llmSettingsContainer);
        
        // Store references for later use
        this.modelSelector = modelSelector;
        this.apiUrlInput = urlInput;
        this.apiKeyInput = keyInput;
        
        // Quick Mode checkbox
        const quickModeContainer = this.createCheckboxOption(
            'quickMode',
            'Quick Mode',
            this.explainer.quickMode,
            (e) => { this.explainer.quickMode = e.target.checked; }
        );

        // Parallel checkbox
        const parallelContainer = this.createCheckboxOption(
            'parallel',
            'Parallel Processing',
            this.explainer.parallel,
            (e) => { this.explainer.parallel = e.target.checked; }
        );
        this.applyStyles(parallelContainer, { marginBottom: '15px' });

        // Add options to container
        optionsContainer.appendChild(quickModeContainer);
        optionsContainer.appendChild(parallelContainer);

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

        // Add play icon
        const playIcon = this.createElement('span', null, {
            marginRight: '8px'
        });
        playIcon.innerHTML = '▶';
        explainButton.appendChild(playIcon);
        explainButton.appendChild(document.createTextNode('Explain'));

        // Tree selection container
        const treeSelectionContainer = this.createElement('div', 'tree-selection-container', {
            marginBottom: '15px',
            display: 'none' // Initially hidden
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
            this.currentSelectedTreeId = e.target.value;
            this.updateDisplayedData();
            this.loadRegionsForTree();
        });

        treeSelectionContainer.appendChild(treeSelectionLabel);
        treeSelectionContainer.appendChild(treeSelector);

        // Region selection container
        const regionSelectionContainer = this.createElement('div', 'region-selection-container', {
            marginBottom: '15px',
            display: 'none' // Initially hidden
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
            border: '1px solid #ddd'
        });
        regionSelector.id = 'regionSelector';

        regionSelector.addEventListener('change', (e) => {
            this.currentSelectedRegionId = e.target.value;
            this.updateDisplayedRegionData();
        });

        regionSelectionContainer.appendChild(regionSelectionLabel);
        regionSelectionContainer.appendChild(regionSelector);

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

        // Add sections to results container
        resultsContainer.appendChild(quickSummarySection);
        resultsContainer.appendChild(detailedSummarySection);
        resultsContainer.appendChild(regionSummarySection);

        // Add all elements to main container
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

        // Add event listener for the Explain button
        explainButton.addEventListener('click', () => this.runExplanation());
    }

    /**
     * Run the explanation process with an indeterminate loading animation
     */
    runExplanation() {
        // Show loading and disable button
        this.explainButton.disabled = true;
        this.loadingContainer.style.display = 'block';
        this.loadingProgress.style.width = '0%';

        // Hide any previous results
        this.quickSummarySection.style.display = 'none';
        this.detailedSummarySection.style.display = 'none';
        this.regionSummarySection.style.display = 'none';

        // Set up loading animation
        this.loadingProgress.style.transition = 'width 0.5s ease-in-out';

        // Create a back-and-forth indeterminate loading animation
        let direction = 1;  // 1 for moving right, -1 for moving left
        let position = 0;   // Current position (0-100)

        const interval = setInterval(() => {
            position += (5 * direction);
            
            if (position >= 90) {
                direction = -1;
            } else if (position <= 10) {
                direction = 1;
            }
            
            this.loadingProgress.style.width = `${position}%`;
        }, 100);

        // Check if we have a selected model from the UI
        if (this.modelSelector && this.modelSelector.value) {
            // Update the model in the explainer before running the explanation
            this.explainer.model = this.modelSelector.value;
        }

        // Run the actual explanation
        this.explainer.explainSelectedTraces({
            quickMode: this.explainer.quickMode,
            parallel: this.explainer.parallel,
            model: this.explainer.model // Pass the model to the explainer
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

    /**
     * Load the explanations and update the tree selector
     */
    loadExplanations() {
        // Get the available trees
        const trees = this.explainer.selectedTrees;

        // Clear the selector
        this.treeSelector.innerHTML = '';

        if (trees.size === 0) {
            this.treeSelectionContainer.style.display = 'none';
            alert("No trees found. Please make sure there are selected trees before explaining.");
            return;
        }

        // Populate the selector with tree options
        for (const [treeId, treeData] of trees.entries()) {
            const option = document.createElement('option');
            option.value = treeId;
            const treeLabel = treeData.tree ? treeData.tree.label || `Tree ${treeId}` : `Tree ${treeId}`;
            option.textContent = `${treeLabel} (ID: ${treeId})`;
            this.treeSelector.appendChild(option);
        }

        // Set the first tree as selected
        this.currentSelectedTreeId = this.treeSelector.options[0].value;

        // Show the tree selection
        this.treeSelectionContainer.style.display = 'block';

        // Update the displayed data and load regions
        this.updateDisplayedData();
        this.loadRegionsForTree();
    }

    /**
     * Update the displayed data based on the currently selected tree
     */
    updateDisplayedData() {
        if (!this.currentSelectedTreeId) return;

        // Hide region summary when displaying tree data
        this.regionSummarySection.style.display = 'none';

        // Use the helper method to update tree data
        this.updateDisplayedTreeData();
    }

    /**
     * Display tree data summaries
     */
    updateDisplayedTreeData() {
        if (!this.currentSelectedTreeId) return;

        const treeData = this.explainer.selectedTrees.get(this.currentSelectedTreeId);
        if (!treeData) return;

        // Display quick summary if available
        const quickSummary = this.formatExplanationData(treeData.explanation.quickSummary);
        if (quickSummary) {
            this.renderSummarySection(this.quickSummaryContent, quickSummary);
            this.quickSummarySection.style.display = 'block';
            this.quickSummaryContentWrapper.style.display = 'block';
        } else {
            this.quickSummarySection.style.display = 'none';
        }

        // Display detailed summary if available
        const detailedSummary = this.formatExplanationData(treeData.explanation.summaryAfterThinking);
        if (detailedSummary) {
            this.renderSummarySection(this.detailedSummaryContent, detailedSummary);
            this.detailedSummarySection.style.display = 'block';
            this.detailedSummaryContentWrapper.style.display = 'block';
        } else {
            this.detailedSummarySection.style.display = 'none';
        }
    }

    /**
     * Format explanation data for display
     * @param {string|Object} explanation - The explanation data
     * @returns {Object|null} Formatted explanation data or null if no data
     */
    formatExplanationData(explanation) {
        if (!explanation) return null;

        // Check if the explanation is a JSON string
        if (typeof explanation === 'string' && explanation.trim().startsWith('{') && explanation.trim().endsWith('}')) {
            try {
                return JSON.parse(explanation);
            } catch (e) {
                console.warn("Failed to parse explanation as JSON:", e);
            }
        }

        // If the explanation is a string, convert it to an object format
        if (typeof explanation === 'string') {
            let detailedBehaviour = "";
            let flowRepresentation = "";
            let briefSummary = "";

            // Split the explanation by paragraphs
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

            return {
                detailedBehaviour,
                flowRepresentation,
                briefSummary
            };
        }

        // If already in object format, return as is
        return explanation;
    }

    /**
     * Load regions for the currently selected tree
     */
    loadRegionsForTree() {
        if (!this.currentSelectedTreeId) return;

        // Clear the region selector
        this.regionSelector.innerHTML = '';

        // Hide the region summary section initially
        this.regionSummarySection.style.display = 'none';

        // Get the regions associated with the current tree
        const regionIds = this.explainer.traceToRegion.get(this.currentSelectedTreeId) || [];

        // Add the "Whole Trace" option
        const wholeTraceOption = document.createElement('option');
        wholeTraceOption.value = "whole_trace";
        wholeTraceOption.textContent = "Whole Trace";
        this.regionSelector.appendChild(wholeTraceOption);

        // Add a separator if there are regions
        if (regionIds.length > 0) {
            const separatorOption = document.createElement('option');
            separatorOption.disabled = true;
            separatorOption.textContent = "───────────────";
            this.regionSelector.appendChild(separatorOption);
        }

        // Add regions that have been explained
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

        // Show the region selection container
        this.regionSelectionContainer.style.display = 'block';

        // Set default selection to "Whole Trace"
        this.regionSelector.value = "whole_trace";
        this.currentSelectedRegionId = "whole_trace";

        // Update display
        this.updateDisplayedRegionData();
    }

    /**
     * Update the displayed data based on the currently selected region
     */
    updateDisplayedRegionData() {
        if (!this.currentSelectedRegionId) {
            this.regionSummarySection.style.display = 'none';
            return;
        }

        // Special case for "Whole Trace" option
        if (this.currentSelectedRegionId === "whole_trace") {
            this.updateDisplayedTreeData();
            this.regionSummarySection.style.display = 'none';
            return;
        }

        // For actual regions
        const regionData = this.explainer.regions.get(this.currentSelectedRegionId);
        if (!regionData || !regionData.explained) {
            this.regionSummarySection.style.display = 'none';
            return;
        }

        // Create a data object with region explanation
        const regionSummary = {
            briefSummary: regionData.briefSummary || '',
            flowRepresentation: regionData.flowRepresentation || '',
            detailedBehaviour: regionData.detailedBehaviour || ''
        };

        // Render the region summary
        this.renderSummarySection(this.regionSummaryContent, regionSummary);

        // Show region summary and hide tree summaries
        this.regionSummarySection.style.display = 'block';
        this.regionSummaryContentWrapper.style.display = 'block';
        this.quickSummarySection.style.display = 'none';
        this.detailedSummarySection.style.display = 'none';
    }

    /**
     * Render a summary section with the provided data
     * @param {HTMLElement} container - The container to render into
     * @param {Object} data - The summary data
     */
    renderSummarySection(container, data) {
        container.innerHTML = '';

        // Helper function to create a summary subsection
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

        // Add each section if content exists
        const briefSection = createSubsection('Brief Summary', data.briefSummary);
        if (briefSection) container.appendChild(briefSection);
        
        const flowSection = createSubsection('Flow Representation', data.flowRepresentation);
        if (flowSection) container.appendChild(flowSection);
        
        const detailedSection = createSubsection('Detailed Behaviour', data.detailedBehaviour, true);
        if (detailedSection) container.appendChild(detailedSection);
    }
}