import _ from 'lodash'; // eslint-disable-line id-length
import base from './base';

const env = process.env,
    missing = {},
    settings = _.merge({}, base);

const LIFETIME = 86400;

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

settings.DEBUG = true;
settings.USE_FALLBACK = get('USE_FALLBACK', true, 'bool');
settings.LISTEN = get('LISTEN', '0.0.0.0:50051');

settings.DATABASE_URL = get('DATABASE_URL', 'mysql://root@127.0.0.1:3306/services_account');
settings.SECRET_KEY = get('SECRET_KEY', 'a@km73d9w!b6&hdibhx_nq4s8asyan)g)2^_)-_@)#((m-&19b))');

settings.FALLBACK_DATABASE_URL = get('FALLBACK_DATABASE_URL',
                                     'mysql://root@127.0.0.1:3306/fallback');
settings.FALLBACK_SECRET_KEY = get('FALLBACK_SECRET_KEY',
                                   'ou3bbh&l&=!3**jml18v-^l5c5&%2)kr%f@eb9qug!8vz^qu&o');

// Set memcache
settings.MEMCACHED_URL = get('MEMCACHED_URL', '127.0.0.1:11211');
settings.MEMCACHED_LIFETIME = get('MEMCACHED_LIFETIME', LIFETIME); // default lifetime 1 day.

settings.ADMINS = get('ADMINS', 'admin:admin');
settings.STAFFS = get('STAFFS', 'staff:staff');

export default settings;
