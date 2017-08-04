import Memcached from 'memcached-promisify';
import settings from './settings';

const options = { cacheHost: settings.MEMCACHED_URL.replace(/^memcache:\/\//g, '') };
const cache = new Memcached(options);

export async function get(key) {
    try {
        const value = await cache.get(key);

        try {
            return JSON.parse(value);
        } catch (e) {
            return value;
        }
    } catch (err) {
        return null;
    }
}


export async function set(key, value) {
    const val = typeof (value) === 'object' ? JSON.stringify(value) : value;

    return await cache.set(key, val, parseInt(settings.MEMCACHED_LIFETIME));
}


export async function del(key) {
    return await cache.del(key);
}
