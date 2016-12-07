import request from '../utils/request';
import { errorHandler } from './errors'

export function fetchUsers(tree, query = '', page = 1, perPage = 20) {
    request('/users', {
        data: { query, page, perPage }
    })
    .then(response => {
        tree.set('users', response.rows);
        tree.set('usersTotal', response.count);
    })
    .catch(errorHandler(tree));
}

export function selectUser(tree, id = '') {
    tree.set('selectedUserId', id);

    if (!tree.get('selectedUser').id) {
        request('/users/' + id)
            .then(user => tree.selectedItem('selectedUser').set(user))
            .catch(errorHandler(tree));
    }
}

export function unselectUser(tree) {
    tree.set('selectedUserId', null);
}

export function updatePrivileges(tree, userId, data) {
    request(`/users/${userId}/priveleges`, {
        method: 'PUT',
        data
    })
    .catch(errorHandler(tree));
}
