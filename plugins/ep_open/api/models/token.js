'use strict';

const Sequelize = require('sequelize');
const ModelBase = require('./base');
const User = require('./user');

const Token = ModelBase('token', {
    id: {
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
    },
    expires: Sequelize.DATE,
    userId: {
        type: Sequelize.UUID,
	    private: true
    }
}, {
    instanceMethods: {
        isActive() {
            return this.expires > new Date();
        }
    }
});

User.hasMany(Token, { foreignKey: 'userId' });
Token.belongsTo(User, { foreignKey: 'userId' });

module.exports = Token;