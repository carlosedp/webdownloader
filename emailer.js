var sys = require('sys');
var path = require('path');
var mailer = require('mailer');
var jade = require('jade');

var config = require('./config');

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

			console.log('[SENDING MAIL]', sys.inspect(mailOptions));

			// Only send mails in production
			//if (server.settings.env == 'production') {
				//mailer.send(mailOptions, function(err, result) {
					//if (err) {
						//console.log(err);
					//}
				//});
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
	sendDownload: function(user, download) {
		this.send('download.jade', {
			to: user.email,
			subject: 'Downloadit4me - Grab your download'
		},
		{
			locals: {
				user: user,
				download: download,
			}
		});
	},
};

