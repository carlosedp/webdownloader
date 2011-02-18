var crypto = require('crypto');
var url = require('url');
var config = require('./config');

var Download;
var User;

function defineModels(mongoose, fn) {
	var Schema = mongoose.Schema;
	var ObjectId = Schema.ObjectId;

	/**
    * Model: Download
    */
	Download = new Schema({
		'filename': String,
		'filesize': Number,
		'url': String,
		'date': {
			type: Date,
		default:
			Date.now,
		},
		'localpath': String,
		'hash': String,
        'refs': Number,
        'users': [String]
	});
	Download.virtual('localurl').get(function() {
		return config.serverAddress + config.downloadDirSuffix + this.filename;
	});

	/**
    * Model: User
    */

	function validatePresenceOf(value) {
		return value && value.length;
	}

	function toLower(v) {
		return v.toLowerCase();
	}

	User = new Schema({
		'email': {
			type: String,
			set: toLower,
			validate: [validatePresenceOf, 'an email is required'],
			index: {
				unique: true
			}
		},
		'name': String,
		'hashed_password': String,
		'salt': String,
		'creation_date': {
			type: Date,
		default:
			Date.now
		},
	});

	User.virtual('id').get(function() {
		return this._id.toHexString();
	});

	User.virtual('password').set(function(password) {
		this._password = password;
		this.salt = this.makeSalt();
		this.hashed_password = this.encryptPassword(password);
	}).get(function() {
		return this._password;
	});

	User.method('authenticate', function(plainText) {
		return this.encryptPassword(plainText) === this.hashed_password;
	});

	User.method('makeSalt', function() {
		return Math.round((new Date().valueOf() * Math.random())) + '';
	});

	User.method('encryptPassword', function(password) {
		return crypto.createHmac('sha1', this.salt).update(password).digest('hex');
	});

	User.pre('save', function(next) {
		if (!validatePresenceOf(this.password)) {
			next(new Error('Invalid password'));
		} else {
			next();
		}
	});

	mongoose.model('Download', Download);
	mongoose.model('User', User);

	fn();
}

exports.defineModels = defineModels;

