var http = require("http");
var url = require("url");
var fs = require("fs");

var downloadDir =  __dirname + '/downloadedFiles/';

var checkFileSize = function(requestUrl) {
    var host = url.parse(requestUrl).hostname;
    var filename = url.parse(requestUrl).pathname.split("/").pop();
    var theurl = http.createClient(80, host);
    console.log("Checking file size: " + filename);
    var request = theurl.request('HEAD', requestUrl, {"host": host});  
    request.end();

    request.on('response', function(response) {
        var filesize = response.headers['content-length'];
        console.log("File size " + filename + ": " + filesize + " bytes.");
        if (filesize >= 50000) {
            console.log("Download cancelled. File too big.");
            return 0;
        } else {
            console.log("Download will continue.");
            return 1;
        }
    });
}

var downloadFile = function(requestUrl) {    
    var host = url.parse(requestUrl).hostname;
    var filename = url.parse(requestUrl).pathname.split("/").pop();
    var dlprogress = 0;

    var theurl = http.createClient(80, host);

    console.log("Downloading file: " + filename);
    var request = theurl.request('GET', requestUrl, {"host": host});  

    var downloadId = setInterval(function () {
        console.log("Download progress for file" + filename + ": " + dlprogress + " bytes");
    }, 1000);

    request.on('response', function(response) {
        var downloadfile = fs.createWriteStream(downloadDir + filename, {'flags': 'a'});
        response.on('data', function (chunk) {
            dlprogress += chunk.length;
            downloadfile.write(chunk, encoding='binary');
        });
        response.on('end', function() {
            downloadfile.end();
            console.log("Finished downloading " + filename);
            clearInterval(downloadId);   
        });
    });
    request.end();
}

exports.scheduleDownload = function(URL) {
    if (checkFileSize(URL) == 1) {
        console.log("Download");
        downloadFile(URL);
    }
}

