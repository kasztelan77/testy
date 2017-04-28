// *** this should be removed one all is transferred to neo4j
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
// all the way to here ***

var db = require('../config/db');
var Utils = require('util');

// private constructor:
var Group = module.exports = function Group(_node) {
	this._node = _node;
}

// creates the group and persists it to the db, incl. indexing it:
Group.create = function (ownerId, data, callback) {
	console.log('user ' + ownerId + ' creating group; data: ' + Utils.inspect(data));
	var qp = {
		query: [
			'MATCH (user:User) WHERE user.id = {ownerId}',
			'CREATE (group:Group {data})',
			'MERGE (user)-[rel:own]->(group)',
			'RETURN group',
		].join('\n'),
		params: {
			data: data,
			ownerId: ownerId
		}
	}
	db.cypher(qp, function (err, results) {
		if (err) {
			console.log('Group.create error:' + err);
			return callback(err);
		}
		console.log('no error; results: ' + Utils.inspect(results));
		callback(null, results[0]['group']);
	});
};

Group.update = function (data, callback) {
	var qp = {
		query: [
			'MATCH (group:Group)',
			'WHERE group.id = {groupId}',
			'SET group += {props}',
			'RETURN group',
		].join('\n'),
		params: {
			groupId: data.id,
			props: data.props,
		}
	}

	db.cypher(qp, function (err, results) {
		if (err) {
			console.log('Group.update error:' + err);
			return callback(err);
		}
		callback(null, results[0]['group']);
	});
}

Group.get = function (id, callback) {
	var qp = {
		query: [
			'MATCH (group:Group)',
			'WHERE group.id = {groupId}',
			'RETURN group',
		].join('\n'),
		params: {
			groupId: parseInt(id)
		}
	}

	db.cypher(qp, function (err, result) {
		if (err) {
			console.log('Group.get error:' + err);
			return callback(err);
		}
		callback(null, result[0]['group']);
	});
};

Group.getAll = function (callback) {
	var qp = {
		query: [
			'MATCH (group:Group)',
			'RETURN group',
			'LIMIT 100'
		].join('\n')
	}

	db.cypher(qp, function (err, result) {
		if (err) {
			console.log('Group.getAll error:' + err);
			return callback(err);
		}
		callback(null, result);
	});
};

//get all groups which
//1) are not owned by 'email'
//2) 'email' has not subscribed to given group
Group.getSubscribable = function (email, callback) {
	var qp = {
		query: [
			'MATCH (group:Group),(user:User)',
			//'WHERE (user.email = {email} AND group.owner <> {email} AND NOT ((user)-[:subscribed]->(group)))',
			'WHERE (user.email = {email} AND NOT ((user)-[:own]->(group)) AND NOT ((user)-[:subscribed]->(group)))',
			'RETURN group',
			'LIMIT 100'
		].join('\n'),
		params: {
			email: email
		}
	}

	db.cypher(qp, function (err, result) {
		if (err) {
			console.log('Group.getSubscribable error:' + err);
			return callback(err);
		}
		callback(null, result);
	});
};

Group.getBy = function (field, value, callback) {
	console.log('in Group.getBy; field: ' + field + ', value: ' + value);
	var qp = {
		query: [
			'MATCH (group:Group)',
			'WHERE group.' + field + ' = {value}',
			'RETURN group',
		].join('\n'),
		params: {
			value: value
		}
	}

	db.cypher(qp, function (err, result) {
		if (err) {
			console.log('Group.getBy error:' + err + '; field: ' + field + ' value: ' + value);
			return callback(err);
		}
		if (!result[0]) {
			console.log('returning null');
			callback(null, null);
		} else {
			console.log('group found, returning');
			callback(null, result[0]['group']);
		}
	});
}

Group.detachDeleteBy = function (field, value, callback) {
	console.log('in detachDeleteBy');
	var qp = {
		query: [
			'MATCH (group:Group)',
			'WHERE group.' + field + ' = {value}',
			'DETACH DELETE group',
		].join('\n'),
		params: {
			value: value
		}
	}

	db.cypher(qp, function (err) {
		if (err) {
			console.log('Group.detachDeleteBy error:' + err + '; field: ' + field + ' value: ' + value);
			return callback(err);
		}
	});
}

Group.addGroupUserRelationshipByUserField = function(relation, groupId, field, userFieldValue, callback) {
	switch (relation) {
		//invite a user to a group
		case 'invite':
			console.log('setting relationship ' + relation + ' for group id ' + groupId + ' and user identified by ' + field + ': ' + userFieldValue);		
			var qp = {
				query: [
					'MATCH (group:Group),(user:User)',
					'WHERE group.id = {groupId} AND user.' + field + ' = {userFieldValue}',
					'MERGE (group)-[rel1:invited]->(user)',
					'MERGE (user)-[rel2:invited_by]->(group)',
					'ON CREATE SET rel1.timestamp = timestamp()',
					'ON CREATE SET rel2.timestamp = timestamp()',
					'RETURN rel1'
				].join('\n'),
				params: {
					groupId: groupId,
					userFieldValue: userFieldValue,
				}
			}
		break;
		//remove a user from a group
		case 'remove':
			//this removes the 'member_of' relationship
			//should it also handle 'invited' (ie. allow remove between when the invitation was made and when it is accepted)?
			//there should be a better way fot this two-way MATCH specification, but for now this should do
			var qp = {
				query: [
					'MATCH (user:User) -[rel:member_of]-> (group:Group), (group:Group) -[rel1:contains]-> (user:User)',
					'WHERE user.' + field + ' = {userFieldValue} AND group.id = {groupId}',
					'DELETE rel',
					'DELETE rel1'
				].join('\n'),
				params: {
					userFieldValue: userFieldValue,
					groupId: groupId,
				}
			}
		break;
		//accept user subscription to a group
		case 'accept':
			//on accept, we set the 'accepted' relationship, set the relationships
			//user-[member_of]->group and group-[contains]->user
			//and delete the 'subscribed' relationship
			//
			//would it be useful to keep the original subscription information
			var qp = {
				query: [
					'MATCH (user:User) -[rel:subscribed]-> (group:Group)',
					'WHERE user.' + field + ' = {userFieldValue} AND group.id = {groupId}',
					'WITH user, group, rel',
					'MERGE (group)-[rel1:accepted]->(user)',
					'MERGE (user)-[rel2:member_of]->(group)',
					'MERGE (group)-[rel3:contains]->(user)',
					'ON CREATE SET rel1.timestamp = timestamp() AND rel2.timestamp = timestamp() AND rel3.timestamp = timestamp()',
					'DELETE rel',
					'RETURN rel2'
				].join('\n'),
				params: {
					userFieldValue: userFieldValue,
					groupId: groupId,
				}
			}
		break;
		case 'reject':
			//reject user subscription to a group
			//we could just delete the 'subscribed' relationship
			//but it may be useful to have the knowledege of who rejected and when
			var qp = {
				query: [
					'MATCH (user:User) -[rel:subscribed]-> (group:Group)',
					'WITH user, group, rel',
					'WHERE user.' + field + ' = {userFieldValue} AND group.id = {groupId}',
					'MERGE (group)-[rel1:rejected]->(user)',
					'ON CREATE SET rel1.timestamp = timestamp()',
					'DELETE rel',
					'RETURN rel1'
				].join('\n'),
				params: {
					userFieldValue: userFieldValue,
					groupId: groupId,
				}
			}
		break;
	}

	db.cypher(qp, function (err, result) {
		if (err) {
			console.log('Group.addGroupUserRelationships error:' + err);
			return callback(err);
		}
		console.log('result of query ' + qp + ' : ' + result + '.');
		callback(null, result);
	});
}

//eg. users contained by this group
Group.getTargetsOfGroupRelationship = function(id, relationship, callback) {
	console.log('getting targets of rel ' + relationship + ' for group id ' + id);
	var qp = {
		query: [
			//'START n=node({userId})',
			'MATCH (n)-[r:' + relationship + ']-(m)',
			'WHERE n.id = {groupId}',
			'RETURN m'
		].join('\n'),
		params: {
			groupId: id
		}
	}

	db.cypher(qp, function (err, result) {
		if (err) {
			console.log('Group.getTargetsOfGroupRelationship error:' + err);
			return callback(err);
		}
		//project to remove the m-layer and get just the Nodes
		//neo4j still confuses me in how inconsistently it treats the nodes
        var projectedResult = result.map(function(item) {
            return item.m;
        });
		callback(null, projectedResult);
	});
}

//eg. get users who subscribe to this group
Group.getSourcesOfGroupRelationship = function(id, relationship, callback) {
	var qp = {
		query: [
			//'START m=node({userId})',
			'MATCH (n)-[r:' + relationship + ']-m',
			'WHERE m.id = {groupId}',
			'RETURN n'
		].join('\n'),
		params: {
			groupId: id
		}
	}

	db.cypher(qp, function (err, result) {
		if (err) {
			console.log('Group.getSourcesOfGroupRelationship error:' + err);
			return callback(err);
		}
		//project to remove the m-layer and get just the Nodes
        var projectedResult = result.map(function(item) {
            return item.n;
        });
		callback(null, projectedResult);
	});
}

Group.getGroupRelationships = function(id, callback) {
	var qp = {
		query: [
			'START n=node({groupId})',
			'MATCH n-[r]-(m)',
			'RETURN n,r,m'
		].join('\n'),
		params: {
			groupId: id
		}
	}

	db.cypher(qp, function (err, result) {
		if (err) {
			console.log('Group.getGroupRelationships error:' + err);
			return callback(err);
		}
		callback(null, result);
	});
}
