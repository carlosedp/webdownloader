var express = require('express');
var downloader = require('./downloader');

var serverport = 8000;

var app = express.createServer();
app.use(express.bodyDecoder());

app.get('/', function(request, response) {
        response.send(
            '<h1>File Downloader</h1><br>'
            + '<form action="/" method="POST">'
            + 'Type in the URL of the file you want to download:'
            + '<input id="URLTextbox" name="URL" type="text"></input>'
            + '<input type="submit"></input>'
            + '</form>');
        });

app.post('/', function(request, response) {
        console.log("Received request to download file: " + request.body.URL);
        downloader.DownloadFile(request.body.URL);
        response.redirect('back');
        });

app.listen(serverport);
console.log('Express app started on port ' + serverport);

