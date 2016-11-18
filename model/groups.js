var mongoose = require('mongoose');
var groupSchema = new mongoose.Schema({
	name: String,
	owner: String, // reference into users?
	
	//users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
	users: [String], //for now we'll put emails into these; consider if these should be ids, or id/email tuples?
	pending_subscriptions: [ { id: String, email: String} ],
	pending_invitations: [String],
	rejected_invitations: [String],
	
	//an array of test assignments
	//each assignment consists of the name, assignment date, due date, and an array of questions
	//in the future we'll probably want to extend it with additional properties such as eg weight, etc
	//note that it isn't a reference into the tests collection, but instead the questions are copied into
	//this list from a particular test at the time of assignment
	//this gives the owner a flexibility to modify their tests, or we or them can delete a test etc
	//without worry here about coherency and eg an assigned test changing on a user/group day to day
	//with the copy at the time of assignment the semantics is clear - the assignment is valid and makes sense
	//at the time when it is assigned; what hapens to the test being assigned afterwards is irrelevant
	//the drawback is that we have to make sure that the questions specification matches that of the Question model 
	//not sure if monboDB/mongoose has a way to specify a model reference here, and if it does if we want to use it
	//(as we don't want some fields such as flags, suspect handling, etc)
	assigned: [ { name: String, assigned_date: Date, due_date: Date,
		questions: [ { qn: String, type: String, answers: [String], answers_options: [String], hints: [String], links: [String]} ] }]
});
mongoose.model('Group', groupSchema);
