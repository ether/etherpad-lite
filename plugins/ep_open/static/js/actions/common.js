export function addLayoutMode(tree, mode) {
    const layoutModes = tree.get('layoutModes');

    if (layoutModes.indexOf(mode) === -1) {
        tree.set('layoutModes', layoutModes.concat(mode));
    }
}

export function removeLayoutMode(tree, mode) {
    const layoutModes = tree.get('layoutModes').filter(layoutMode => layoutMode !== mode);

    tree.set('layoutModes', layoutModes);
}