var mongoose = require('mongoose');
var questionSchema = new mongoose.Schema({
	qn: String,
	type: String,
	categories: [String],
	levels: [String],
	answers: [String],
	answer_options: [String],
	hints: [String],
	links: [String],
	flags: [String],
	/*
	 * if we continue to use mongoDB, the creation time is included in _id, so this would be unnecessary; 
	 * keep it though, in case we switch to a different engine
	 */
	date_added: Date,
	date_modified: Date,
	reason_suspect: String
});

global.ValidQuestionTypes = ["multiple choice", "open", "closed", "yesno"];
global.AllValidFlags = ["unverified", "accepted", "review_requested", "owner_only", "premium", "public"];
global.SelectableFlags = ["review_requested", "owner_only", "premium", "public"];

mongoose.model('Question', questionSchema);
