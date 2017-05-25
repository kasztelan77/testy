//all this mongoose stuff will go once all is rewritten to use neo4j and any fereneces to this cleaned
// *** this should be removed one all is transferred to neo4j
var mongoose = require('mongoose');
var levelSchema = new mongoose.Schema({
	name: String,
	equivalent_levels: [String]
});
mongoose.model('Level', levelSchema);
// all the way to here ***

var db = require('../config/db');
var Utils = require('util');
var ShortId = require('shortid');

// private constructor:
var Level = module.exports = function Level(_node) {
	this._node = _node;
}

// creates the level and persists it to the db, incl. indexing it
// we should set the creator and probably many other attributes
Level.create = function (ownerId, data, callback) {
	console.log('user ' + ownerId + ' creating level; data: ' + Utils.inspect(data));
	var qp = {
		query: [
			'CREATE (level:Level {data})',
			'RETURN level',
		].join('\n'),
		params: {
			data: data,
			ownerId: ownerId
		}
	}
	db.cypher(qp, function (err, results) {
		if (err) {
			console.log('Level.create error:' + err);
			return callback(err);
		}
		console.log('no error; results: ' + Utils.inspect(results));
		callback(null, results[0]['level']);
	});
};

Level.update = function (id, data, callback) {
	var qp = {
		query: [
			'MATCH (level:Level)',
			'WHERE level.id = {levelId}',
			'SET level += {props}',
			'RETURN level',
		].join('\n'),
		params: {
			levelId: id,
			props: data,
		}
	}

	db.cypher(qp, function (err, results) {
		if (err) {
			console.log('Level.update error:' + err);
			return callback(err);
		}
		callback(null, results[0]['level']);
	});
}

Level.get = function (id, callback) {
	var qp = {
		query: [
			'MATCH (level:Level)',
			'WHERE level.id = {levelId}',
			'RETURN level',
		].join('\n'),
		params: {
			levelId: parseInt(id)
		}
	}

	db.cypher(qp, function (err, result) {
		if (err) {
			console.log('Level.get error:' + err);
			return callback(err);
		}
		callback(null, result[0]['level']);
	});
};

//get all, for small values of all
Level.getAll = function (callback) {
	var qp = {
		query: [
			'MATCH (level:Level)',
			'RETURN level',
			'LIMIT 100'
		].join('\n')
	}

	db.cypher(qp, function (err, result) {
		if (err) {
			console.log('Level.getAll error:' + err);
			return callback(err);
		}
		callback(null, result);
	});
};

Level.getBy = function (field, value, callback) {
	console.log('in Level.getBy; field: ' + field + ', value: ' + value);
	var qp = {
		query: [
			'MATCH (level:Level)',
			'WHERE level.' + field + ' = {value}',
			'RETURN level',
		].join('\n'),
		params: {
			value: value
		}
	}

	db.cypher(qp, function (err, result) {
		if (err) {
			console.log('Level.getBy error:' + err + '; field: ' + field + ' value: ' + value);
			return callback(err);
		}
		if (!result[0]) {
			console.log('returning null');
			callback(null, null);
		} else {
			console.log('level for ' + value + ' found, returning');
			callback(null, result);
		}
	});
}

Level.detachDeleteBy = function (field, value, callback) {
	console.log('in detachDeleteBy');
	var qp = {
		query: [
			'MATCH (level:Level)',
			'WHERE level.' + field + ' = {value}',
			'DETACH DELETE level',
		].join('\n'),
		params: {
			value: value
		}
	}

	db.cypher(qp, function (err) {
		if (err) {
			console.log('Level.detachDeleteBy error:' + err + '; field: ' + field + ' value: ' + value);
			return callback(err);
		} else {
			callback(null);
		}
	});
}
