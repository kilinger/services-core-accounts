const USERNAME_MAX_LEN = 150;
const EMAIL_MAX_LEN = 120;
const PHONE_MAX_LEN = 20;
const OPENID_MAX_LEN = 120;

module.exports = {
    up(queryInterface, Sequelize) {
        const options = {};

        // tableName, timestamps(createdAt, updatedAt), instanceMethods were invalid for createTable-options
        options.charset = 'utf8mb4';
        options.collate = 'utf8mb4_general_ci';

        return queryInterface.createTable('users', {
            id: {
                type: Sequelize.UUID,
                primaryKey: true,
                defaultValue: Sequelize.UUIDV4
            },

            username: {
                type: Sequelize.STRING(USERNAME_MAX_LEN),
                unique: true,
                allowNull: false
            },
            password: {
                type: Sequelize.STRING
            },
            email: {
                type: Sequelize.STRING(EMAIL_MAX_LEN),
                unique: true,
                allowNull: false
            },
            phone: {
                type: Sequelize.STRING(PHONE_MAX_LEN),
                unique: true,
                allowNull: true
            },
            screenName: {
                type: Sequelize.STRING,
                field: 'screen_name'
            },
            isActive: {
                type: Sequelize.BOOLEAN,
                defaultValue: true,
                field: 'is_active'
            },
            gender: {
                type: Sequelize.STRING(1),
                values: [ 'm', 'f', 'n' ]
            },
            isStaff: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
                field: 'is_staff'
            },
            isSuperuser: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
                field: 'is_superuser'
            },
            dateJoined: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW,
                field: 'date_joined'
            },
            birthDay: {
                type: Sequelize.DATEONLY,
                field: 'birth_day'
            },

            openid: {
                type: Sequelize.STRING(OPENID_MAX_LEN),
                unique: true,
                allowNull: true
            },
            avatarUrl: {
                type: Sequelize.STRING,
                allowNull: false,
                field: 'avatar_url'
            },
            createdAt: {
                type: Sequelize.DATE,
                field: 'created_at'
            },
            updatedAt: {
                type: Sequelize.DATE,
                field: 'updated_at'
            }
        }, options);
    },

    down(queryInterface, Sequelize) {
        return queryInterface.dropTable('users');
    }
};
