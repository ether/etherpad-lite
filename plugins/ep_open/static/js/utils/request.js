import fetch from 'isomorphic-fetch';
import config from '../config';
import tree from '../store';

function userSyncPromise() {
    return new Promise(resolve => {
        if (tree.get('userSync')) {
            resolve();
        } else {
            tree.select('userSync').on('update', event => event.data.currentData && resolve());
        }
    });
}

function request(url, params = {}) {
    const isExternal = url.indexOf('http') !== -1;
    const token = tree.select('token').get();

    url = (isExternal ? '' : config.apiHost) + url;
    params.headers = {};

    if (token && token.id) {
        params.headers['X-AUTH-TOKEN'] = token.id;
    }

    if (typeof params.data === 'object') {
        if (/^POST|PUT$/.test(params.method)) {
            params.headers['Content-Type'] = 'application/json';
            params.body = JSON.stringify(params.data);
        } else {
            Object.keys(params.data).forEach((key, index) => {
                url += `${index ? '&' : '?'}${key}=${params.data[key]}`;
            });
        }

        delete params.data;
    }

    return fetch(url, params).then(response => {
        const isError = response.status >= 400;

        if (isExternal) {
            if (isError) {
                throw new Error('Bad response from server');
            }

            return response;
        } else {
            return response.json().then(response => {
                if (isError) {
                    throw new Error(response.error ? response.error : 'Bad response from server');
                }

                return response;
            });
        }
    });
}

export default function(url, params = {}, noUserSync) {
    return noUserSync ? request(url, params) : userSyncPromise().then(() => request(url, params));
}