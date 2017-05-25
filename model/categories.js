//all this mongoose stuff will go once all is rewritten to use neo4j and any fereneces to this cleaned
// *** this should be removed one all is transferred to neo4j
var mongoose = require('mongoose');
var categorySchema = new mongoose.Schema({
	name: String,
	subcategories: [String]
});
mongoose.model('Category', categorySchema);
// all the way to here ***

var db = require('../config/db');
var Utils = require('util');
var ShortId = require('shortid');

// private constructor:
var Category = module.exports = function Category(_node) {
	this._node = _node;
}

// creates the category and persists it to the db, incl. indexing it
// we should set the creator and probably many other attributes
Category.create = function (ownerId, data, callback) {
	console.log('user ' + ownerId + ' creating category; data: ' + Utils.inspect(data));
	var qp = {
		query: [
			'CREATE (category:Category {data})',
			'RETURN category',
		].join('\n'),
		params: {
			data: data,
			ownerId: ownerId
		}
	}
	db.cypher(qp, function (err, results) {
		if (err) {
			console.log('Category.create error:' + err);
			return callback(err);
		}
		console.log('no error; results: ' + Utils.inspect(results));
		callback(null, results[0]['category']);
	});
};

Category.update = function (id, data, callback) {
	var qp = {
		query: [
			'MATCH (category:Category)',
			'WHERE category.id = {categoryId}',
			'SET category += {props}',
			'RETURN category',
		].join('\n'),
		params: {
			categoryId: id,
			props: data,
		}
	}

	db.cypher(qp, function (err, results) {
		if (err) {
			console.log('Category.update error:' + err);
			return callback(err);
		}
		callback(null, results[0]['category']);
	});
}

Category.get = function (id, callback) {
	var qp = {
		query: [
			'MATCH (category:Category)',
			'WHERE category.id = {categoryId}',
			'RETURN category',
		].join('\n'),
		params: {
			categoryId: parseInt(id)
		}
	}

	db.cypher(qp, function (err, result) {
		if (err) {
			console.log('Category.get error:' + err);
			return callback(err);
		}
		callback(null, result[0]['category']);
	});
};

//get all, for small values of all
Category.getAll = function (callback) {
	var qp = {
		query: [
			'MATCH (category:Category)',
			'RETURN category',
			'LIMIT 100'
		].join('\n')
	}

	db.cypher(qp, function (err, result) {
		if (err) {
			console.log('Category.getAll error:' + err);
			return callback(err);
		}
		callback(null, result);
	});
};

Category.getBy = function (field, value, callback) {
	console.log('in Category.getBy; field: ' + field + ', value: ' + value);
	var qp = {
		query: [
			'MATCH (category:Category)',
			'WHERE category.' + field + ' = {value}',
			'RETURN category',
		].join('\n'),
		params: {
			value: value
		}
	}

	db.cypher(qp, function (err, result) {
		if (err) {
			console.log('Category.getBy error:' + err + '; field: ' + field + ' value: ' + value);
			return callback(err);
		}
		if (!result[0]) {
			console.log('returning null');
			callback(null, null);
		} else {
			console.log('category for ' + value + ' found, returning');
			callback(null, result);
		}
	});
}

Category.detachDeleteBy = function (field, value, callback) {
	console.log('in detachDeleteBy');
	var qp = {
		query: [
			'MATCH (category:Category)',
			'WHERE category.' + field + ' = {value}',
			'DETACH DELETE category',
		].join('\n'),
		params: {
			value: value
		}
	}

	db.cypher(qp, function (err) {
		if (err) {
			console.log('Category.detachDeleteBy error:' + err + '; field: ' + field + ' value: ' + value);
			return callback(err);
		} else {
			callback(null);
		}
	});
}
