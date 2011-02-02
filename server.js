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

server.configure('development', function() {
  //server.set('db-uri', 'mongodb://localhost/nodepad-development');
  server.use(express.errorHandler({ dumpExceptions: true }));  
});

server.configure('test', function() {
  //server.set('db-uri', 'mongodb://localhost/nodepad-test');
});

server.configure('production', function() {
  //server.set('db-uri', 'mongodb://localhost/nodepad-production');
});

server.configure(function(){
        server.use(express.favicon());
        server.use(express.bodyDecoder());
        server.use(express.cookieDecoder());
        server.use(express.session({secret: 'secret stuff'}));
        server.use(express.logger({ format: '[:date] \x1b[1m:method\x1b[0m \x1b[33m:url\x1b[0m :response-time ms' }));
        server.use(express.methodOverride());
        server.use(server.router);
        server.use(express.staticProvider(pub));
        server.set('views', __dirname + '/views');
        server.set('view engine', 'jade');
        server.helpers(require('./helpers.js').helpers);
        server.dynamicHelpers(require('./helpers.js').dynamicHelpers);
});


// Error handling
function NotFound(msg) {
  this.name = 'NotFound';
  Error.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);
}
sys.inherits(NotFound, Error);

server.error(function(err, req, res, next) {
  if (err instanceof NotFound) {
    res.render('404.jade', { status: 404 });
  } else {
    next(err);
  }
});

server.error(function(err, req, res) {
  res.render('500.jade', {
    status: 500,
    locals: {
      error: err
    } 
  });
});

// Generate a salt for the user to prevent rainbow table attacks

var users = {
  carlosedp: {
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
    res.redirect('/login');
  }
}

function accessLogger(req, res, next) {
  console.log('/restricted accessed by %s', req.session.user.name);
  next();
}

sys.inherits(NotFound, Error);

function isUrl(url) {
	var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
	return regexp.test(url);
}

function isEmail(email) {
   var regexp = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/;
   return regexp.test(email);
}

///////////////////////////////////////////
//              Routes                   //
///////////////////////////////////////////


server.get('/', function(req, res) {
    res.render('home', {
        locals: {
            title: 'Web Downloader'
        }
    });
});

server.get('/signin', function(req, res) {
    //if (req.session.user) {
        //req.flash('info', 'You are already logged-in as' + req.session.user);
        //console.log("User already logged as " + req.session.user);
        //res.redirect('/');
    //}
    res.render('signin', {
        locals: {
            title: 'Sign-in'
        }
    });
});

server.post('/signin', function(req, res) {
  authenticate(req.body.username, req.body.password, function(err, user) {
    if (user) {
      // Regenerate session when signing in
      // to prevent fixation 
      req.session.regenerate(function(){
        // Store the user's primary key 
        // in the session store to be retrieved,
        // or in this case the entire user object
        req.session.user = user;
        req.flash('info', 'Signed in successfully');
        res.redirect('/');
      });
    } else {
      req.flash('error', 'Authentication failed. Check your user and password.');
      res.redirect('/signin');
    }
  });
});

server.get('/signout', function(req, res){
  // destroy the user's session to log them out
  // will be re-created next request
  req.session.destroy(function(){
    res.redirect('/');
  });
})

server.get('/signup', function(req, res) {
  res.render('users/new.jade', {
    locals: { user: new User() }
  });
})

server.post('/submitDownload', restrict, 
        form(
            validate("download").required().isUrl("The download link is invalid.")
            ),
        function(req, res) {
            console.log("Received request to download file: " + req.form.download);
            if (!req.form.isValid) {
                console.log(req.form.errors);
                for (key in req.form.errors) {
                    req.flash('error', req.form.errors[key]);
                }
            } else {
                req.flash('info', 'Download for the file ' + req.form.download + ' scheduled.');
                console.log("Download file:", req.form.download);
            }
        res.redirect('back');
});

server.get('/restricted', restrict, accessLogger, function(req, res){
  res.send('Wahoo! restricted area');
})

server.get('/404', function(req, res) {
  throw new NotFound;
});

server.get('/500', function(req, res) {
  throw new Error('An expected error');
});

server.get('/bad', function(req, res) {
  unknownMethod();
});

/////////// Run Server ///////////
if (!module.parent) {
  server.listen(port);
  console.log("Express server listening on port %d, environment: %s", server.address().port, server.settings.env);
}

