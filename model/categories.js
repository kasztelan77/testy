var mongoose = require('mongoose');
var categorySchema = new mongoose.Schema({
	name: String,
	subcategories: [String]
});
mongoose.model('Category', categorySchema);
