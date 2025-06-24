import { UIElementFactory } from "./UIElementFactory.js";

/**
 * Handles content processing and rendering for explanations
 */
class ExplanationContentRenderer {
    constructor(explainer, regionFocusManager, eventBus) {
        this.explainer = explainer;
        this.regionFocusManager = regionFocusManager;
        this.eventBus = eventBus;
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

    identifyMethodNames(text) {
        if (!text) return text;
        const threadName = this.explainer.selectedTrees.get(this.regionFocusManager.currentSelectedTreeId).threadName;

        const self = this;
        const methodClickHandlerId = `methodClickHandler_${Math.random().toString(36).substr(2, 9)}`;
        window[methodClickHandlerId] = function (methodName, thread) {
            console.log('Method clicked:', methodName, 'Thread:', thread);
            self.eventBus.publish("fuzzySearchFromDetailedBehaviour", {
                name: methodName,
                threadName: thread
            });
        };

        let processedText = text.replace(
            /\b([a-zA-Z][a-zA-Z0-9_]*(?:[$\.][a-zA-Z][a-zA-Z0-9_]*)*)\(\)/g,
            (match) => {
                const safeMatch = match.replace(/'/g, "\\'");
                const safeThreadName = threadName ? threadName.replace(/'/g, "\\'") : '';
                return `<span class="method-name" style="text-decoration: underline; cursor: pointer;" 
                   onclick="${methodClickHandlerId}('${safeMatch}', '${safeThreadName}')">${match}</span>`;
            }
        );

        processedText = processedText.replace(
            /`([a-zA-Z][a-zA-Z0-9_]*(?:[$\.][a-zA-Z][a-zA-Z0-9_]*)*)`/g,
            (match, methodRef) => {
                const safeMethodRef = methodRef.replace(/'/g, "\\'");
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

            const section = UIElementFactory.createElement('div', title.toLowerCase().replace(' ', '-') + '-summary', {
                marginBottom: isLast ? '0' : '15px'
            });

            const sectionTitle = UIElementFactory.createElement('h6', null, {
                margin: '0 0 5px 0',
                fontWeight: 'bold',
                fontSize: '14px'
            }, title);

            let processedContent = content;
            if (title === 'Detailed Behaviour') {
                processedContent = this.identifyMethodNames(content);

                const sectionContent = document.createElement('p');
                sectionContent.style.margin = '0';
                sectionContent.style.fontSize = '14px';
                sectionContent.style.wordWrap = 'break-word';
                sectionContent.style.whiteSpace = 'normal';
                sectionContent.innerHTML = processedContent;

                section.appendChild(sectionTitle);
                section.appendChild(sectionContent);
                return section;
            }

            const sectionContent = UIElementFactory.createElement('p', null, {
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

export { ExplanationContentRenderer };