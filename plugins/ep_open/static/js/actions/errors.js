export function addError(tree, message) {
    const id = new Date().getTime();

    tree.push('errors', { id, message });
    setTimeout(() => removeError(tree, id), 5000);
}

export function removeError(tree, id) {
    tree.set('errors', tree.select('errors').get().filter(error => error.id !== id));
}

export function errorHandler(tree) {
    return response => {
        const message = response.message || response.error;

        message && addError(tree, message);
    };
}