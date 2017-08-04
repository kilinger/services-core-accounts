import { join } from 'path';
import _ from 'lodash'; // eslint-disable-line id-length
import dotenv from 'dotenv';

dotenv.config({ path: join(__dirname, '../.env'), silent: true });
dotenv.config({ path: join(__dirname, '../../.env'), silent: true });

const mod = process.env.NODE_ENV;

if (!mod || _.indexOf([ 'prod', 'staging', 'dev', 'test' ], mod) === -1) {
    console.log('NODE_ENV required and should be one of prod, staging, dev, test.');
    process.exit(1); // eslint-disable-line
}

const settings = require('./' + mod + '.js');

export default settings.default;
