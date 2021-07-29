'use strict';

var properties = require('../../package.json')

var controllers = {
    get_app_info: function (req, res) {
        var appInfo = {
            name: properties.name,
            version: properties.version
        }
        res.json(appInfo);
    },
};

module.exports = controllers;