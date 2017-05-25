//all this mongoose stuff will go once all is rewritten to use neo4j and any fereneces to this cleaned
// *** this should be removed one all is transferred to neo4j
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

mongoose.model('Question', questionSchema);
// all the way to here ***

global.ValidQuestionTypes = ["multiple choice", "open", "closed", "yesno"];
global.AllValidFlags = ["unverified", "accepted", "review_requested", "owner_only", "premium", "public"];
global.SelectableFlags = ["review_requested", "owner_only", "premium", "public"];

var db = require('../config/db');
var Utils = require('util');
var ShortId = require('shortid');

// private constructor:
var Question = module.exports = function Question(_node) {
	this._node = _node;
}

// creates the question and persists it to the db, incl. indexing it
// we should set the creator and probably many other attributes
Question.create = function (ownerId, data, callback) {
	console.log('user ' + ownerId + ' creating question; data: ' + Utils.inspect(data));
	var qp = {
		query: [
			'CREATE (question:Question {data})',
			'RETURN question',
		].join('\n'),
		params: {
			data: data,
			ownerId: ownerId
		}
	}
	db.cypher(qp, function (err, results) {
		if (err) {
			console.log('Question.create error:' + err);
			return callback(err);
		}
		console.log('no error; results: ' + Utils.inspect(results));
		callback(null, results[0]['question']);
	});
};

Question.update = function (id, data, callback) {
	var qp = {
		query: [
			'MATCH (question:Question)',
			'WHERE question.id = {questionId}',
			'SET question += {props}',
			'RETURN question',
		].join('\n'),
		params: {
			questionId: id,
			props: data,
		}
	}

	db.cypher(qp, function (err, results) {
		if (err) {
			console.log('Question.update error:' + err);
			return callback(err);
		}
		callback(null, results[0]['question']);
	});
}

Question.get = function (id, callback) {
	var qp = {
		query: [
			'MATCH (question:Question)',
			'WHERE question.id = {questionId}',
			'RETURN question',
		].join('\n'),
		params: {
			questionId: parseInt(id)
		}
	}

	db.cypher(qp, function (err, result) {
		if (err) {
			console.log('Question.get error:' + err);
			return callback(err);
		}
		callback(null, result[0]['question']);
	});
};

//get all, for small values of all
Question.getAll = function (callback) {
	var qp = {
		query: [
			'MATCH (question:Question)',
			'RETURN question',
			'LIMIT 100'
		].join('\n')
	}

	db.cypher(qp, function (err, result) {
		if (err) {
			console.log('Question.getAll error:' + err);
			return callback(err);
		}
		callback(null, result);
	});
};

Question.getBy = function (field, value, callback) {
	console.log('in Question.getBy; field: ' + field + ', value: ' + value);
	var qp = {
		query: [
			'MATCH (question:Question)',
			'WHERE question.' + field + ' = {value}',
			'RETURN question',
		].join('\n'),
		params: {
			value: value
		}
	}

	db.cypher(qp, function (err, result) {
		if (err) {
			console.log('Question.getBy error:' + err + '; field: ' + field + ' value: ' + value);
			return callback(err);
		}
		if (!result[0]) {
			console.log('returning null');
			callback(null, null);
		} else {
			console.log('question for ' + value + ' found, returning');
			callback(null, result);
		}
	});
}

Question.detachDeleteBy = function (field, value, callback) {
	console.log('in detachDeleteBy');
	var qp = {
		query: [
			'MATCH (question:Question)',
			'WHERE question.' + field + ' = {value}',
			'DETACH DELETE question',
		].join('\n'),
		params: {
			value: value
		}
	}

	db.cypher(qp, function (err) {
		if (err) {
			console.log('Question.detachDeleteBy error:' + err + '; field: ' + field + ' value: ' + value);
			return callback(err);
		} else {
			callback(null);
		}
	});
}