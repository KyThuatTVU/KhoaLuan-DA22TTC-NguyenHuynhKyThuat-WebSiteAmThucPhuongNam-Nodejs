// Component Management System
const ComponentManager = {
    components: {},
    
    // Register a component
    register(name, template) {
        this.components[name] = template;
    },
    
    // Render a component
    render(name, data = {}) {
        const template = this.components[name];
        if (!template) {
            console.error(`Component ${name} not found`);
            return '';
        }
        return typeof template === 'function' ? template(data) : template;
    },
    
    // Load component into element
    load(elementId, componentName, data = {}) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = this.render(componentName, data);
        }
    }
};

// Export for use in other files
window.ComponentManager = ComponentManager;
