//var log4js = require('log4js')();
//Added local module until npm is updated
var log4js = require('./deps/log4js/lib/log4js')();

// Log configuration
log4js.addAppender(log4js.fileAppender('./logs/express.log'), 'express');
log4js.addAppender(log4js.fileAppender('./logs/application.log'), 'application');

var consoleLogger = log4js.getLogger('console');
var expressFileLogger = log4js.getLogger('express');
var appLogger = log4js.getLogger('console');
// Use line below when in production
// TODO automate this
////var appLogger = log4js.getLogger('application');
   
// Set logger level threshold   
//consoleLogger.setLevel('INFO');
//appLogger.setLevel('INFO');
//expressFileLogger.setLevel('INFO');

exports.log4js = log4js;
exports.consoleLogger = consoleLogger;
exports.expressFileLogger = expressFileLogger;
exports.appLogger = appLogger;

