import fs from 'fs';
import path from 'path';

import Sequelize from 'sequelize';

import settings from '../settings';

const basename = path.basename(module.filename);

const sequelize = new Sequelize(settings.DATABASE_URL, {
    define: {
        timestamps: false // true by default
    }
});

const db = {};

// eslint-disable-next-line
fs.readdirSync(__dirname).filter(function(file) {
    // eslint-disable-next-line
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
}).forEach(function(file) {
    const model = sequelize.import(path.join(__dirname, file));

    db[model.name] = model;
});

Object.keys(db).forEach(function(modelName) {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
