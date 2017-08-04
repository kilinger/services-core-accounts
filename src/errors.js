import grpc from 'grpc';

const errNotFound = { code: grpc.status.NOT_FOUND, message: 'not found' };
const errAuthFailed = { code: grpc.status.INVALID_ARGUMENT,
        message: 'authentication failed, invalid username, email, phone or password' };
const errUserExists = { code: grpc.status.NOT_FOUND, message: 'user exists' };
const errValidationFailed = { code: grpc.status.INVALID_ARGUMENT, message: 'validation falied' };
const errUnauthorized = { code: grpc.status.UNAUTHENTICATED, message: 'Unauthorized' };


export default {
    errAuthFailed, errNotFound, errUnauthorized, errUserExists, errValidationFailed
};
