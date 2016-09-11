var mongoose = require('mongoose');
var userSchema = new mongoose.Schema({
	/*
	 * many more fields about a user are useful
	 * not spending much time on know-your-user logic, as hopefuly we're able to reuse a common module
	 */
	name: String,
	pwdHash: String,
	email: [String],
	/*
	 * Below section is incomplete;
	 * we need to be able to assign a test, and a user can save (partially solved) or submit it (solved)
	 * so we need to track for each user: all assigned sets, and for each assigned test, whether an attempt
	 * to solve it has started and if so where it stands, and once it is submitted, status of solution
	 * to each question - answer, as well as whether hints were users and if so, how many.
	 * In addition, it would be nice if we could track how long the user spent on each question
	 * side note: I'm not even convinced that this is a right place to track this
	 */
	//assigned: [ {type: Schema.Types.ObjectId, ref: 'Test', status: String } ],
	//saved: [ {type: Schema.Types.ObjectId, ref: 'Test', status: String } ],
	//submitted: [ {type: Schema.Types.ObjectId, ref: 'Test', status: String } ]
});
mongoose.model('User', userSchema);
