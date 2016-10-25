'use strict';

const crypto = require('crypto');
const Sequelize = require('sequelize');
const ModelBase = require('./base');
const constants = require('../../config/constants');

const User = ModelBase('user', {
    id: {
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
    },
    email: {
        type: Sequelize.STRING,
        unique: true
    },
    nickname: {
        type: Sequelize.STRING,
        unique: true
    },
    role: {
        type: Sequelize.STRING,
        defaultValue: 'user'
    },
    name: Sequelize.STRING,
    password: {
        type: Sequelize.VIRTUAL,
        set: function(value) {
            this.setDataValue('password', value);
            this.setDataValue('salt', Math.round((new Date().valueOf() * Math.random())) + '');
            this.setDataValue('passwordHash', this.encryptPassword(value));
        },
        private: true
    },
    passwordHash: {
        type: Sequelize.STRING,
        private: true
    },
    salt: {
        type: Sequelize.STRING,
        private: true
    },
    surname: Sequelize.STRING,
    avatar: Sequelize.STRING,
    reputation: Sequelize.JSONB,
    github: Sequelize.JSON,
    githubUserId: {
        type: Sequelize.INTEGER,
        private: true
    },
    githubToken: {
        type: Sequelize.STRING,
        private: true
    },
    google: Sequelize.JSON,
    googleUserId: {
        type: Sequelize.STRING,
        private: true
    },
    googleToken: {
        type: Sequelize.STRING,
        private: true
    }
}, {
    instanceMethods: {
        encryptPassword(password) {
            return this.salt ? crypto.createHmac('sha1', this.salt).update(password).digest('hex') : false;
        },
        authenticate(plainText) {
            return this.encryptPassword(plainText) === this.passwordHash;
        },
        getReputation(groupId) {
            return (this.reputation || {})[groupId] || 1;
        },
        setReputation(groupId, value) {
            this.setDataValue('reputation', Object.assign({}, this.reputation, { [groupId]: value }));
        },
        addReputation(groupId, value) {
            this.setReputation(groupId, Math.max(1, this.getReputation(groupId) + value));
        },
        getPermissions(groupId) {
            return (this.permissions || {})[groupId] || {};
        },
        isActionAllowed(action, companyId, ownerId) {
            let isAllowed;

            if (constants.ACTIONS.indexOf(action) === -1) {
                return new Error('Unknown action');
            }

            if (companyId) {
                const permissions = this.getPermissions(companyId);
                const reputation = this.getReputation(companyId);

                if (ownerId && constants.OWNER_ACTIONS.indexOf(action) !== -1) {
                    isAllowed = this.id === ownerId;
                }

                if (isAllowed === undefined) {
                    isAllowed = permissions[action];
                }

                if (isAllowed === undefined) {
                    isAllowed = reputation >= constants.ACTIONS_MIN_REPUTATION[action];
                }
            }

            return isAllowed;
        }
    },
    defaultScope: {
        attributes: ['id', 'email', 'nickname', 'avatar', 'reputation', 'role']
    },
    scopes: {
        full: {}
    }
});

module.exports = User;