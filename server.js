var express = require('express');
var downloader = require('./downloader');

var serverport = 8000;

// Path to public directory
var pub = __dirname + '/public';

var app = express.createServer(
        // Auto-compile sass to css with "compiler"
        // and then serve with connect's staticProvider
        express.compiler({ src: pub, enable: ['sass'] }),
        express.staticProvider(pub)
        );

app.set('views', __dirname + '/views');


app.use(express.bodyDecoder());

// Set default template engine to "jade"
app.set('view engine', 'jade');


app.get('/', function(request, response) {
        response.render('index');
});

app.post('/', function(request, response) {
        console.log("Received request to download file: " + request.body.URL);
        downloader.DownloadFile(request.body.URL);
        response.redirect('back');
        });

app.listen(serverport);
console.log('Express app started on port ' + serverport);

