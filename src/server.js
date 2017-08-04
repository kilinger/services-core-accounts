import { join } from 'path';
import _ from 'lodash';  // eslint-disable-line id-length

import grpc from 'grpc';
import health from 'grpc/src/node/health_check/health';

import error from './errors';
import settings from './settings';

import { debug, info } from './logging';

import * as utils from './utils';
import * as db from './models';
import * as fallback from './fallback';

function getUserIdQuery(request, attrs = [ 'username', 'email', 'phone', 'openid' ]) {
    const query = {};

    attrs.forEach(function(e) {
        if (_.has(request, e) && request[e]) {
            query[e] = request[e];
        }
    });

    return query;
}

async function getUserFromFallback(query, password, user = null) {
    /* 从 fallback.User 中查询用户，然后同步到 db.User
     */
    if (!settings.USE_FALLBACK) {
        throw error.errNotFound;
    }

    const fallbackUser = await fallback.User.findOne({ where: query });

    if (!fallbackUser) {
        throw error.errNotFound;
    }

    if (!fallbackUser.checkPassword(password)) {
        throw error.errAuthFailed;
    }

    if (user) {
        user.setPassword(password);

        return await user.save();
    }

    const data = fallbackUser.getDataForUser();

    data.password = password;

    return await db.User.create(data);
}


async function doAuthenticate(request, metadata) {
    const query = getUserIdQuery(request),
        password = request.password,
        authenticateUsingOpenID = Boolean(_.get(request, 'openid'));

    let user = await db.User.findOne({ where: query });

    if (!user || !user.checkPassword(password)) {
        if (authenticateUsingOpenID) {
            throw error.errAuthFailed;
        }
        try {
            user = await getUserFromFallback(query, password, user);
        } catch (e) {
            throw error.errAuthFailed;
        }
    }

    if (!authenticateUsingOpenID && !user.checkPassword(password)) {
        throw error.errAuthFailed;
    }

    return { token: user.signToken() };
}


async function doCreate (request, metadata) {
    if (request.openid) {
        request.username = utils.findName(request.screenName);
        request.email = utils.findEmail();
        request.phone = utils.findPhone();
    }

    if (settings.USE_FALLBACK) {
        debug('check user exists in fallback database');
        let exists = false;
        const query = getUserIdQuery(request, [ 'username', 'email', 'phone' ]);

        if (!_.isEmpty(query)) {
            exists = await fallback.User.findOne({ where: query });
        }
        if (exists) {
            throw error.errUserExists;
        }
    }

    let user;  // eslint-disable-line

    try {
        user = await db.User.create(request);
    } catch (e) {
        debug('create user err: ', e);
        throw error.errValidationFailed;
    }

    if (settings.USE_FALLBACK) {
        const data = user.getDataForFallback();

        data.password = request.password;

        try {
            await fallback.User.create(data);
        } catch (e) {
            debug('sync user to fallback err: ', e);
        }
    }

    return user;
}


async function doSetPassword(request, metadata) {
    let user = request.user;

    user.setPassword(request.password);
    user = await user.save();

    if (settings.USE_FALLBACK) {
        try {
            let fallbackUser = await fallback.User.findOne({ where: { uuid: user.id } });

            if (fallbackUser) {
                fallbackUser.setPassword(request.password);
                fallbackUser = await fallbackUser.save();
            }

        } catch (e) {
            debug(e);
        }
    }

    return {};
}

async function doUpdate(request, metadata) {
    let user = request.user;

    [ 'screenName', 'birthDay', 'gender', 'avatarUrl' ].forEach(function(e) {
        user[e] = request[e];
    });

    try {
        user = await (await user.save()).invalidCache();

        return user;
    } catch (e) {
        throw e;
    }
}

async function doShowMe(request, metadata) {
    return await request.user;
}

async function doGet(request, metadata) {
    const query = getUserIdQuery(request, [ 'id' ]);
    const user = await db.User.findOne({ where: query });

    if (!user) {
        throw error.errNotFound;
    }

    return user;
}

async function doSearch(request, metadata) {
    const perPagedefault = 20;
    const page = request.page ? request.page : 1;
    const perPage = request.perPage ? request.perPage : perPagedefault;
    const limit = perPage;
    const offset = (page - 1) * perPage;
    const queries = [];

    for (const key of [ 'screenName', 'username', 'phone', 'email' ]) {
        if (request[key]) {
            const query = {};

            query[key] = { $like: '%' + request[key] + '%' };
            queries.push(query);
        }
    }

    const users = await db.User.findAll({
        where: { $and: queries },
        order: 'created_at DESC',
        limit,
        offset
    });

    return users;
}


const wrap = utils.wrap;
const loginRequired = utils.loginRequired;
const staffUserRequired = utils.staffUserRequired;


class Server {

    constructor() {
        const server = new grpc.Server(),
            coreProto = grpc.load(join(__dirname, '../core.proto'));

        server.addProtoService(coreProto.core.UserService.service, {
            authenticate: wrap(doAuthenticate),
            create: wrap(staffUserRequired(doCreate)),
            get: wrap(loginRequired(doGet)),
            me: wrap(loginRequired(doShowMe)),
            update: wrap(loginRequired(doUpdate)),
            setPassword: wrap(loginRequired(doSetPassword)),
            search: wrap(staffUserRequired(doSearch))
        });

        const healthImpl = new health.Implementation({ accounts: 'SERVING' });

        server.addProtoService(health.service, healthImpl);

        this._server = server;
    }

    run(listen) {
        info('listen at ' + listen);
        this._server.bind(listen, grpc.ServerCredentials.createInsecure());
        this._server.start();
    }
}

export default Server;
