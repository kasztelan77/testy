var mongoose = require('mongoose');
var testSchema = new mongoose.Schema({
	owner: String, // should it be a reference into users/educators?
	name: String,
	assigned: Date,
	due: Date,
	//questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }]
	// for the time being, an array of freeform strings
	questions: [ String ]
});
mongoose.model('Test', testSchema);
