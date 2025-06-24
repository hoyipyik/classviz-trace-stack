
/**
 * Utility class for creating and styling DOM elements
 */
class UIElementFactory {
    static applyStyles(element, styles) {
        Object.assign(element.style, styles);
    }

    static createElement(tag, className, styles = {}, textContent = null) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        this.applyStyles(element, styles);
        if (textContent !== null) element.textContent = textContent;
        return element;
    }

    static createCheckboxOption(id, label, checked, title, changeHandler) {
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

    static createCollapsibleSection(title, styles = {}) {
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
}
export { UIElementFactory };