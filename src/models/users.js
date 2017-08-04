import bcrypt from 'bcrypt';
import hashers from 'node-django-hashers';
import jwt from 'jsonwebtoken';

import * as cache from '../cache';
import settings from '../settings';
import * as utils from '../utils';
import { debug, info } from '../logging';

const basic = new RegExp(/^([^:]*):(.*)$/);

function generatePasswordHash(password) {
    const hasher = new hashers.PBKDF2PasswordHasher();

    return hasher.encode(password, settings.SECRET_KEY);
}

async function getUserByBasicToken(token) {
    const auth = (new Buffer(token, 'base64')).toString('utf8').match(basic);

    if (auth) {
        const username = auth[1],
            password = auth[2];

        try {
            const user = await this.findOne({ where: { username } });

            if (!user || !user.checkPassword(password)) {
                throw new Error('username or password error');
            }

            return user;
        } catch (e) {
            info('find user by username got err ', e);
            throw e;
        }
    }
}

async function getUserByJwtToken(token) {

    let playload = await cache.get('token:' + token);

    if (!playload) {
        try {
            playload = jwt.verify(token, settings.SECRET_KEY);
            await cache.set('token:' + token, playload);
        } catch (e) {
            debug(e);
        }
    }

    if (!playload) {
        debug('token failed');
        throw new Error('invalid token');
    }

    let user = await cache.get('user:' + playload.user.id);

    if (user) {
        user = this.build(user);
        user.isNewRecord = false;
    }
    if (!user) {
        try {
            debug('try to find user ' + playload.user.id + ' in db');
            user = await this.findById(playload.user.id);

            if (!user) {
                throw new Error('user not exists');
            }

            try {
                await cache.set('user:' + playload.user.id, user);
            } catch (e) {
                info('set cache got err ', e);
            }

        } catch (e) {
            info('find user by id got err ', e);
            throw e;
        }
    }

    return user;
}

const USERNAME_MAX_LEN = 150;
const EMAIL_MAX_LEN = 120;
const PHONE_MAX_LEN = 20;
const OPENID_MAX_LEN = 120;

module.exports = function(sequelize, DataTypes) {

    const options = {};

    options.tableName = 'users';

    options.timestamps = true;
    options.createdAt = 'created_at';
    options.updatedAt = 'updated_at';

    options.charset = 'utf8mb4';
    options.collate = 'utf8mb4_general_ci';

    options.classMethods = {
        getUserByJwtToken,
        getUserByBasicToken
    };

    options.instanceMethods = {

        signToken() {
            return jwt.sign({ user: this.toProtoMessage() }, settings.SECRET_KEY);
        },

        isAuthenticated() {
            return true;
        },

        async invalidCache() {
            try {
                await cache.del('user:' + this.id);
            } catch (e) {
                // debug(e);
            }


            return this;
        },

        setPassword(password, cb) {
            this.password = generatePasswordHash(password);
        },

        checkPassword(password, cb) {
            const hasher = hashers.getHasher(hashers.identifyHasher(this.password));

            if (hasher) {
                return hasher.verify(password, this.password);
            }
            // eslint-disable-next-line
            const ok = bcrypt.compareSync(password, this.password.replace(/^\$2y(.+)$/i, '\$2a$1'));

            if (ok) {
                this.setPassword(password);
                try {
                    this.save();
                } catch (e) {
                    // log it
                }
            }

            return ok;  // eslint-disable-line newline-before-return
        },

        getDataForFallback(cb) {
            const data = {},
                self = this,
                attars = [ 'username', 'email', 'phone', 'gender',
                           'isActive', 'isStaff', 'isSuperuser', 'dateJoined' ];

            attars.forEach(function(key) {
                data[key] = self[key];
            });

            data.uuid = this.id;

            return data;
        },

        toProtoMessage() {
            return {
                id: this.id,
                username: this.username,
                email: this.email,
                phone: this.phone,
                gender: this.gender,
                is_staff: this.isStaff,
                is_superuser: this.isSuperuser,
                screen_name: this.screenName,
                birth_day: this.birthDay,
                avatar_url: this.avatarUrl
            };
        },

        toJSON() {
            return this.toProtoMessage();
        }
    };

    const User = sequelize.define('User', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },

        username: {
            type: DataTypes.STRING(USERNAME_MAX_LEN),
            unique: true,
            allowNull: false
        },
        password: {
            type: DataTypes.STRING
        },
        email: {
            type: DataTypes.STRING(EMAIL_MAX_LEN),
            unique: true,
            allowNull: false
        },
        phone: {
            type: DataTypes.STRING(PHONE_MAX_LEN),
            unique: true,
            allowNull: true,

            set(val) {
                const value = val === '' ? null : val;

                this.setDataValue('phone', value);
            },

            get() {
                let val = this.getDataValue('phone');

                if (val === null) {
                    val = '';
                }

                return val;
            }
        },
        screenName: {
            type: DataTypes.STRING,
            field: 'screen_name'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        },
        gender: {
            type: DataTypes.STRING(1),
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
            },
            get() {
                const val = this.getDataValue('gender');

                switch (val) {
                    case 'm':
                        return 'MALE';
                    case 'f':
                        return 'FEMALE';
                    default:
                        return 'SECRET';
                }
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
            defaultValue: DataTypes.NOW,
            field: 'date_joined'
        },
        birthDay: {
            type: DataTypes.DATEONLY,
            field: 'birth_day',
            set(val) {
                const value = val === '' ? null : utils.stringToDate(val, 'YYYY-MM-DD');

                this.setDataValue('birthDay', value);
            },
            get() {
                let val = this.getDataValue('birthDay');

                if (val === null) {
                    val = '';
                } else {
                    val = utils.dateToString(val, 'YYYY-MM-DD');
                }

                return val;
            }
        },

        openid: {
            type: DataTypes.STRING(OPENID_MAX_LEN),
            unique: true,
            allowNull: true,

            set(val) {
                const value = val === '' ? null : val;

                this.setDataValue('openid', value);
            },

            get() {
                let val = this.getDataValue('openid');

                if (val === null) {
                    val = '';
                }

                return val;
            }
        },

        avatarUrl: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'avatar_url',

            set(val) {
                console.log('vvvv' + val);
                this.setDataValue('avatarUrl', val === null ? '' : val);
            }
        }
    }, options);

    User.beforeCreate(function(user, opts) {
        if (user.password) {
            user.password = generatePasswordHash(user.password);
        }

        if (user.phone === '') {
            user.phone = null;
        }
    });

    return User;
};
