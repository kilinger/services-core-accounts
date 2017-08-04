import _ from 'lodash'; // eslint-disable-line id-length
import base from './base';

const env = process.env,
    missing = {},
    settings = _.merge({}, base);

function get(key, defaultValue = missing, type = 'string') {
    const val = _.get(env, key, defaultValue);

    if (val === missing) {
        console.log(key + ' is required!');
        process.exit(1); // eslint-disable-line
    }

    if (type === 'bool') {
        if (typeof val === 'boolean') {
            return val;
        }

        return Boolean(val.toLowerCase() in [ 'true', 't', 'yes', 'y' ]);
    }


    return val;
}

settings.DEBUG = false;

settings.LISTEN = get('LISTEN');
settings.USE_FALLBACK = get('USE_FALLBACK', missing, 'bool');
settings.DATABASE_URL = get('DATABASE_URL');
settings.SECRET_KEY = get('SECRET_KEY');

settings.FALLBACK_DATABASE_URL = get('FALLBACK_DATABASE_URL');
settings.FALLBACK_SECRET_KEY = get('FALLBACK_SECRET_KEY');

// Set memcache
settings.MEMCACHED_URL = get('MEMCACHED_URL');
settings.MEMCACHED_LIFETIME = get('MEMCACHED_LIFETIME');

settings.ADMINS = get('ADMINS', '');
settings.STAFFS = get('STAFFS', '');


export default settings;
