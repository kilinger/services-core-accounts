#!/usr/bin/env sh

echo "db migrate"
sequelize db:migrate
echo "db migrate done"
