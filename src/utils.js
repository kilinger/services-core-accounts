import _ from 'lodash'; // eslint-disable-line id-length
import faker from 'faker';
import moment from 'moment';

import error from './errors';
import { PreHooks, PostHooks } from './hooks';
import { debug, info } from './logging';


export function findName(screenName) {
    return faker.name.findName().toLowerCase().replace(' ', '_');
}

export function findEmail(prefix = 'wx_') {
    return faker.internet.email(prefix);
}

export function findPhone(format = '119########') {
    return faker.phone.phoneNumber(format);
}

export function getCamelCaseRequest(call) {
    const request = {};

    _.forIn(call.request, function(value, key) {
        request[_.camelCase(key)] = value;
    });

    return request;
}

export function stringToDate(string, format = 'YYYY-MM-DD HH:mm:ss') {
    const dt = moment(string, format);

    try {
        return dt.isValid() ? dt._d : null;
    } catch (err) {
        return null;
    }
}

export function dateToString(datetime, format = 'YYYY-MM-DD HH:mm:ss') {
    return datetime ? moment(datetime).format(format) : '';
}


export function wrap(func, pre_hooks = [], post_hooks = []) {
    return async function(call, callback) {
        const metadata = call.metadata.getMap(),
            request = getCamelCaseRequest(call);

        debug('run pre hooks');
        for (const hook of _.concat(PreHooks, pre_hooks)) {
            let err;  // eslint-disable-line
            if (hook.async) {
                err = await hook(request, metadata);
            } else {
                err = hook(request, metadata);
            }
            if (err) {
                info('got err when run pre_host', err);

                return callback(err);
            }
        }
        debug('run pre hooks done');

        try {
            let response = await func(request, metadata);

            debug('run post hooks');
            for (const post_hook of _.concat(PostHooks, post_hooks)) {
                if (post_hook.async) {
                    try {
                        response = await post_hook(response, request, metadata);
                    } catch (err) {
                        info('got err when run post_hook', err);
                    }
                } else {
                    response = post_hook(response, request, metadata);
                }

            }
            debug('run post hooks done');
            debug('return with response:', response);

            return callback(null, response);
        } catch (err) {
            info('got err when call func', err);

            return callback(err);
        }
    };
}

export function loginRequired(func) {
    return async function(request, metadata) {

        debug('check request.user isAuthenticated');

        if (!request.user.isAuthenticated()) {
            info('request.user not authenticated');
            throw error.errUnauthorized;
        }

        info('request.user authenticated');

        return await func(request, metadata);
    };
}


export function staffUserRequired(func) {
    return async function(request, metadata) {

        debug('check request.user isAuthenticated and is staff');

        if (!request.user.isAuthenticated() || !request.user.isStaff) {
            info('request.user not authenticated or not staff');
            throw error.errUnauthorized;
        }

        info('request.user is authenticated and staff');

        return await func(request, metadata);
    };
}
