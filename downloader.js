var http = require("http");
var url = require("url");
var fs = require("fs");

exports.DownloadFile = function (requestUrl) {
    var host = url.parse(requestUrl).hostname;
    var filename = url.parse(requestUrl).pathname.split("/").pop();

    var theurl = http.createClient(80, host);
    console.log("Downloading file: " + filename);
    var request = theurl.request('GET', requestUrl, {"host": host});
    request.end();

    var dlprogress = 0;

    var downloadId = setInterval(function () {
            console.log("Download progress for file" + filename + ": " + dlprogress + " bytes");
            }, 1000);


    request.addListener('response', function (response) {
            var downloadfile = fs.createWriteStream(filename, {'flags': 'a'});
            console.log("File size " + filename + ": " + response.headers['content-length'] + " bytes.");
            response.addListener('data', function (chunk) {
                dlprogress += chunk.length;
                downloadfile.write(chunk, encoding='binary');
                });
            response.addListener("end", function() {
                downloadfile.end();
                console.log("Finished downloading " + filename);
                clearInterval(downloadId);
                });
            });
};
