import hashers from 'node-django-hashers';

import settings from '../settings';


function generatePasswordHash(password) {
    const hasher = new hashers.PBKDF2PasswordHasher();

    return hasher.encode(password, settings.FALLBACK_SECRET_KEY);
}

module.exports = function(sequelize, DataTypes) {

    const options = {};

    options.tableName = 'accounts_customuser';

    options.instanceMethods = {

        setPassword(password, cb) {
            this.password = generatePasswordHash(password);
        },

        checkPassword(password, cb) {
            const hasher = hashers.getHasher(hashers.identifyHasher(this.password));

            return hasher.verify(password, this.password);
        },

        getDataForUser(cb) {
            const data = {},
                self = this,
                attars = [ 'username', 'email', 'phone', 'gender',
                           'isActive', 'isStaff', 'isSuperuser', 'dateJoined' ];

            attars.forEach(function(key) {
                data[key] = self[key];
            });
            data.id = this.uuid;
            data.screenName = this.username;

            return data;
        }
    };

    const User = sequelize.define('User', {
        username: {
            type: DataTypes.STRING(254), // eslint-disable-line no-magic-numbers
            unique: true
        },
        password: {
            type: DataTypes.STRING(128) // eslint-disable-line no-magic-numbers

        },
        email: {
            type: DataTypes.STRING(254), // eslint-disable-line no-magic-numbers
            unique: true
        },
        phone: {
            type: DataTypes.STRING(11), // eslint-disable-line no-magic-numbers
            unique: true
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        },
        gender: {
            type: DataTypes.STRING(2), // eslint-disable-line no-magic-numbers
            values: [ 'm', 'f', 'n' ],
            set(val) {
                let gender;  // eslint-disable-line

                switch (val.toLowerCase()) {
                    case 'male':
                        gender = 'm';
                        break;
                    case 'female':
                        gender = 'f';
                        break;
                    default:
                        gender = 'n';
                }

                this.setDataValue('gender', gender);
            }
        },
        uuid: {
            type: DataTypes.STRING(36), // eslint-disable-line no-magic-numbers
            set(val) {
                const value = val.replace(/-/g, '');

                this.setDataValue('uuid', value);
            },

            get() {
                const val = this.getDataValue('uuid');

                /* eslint-disable no-magic-numbers */
                return val.substring(0, 8) + '-' + val.substring(8, 12) + '-' +
                    val.substring(12, 16) + '-' + val.substring(16, 20) + '-' +
                    val.substring(20, 32);
                /* eslint-enable no-magic-numbers */
            }
        },
        isStaff: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_staff'
        },
        isSuperuser: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_superuser'
        },
        dateJoined: {
            type: DataTypes.DATE,
            field: 'date_joined'

        }
    }, options);

    User.beforeCreate(function(user, opts) {
        user.password = generatePasswordHash(user.password);
    });

    return User;
};
