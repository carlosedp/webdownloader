var http = require("http");
var url = require("url");
var fs = require("fs");
var config = require('./config');
var emailer = require('./emailer').emailer;
var appLogger = require('./logger').appLogger;


var downloadDirSuffix = config.downloadDirSuffix;
var downloadDir = config.downloadDir;

var scheduleDownload = function(d, user) {
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

	checkDownloadSize(options, d, function(result) {
		if (result) {
			downloadFile(options, d);
			d.save(function(err) {
				if (err) appLogger.error("downloader.js - Error saving download:" + err);
			});
		}
	});

}
var checkDownloadSize = function(options, d, callback) {
	appLogger.debug("Checking file size for: " + d.filename);
	var request = http.request(options);
	request.on('response', function(response) {
		var filesize = response.headers['content-length'];
		if (filesize >= config.fileSizeLimit || response.statusCode != 200) {
			appLogger.debug("Download cancelled. File too big or is a redirect.");
			appLogger.debug(sys.inspect(response));
			callback(0);
		} else {
			appLogger.debug("Download will continue.");
			d.filesize = filesize;
			callback(1);
		}
	});
	request.on('error', function(err) {
		appLogger.error('[FILE DOWNLOAD ERROR - HEADER]' + err);
	});
	request.end();
}

var downloadFile = function(options, d) {
	var dlprogress = 0;
	var downloadId = setInterval(function() {
		appLogger.debug("Download progress for file" + d.filename + ": " + dlprogress + " bytes");
	},
	1000);

	var dlrequest = http.get(options);
	dlrequest.on('response', function(response) {
		var downloadfile = fs.createWriteStream(d.localpath + d.filename, {
			flags: 'a',
			encoding: 'binary'
		});
		response.on('data', function(chunk) {
			dlprogress += chunk.length;
			downloadfile.write(chunk);
		});
		response.on('end', function() {
			downloadfile.end();
			appLogger.debug("Finished downloading " + d.filename);
			clearInterval(downloadId);
			emailer.sendDownload(user, d);
		});
	});
    dlrequest.on('error', function(err) {
        appLogger.error('[FILE DOWNLOAD ERROR - DATA]' + err);
    });
}

exports.scheduleDownload = scheduleDownload;

