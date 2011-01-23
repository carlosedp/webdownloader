var sys = require("sys"),
    http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs"),
    events = require("events");


function downloadFile(requestUrl) {
    var host = url.parse(requestUrl).hostname;
    var filename = url.parse(requestUrl).pathname.split("/").pop();

    var theurl = http.createClient(80, host);
    sys.puts("Downloading file: " + filename);
    var request = theurl.request('GET', requestUrl, {"host": host});
    request.end();

    var dlprogress = 0;

    setInterval(function () {
        sys.puts("Download progress for file" + filename + ": " + dlprogress + " bytes");
    }, 1000);


    request.addListener('response', function (response) {
        var downloadfile = fs.createWriteStream(filename, {'flags': 'a'});
        sys.puts("File size " + filename + ": " + response.headers['content-length'] + " bytes.");
        response.addListener('data', function (chunk) {
            dlprogress += chunk.length;
            downloadfile.write(chunk, encoding='binary');
        });
        response.addListener("end", function() {
            downloadfile.end();
            sys.puts("Finished downloading " + filename);
        });

    });
}

var url1 = "http://python.org/ftp/python/3.1.3/python-3.1.3-macosx10.3.dmg";
var url2 = "http://nodejs.org/dist/node-v0.2.6.tar.gz";

downloadFile(url1);
downloadFile(url2);

