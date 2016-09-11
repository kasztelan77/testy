var mongoose = require('mongoose');
var levelSchema = new mongoose.Schema({
	name: String,
	equivalent_levels: [String]
});
mongoose.model('Level', levelSchema);
