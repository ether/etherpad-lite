import window from 'global';
import config from '../config';
import request from '../utils/request';
import { errorHandler } from './errors';

export function setCurrentUser(tree, user = null) {
    tree.set('currentUser', user);
}

export function initToken(tree) {
    const tokenString = window.localStorage.token || window.sessionStorage.token;
    const syncUser = (token) => {
        setToken(tree, token);
        tree.set('userSync', true);
    };
    let token;

    try {
        token = JSON.parse(tokenString);
    } catch (e) {}

    if (token) {
        request('/profile?authToken=' + token.id, {}, true)
            .then(user => syncUser(Object.assign(token, { user })))
            .catch(() => syncUser());
    } else {
        syncUser();
    }
}

export function setToken(tree, token, remember = !!window.localStorage.token) {
    let user = null;

    delete window.localStorage.token;
    delete window.sessionStorage.token;

    if (token) {
        (remember ? window.localStorage : window.sessionStorage).token = JSON.stringify(token);

        if (token.user) {
            user = token.user;
            delete token.user;
        }
    }

    tree.set('currentUser', user);
    tree.set('token', token);
}

export function getProfile(tree) {
    request('/profile')
        .then(user => tree.set('currentUser', user))
        .catch(errorHandler(tree));
}

export function updateProfile(tree, data) {
    request('/profile', {
        method: 'PUT',
        data
    })
    .then(user => tree.set('currentUser', user))
    .catch(errorHandler(tree));
}

export function uploadAvatar(tree, image) {
    request('/profile/avatar', {
        method: 'POST',
        data: { image }
    })
    .then(user => tree.set('currentUser', user))
    .catch(errorHandler(tree));
}

export function changePassword(tree, data) {
    request('/profile/password', {
        method: 'PUT',
        data
    })
    .then(user => tree.set('currentUser', user))
    .catch(errorHandler(tree));
}

export function auth(tree, data = {}) {
    request('/tokens', {
        method: 'POST',
        data: {
            email: data.email,
            password: data.password
        }
    })
    .then(token => setToken(tree, token, data.remember))
    .catch(errorHandler(tree));
}

export function socialAuth(tree, provider) {
    const authWindow = window.open(`${config.apiHost}/oauth/${provider}`, provider, 'width=600,height=400');
    const oauthCallbackHandler = function(event) {
        let message = event.data;

        try {
            message = JSON.parse(message);
        } catch(e) {}

        if (typeof message === 'object' && message.type === 'oauth_callback') {
            if (message.data) {
                setToken(tree, message.data, true);
            }
        }

        window.removeEventListener('message', oauthCallbackHandler);
    };

    window.addEventListener('message', oauthCallbackHandler);
    authWindow.onbeforeunload = function() {
        window.removeEventListener('message', oauthCallbackHandler);
    };
}

export function register(tree, data) {
    request('/users', {
        method: 'POST',
        data
    })
    .then(() => auth(tree, {
        email: data.email,
        password: data.password,
        remember: true
    }))
    .catch(errorHandler(tree));
}

export function logout(tree) {
    setToken(tree, null);
}