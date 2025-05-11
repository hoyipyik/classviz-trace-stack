/**
 * Controller for LLM Explanation UI
 * Manages the explanation options and display of results
 * NO-SCROLL VERSION
 */
export class ExplanationUIController {
    constructor(explainer, eventBus, containerId = 'llmExplanation') {
        this.explainer = explainer;
        this.eventBus = eventBus;
        this.currentSelectedTreeId = null;

        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container with ID '${containerId}' not found`);
            return;
        }

        // 確保全頁不滾動
        document.body.style.overflow = 'visible';
        document.documentElement.style.overflow = 'visible';

        // 為主容器添加無滾動樣式
        this.container.style.overflow = 'visible';
        // this.container.style.height = 'auto';】
        this.container.style.maxHeight = '9000px';
        this.container.style.position = 'static';
        this.container.style.display = 'block';
        this.container.style.width = '240px';
        this.container.style.boxSizing = 'border-box';
        this.container.style.whiteSpace = 'normal';
        this.container.style.boxSizing = 'content-box';
        this.container.style.wordWrap = 'break-word';
        this.container.style.wordBreak = 'break-word';

        // 初始化UI
        this.initUI();

        // Subscribe to the explanationCompleted event to update UI
        this.eventBus.subscribe('explanationCompleted', ({ backData }) => {
            // Hide loading bar when explanation is completed
            this.loadingContainer.style.display = 'none';

            // Refresh the tree selection and displayed data
            this.loadExplanations();
        });
    }

    /**
     * Initialize the UI components
     */
    initUI() {
        // 確保主容器不滾動 (這在constructor中已設置，這裡是為了確保)
        this.container.style.overflow = 'visible';
        this.container.style.maxHeight = 'none';
        this.container.style.position = 'static';

        // Create options container
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'explanation-options';
        optionsContainer.style.marginBottom = '15px';
        optionsContainer.style.overflow = 'visible';
        optionsContainer.style.maxHeight = 'none';
        optionsContainer.style.height = 'auto';
        optionsContainer.style.width = '100%';
        optionsContainer.style.boxSizing = 'border-box';
        optionsContainer.style.whiteSpace = 'normal';
        optionsContainer.style.wordBreak = 'break-word';

        // Quick Mode checkbox
        const quickModeContainer = document.createElement('div');
        quickModeContainer.className = 'option-item';
        quickModeContainer.style.marginBottom = '8px';

        const quickModeCheckbox = document.createElement('input');
        quickModeCheckbox.type = 'checkbox';
        quickModeCheckbox.id = 'quickMode';
        quickModeCheckbox.checked = this.explainer.quickMode;
        quickModeCheckbox.addEventListener('change', (e) => {
            this.explainer.quickMode = e.target.checked;
        });

        const quickModeLabel = document.createElement('label');
        quickModeLabel.htmlFor = 'quickMode';
        quickModeLabel.textContent = 'Quick Mode';
        quickModeLabel.style.marginLeft = '8px';

        quickModeContainer.appendChild(quickModeCheckbox);
        quickModeContainer.appendChild(quickModeLabel);

        // Parallel checkbox
        const parallelContainer = document.createElement('div');
        parallelContainer.className = 'option-item';
        parallelContainer.style.marginBottom = '15px';

        const parallelCheckbox = document.createElement('input');
        parallelCheckbox.type = 'checkbox';
        parallelCheckbox.id = 'parallel';
        parallelCheckbox.checked = this.explainer.parallel;
        parallelCheckbox.addEventListener('change', (e) => {
            this.explainer.parallel = e.target.checked;
        });

        const parallelLabel = document.createElement('label');
        parallelLabel.htmlFor = 'parallel';
        parallelLabel.textContent = 'Parallel Processing';
        parallelLabel.style.marginLeft = '8px';

        parallelContainer.appendChild(parallelCheckbox);
        parallelContainer.appendChild(parallelLabel);

        // Add options to container
        optionsContainer.appendChild(quickModeContainer);
        optionsContainer.appendChild(parallelContainer);

        // Create explain button with play icon
        const explainButton = document.createElement('button');
        explainButton.className = 'explain-button';
        explainButton.style.padding = '8px 16px';
        explainButton.style.backgroundColor = '#4a86e8';
        explainButton.style.color = 'white';
        explainButton.style.border = 'none';
        explainButton.style.borderRadius = '4px';
        explainButton.style.cursor = 'pointer';
        explainButton.style.display = 'flex';
        explainButton.style.alignItems = 'center';
        explainButton.style.justifyContent = 'center';
        explainButton.style.fontWeight = 'bold';
        explainButton.style.width = '100%';
        explainButton.style.marginBottom = '15px';

        // Add play icon
        const playIcon = document.createElement('span');
        playIcon.innerHTML = '▶';
        playIcon.style.marginRight = '8px';

        explainButton.appendChild(playIcon);
        explainButton.appendChild(document.createTextNode('Explain'));

        // Tree selection container
        const treeSelectionContainer = document.createElement('div');
        treeSelectionContainer.className = 'tree-selection-container';
        treeSelectionContainer.style.marginBottom = '15px';
        treeSelectionContainer.style.display = 'none'; // Initially hidden until trees are loaded

        const treeSelectionLabel = document.createElement('label');
        treeSelectionLabel.htmlFor = 'treeSelector';
        treeSelectionLabel.textContent = 'Select Tree:';
        treeSelectionLabel.style.display = 'block';
        treeSelectionLabel.style.marginBottom = '5px';
        treeSelectionLabel.style.fontWeight = 'bold';
        treeSelectionLabel.style.fontSize = '14px';

        const treeSelector = document.createElement('select');
        treeSelector.id = 'treeSelector';
        treeSelector.style.width = '250px';
        treeSelector.style.maxWidth = '250px';
        treeSelector.style.padding = '6px';
        treeSelector.style.borderRadius = '4px';
        treeSelector.style.border = '1px solid #ddd';

        treeSelector.addEventListener('change', (e) => {
            this.currentSelectedTreeId = e.target.value;
            this.updateDisplayedData();
        });

        treeSelectionContainer.appendChild(treeSelectionLabel);
        treeSelectionContainer.appendChild(treeSelector);

        // Loading bar (hidden by default)
        const loadingContainer = document.createElement('div');
        loadingContainer.className = 'loading-container';
        loadingContainer.style.marginTop = '10px';
        loadingContainer.style.display = 'none';

        const loadingBar = document.createElement('div');
        loadingBar.className = 'loading-bar';
        loadingBar.style.height = '4px';
        loadingBar.style.backgroundColor = '#f1f1f1';
        loadingBar.style.borderRadius = '2px';
        loadingBar.style.overflow = 'hidden';

        const loadingProgress = document.createElement('div');
        loadingProgress.className = 'loading-progress';
        loadingProgress.style.width = '0%';
        loadingProgress.style.height = '100%';
        loadingProgress.style.backgroundColor = '#4a86e8';
        loadingProgress.style.transition = 'width 0.3s ease-in-out';

        loadingBar.appendChild(loadingProgress);
        loadingContainer.appendChild(loadingBar);

        // Results containers (不使用固定高度)
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'results-container';
        resultsContainer.style.marginTop = '20px';
        resultsContainer.style.width = '100%';
        resultsContainer.style.maxHeight = 'none';
        resultsContainer.style.height = 'auto';
        resultsContainer.style.overflow = 'visible';
        resultsContainer.style.position = 'static';
        resultsContainer.style.boxSizing = 'border-box';
        resultsContainer.style.display = 'block';
        resultsContainer.style.whiteSpace = 'normal';
        resultsContainer.style.wordBreak = 'break-word';

        // Quick Summary section with collapsible functionality
        const quickSummarySection = document.createElement('div');
        quickSummarySection.className = 'result-section quick-summary-section';
        // quickSummarySection.style.marginBottom = '20px';
        quickSummarySection.style.display = 'none';
        quickSummarySection.style.border = '1px solid #ddd';
        quickSummarySection.style.borderRadius = '4px';
        quickSummarySection.style.overflow = 'visible';
        quickSummarySection.style.maxHeight = 'none';
        quickSummarySection.style.maxWidth = '250px';
        quickSummarySection.style.height = 'auto';
        quickSummarySection.style.position = 'static';
        quickSummarySection.style.boxSizing = 'border-box';
        quickSummarySection.style.width = '100%';
        quickSummarySection.style.wordBreak = 'break-word';
        quickSummarySection.style.whiteSpace = 'normal';

        const quickSummaryHeader = document.createElement('div');
        quickSummaryHeader.className = 'summary-header';
        quickSummaryHeader.style.padding = '10px 15px';
        quickSummaryHeader.style.backgroundColor = '#f5f5f5';
        quickSummaryHeader.style.borderBottom = '1px solid #ddd';
        quickSummaryHeader.style.borderTopLeftRadius = '4px';
        quickSummaryHeader.style.borderTopRightRadius = '4px';
        quickSummaryHeader.style.cursor = 'pointer';
        quickSummaryHeader.style.display = 'flex';
        quickSummaryHeader.style.justifyContent = 'space-between';
        quickSummaryHeader.style.alignItems = 'center';
        quickSummaryHeader.style.boxSizing = 'border-box';
        quickSummaryHeader.style.overflow = 'visible';
        quickSummaryHeader.style.width = '100%';
        quickSummaryHeader.style.wordBreak = 'break-word';
        quickSummaryHeader.style.whiteSpace = 'normal';

        const quickSummaryTitle = document.createElement('h5');
        quickSummaryTitle.textContent = 'Quick Summary';
        quickSummaryTitle.style.margin = '0';
        quickSummaryTitle.style.color = '#333';

        const quickSummaryToggle = document.createElement('span');
        quickSummaryToggle.innerHTML = '&#9660;'; // Down arrow
        quickSummaryToggle.style.transition = 'transform 0.3s';

        quickSummaryHeader.appendChild(quickSummaryTitle);
        quickSummaryHeader.appendChild(quickSummaryToggle);

        const quickSummaryContentWrapper = document.createElement('div');
        quickSummaryContentWrapper.className = 'summary-content-wrapper';
        quickSummaryContentWrapper.style.padding = '15px';
        quickSummaryContentWrapper.style.display = 'block';
        quickSummaryContentWrapper.style.maxHeight = 'none';
        quickSummaryContentWrapper.style.height = 'auto';
        quickSummaryContentWrapper.style.overflow = 'visible';
        quickSummaryContentWrapper.style.position = 'static';
        quickSummaryContentWrapper.style.boxSizing = 'border-box';
        quickSummaryContentWrapper.style.width = '100%';
        quickSummaryContentWrapper.style.wordBreak = 'break-word';
        quickSummaryContentWrapper.style.whiteSpace = 'normal';

        const quickSummaryContent = document.createElement('div');
        quickSummaryContent.className = 'summary-content';

        quickSummaryContentWrapper.appendChild(quickSummaryContent);

        quickSummarySection.appendChild(quickSummaryHeader);
        quickSummarySection.appendChild(quickSummaryContentWrapper);

        // Add collapse/expand functionality to Quick Summary
        quickSummaryHeader.addEventListener('click', () => {
            if (quickSummaryContentWrapper.style.display === 'none') {
                quickSummaryContentWrapper.style.display = 'block';
                quickSummaryToggle.innerHTML = '&#9660;'; // Down arrow
                quickSummaryToggle.style.transform = 'rotate(0deg)';
            } else {
                quickSummaryContentWrapper.style.display = 'none';
                quickSummaryToggle.innerHTML = '&#9660;'; // Down arrow
                quickSummaryToggle.style.transform = 'rotate(-90deg)';
            }
        });

        // Detailed Summary section with collapsible functionality
        const detailedSummarySection = document.createElement('div');
        detailedSummarySection.className = 'result-section detailed-summary-section';
        detailedSummarySection.style.display = 'none';
        detailedSummarySection.style.marginTop = '6px';
        detailedSummarySection.style.border = '1px solid #ddd';
        detailedSummarySection.style.borderRadius = '4px';
        // detailedSummarySection.style.marginBottom = '15px';
        detailedSummarySection.style.overflow = 'visible';
        detailedSummarySection.style.maxHeight = 'none';
        detailedSummarySection.style.maxWidth = '250px';
        detailedSummarySection.style.height = 'auto';
        detailedSummarySection.style.position = 'static';
        detailedSummarySection.style.boxSizing = 'border-box';
        detailedSummarySection.style.width = '100%';
        detailedSummarySection.style.wordBreak = 'break-word';
        detailedSummarySection.style.whiteSpace = 'normal';

        const detailedSummaryHeader = document.createElement('div');
        detailedSummaryHeader.className = 'summary-header';
        detailedSummaryHeader.style.padding = '10px 15px';
        detailedSummaryHeader.style.backgroundColor = '#f5f5f5';
        detailedSummaryHeader.style.borderBottom = '1px solid #ddd';
        detailedSummaryHeader.style.borderTopLeftRadius = '4px';
        detailedSummaryHeader.style.borderTopRightRadius = '4px';
        detailedSummaryHeader.style.cursor = 'pointer';
        detailedSummaryHeader.style.display = 'flex';
        detailedSummaryHeader.style.justifyContent = 'space-between';
        detailedSummaryHeader.style.alignItems = 'center';

        const detailedSummaryTitle = document.createElement('h5');
        detailedSummaryTitle.textContent = 'Summary After Thinking';
        detailedSummaryTitle.style.margin = '0';
        detailedSummaryTitle.style.color = '#333';

        const detailedSummaryToggle = document.createElement('span');
        detailedSummaryToggle.innerHTML = '&#9660;'; // Down arrow
        detailedSummaryToggle.style.transition = 'transform 0.3s';

        detailedSummaryHeader.appendChild(detailedSummaryTitle);
        detailedSummaryHeader.appendChild(detailedSummaryToggle);

        const detailedSummaryContentWrapper = document.createElement('div');
        detailedSummaryContentWrapper.className = 'summary-content-wrapper';
        detailedSummaryContentWrapper.style.padding = '15px';
        detailedSummaryContentWrapper.style.display = 'block';
        detailedSummaryContentWrapper.style.maxHeight = 'none'; // 確保內容不被截斷
        detailedSummaryContentWrapper.style.overflow = 'visible'; // 禁用滾動

        const detailedSummaryContent = document.createElement('div');
        detailedSummaryContent.className = 'summary-content';

        detailedSummaryContentWrapper.appendChild(detailedSummaryContent);

        detailedSummarySection.appendChild(detailedSummaryHeader);
        detailedSummarySection.appendChild(detailedSummaryContentWrapper);

        // Add collapse/expand functionality to Detailed Summary
        detailedSummaryHeader.addEventListener('click', () => {
            if (detailedSummaryContentWrapper.style.display === 'none') {
                detailedSummaryContentWrapper.style.display = 'block';
                detailedSummaryToggle.innerHTML = '&#9660;'; // Down arrow
                detailedSummaryToggle.style.transform = 'rotate(0deg)';
            } else {
                detailedSummaryContentWrapper.style.display = 'none';
                detailedSummaryToggle.innerHTML = '&#9660;'; // Down arrow
                detailedSummaryToggle.style.transform = 'rotate(-90deg)';
            }
        });

        // Add results sections to container
        resultsContainer.appendChild(quickSummarySection);
        resultsContainer.appendChild(detailedSummarySection);

        // Add all elements to main container
        this.container.appendChild(optionsContainer);
        this.container.appendChild(explainButton);
        this.container.appendChild(treeSelectionContainer); // Add tree selection below the explain button
        this.container.appendChild(loadingContainer);
        this.container.appendChild(resultsContainer);

        // 確保容器不產生滾動條，非常徹底的禁用滾動
        this.container.style.overflow = 'visible';
        this.container.style.maxHeight = 'none';
        this.container.style.position = 'static';
        this.container.style.display = 'block';

        // 為每個子元素也確保不會滾動
        const allElements = this.container.querySelectorAll('*');
        for (const el of allElements) {
            el.style.overflow = 'visible';
            el.style.maxHeight = 'none';
        }

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

        // Add event listener for the Explain button
        explainButton.addEventListener('click', () => this.runExplanation());
    }

    /**
     * Run the explanation process
     */
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

        // Set up the loading bar style for smooth animation
        this.loadingProgress.style.transition = 'width 0.5s ease-in-out';

        // Create a back-and-forth indeterminate loading animation
        let direction = 1; // 1 for moving right, -1 for moving left
        let position = 0;  // Current position (0-100)

        const interval = setInterval(() => {
            // Update position based on direction
            position += (5 * direction);

            // Change direction when reaching the edges
            if (position >= 90) {
                direction = -1;
            } else if (position <= 10) {
                direction = 1;
            }

            // Update the loading bar width
            this.loadingProgress.style.width = `${position}%`;
        }, 100);

        // Run the actual explanation
        // This will trigger the 'explanationCompleted' event when done
        this.explainer.explainSelectedTraces({
            quickMode: this.explainer.quickMode,
            parallel: this.explainer.parallel
        }).then(data => {
            // Clear the animation interval
            clearInterval(interval);

            // Set to 100% when complete
            this.loadingProgress.style.width = '100%';

            // Note: Don't hide loading here. It will be hidden by the explanationCompleted event
            // Don't load explanations here. It will be done by the explanationCompleted event handler

            // Only re-enable the button
            this.explainButton.disabled = false;
        }).catch(error => {
            console.error("Error running explanation:", error);

            // Clear the animation interval
            clearInterval(interval);

            // Hide loading and show error
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
            // No trees available
            this.treeSelectionContainer.style.display = 'none';
            alert("No trees found. Please make sure there are selected trees before explaining.");
            return;
        }

        // Populate the selector with tree options
        for (const [treeId, treeData] of trees.entries()) {
            const option = document.createElement('option');
            option.value = treeId;

            // Create a user-friendly label (can be customized based on tree data)
            const treeLabel = treeData.tree ? treeData.tree.label || `Tree ${treeId}` : `Tree ${treeId}`;
            option.textContent = `${treeLabel} (ID: ${treeId})`;

            this.treeSelector.appendChild(option);
        }

        // Set the first tree as selected
        this.currentSelectedTreeId = this.treeSelector.options[0].value;

        // Show the tree selection
        this.treeSelectionContainer.style.display = 'block';

        // Update the displayed data for the selected tree
        this.updateDisplayedData();
    }

    /**
     * Update the displayed data based on the currently selected tree
     */
    updateDisplayedData() {
        if (!this.currentSelectedTreeId) return;

        const treeData = this.explainer.selectedTrees.get(this.currentSelectedTreeId);
        if (!treeData) return;

        // Display quick summary if available
        const quickSummary = this.formatExplanationData(treeData.explanation.quickSummary);
        if (quickSummary) {
            this.renderSummarySection(this.quickSummaryContent, quickSummary);
            this.quickSummarySection.style.display = 'block';
            this.quickSummaryContentWrapper.style.display = 'block'; // Ensure content is visible initially
        } else {
            this.quickSummarySection.style.display = 'none';
        }

        // Display detailed summary if available
        const detailedSummary = this.formatExplanationData(treeData.explanation.summaryAfterThinking);
        if (detailedSummary) {
            this.renderSummarySection(this.detailedSummaryContent, detailedSummary);
            this.detailedSummarySection.style.display = 'block';
            this.detailedSummaryContentWrapper.style.display = 'block'; // Ensure content is visible initially
        } else {
            this.detailedSummarySection.style.display = 'none';
        }
    }

    /**
     * Format explanation data for display
     * Handles both string and object formats
     * @param {string|Object} explanation - The explanation data
     * @returns {Object|null} Formatted explanation data or null if no data
     */
    formatExplanationData(explanation) {
        if (!explanation) return null;

        // Check if the explanation is a JSON string
        if (typeof explanation === 'string' && explanation.trim().startsWith('{') && explanation.trim().endsWith('}')) {
            try {
                // Try to parse it as JSON
                return JSON.parse(explanation);
            } catch (e) {
                console.warn("Failed to parse explanation as JSON:", e);
                // Continue with string processing if JSON parsing fails
            }
        }

        // If the explanation is a string, convert it to an object format
        if (typeof explanation === 'string') {
            // Simple heuristic: if the explanation contains specific keywords,
            // try to extract sections
            let detailedBehaviour = "";
            let flowRepresentation = "";
            let briefSummary = "";

            // Split the explanation by paragraphs
            const paragraphs = explanation.split('\n\n');

            if (paragraphs.length >= 3) {
                // Assume a structured format with multiple paragraphs
                briefSummary = paragraphs[0];
                flowRepresentation = paragraphs[1];
                detailedBehaviour = paragraphs.slice(2).join('\n\n');
            } else if (paragraphs.length === 2) {
                // Assume two-paragraph format
                briefSummary = paragraphs[0];
                detailedBehaviour = paragraphs[1];
            } else {
                // Single paragraph - use as brief summary
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
     * Render a summary section with the provided data
     * @param {HTMLElement} container - The container to render into
     * @param {Object} data - The summary data
     */
    renderSummarySection(container, data) {
        container.innerHTML = '';

        if (data.briefSummary) {
            const briefSection = document.createElement('div');
            briefSection.className = 'brief-summary';
            briefSection.style.marginBottom = '15px';

            const briefTitle = document.createElement('h6');
            briefTitle.textContent = 'Brief Summary';
            briefTitle.style.margin = '0 0 5px 0';
            briefTitle.style.fontWeight = 'bold';
            briefTitle.style.fontSize = '14px';

            const briefContent = document.createElement('p');
            briefContent.textContent = data.briefSummary;
            briefContent.style.margin = '0';
            briefContent.style.fontSize = '14px';
            briefContent.style.wordWrap = 'break-word'; // 允許長單詞斷行
            briefContent.style.whiteSpace = 'normal';   // 保持正常換行

            briefSection.appendChild(briefTitle);
            briefSection.appendChild(briefContent);
            container.appendChild(briefSection);
        }

        if (data.flowRepresentation) {
            const flowSection = document.createElement('div');
            flowSection.className = 'flow-representation';
            flowSection.style.marginBottom = '15px';

            const flowTitle = document.createElement('h6');
            flowTitle.textContent = 'Flow Representation';
            flowTitle.style.margin = '0 0 5px 0';
            flowTitle.style.fontWeight = 'bold';
            flowTitle.style.fontSize = '14px';

            const flowContent = document.createElement('p');
            flowContent.textContent = data.flowRepresentation;
            flowContent.style.margin = '0';
            flowContent.style.fontSize = '14px';
            flowContent.style.wordWrap = 'break-word'; // 允許長單詞斷行
            flowContent.style.whiteSpace = 'normal';   // 保持正常換行

            flowSection.appendChild(flowTitle);
            flowSection.appendChild(flowContent);
            container.appendChild(flowSection);
        }

        if (data.detailedBehaviour) {
            const detailedSection = document.createElement('div');
            detailedSection.className = 'detailed-behaviour';

            const detailedTitle = document.createElement('h6');
            detailedTitle.textContent = 'Detailed Behaviour';
            detailedTitle.style.margin = '0 0 5px 0';
            detailedTitle.style.fontWeight = 'bold';
            detailedTitle.style.fontSize = '14px';

            const detailedContent = document.createElement('p');
            detailedContent.textContent = data.detailedBehaviour;
            detailedContent.style.margin = '0';
            detailedContent.style.fontSize = '14px';
            detailedContent.style.wordWrap = 'break-word'; // 允許長單詞斷行
            detailedContent.style.whiteSpace = 'normal';   // 保持正常換行

            detailedSection.appendChild(detailedTitle);
            detailedSection.appendChild(detailedContent);
            container.appendChild(detailedSection);
        }
    }
}