// Built-in libraries
var express = require('express');
var connect = require('connect');
var sys = require('sys');

// Custom libraries
var downloader = require('./downloader');

// Server port
var port = (process.env.PORT || 8000);

// Path to static directory
var pub = __dirname + '/static';

var server = express.createServer(
        express.bodyDecoder(),
        connect.staticProvider(pub),
        express.cookieDecoder(),
        express.session({ secret: 'secret stuff' })
);

server.configure(function(){
        server.set('views', __dirname + '/views');
        server.set('view engine', 'jade');
        server.use(server.router);
});

server.helpers(require('./helpers.js').helpers);
server.dynamicHelpers(require('./helpers.js').dynamicHelpers);

//setup the errors
//server.error(function(err, req, res, next){
        //if (err instanceof NotFound) {
            //res.render('404', { locals: {
                //title : '404 - Not Found',
                //description: '',
                //author: '',
                //analyticssiteid: 'XXXXXXX'
            //},status: 404 });
        //} else {
            //res.render('500', { locals: {
                //title : 'The Server Encountered an Error',
                //description: '',
                //author: '',
                //analyticssiteid: 'XXXXXXX',
                //error: err
            //},status: 500 });
        //}
//});

server.listen(port);

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
    console.log("Received request to download file: " + request.body.URL);
    downloader.DownloadFile(request.body.URL);
    request.flash('info', 'Download scheduled');
    response.redirect('back');
});

//A Route for Creating a 500 Error (Useful to keep around)
server.get('/500', function(req, res){
    throw new Error('This is a 500 Error');
});

//The 404 Route (ALWAYS Keep this as the last route)
server.get('/*', function(req, res) {
    throw new NotFound;
});

function NotFound(msg){
    this.name = 'NotFound';
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.callee);
}

console.log('Listening on http://0.0.0.0:' + port );
