var http = require("http");
var url = require("url");
var fs = require("fs");
var util = require('util');
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
		maxRedirects: 4,
		_redirectsFollowed: 0,
		followRedirect: 1,
	};

	checkDownloadSize(options, d, checkDownloadCallback);
}

var checkDownloadCallback = function(result, options, d) {
	if (result) {
		downloadFile(options, d);
		d.save(function(err) {
			if (err) appLogger.error("downloader.js - Error saving download:" + err);
		});
	}
}

var checkDownloadSize = function(options, d, callback) {
	appLogger.debug("Checking file size for: " + d.filename);
    appLogger.debug("Debug " + util.inspect(options));
	var request = http.request(options);
	request.on('response', function(response) {
		if (response.statusCode >= 300 && response.statusCode < 400 && options.followRedirect && response.headers['location']) {
			// Follow redirect and try again
            appLogger.debug("Following redirect to: " + response.headers['location']);
			options._redirectsFollowed += 1;
			if (options._redirectsFollowed >= options.maxRedirects) {
				appLogger.error("Exceeded maxRedirects. Probably stuck in a redirect loop.");
                callback(0, options, d);
                return;
			}
			options.host = url.parse(response.headers['location']).hostname;
			options.path = url.parse(response.headers['location']).pathname;
			// Check again the redirected URL
			checkDownloadSize(options, d, checkDownloadCallback);
		} else {
			// Check file size
			var filesize = response.headers['content-length'];
			if (filesize >= config.fileSizeLimit && (response.statusCode < 200 || response.statusCode >= 300)) {
				appLogger.debug("Download cancelled. File too big or is a redirect.");
				callback(0, options, d);
			} else {
				appLogger.debug("Download will continue.");
				d.filesize = filesize;
				callback(1, options, d);
			}
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

