'use strict';

const stream = require('stream');
const gcloud = require('gcloud');
const gstorage = gcloud.storage({
	projectId: 'cool-plasma-778',
	keyFilename: './google_cloud_key_f738e3f5d4ca.json'
});
const md5 = require('md5');
const helpers = require('../common/helpers');
const async = helpers.async;
const checkAuth = helpers.checkAuth;
const responseError = helpers.responseError;
const checkUserUniq = require('./users').checkUserUniq;
const updateAuthorName = require('./users').updateAuthorName;
const User = require('../models/user');

module.exports = api => {
    api.get('/profile', checkAuth, async(function*(request, response) {
        return request.token.user;
    }));

	api.put('/profile', checkAuth, async(function*(request, response) {
        const user = request.token.user;

		if (!user) {
			return responseError(response, 'User is not found');
		}

		request.cookies.token && updateAuthorName(request.cookies.token, user);

        yield checkUserUniq(request.body);

		return yield user.update(request.body);
	}));

	api.post('/profile/avatar', checkAuth, async(function*(request, response) {
        const user = request.token.user;

		if (!user) {
			return responseError(response, 'User is not found');
		}

		request.checkBody('image', 'Image is required').notEmpty();
		request.checkErrors();

		const avatarPath = yield new Promise((resolve, reject) => {
			const imageMatch = request.body.image.match(/data\:([^;]*);base64,(.*)/);
			const imageType = imageMatch[1];
			const imageBase64 = imageMatch[2];
			const imageExtension = /^image\//.test(imageType) ? imageType.replace('image/', '') : 'png';
			const imagePath = `${md5(user.id)}/avatar.${imageExtension}`;
			const bufferStream = new stream.PassThrough();
			const file = gstorage.bucket('open-companies').file(imagePath);

			bufferStream.end(new Buffer(imageBase64, 'base64'));

			bufferStream
				.pipe(file.createWriteStream({
					metadata: {
						contentType: imageType
					}
				}))
				.on('error', reject)
				.on('finish', function() {
					file.makePublic(error => error ? reject(error) : resolve(imagePath + '?' + new Date().getTime()));
				});
		});

		return yield user.update({ avatar: avatarPath });
	}));

	api.put('/profile/password', checkAuth, async(function*(request, response) {
        const user = request.token.user;

		request.checkBody('current', 'Current password is required').notEmpty();
		request.checkBody('new', 'New password is required').notEmpty();
		request.checkErrors();

		if (!user.authenticate(request.body.current)) {
			return responseError(response, 'Wrong current password');
		}

		return yield user.update({ password: request.body.new });
	}));
};