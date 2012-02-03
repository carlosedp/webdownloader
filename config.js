// Server Configuration

exports.environment = 'development'
exports.serverPort = (process.env.PORT || 8000);
exports.DBserverAddress = 'localhost';
exports.pub = __dirname + '/static';
exports.serverAddress = 'http://localhost:' + this.serverPort;

exports.downloadDirSuffix = '/downloadedFiles/';
exports.downloadDir = __dirname + this.downloadDirSuffix;
exports.fileSizeLimit = 100000000;

exports.mailOptions = {
	host: 'localhost',
	port: '1025',
	from: 'mailer@downloadit4.me',
};


