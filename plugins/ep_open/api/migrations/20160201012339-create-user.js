'use strict';

module.exports = {
    up: function(queryInterface, Sequelize) {
        return queryInterface.createTable('users', {
            id: {
                autoIncrement: false,
                primaryKey: true,
                type: Sequelize.UUID
            },
            email: {
                type: Sequelize.STRING,
                unique: true
            },
            nickname: {
                type: Sequelize.STRING,
                unique: true
            },
            password_hash: Sequelize.STRING,
            salt: Sequelize.STRING,
            name: Sequelize.STRING,
            surname: Sequelize.STRING,
            avatar: Sequelize.STRING,
            github: Sequelize.JSON,
            github_user_id: Sequelize.INTEGER,
            github_token: Sequelize.STRING,
            google: Sequelize.JSON,
            google_user_id: Sequelize.STRING,
            google_token: Sequelize.STRING,
            role: {
    			type: Sequelize.STRING,
    			defaultValue: 'user'
    		},
            reputation: { type: Sequelize.JSONB },
            permissions: { type: Sequelize.JSONB },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updated_at: {
                allowNull: false,
                type: Sequelize.DATE
            }
        });
    },

    down: function(queryInterface, Sequelize) {
        return queryInterface.dropTable('users');
    }
};