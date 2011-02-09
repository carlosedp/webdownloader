var mongoose = require('mongoose');

var Download = new mongoose.Schema({
    'filename' : String,
    'filesize' : Number,
    'url'      : String,
    'date'     : Date,
    'localpath': String,
    'hash'     : String,
    'refs'     : Number
});

function validatePresenceOf(value) {
    return value && value.length;
}

var User = new Schema({
    'email': { type: String, validate: [validatePresenceOf, 'an email is required'], index: { unique: true } },
    'hashed_password': String,
    'salt': String,
    'creation_date' : Date
});


mongoose.model('Download', Download);
mongoose.model('User', User);

