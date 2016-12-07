'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const Token = require('./models/token');
const User = require('./models/user');
const responseError = require('./common/helpers').responseError;
const api = express();

api.use((request, response, next) => {
	const tokenId = request.headers['x-auth-token'] || request.query.authToken;

	// Function for triggering of validation errors;
	request.checkErrors = function() {
		const errors = request.validationErrors();

		if (errors.length) {
			return responseError(response, errors[0].msg);
		}
	};

	if (/^POST|PUT$/.test(request.method) && typeof request.body !== 'object') {
		return responseError(response, 'Request should contain body in JSON format');
	}

	if (tokenId) {
		Token
			.find({
				where: { id: tokenId },
				include: [ User.scope('full') ]
			})
			.then(token => {
				if (token && token.isActive()) {
					request.token = token;
				} else {
					request.token = {};
					Token.destroy({ where: { id: tokenId }});
				}

				next();
			})
			.catch(next);
	} else {
		next();
	}
});

// Loading of API controllers
fs.readdir(path.resolve(__dirname, './controllers'), (error, files) => {
	files.forEach(file => {
		if (file.search(/\.js$/) !== -1) {
			require('./controllers/' + file)(api);
		}
	});
});

module.exports = api;