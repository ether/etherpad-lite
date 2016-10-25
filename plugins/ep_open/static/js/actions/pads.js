import request from '../utils/request';
import { addError, errorHandler } from './errors';

export function getCurrentPadId(tree) {
    const currentPadId = tree.get('currentPadId');

    if (currentPadId) {
        return currentPadId;
    } else {
        addError(tree, 'Pad is not selected');
        return false;
    }
}

export function fetchPads(tree, query) {
    const data = {};

    if (query) {
        data.query = query;
    }

    return request(`/pads`, { data })
        .then(response => {
            tree.set('pads', response.rows);
            tree.set('padsTotal', parseInt(response.count));
        })
        .catch(errorHandler(tree));
}

export function fetchPadsByIds(tree, ids) {
    return request(`/pads`, {
        data: { ids }
    })
    .then(response => {
        tree.set('pads', response.rows);
    })
    .catch(errorHandler(tree));
}

export function setCurrentPad(tree, id = '') {
    tree.set('currentPadId', id);
}

export function getCurrentPad(tree, id = '') {
    tree.set('currentPadId', id);

    if (!tree.get('currentPad').responses) {
        request(`/pads/${id}`)
            .then(pad => {
                tree.selectedItem('currentPad').set(pad);
            })
            .catch(errorHandler(tree));
    }
}

export function createPad(tree, data = {}) {
    request(`/pads`, {
        method: 'POST',
        data
    })
    .then(pad => {
        tree.set('newPad', pad);
        tree.push('pads', pad);
    })
    .catch(errorHandler(tree));
}

export function updatePad(tree, data) {
    const currentPadId = getCurrentPadId(tree);

    if (currentPadId) {
        request(`/pads/${currentPadId}`, {
            method: 'PUT',
            data
        })
        .then(pad => tree.selectedItem('currentPad').set(pad))
        .catch(errorHandler(tree));
    }
}

export function deletePad(tree, id) {
    request(`/pads/${id}`, { method: 'DELETE' })
        .then(() => {
            const pads = tree.select('pads');

            pads.set(pads.get().filter(pad => pad.id !== id));
        })
        .catch(errorHandler(tree));
}


export function clearNewPad(tree) {
    tree.set('newPad', null);
}