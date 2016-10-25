import moment from 'moment';
import tree from '../store';
import { ACTIONS, OWNER_ACTIONS, ACTIONS_MIN_REPUTATION } from '../../../config/constants';

export function niceDate(date) {
    return moment(date).calendar(null, {
        sameDay: '[today] [at] hh:mm a',
        nextDay: '[tomorrow] [at] hh:mm a',
        nextWeek: 'dddd [at] hh:mm a',
        lastDay: '[yesterday] [at] hh:mm a',
        lastWeek: '[last] dddd [at] hh:mm a',
        sameElse: 'MMMM D, YYYY [at] hh:mm a'
    }).toLowerCase();
}

export function isActionAllowed(action, ownerId) {
    const user = tree.get('currentUser');
    const companyId = tree.get('currentCompanyId');
    let isAllowed;

    if (ACTIONS.indexOf(action) === -1) {
        return new Error('Unknown action');
    }

    if (companyId && user) {
        const permissions = (user.permissions || {} )[companyId] || {};
        const reputation = (user.reputation || {} )[companyId] || 1;

        if (ownerId && OWNER_ACTIONS.indexOf(action) !== -1) {
            isAllowed = user.id === ownerId;
        }

        if (isAllowed === undefined) {
            isAllowed = permissions[action];
        }

        if (isAllowed === undefined) {
            isAllowed = reputation >= ACTIONS_MIN_REPUTATION[action];
        }
    }

    return isAllowed;
}