var sys = require('sys');
var fs = require("fs");
var path = require('path');
var jade = require('jade');
var nodemailer = require('nodemailer');
var config = require('./config');
var appLogger = require('./logger').appLogger;

nodemailer.SMTP = {
	host: config.mailOptions.host,
	port: config.mailOptions.port,
	use_authentication: false,
	user: "",
	pass: "",
}

exports.emailer = {
	send: function(template, mailOptions, templateOptions) {
		mailOptions.to = mailOptions.to;
		jade.renderFile(path.join(__dirname, 'views', 'mailer', template), templateOptions, function(err, text) {
			// Add the rendered Jade template to the mailOptions
			mailOptions.body = text;

			// Merge the app's mail options
			var keys = Object.keys(config.mailOptions);
			var k;
			for (var i = 0, len = keys.length; i < len; i++) {
				k = keys[i];
				if (!mailOptions.hasOwnProperty(k)) mailOptions[k] = config.mailOptions[k]
			}
			appLogger.info('[SENDING MAIL]' + sys.inspect(mailOptions));
			//if (server.settings.env == 'production') { //TODO
			nodemailer.send_mail({
				sender: mailOptions.from,
				to: mailOptions.to,
				subject: mailOptions.subject,
				html: mailOptions.body,
			},
            function(error, success) {
                if (error) {
                    appLogger.error('[SENDING MAIL] - Message failed. ' + error);
                } else {
                    appLogger.info('[SENDING MAIL] - Message sent.');
                }
			});
			//}
		});
	},

	sendWelcome: function(user) {
		this.send('welcome.jade', {
			to: user.email,
			subject: 'Welcome to Downloadit4me!'
		},
		{
			locals: {
				user: user
			}
		});
	},
	sendDownloadNotify: function(user, download) {
		this.send('downloadNotify.jade', {
			to: user.email,
			subject: 'Downloadit4me - Grab your download!'
		},
		{
			locals: {
				user: user,
				download: download,
			}
		});
	},
	sendDownload: function(user, download) {
		fs.readFile(download.localpath, 'binary', function(err, data) {
			if (err) throw err;
			this.send('download.jade', {
				to: user.email,
				subject: 'Downloadit4me - Here is your download!',
				attachments: [{
					filename: download.filename,
					contents: new Buffer(data, "binary"),
				}],
			},
			{
				locals: {
					user: user,
					download: download,
				},
			});

		});

	},

};

