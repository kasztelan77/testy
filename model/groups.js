var mongoose = require('mongoose');
var groupSchema = new mongoose.Schema({
	name: String,
	owner: String, // reference into users?
	users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});
mongoose.model('Group', groupSchema);
