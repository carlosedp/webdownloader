var http = require("http");
var url = require("url");
var fs = require("fs");
var config = require('./config');

var downloadDirSuffix = config.downloadDirSuffix;
var downloadDir = config.downloadDir;

exports.downloadFile = function(d) {
	var hostname = url.parse(d.url).hostname;
	var pathname = url.parse(d.url).pathname;
	var filename = url.parse(d.url).pathname.split("/").pop();
	d.filename = filename;
	d.localpath = downloadDir;

	var options = {
		host: hostname,
		port: 80,
		path: pathname,
		method: 'HEAD',
	};

	console.log("Checking file size for: " + filename);
	var request = http.request(options);
	request.end();
	request.on('response', function(response) {
		var filesize = response.headers['content-length'];
        if (filesize >= 50000 || response.statusCode != 200) {
            console.log("Download cancelled. File too big or is a redirect.");
            console.log(response);
			return;
		} else {
			console.log("Download will continue.");
			d.filesize = filesize;

			var dlprogress = 0;
			var dlrequest = http.get(options);

			var downloadId = setInterval(function() {
				console.log("Download progress for file" + filename + ": " + dlprogress + " bytes");
			},
			1000);

			dlrequest.on('response', function(response2) {
				var downloadfile = fs.createWriteStream(downloadDir + filename, {
					'flags': 'a'
				});
				response2.on('data', function(chunk) {
					dlprogress += chunk.length;
					downloadfile.write(chunk, encoding = 'binary');
				});
				response2.on('end', function() {
					downloadfile.end();
					console.log("Finished downloading " + filename);
					clearInterval(downloadId);
					d.save(function(err) {
						if (err) console.log("downloader.js - Error saving download:" + err);
					});
				});
			});

		}

	});
}

