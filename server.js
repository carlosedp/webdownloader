// Built-in libraries
var express = require('express');
var connect = require('connect');
var sys = require('sys');
var crypto = require('crypto');

// Form validation lib
var form = require("express-form");
var filter = form.filter;
var validate = form.validator;

// Custom libraries
var downloader = require('./downloader');

// Server Configuration
var port = (process.env.PORT || 8000);
var pub = __dirname + '/static';
var Settings = { development: {}, test: {}, production: {} };

var server = express.createServer();

server.configure(function(){
        server.set('views', __dirname + '/views');
        server.set('view engine', 'jade');
        server.helpers(require('./helpers.js').helpers);
        server.dynamicHelpers(require('./helpers.js').dynamicHelpers);
        server.use(express.favicon());
        server.use(express.bodyDecoder());
        server.use(express.cookieDecoder());
        server.use(express.session({secret: 'secret stuff'}));
        server.use(express.logger({ format: '[:date] \x1b[1m:method\x1b[0m \x1b[33m:url\x1b[0m :response-time ms' }));
        server.use(express.methodOverride());
        server.use(express.staticProvider(pub));
        server.use(server.router);
    });

server.configure('development', function() {
    //server.set('db-uri', 'mongodb://localhost/nodepad-development');
      server.use(express.errorHandler({ showStack: true, dumpExceptions: true }));  
});

server.configure('test', function() {
    //server.set('db-uri', 'mongodb://localhost/nodepad-test');
    server.use(express.errorHandler()); 
});

server.configure('production', function() {
    //server.set('db-uri', 'mongodb://localhost/nodepad-production');
      server.use(express.errorHandler()); 
});

//setup the errors
server.error(function(err, req, res, next){
    if (err instanceof NotFound) {
        res.render('errors/404', { status: 404, locals: { url: req.url } } );
    } else {
        res.render('errors/500', { locals: { error: err },status: 500 });
    }
});

function NotFound(msg){
    this.name = 'NotFound';
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.callee);
}

// Generate a salt for the user to prevent rainbow table attacks
// TODO -> Change to DB 
var users = {
  'carlosedp@gmail.com': {
    name: 'carlosedp'
    , salt: 'randomly-generated-salt'
    , pass: md5('qwe' + 'randomly-generated-salt')
  }
};

// Used to generate a hash of the plain-text password + salt

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

// Authenticate using our plain-object database of doom!
// TODO -> Change to DB 
function authenticate(name, pass, fn) {
  var user = users[name];
  // query the db for the given username
  if (!user) return fn(new Error('cannot find user'));
  // apply the same algorithm to the POSTed password, applying
  // the md5 against the pass / salt, if there is a match we
  // found the user
  if (user.pass == md5(pass + user.salt)) return fn(null, user);
  // Otherwise password is invalid
  fn(new Error('invalid password'));
}

function restrict(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/session/new');
  }
}

function accessLogger(req, res, next) {
  console.log('/restricted accessed by %s', req.session.user.name);
  next();
}


function isUrl(url) {
	var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
	return regexp.test(url);
}

function isEmail(email) {
   var regexp = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/;
   return regexp.test(email);
}

/////////////////////////////////////////
//              API                   //
////////////////////////////////////////
/*
Downloads:
---------------------------------------------------------------------------------------
|GET     | /downloads      | Index method that returns the downloads list for the user
|POST    | /downloads/     | Submits a new download
|GET     | /downloads/:id  | Returns the download info page
|DELETE  | /downloads/:id  | Delete the download
---------------------------------------------------------------------------------------

Users:
---------------------------------------------------------------------------------------
|GET     | /user/new       | Display new user sign-up page
|POST    | /user           | Submits a new user
|GET     | /user           | Shows user info page / settings
|DELETE  | /user           | Delete the user
---------------------------------------------------------------------------------------

Sessions:
---------------------------------------------------------------------------------------
|GET     | /session/new    | Display user Sign-in page
|POST    | /session        | Sign-in user
|DELETE  | /session        | Sign-out user
---------------------------------------------------------------------------------------
*/

///////////////////////////////////////////
//              Routes                   //
///////////////////////////////////////////

// Home page
server.get('/', function(req, res) {
    if (req.session.user) {
        res.redirect('/downloads');
    } else {
        res.render('home', {
            locals: {
                title: 'Web Downloader'
            }
        });
    }
});

// Sign-in user page
server.get('/session/new', function(req, res) {
    if (req.session.user) {
        req.flash('info', 'You are already logged-in as' + req.session.user);
        console.log("User already logged as " + req.session.user);
        res.redirect('/downloads');
    }
    res.render('session/new', {
        locals: {
            title: 'Sign-in'
        }
    });
});

// Sign-in user submit
server.post('/session', function(req, res) {
  authenticate(req.body.email, req.body.password, function(err, user) {
    if (user) {
      // Regenerate session when signing in
      // to prevent fixation 
      req.session.regenerate(function(){
        // Store the user's primary key 
        // in the session store to be retrieved,
        // or in this case the entire user object
        req.session.user = user;
        req.flash('info', 'Signed in successfully');
        //TODO Redirect to user downloads
        res.redirect('/downloads');
      });
    } else {
      req.flash('error', 'Authentication failed. Check your email and password.');
      res.redirect('/session/new');
    }
  });
});

// Sign-out user
server.del('/session', function(req, res){
  // destroy the user's session to log them out
  // will be re-created next request
  req.session.destroy(function(){
    res.redirect('/');
  });
})

// User sign-up page
server.get('/user/new', function(req, res) {
  res.render('user/new', {
    locals: { user: new User() }
  });
})

// User sign-up submission
// TODO Create route


// Downloads
server.get('/downloads', function(req, res) {
  res.render('downloads/index');
})

// Submit new download
server.post('/downloads', restrict, 
        form(
            validate("download").required().isUrl("The download link is invalid.")
            ),
        function(req, res) {
            console.log("Received request to download file: " + req.form.download);
            if (!req.form.isValid) {
                for (key in req.form.errors) {
                    req.flash('error', req.form.errors[key]);
                }
            } else {
                req.flash('info', 'Download for the file ' + req.form.download + ' scheduled.');
                console.log("Download file:", req.form.download);
                downloader.downloadFile(req.form.download);
            }
        res.redirect('back');
});


// Error routes

//A Route for Creating a 500 Error (Useful to keep around)
server.get('/500', function(req, res){
    throw new Error('This is a 500 Error');
});

//The 404 Route (ALWAYS Keep this as the last route)
//server.get('/*', function(req, res){
    //throw new NotFound;
//});

/////////// Run Server ///////////
if (!module.parent) {
  server.listen(port);
  console.log("Express server listening on port %d, environment: %s", server.address().port, server.settings.env);
}

