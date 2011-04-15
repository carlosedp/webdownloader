// Server Configuration
exports.serverPort = (process.env.PORT || 8000);
exports.DBserverAddress = 'localhost';
exports.pub = __dirname + '/static';
exports.serverAddress = 'http://localhost:' + this.serverPort;

exports.downloadDirSuffix = '/downloadedFiles/';
exports.downloadDir = __dirname + this.downloadDirSuffix;

exports.mailOptions = {
	host: 'localhost',
	port: '25',
	from: 'download@downloadit4.me',
};


