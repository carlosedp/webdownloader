// Built-in libraries
var express = require('express');
//var cluster = require('cluster');
var connect = require('connect');
var util = require('util');
var crypto = require('crypto');
var mongoose = require('mongoose');
//var mongoStore = require('connect-mongodb');
var gravatar = require('node-gravatar');

// Form validation lib
var form = require('express-form');
var filter = form.filter;
var validate = form.validate;
var expressmessages = require('express-messages');

// Custom libraries
var config = require('./config');
var downloader = require('./downloader');
var models = require('./models');
var emailer = require('./emailer').emailer;

var log4js = require('./logger').log4js;
var consoleLogger = require('./logger').consoleLogger;
var appLogger = require('./logger').appLogger;
var expressFileLogger = require('./logger').expressFileLogger;
var expressLogFormat = '\x1b[1m:method\x1b[0m \x1b[33m:url\x1b[0m :response-time ms'

// Create Server
var server = express.createServer();

// Dev environment
server.configure('development', function() {
	server.use(log4js.connectLogger(consoleLogger, {
		level: log4js.levels.INFO,
		format: expressLogFormat,
	}));
	server.set('db-name', 'webdownloader-dev');
	server.use(express.errorHandler({
		showStack: true,
		dumpExceptions: true
	}));
});

// Configure production environment
server.configure('production', function() {
	server.use(log4js.connectLogger(expressFileLogger, {
		level: log4js.levels.INFO,
		format: expressLogFormat,
	}));
	server.set('db-name', 'webdownloader-prod');
	server.use(express.errorHandler());
});

// Configure all environments
server.configure(function() {
	server.set('views', __dirname + '/views');
	server.set('view engine', 'jade');
	server.set('db-uri', 'mongodb://' + config.DBserverAddress + '/' + server.set('db-name'));
	server.use(express.bodyParser());
	server.use(express.methodOverride());
	server.use(express.cookieParser());
	server.use(express.session({
		secret: 'verysecret'//,
		//store: new mongoStore({
			//host: config.DBserverAddress,
			//db: server.set('db-name')
		//})
	}));
	server.helpers(require('./helpers.js').helpers);
	server.dynamicHelpers(require('./helpers.js').dynamicHelpers);
	server.dynamicHelpers({
		messages: expressmessages
	});
	server.use(express.favicon());
	server.use(express.csrf());
	server.use(express.static(config.pub));
	server.use(server.router);
});

// Load models and connect to DB
var Download = mongoose.model('Download', models.Download);
var User = mongoose.model('User', models.User);
var LoginToken = mongoose.model('LoginToken', models.LoginToken);
var db = mongoose.connect(server.set('db-uri'));

// Setup the errors
server.error(function(err, req, res, next) {
	if (err instanceof NotFound) {
		res.render('errors/404', {
			status: 404,
			url: req.url
		});
	} else {
		res.render('errors/500', {
			error: err,
			status: 500
		});
	}
});

///////////////////////////////////////////
//             Functions                 //
///////////////////////////////////////////
function NotFound(msg) {
	this.name = 'NotFound';
	Error.call(this, msg);
	Error.captureStackTrace(this, arguments.callee);
}
util.inherits(NotFound, Error)

function authenticateFromLoginToken(req, res, next) {
	var cookie = JSON.parse(req.cookies.logintoken);

	LoginToken.findOne({
		email: cookie.email,
		series: cookie.series,
		token: cookie.token
	},
	(function(err, token) {
		if (!token) {
			res.redirect('/sessions/new');
			return;
		}

		User.findOne({
			email: token.email
		},
		function(err, user) {
			if (user) {
				req.session.user_id = user.id;
				req.currentUser = user;

				token.token = token.randomToken();
				token.save(function() {
					res.cookie('logintoken', token.cookieValue, {
						expires: new Date(Date.now() + 2 * 604800000),
						path: '/'
					});
					next();
				});
			} else {
				res.redirect('/sessions/new');
			}
		});
	}));
}

function loadUser(req, res, next) {
	if (req.session.user_id) {
		User.findById(req.session.user_id, function(err, user) {
			if (user) {
				req.currentUser = user;
				next();
			} else {
				res.redirect('/session/new');
			}
		});
	} else if (req.cookies.logintoken) {
		authenticateFromLoginToken(req, res, next);
	} else {
		res.redirect('/session/new');
	}
}

/////////////////////////////////////////
//              API                   //
////////////////////////////////////////
/*
Sessions:
---------------------------------------------------------------------------------------
|GET     | /session/new    | Display user Sign-in page
|POST    | /session        | Sign-in user
|GET     | /session/end    | Sign-out user
---------------------------------------------------------------------------------------

Users:
---------------------------------------------------------------------------------------
|GET     | /user/new       | Display new user sign-up page
|POST    | /user           | Submits a new user
|GET     | /user           | Shows user info page / settings
|PUT     | /user           | Updates user info / settings
|DELETE  | /user           | Delete the user
---------------------------------------------------------------------------------------

Downloads:
---------------------------------------------------------------------------------------
|GET      | /downloads          | Index method that returns the downloads list for the user
|POST     | /downloads/         | Submits a new download
|GET      | /downloads/:id      | Returns the download info page
|GET      | /downloads/del/:id  | Delete the download
|GET      | /downloads/mail/:id | Mail the download
---------------------------------------------------------------------------------------
*/

///////////////////////////////////////////
//              Routes                   //
///////////////////////////////////////////
// Home page
server.get('/', function(req, res) {
	if (req.session.user_id) {
		res.redirect('/downloads');
	} else {
		res.render('home');
	}
});

////////////////////  Session routes ////////////////////
// Sign-in user page
server.get('/session/new', function(req, res) {
	res.render('session/new', {
		user: new User()
	});
});

// Sign-in user submit
server.post('/session', function(req, res) {
	User.findOne({
		email: req.body.user.email
	},
	function(err, user) {
		if (user && user.authenticate(req.body.user.password)) {
			req.session.regenerate(function() {
				req.session.user_id = user.id;
				// Remember me
				if (req.body.remember_me) {
					var loginToken = new LoginToken({
						email: user.email
					});
					loginToken.save(function() {
						res.cookie('logintoken', loginToken.cookieValue, {
							expires: new Date(Date.now() + 2 * 604800000),
							path: '/'
						});
						res.redirect('/downloads');
					});
				} else {
					res.redirect('/downloads');
				}
			});
		} else {
			req.flash('error', 'Authentication failed. Check your email and password.');
			res.render('session/new', {
				user: new User({
					'email': req.body.user.email
				})
			});
		}
	});
});

// Sign-out user
server.get('/session/end', loadUser, function(req, res) {
	if (req.session) {
		LoginToken.remove({
			email: req.currentUser.email
		},
		function() {});
		res.clearCookie('logintoken');
		req.session.destroy(function() {});
	}
	res.redirect('/');
});

//////////////////// User routes ////////////////////
// User sign-up page
server.get('/user/new', function(req, res) {
	res.render('user/new', {
		user: new User()
	});
})

// Submits new user
server.post('/user', function(req, res) {
	var user = new User(req.body.user);

	function userSaveFailed(err) {
		req.flash('error', 'Account creation failed.');
		// TODO indicate failed fields
		appLogger.error('Errors: ' + err);
		res.render('user/new', {
			user: user
		});
	}

	user.save(function(err) {
		if (err) return userSaveFailed(err);

		req.flash('info', 'Your account has been created');
		emailer.sendWelcome(user);
		req.session.user_id = user.id;
		res.redirect('/downloads');
	});
});

// User info/settings page
server.get('/user', loadUser, function(req, res) {
	res.render('user/index', {
		user: req.currentUser,
		gravatar: gravatar.get(req.currentUser.email, 'R', 60, 'identicon')
	});
});

// Update user info/settings
server.put('/user', loadUser, function(req, res) {
	User.findById(req.currentUser.id, function(err, u) {
		if (!u.authenticate(req.body.user.password)) {
			req.flash('error', 'Authentication failed. Check password.');
			res.redirect('/user');
		} else {

			u.password = req.body.user.password;
			u.name = req.body.user.name;

			if (req.body.new_password) {
				if (req.body.new_password === req.body.new_password_confirm) {
					u.password = req.body.new_password;
				} else {
					return userSaveFailed(err, 'New password and confirmation don´t match');
				}
			}
			u.save(function(err) {
				if (err) return userSaveFailed(err, 'Error.');
				req.flash('info', 'User updated');
				res.redirect('/downloads');
			});

			function userSaveFailed(err, msg) {
				req.flash('error', 'User update failed. ' + msg);
				appLogger.error('Errors: ' + err + 'Err msg: ' + msg);
				// TODO indicate failed fields
				res.redirect('/user');
			}
		}
	});

});

// Remove user account
server.del('/user', function(req, res) {
	res.render('user/????');
});

//////////////////// Download routes ////////////////////
// Show user downloads
server.get('/downloads', loadUser, function(req, res) {
	Download.find({
		users: req.currentUser.id
	},
	function(err, downloads) {
		if (!downloads) downloads = [];

		res.render('downloads/index', {
			downloads: downloads
		});
	});
})

// Submit new download
server.post('/downloads', loadUser, form(validate('url').required().isUrl('The download link is invalid.')), function(req, res) {
	if (!req.form.isValid) {
		res.redirect('/downloads/');
	} else {
		Download.findOne({
			url: req.form.url
		},
		function(err, d) {
			if (d) {
				// If Download exists
				appLogger.debug('Download does exists');
				if (d.users.indexOf(req.currentUser.id) != - 1) {
					// User already have this download
					req.flash('error', 'Download already exists.');
					appLogger.debug('Download already exists for this user.');
				} else {
					// Just push this user into download users
					appLogger.debug('Download already exists, pushing user: ' + req.currentUser.email + ' into file ' + d.url);
					d.users.push(req.currentUser.id);
					emailer.sendDownloadNotify(req.currentUser, d);
				}
			} else {
				appLogger.debug('Download does not exist');
				// Download does not exist
				var d = new Download({
					url: req.body.url
				});
				d.users.push(req.currentUser.id);
				appLogger.info('Download file: ' + d.url);
				downloader.scheduleDownload(d, req.currentUser.id);
			}
			d.save(function(err) {
				if (err) appLogger.error('server.js Download - Error saving download: ' + err);
				req.flash('success', 'Download for the file ' + d.url + ' scheduled.');
				res.redirect('/downloads/');
			});
		});
	}
});

// Returns the download info page
server.get('/downloads/:id', loadUser, function(req, res) {
	res.redirect('/downloads/');
});

// Delete the download
server.get('/downloads/del/:id', loadUser, function(req, res) {
	Download.findById(req.params.id, function(err, dl) {
		if (dl) {
			if (dl.users.length > 1) {
				var oldusers = dl.users;
				oldusers.splice(dl.users.indexOf(req.currentUser.id), 1);
				dl.users = oldusers;
				dl.save(function(err) {
					if (err) appLogger.error('server.js New Download - Error saving download: ' + err);
				});
			} else {
				dl.remove();
			}
		} else {
			appLogger.info('Download does not exist. ' + err);
		}
	});
	res.redirect('/downloads/');
});

// Mail the download
server.get('/downloads/mail/:id', loadUser, function(req, res) {
	Download.findById(req.params.id, function(err, dl) {
		emailer.sendDownload(req.currentUser, dl);
	});
	req.flash('info', 'Your download will be sent attached via email.');
	res.redirect('/downloads/');
});

//////////////////// Error routes ////////////////////
//A Route for Creating a 500 Error (Useful to keep around)
server.get('/500', function(req, res) {
	throw new Error('This is a 500 Error');
});

//The 404 Route (ALWAYS Keep this as the last route)
server.get('/*', function(req, res) {
	throw new NotFound;
});

//////////////////// Run Server ////////////////////
process.on('uncaughtException', function(err) {
	appLogger.errorn(err);
});

if (!module.parent) {
	//cluster(server).set('workers', 1).use(cluster.reload()).use(cluster.debug()).listen(8000);
	server.listen(config.serverPort);
	appLogger.info('Express server listening on port ' + server.address().port + ' , environment: ' + server.settings.env);
}

