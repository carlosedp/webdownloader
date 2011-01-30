// Built-in libraries
var express = require('express');
var connect = require('connect');
var sys = require('sys');

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

//server.configure('test', function() {
  //server.set('db-uri', 'mongodb://localhost/nodepad-test');
//});

//server.configure('production', function() {
  //server.set('db-uri', 'mongodb://localhost/nodepad-production');
//});

server.configure(function(){
        server.use(express.favicon());
        server.use(express.bodyDecoder());
        server.use(express.cookieDecoder());
        server.use(express.session({secret: 'secret stuff'}));
        server.use(express.logger({ format: '\x1b[1m:method\x1b[0m \x1b[33m:url\x1b[0m :response-time ms' }));
        server.use(express.methodOverride());
        server.use(server.router);
        server.use(express.staticProvider(pub));
        server.set('views', __dirname + '/views');
        server.set('view engine', 'jade');

});

server.helpers(require('./helpers.js').helpers);
server.dynamicHelpers(require('./helpers.js').dynamicHelpers);

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


server.get('/', function(request, response) {
    response.render('index', {
        locals: {
            signedIn: 1,
            title: 'Web Downloader',
            description: 'Page Description',
            author: 'Your Name',
            analyticssiteid: 'XXXXXXX' 
        }
    });
});

server.post('/', function(request, response) {
    console.log("Received request to download file: " + request.body.download);
    if (!isUrl(request.body.download)) {
        request.flash('error', 'Invalid URL');
        console.log("Invalid URL");
    } else {
        if (!isEmail(request.body.email)) {
            request.flash('error', 'Invalid Email');
            console.log("Invalid Email");
        } else {
            request.flash('info', 'Download scheduled');
            downloader.scheduleDownload(request.body.download);
        }
    }
    response.redirect('back');
});

// Error handling
function NotFound(msg) {
  this.name = 'NotFound';
  Error.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);
}

sys.inherits(NotFound, Error);

server.get('/404', function(req, res) {
  throw new NotFound;
});

server.get('/500', function(req, res) {
  throw new Error('An expected error');
});

server.get('/bad', function(req, res) {
  unknownMethod();
});

server.error(function(err, req, res, next) {
  if (err instanceof NotFound) {
    res.render('404', { status: 404 });
  } else {
    next(err);
  }
});

server.error(function(err, req, res) {
  res.render('500', {
    status: 500,
    locals: {
      error: err
    } 
  });
});

/////////// Run Server ///////////
if (!module.parent) {
  server.listen(port);
  console.log("Express server listening on port %d, environment: %s", server.address().port, server.settings.env);
}

