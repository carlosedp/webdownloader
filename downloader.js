var http = require("http");
var url = require("url");
var fs = require("fs");
var config = require('./config');

var downloadDirSuffix = config.downloadDirSuffix;
var downloadDir = config.downloadDir;

exports.downloadFile = function(d) {
	var host = url.parse(d.url).hostname;
	var path = url.parse(d.url).pathname;
	var filename = url.parse(d.url).pathname.split("/").pop();
	d.filename = filename;
	d.localpath = downloadDir;

	var options = {
		host: host,
		port: 80,
		path: path,
		method: 'HEAD'
	};

	console.log("Checking file size for: " + filename);
	var request = http.request(options, function(res) {
		request.end(function() {
			d.save(function(err) {
				if (err) console.log("downloader.js - Error saving download:" + err);
			});
		});

		request.on('response', function(response) {
			var filesize = response.headers['content-length'];
			d.filesize = filesize;
			console.log("File size " + filename + ": " + filesize + " bytes.");
			if (filesize >= 50000) {
				console.log("Download cancelled. File too big.");
			} else {
				console.log("Download will continue.");

				// Delete the method from object to fire a GET
				delete options.method;

				http.get(options, function(res) {
					var dlprogress = 0;

					var downloadId = setInterval(function() {
						console.log("Download progress for file" + filename + ": " + dlprogress + " bytes");
					},
					1000);

					request.on('response', function(response) {
						var downloadfile = fs.createWriteStream(downloadDir + filename, {
							'flags': 'a'
						});
						response.on('data', function(chunk) {
							dlprogress += chunk.length;
							downloadfile.write(chunk, encoding = 'binary');
						});
						response.on('end', function() {
							downloadfile.end();
							console.log("Finished downloading " + filename);
							clearInterval(downloadId);
						});
					});

				});

			}
		});
	});
}

