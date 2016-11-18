var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');

var userSchema = new mongoose.Schema({
	/*
	 * many more fields about a user are useful
	 * not spending much time on know-your-user logic, as hopefuly we're able to reuse a common module
	 */

	/*
	 * we'll use email/pwd for typical authentication
	 * passport-local strategy takes care of proper salting, hashing
	 * serializing and deserializing users (sans password hash)
	 * we need a way to link accounts when using facebook/twitter/google strategies
	 */
	name: String,
	email: String,
	password: String,
	avatar: String, // png? file path?
	roles: [String], // ?
	institution: String,
	reputation: String,

	alternate_emails: [String],
	groups: [ { type: mongoose.Schema.Types.ObjectId, res: 'id', status: String } ],
	group_invitations: [ { type: mongoose.Schema.Types.ObjectId, res: 'id', status: String } ],
	//just array of tuples of strings for now, until I figure out the references
	invites: [ { name: String, id: String} ],
	invites_ids: [String],

	/*
	 * we need to be able to assign a test, and a user can save (partially solved) or submit it (solved)
	 * so we need to track for each user: all assigned sets, and for each assigned test, whether an attempt
	 * to solve it has started and if so where it stands, and once it is submitted, status of solution
	 * to each question - answer, as well as whether hints were users and if so, how many.
	 * In addition, it would be nice if we could track how long the user spent on each question
	 * side note: I'm not even convinced that this is a right place to track this
	 *
	 * not yet sure if hints, links etc should be in this list, or pulled on request, put here for now
	 */
	assigned: [ { name: String, assigned_date: Date, due_date: Date,
		questions: [ { qn: String, type: String, answers: [String], answers_options: [String], hints: [String], links: [String]} ] }],
	saved: [ { name: String, saved_date: Date,
		questions: [ { qn: String, answers: [String], hints_used: [String]} ] }],
	submitted: [ { name: String, submitted_date: Date,
		questions: [ { qn: String, answers: [String], hints_used: [String]} ] }]
});

userSchema.plugin(passportLocalMongoose, {
	usernameField: 'email'});

module.exports = mongoose.model('User', userSchema);
