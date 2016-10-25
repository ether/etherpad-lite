import _ from 'lodash';
import Baobab from 'baobab';

const tree = new Baobab({
    errors: [],
    currentUser: null,
    token: null,
    userSync: false,
    users: [],
    usersTotal: 0,
    selectedUserId: null,
    selectedUser: selectedItem('users', 'selectedUserId'),

    currentCompanyId: null,

    pads: [],
    padsTotal: 0,
    currentPadId: null,
    currentPad: selectedItem('pads', 'currentPadId'),
    newPad: null
});

// Wrapper for creation of monkey for some selected item in list of items
function selectedItem(itemsKey, selectedItemKey, idKey = 'id') {
    const monkey = Baobab.monkey([itemsKey], [selectedItemKey], (items, currentItemId) => {
        return items.filter(item => item[idKey] === currentItemId)[0] || {};
    });

    return monkey;
}

// Return cursor to selected item in array, useful if you need to set data into selected item monkey
tree.selectedItem = (itemPath) => {
    const monkey = tree._monkeys[itemPath];

    if (monkey) {
        const [[itemsKey], [selectedItemKey]] = monkey.projection;
        const selectedItemId = tree.get(selectedItemKey);
        const items = tree.select(itemsKey);
        const index = _.findIndex(items.get(), { id: selectedItemId });

        return items.select(index === -1 ? items.push({}).length - 1 : index);
    } else {
        return false;
    }
}

export default tree;