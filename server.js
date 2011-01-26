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

//setup the errors
//server.error(function(err, req, res, next){
        //if (err instanceof NotFound) {
            //res.render('404', { locals: {
                //header: '#Header#',
                //footer: '#Footer#',
                //title : '404 - Not Found',
                //description: '',
                //author: '',
                //analyticssiteid: 'XXXXXXX'
            //},status: 404 });
        //} else {
            //res.render('500', { locals: {
                //header: '#Header#',
                //footer: '#Footer#',
                //title : 'The Server Encountered an Error',
                //description: '',
                //author: '',
                //analyticssiteid: 'XXXXXXX',
                //error: err
            //},status: 500 });
        //}
//});

// Dynamic helpers are functions which are executed
// on each view render, unless dynamicHelpers is false.

// So for example we do not need to call messages() in our
// template, "messages" will be populated with the return
// value of this function.

server.dynamicHelpers({
    messages: function(req, res){
        // In the case of flash messages
        // we return a function, allowing
        // flash messages to only be flushed
        // when called, otherwise every request
        // will flush flash messages regardless.
        return function(){
            // Grab the flash messages
            var messages = req.flash();
            // We will render the "messages" partial
            return res.partial('messages', {
                // Our target object is our messages
                object: messages,
                // We want it to be named "types" in the partial
                // since they are keyed like this:
                // { info: ['foo'], error: ['bar']}
                as: 'types',
                // Pass a local named "hasMessages" so we can easily
                // check if we have any messages at all
                locals: { hasMessages: Object.keys(messages).length },
                // We dont want dynamicHelpers in this partial, as
                // it would cause infinite recursion
                dynamicHelpers: false
            });
        }
    }
});


server.listen(port);

///////////////////////////////////////////
//              Routes                   //
///////////////////////////////////////////


server.get('/', function(request, response) {
    response.render('index', {
        locals: {
            //header: '#Header#',
            //footer: '#Footer#',
            //footer: response.partial('_footer'),
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
