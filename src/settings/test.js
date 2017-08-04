import _ from 'lodash'; // eslint-disable-line id-length
import dev from './dev';

const settings = _.merge({}, dev);

settings.USE_FALLBACK = false;

export default settings;
