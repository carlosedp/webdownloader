exports.helpers = {
	appName: 'WebDownloader',
	version: '0.1',

	nameAndVersion: function(name, version) {
		return name + ' v' + version;
	}
};

exports.dynamicHelpers = {
	signedIn: function(req, res) {
		if (req.session) {
			if (req.session.user_id) {
				return 1;
			} else {
				return 0;
			}
		}
	},
	token: function(req, res) {
		return req.session._csrf;
	}
};

