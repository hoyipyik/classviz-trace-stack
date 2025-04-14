import { hslString, role_stereotype_colors, whiten, blacken } from './colors.js';
import { $, h, r } from './shorthands.js';
// import { explainSubTreeFromEnterPoint } from './trace/ui/components/cytoscape/subTreeExplain.js';

const stringToNode = (s) => {
	console.log(s);
	const template = document.createElement('template');
	template.innerHTML = s.trim();
	console.log(template);
	const node = template.content.firstChild;
	return node;
};

const prepareRenderData = (node) => {
	console.log(node.data());
	const renderData = {
		title: `${node.data('properties.kind')}: ${node.data('properties.simpleName').replace(/([A-Z])/g, '\u200B$1')}`,
		properties: []
	};

	if (node.data('properties.qualifiedName')) {
		renderData.properties.push({
			key: "qualifiedName",
			value: node.data('properties.qualifiedName')
				.replace(/\./g, '.\u200B')
				.replace(/([A-Z])/g, '\u200B$1')
		});
	}

	// For methods, always include the explanation sections even if empty
	if (node.data('properties.kind') === "method") {
		// Add briefSummary (always for methods)
		renderData.properties.push({
			key: "briefSummary",
			value: (node.data('briefSummary') || "No explanation available")
				.replace(/\./g, '.\u200B')
				.replace(/([A-Z])/g, '\u200B$1')
		});

		// Add detailedBehavior (always for methods)
		renderData.properties.push({
			key: "detailedBehavior",
			value: (node.data('detailedBehavior') || "No explanation available")
				.replace(/\./g, '.\u200B')
				.replace(/([A-Z])/g, '\u200B$1')
		});

		// Add flowRepresentation (always for methods)
		renderData.properties.push({
			key: "flowRepresentation",
			value: (node.data('flowRepresentation') || "No explanation available")
				.replace(/\./g, '.\u200B')
				.replace(/([A-Z])/g, '\u200B$1')
		});
	} else {
		// For non-methods, only add if they exist
		// Add briefSummary if available
		if (node.data('briefSummary')) {
			renderData.properties.push({
				key: "briefSummary",
				value: node.data('briefSummary')
					.replace(/\./g, '.\u200B')
					.replace(/([A-Z])/g, '\u200B$1')
			});
		}

		// Add detailedBehavior if available
		if (node.data('detailedBehavior')) {
			const behaviourDiv = h('div');
			behaviourDiv.appendChild(h('p', {}, [node.data('detailedBehavior')
				.replace(/\./g, '.\u200B')
				.replace(/([A-Z])/g, '\u200B$1')]));
			renderData.properties.push({
				key: "detailedBehavior",
				value: behaviourDiv
			});
		}

		// Add flowRepresentation if available
		if (node.data('flowRepresentation')) {
			const flowDiv = h('div');
			flowDiv.appendChild(h('p', {}, [node.data('flowRepresentation')
				.replace(/\./g, '.\u200B')
				.replace(/([A-Z])/g, '\u200B$1')]));
			renderData.properties.push({
				key: "flowRepresentation",
				value: flowDiv
			});
		}
	}

	if (node.data('properties.description')) {
		const d = h('div');
		if (node.data('properties.title')) {
			d.appendChild(h('p', {}, [h('b', {}, [node.data('properties.title')])]));
		}
		d.appendChild(h('p', {}, [node.data('properties.description')
			.replace(/\./g, '.\u200B')
			.replace(/([A-Z])/g, '\u200B$1')]));
		renderData.properties.push({
			key: "description",
			value: d
		});
	}

	function buildProp(key) {
		if (node.data(`properties.${key}`)) {
			return {
				key: key,
				value: node.data(`properties.${key}`)
			};
		}
		return {};
	}

	const props = [
		buildProp('docComment'),
		buildProp('keywords'),
		buildProp('layer'),
		(() => {
			const p = buildProp('roleStereotype');

			if (p.value && role_stereotype_colors[p.value]) {
				p['style'] = `background-color: ${hslString(whiten(role_stereotype_colors[p.value], 0.75))};`;
			}

			return p;
		})(),
		buildProp('dependencyProfile')
	];
	props.forEach((p) => {
		if (p.key && p.value) {
			renderData.properties.push(p);
		}
	});

	if (node.data('labels').includes("Structure")) {
		const methods = node.scratch('_classviz')['methods'];

		renderData.properties.push({
			key: "methods",
			value: methods.length > 0 ? methods.map(m => {
				return (
					h('div', {}, [
						h('h3', { class: 'info' },
							[m['properties']['simpleName']]),
						h('div', { class: 'info', style: `background-color: ${hslString(whiten(m.color, 0.75))};` }, [
							h('p', {}, [
								h('b', {}, ['description: ']),
								m.properties.description || "(no description)"]),
							h('p', {}, [
								h('b', {}, ['docComment: ']),
								(m.properties.docComment || "(no docComment)")
							]),
						])]));
			}) : h('div', { class: 'info' }, ["No method information available."])
		});
	} else if (node.data('labels').includes("Container")) {
		// Container-specific rendering (commented out in original code)
	}

	return renderData;
}

export const clearInfo = (sel) => {
	r(sel);
}

// Function to show the loading bar
const showLoading = (containerId = 'classviz-loading-container') => {
    const loadingContainer = $(`#${containerId}`);
    if (loadingContainer) {
        loadingContainer.style.display = 'block';
    }
};

// Function to hide the loading bar
const hideLoading = (containerId = 'classviz-loading-container') => {
    const loadingContainer = $(`#${containerId}`);
    if (loadingContainer) {
        loadingContainer.style.display = 'none';
    }
};

// Function to handle explain action
const handleExplain = async (node, type = null) => {
    const containerId = type ? `${type}-loading-container` : 'classviz-loading-container';
    showLoading(containerId);
    
    try {
        // Call the actual explain function
        // await explainSubTreeFromEnterPoint(window.cytrace, node.data('originalId'), true);
        console.log(`Explanation for ${type || 'region'} of ${node.data('properties.simpleName')} completed!`);
    } catch (error) {
        console.error('Error during explanation:', error);
    } finally {
        hideLoading(containerId);
    }
};

export const displayInfo = (sel) => (node) => {
	const element = $(sel);
	const renderData = prepareRenderData(node);

	const ulContents = renderData.properties.filter(prop => prop.key && prop.value).map(prop => {
		const propAttr = { class: 'info' };
		if (prop.style) {
			propAttr['style'] = prop.style;
		}

		const propChildren = [];
		if (Array.isArray(prop.value)) {
			// Nested list for arrays
			propChildren.push(h('ul', {}, prop.value.map(item => h('li', { class: 'info' }, [item]))));
		} else {
			// Create proper structure for text values
			if (typeof prop.value === 'string') {
				propChildren.push(h('p', {}, [prop.value]));
			} else {
				propChildren.push(prop.value);
			}
		}

		const propDiv = h('div', propAttr, propChildren);
        
        // Add id for specific containers to identify them later
        if (['briefSummary', 'detailedBehavior', 'flowRepresentation'].includes(prop.key)) {
            propDiv.id = `${prop.key}-classvizContainer-value`;
            
            // Add explain button to these specific containers if it's a method
        //     if (node.data('properties.kind') === "method") {
        //         const containerExplainButton = h('button', {
        //             class: 'explain-button',
        //             style: 'background-color: hsl(333, 70%, 50%); color: white; border: none; padding: 6px 12px; border-radius: 4px; margin-top: 8px; cursor: pointer; display: flex; align-items: center;'
        //         }, [
        //             h('span', { 
        //                 class: 'play-icon',
        //                 style: 'display: inline-block; width: 0; height: 0; border-style: solid; border-width: 6px 0 6px 10px; border-color: transparent transparent transparent white; margin-right: 6px;'
        //             }, []),
        //             `Explain ${prop.key}`
        //         ]);
                
        //         containerExplainButton.addEventListener('click', () => handleExplain(node, prop.key));
                
        //         // Add loading container for this specific section
        //         const sectionLoadingContainer = h('div', { class: 'loading-container', id: `${prop.key}-loading-container` }, [
        //             h('div', { class: 'loading-text' }, [`Explaining ${prop.key}...`]),
        //             h('div', { class: 'loading-bar' }, [
        //                 h('div', { class: 'loading-progress' }, [])
        //             ])
        //         ]);
                
        //         // Append button and loading container to this section
        //         propChildren.push(containerExplainButton);
        //         propChildren.push(sectionLoadingContainer);
        //     }
        }

        const li = h('li', { class: 'info' }, [
			h('h3', { class: 'info' }, [prop.key]),
			propDiv]);

		return li;
	});

	// Render the properties
	const ul = h("ul", {}, ulContents);

	element.textContent = "";
	element.appendChild(h('h2', {}, [renderData.title]));
	
	// Only add explain button and loading container if properties.kind is "method"
	if (node.data('properties.kind') === "method") {
		// Add explain button
		const explainButton = h('button', {
			class: 'explain-button',
			style: 'background-color: hsl(333, 70%, 50%); color: white; border: none; padding: 6px 12px; border-radius: 4px; margin-top: 8px; cursor: pointer; display: flex; align-items: center;'
		}, [
			h('span', { 
				class: 'play-icon',
				style: 'display: inline-block; width: 0; height: 0; border-style: solid; border-width: 6px 0 6px 10px; border-color: transparent transparent transparent white; margin-right: 6px;'
			}, []),
			'Explain Region'
		]);
		
		explainButton.addEventListener('click', () => handleExplain(node));
		element.appendChild(explainButton);
		
		// Add loading container
		const loadingContainer = h('div', { id: 'classviz-loading-container', class: 'loading-container' }, [
			h('div', { class: 'loading-text' }, ['Explaining subtree...']),
			h('div', { class: 'loading-bar' }, [
				h('div', { class: 'loading-progress' }, [])
			])
		]);
		element.appendChild(loadingContainer);
	}
	
	element.appendChild(ul);
	
	// Add CSS for loading bar
	if (!document.getElementById('loading-styles')) {
	    const style = document.createElement('style');
	    style.id = 'loading-styles';
	    style.textContent = `
	        /* Loading bar styles */
	        .loading-container {
	            margin-top: 8px;
	            display: none; /* Initially hidden */
	        }
	        .loading-text {
	            font-size: 12px;
	            color: #555;
	            margin-bottom: 4px;
	        }
	        .loading-bar {
	            height: 4px;
	            width: 100%;
	            background-color: #f0f0f0;
	            border-radius: 2px;
	            overflow: hidden;
	            position: relative;
	        }
	        .loading-progress {
	            position: absolute;
	            height: 100%;
	            width: 100%;
	            background-color: hsl(333, 70%, 50%);
	            animation: loading-animation 1.5s infinite ease-in-out;
	            transform-origin: 0% 50%;
	        }
	        @keyframes loading-animation {
	            0% {
	                transform: translateX(-100%);
	            }
	            50% {
	                transform: translateX(0%);
	            }
	            100% {
	                transform: translateX(100%);
	            }
	        }
	        .explain-button:hover {
	            background-color: hsl(333, 70%, 40%);
	        }
	    `;
	    document.head.appendChild(style);
	}
}