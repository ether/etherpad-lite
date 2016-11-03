'use strict';

const rp = require('request-promise');
const google = require('googleapis');
const config = require('../../config');
const helpers = require('../common/helpers');
const async = helpers.async;
const User = require('../models/user');
const createToken = require('./tokens').createToken;
const googleOAuthClient = new google.auth.OAuth2(
	config.google.clientId,
	config.google.clientSecret,
	`${config.env.apiHost}/oauth/google/callback`
);

module.exports = api => {
	api.get('/oauth/github', (request, response) => {
		const authUrl = 'https://github.com/login/oauth/authorize';
		let callback = encodeURIComponent(`${config.env.apiHost}/oauth/github/callback`);

		if (request.query.authToken) {
			callback += encodeURIComponent('?authToken=' + request.query.authToken);
		}

		response.redirect(`${authUrl}?client_id=${config.github.clientId}&redirect_uri=${callback}`);
	});

	api.get('/oauth/google', (request, response) => {
		response.redirect(googleOAuthClient.generateAuthUrl({
			scope: [
				'https://www.googleapis.com/auth/userinfo.email',
				'https://www.googleapis.com/auth/userinfo.profile'
			]
		}));
	});

	api.get('/oauth/:provider/callback', async(function*(request, response) {
		const provider = request.params.provider || '';
		const providerIdKey = `${provider}UserId`;

		if (!/^github|google$/.test(provider)) {
			return response.send('Invalid OAuth provider(supported values: github, google)');
		}

		if (!request.query.code) {
			return response.send('Something went wrong, please try again');
		}

		const oauthData = yield getOAuthData(provider, request.query.code);


		if (!oauthData || !oauthData.access_token) {
			return response.send(oauthData.error_description || 'Something went wrong, please try again');
		}

		const userData = yield getUserData(provider, oauthData.access_token);
		const userSearch = {};
		userSearch[providerIdKey] = userData[providerIdKey];

		let user = yield User.find({ where: userSearch });

		if (!user) {
			const existedUser = yield User.find({
				$or: [
					{ email: userData.email },
					{ nickname: userData.nickname }
				]
			});

			if (existedUser) {
				if (existedUser.email === userData.email) {
					return response.send(`Email ${userData.email} is already in use, please login through regular login`);
				} else {
					userData.nickname += '_' + provider;
				}
			}

			user = yield User.create(userData);
		}

		const token = yield createToken(user, request.cookies.token);
		const tokenJSON = {
			type: 'oauth_callback',
			data: Object.assign(token.toJSON(), { user: user.toJSON() })
		};

		response.send(`
			<html>
			<head>
			<script>
				var parentWindow = window.opener;
				parentWindow && parentWindow.postMessage && parentWindow.postMessage('${JSON.stringify(tokenJSON)}', '*');
				window.close();
			</script>
			</head>
			</html>
		`);
	}));
};

function getOAuthData(provider, code) {
	if (provider === 'github') {
		return rp.post({
			url: 'https://github.com/login/oauth/access_token',
			json: true,
			body: {
				client_id: config.github.clientId,
				client_secret: config.github.clientSecret,
				code: code
			}
		});
	} else {
		return new Promise((resolve, reject) => {
			googleOAuthClient.getToken(code, (error, tokens) => {
				error ? reject(error) : resolve(tokens);
			});
		});
	}
}

function getUserData(provider, accessToken) {
	if (provider === 'github') {
		return rp({
			url: 'https://api.github.com/user?access_token=' + accessToken,
			json: true,
			headers: {
				'User-Agent': 'Open Companies App'
			}
		}).then(data => ({
			email: data.email,
			name: data.name,
			nickname: data.login,
			avatar: data.avatar_url,
			github: data,
			githubUserId: data.id,
			githubToken: accessToken
		}));
	} else {
		return rp({
			url: 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + accessToken,
			json: true
		}).then(data => ({
			email: data.email,
			name: data.name,
			nickname: data.name.toLowerCase().replace(/\s/g, '_'),
			avatar: data.picture,
			google: data,
			googleUserId: data.id,
			googleToken: accessToken
		}));
	}
}