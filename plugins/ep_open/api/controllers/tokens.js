'use strict';

const http = require('http');
const moment = require('moment');
const helpers = require('../common/helpers');
const async = helpers.async;
const responseError = helpers.responseError;
const User = require('../models/user');
const Token = require('../models/token');

module.exports = api => {
	api.get('/tokens/:id', async(function*(request, response) {
		return yield Token.findById(request.params.id);
	}));

	api.post('/tokens', async(function*(request, response) {
		request.checkBody('email', 'You should specify email').notEmpty();
		request.checkBody('password', 'You should specify password').notEmpty();
		request.checkErrors();

		const user = yield User.scope('full').find({ where: { email: request.body.email } });

		if (!user || !user.authenticate(request.body.password)) {
			return responseError(response, 'Authentication fails');
		}

		const token = yield createToken(user.id);

		return Object.assign(token.toJSON(), { user });
	}));

	api.get('/tokens/:id/prolong', async(function*(request, response) {
		const token = yield Token.findById(request.params.id);

		if (!token) {
			return responseError(response, 'Token is not found');
		}

		token.expires = moment().add(1, 'months');

		return yield token.save();
	}));


	api.delete('/tokens/:id', async(function*(request) {
		const token = yield Token.findById(request.params.id);

		if (!token) {
			return responseError(response, 'Token is not found');
		}

		return yield token.destroy();
	}));
};

function createToken(userId) {
	return Token
		.destroy({ where: { userId: userId }})
		.then(() =>
			Token.create({
				expires: moment().add(1, 'months'),
				userId: userId
			})
	);
}

module.exports.createToken = createToken;
