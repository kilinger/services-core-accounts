import _ from 'lodash'; // eslint-disable-line id-length

import * as db from './models';
import { debug, info } from './logging';
import error from './errors';


class AnonymousUser {
    isAuthenticated() {
        return false;
    }
}

async function authenticationHook(request, metadata) {

    request.user = new AnonymousUser();

    const auth = _.get(metadata, 'authorization');

    if (!auth) {
        debug('authorization metadata not found');

        return;
    }

    const parts = auth.split(/\s+/);

    if (parts.length !== 2) {
        info('bad format authorization header');

        return;
    }

    if (parts[0] === 'Basic') {
        info('basic authorization for app');
        try {
            request.user = await db.User.getUserByBasicToken(parts[1]);
        } catch (e) {
            info('find user by basic token got err ', e);
        }
    }

    if (parts[0] === 'Bearer') {
        debug('bearer authorization for user');

        try {
            request.user = await db.User.getUserByJwtToken(parts[1]);
        } catch (e) {
            info('find user by bearer token got err ', e);
        }
    }
}

authenticationHook.async = true;


async function impersonateHook(request, metadata) {

    if (request.user.isAuthenticated() && request.user.isSuperuser) {
        const userId = _.get(metadata, 'user-id');

        info('try to impersonate to user ' + userId);

        if (userId && userId !== request.user.id) {
            try {
                const user = await db.User.findById(userId);

                if (user) {
                    request.impersonatedFrom = request.user;
                    request.user = user;
                } else {
                    throw error.errValidationFailed;
                }
            } catch (e) {
                info('find user by id got err ', e);
            }
        }
    }
}

impersonateHook.async = true;


function toJsonResponseHook(response, request, metadata) {

    if (_.isArray(response)) {
        return _.map(response, function (value) {
            return toJsonResponseHook(value, request, metadata);
        });
    }

    if (_.isObject(response) && _.isFunction(response.toJSON)) {
        return response.toJSON();
    }

    return response;
}

const PreHooks = [
    authenticationHook,
    impersonateHook
];

const PostHooks = [
    toJsonResponseHook
];

export { PreHooks, PostHooks };
