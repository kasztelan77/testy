// user.js
// User model logic.
var bcrypt   = require('bcrypt-nodejs');
var db = require('../config/db');
var Group = require('../model/groups'); //neo4j group handle
var Utils = require('util');

// private constructor:
var User = module.exports = function User(_node) {
	// all we'll really store is the node; the rest of our properties will be
	// derivable or just pass-through properties (see below).
	this._node = _node;
}

// static methods:
User.get = function (id, callback) {
	//this is by node id? weird
	console.log('getting user by id ' + id);
	var qp = {
		query: [
			'MATCH (user:User)',
			'WHERE ID(user) = {userId}',
			'RETURN user',
		].join('\n'),
		params: {
			userId: parseInt(id)
		}
	}

	db.cypher(qp, function (err, result) {
		if (err) {
			console.log('User.get error:' + err);
			return callback(err);
		}
		callback(null, result[0]['user']);
	});
};

User.getAll = function (callback) {
	var qp = {
		query: [
			'MATCH (user:User)',
			'RETURN user',
			'LIMIT 100'
		].join('\n')
	}

	db.cypher(qp, function (err, result) {
		if (err) {
			console.log('User.getAll error:' + err);
			return callback(err);
		}
		//console.log(result);
		callback(null, result);
	});
};

User.getBy = function (field, value, callback) {
	var qp = {
		query: [
			'MATCH (user:User)',
			'WHERE user.' + field + ' = {value}',
			'RETURN user',
		].join('\n'),
		params: {
			value: value
		}
	}

	db.cypher(qp, function (err, result) {
		if (err) {
			console.log('User.getBy error:' + err + '; field: ' + field + ', value: ' + value);
			return callback(err);
		}
		if (!result[0]) {
			callback(null, null);
		} else {
			callback(null, result[0]['user']);
		}
	});
}

User.addUserGroupRelationship = function(relation, userId, groupId, callback) {
	console.log('setting relationship ' + relation + ' for user ' + userId + ' and group ' + groupId);
	switch (relation) {		
		//user owns a group
		case 'own':
			//this semantics allows ownership of a group by many users
			//if we don't want this, we would need to delete existing ownership relationships first
			var qp = {
				query: [
					'MATCH (user:User),(group:Group)',
					'WHERE user.id = {userId} AND group.id = {groupId}',
					'MERGE (user)-[rel:own]->(group)',
					'ON CREATE SET rel.timestamp = timestamp()',
					'RETURN rel'
				].join('\n'),
				params: {
					userId: userId,
					groupId: groupId,
				}
			}
		break;
		//user no longer owns a group
		case 'disown':
			//do we need this?
			//included for symmetry but I do not actually have a use for this right now
			var qp = {
				query: [
					'MATCH (user:User) -[rel:own]-> (group:Group)',
					'WHERE user.id = {userId} AND group.id = {groupId}',
					'DELETE rel'
				].join('\n'),
				params: {
					userId: userId,
					groupId: groupId,
				}
			}
		break;
		//request subscription to a group
		//it needs to be accepted (long term we should support public groups for which
		//anyone can subscribe and no acceptance is necessary; for such group we'd go straight
		//to a member_of relationship)
		//for now all subscriptions result in 'subscribed' relationship, which needs to be
		//accepted to be switched to member_of relationship
		case 'subscribe':
			var qp = {
				query: [
					'MATCH (user:User),(group:Group)',
					'WHERE user.id = {userId} AND group.id = {groupId}',
					'MERGE (user)-[rel:subscribed]->(group)',
					'ON CREATE SET rel.timestamp = timestamp()',
					'RETURN rel'
				].join('\n'),
				params: {
					userId: userId,
					groupId: groupId,
				}
			}
		break;
		//unsubscribe a user from a group
		case 'unsubscribe':
			//this currently removes the 'member_of' relationship, not 'subscribed'
			//it likely should do both (ie. allow unsubscribe between when subsription is requested and when it is accepted)?
			var qp = {
				query: [
					'MATCH (user:User) -[rel:member_of]-> (group:Group)',
					'WHERE user.id = {userId} AND group.id = {groupId}',
					'DELETE rel'
				].join('\n'),
				params: {
					userId: userId,
					groupId: groupId,
				}
			}
		break;
		//accept an invitation to a group
		case 'accept':
			//on accept, we set the 'accepted' relationship, set the relationships
			//user-[member_of]->group (and group-[contains]->user ?)
			//and delete the 'invited' relationship
			//we should delete invited_by as well, can we do it in one step?
			var qp = {
				query: [
					'MATCH (group:Group) -[relinv:invited]- (user:User)',
					'MATCH (user:User) -[relinvby:invited_by]- (group:Group)',
					'WHERE user.id = {userId} AND group.id = {groupId}',
					'WITH user, group, relinv, relinvby',
					'MERGE (user)-[rel1:accepted]->(group)',
					'MERGE (user)-[rel2:member_of]->(group)',
					'MERGE (group)-[rel3:contains]->(user)',
					'ON CREATE SET rel1.timestamp = timestamp()',
					'ON CREATE SET rel2.timestamp = timestamp()',
					'ON CREATE SET rel3.timestamp = timestamp()',
					'DELETE relinv',
					'DELETE relinvby',
					'RETURN rel2'
				].join('\n'),
				params: {
					userId: userId,
					groupId: groupId,
				}
			}
		break;
		//reject an invitation from a group
		case 'reject':
			//we could just delete the 'invited' relationship
			//but it may be useful to have the knowledege of who rejected and when
			var qp = {
				query: [
					'MATCH (group:Group) -[relinv:invited]- (user:User)',
					'MATCH (user:User) -[relinvby:invited_by]- (group:Group)',
					'WITH user, group, relinv, relinvby',
					'WHERE user.id = {userId} AND group.id = {groupId}',
					'MERGE (user)-[rel1:rejected]->(group)',
					'ON CREATE SET rel1.timestamp = timestamp()',
					'DELETE relinv',
					'DELETE relinvby',
					'RETURN rel1'
				].join('\n'),
				params: {
					userId: userId,
					groupId: groupId,
				}
			}
		break;
	}

	db.cypher(qp, function (err, result) {
		if (err) {
			console.log('User.addUserGroupRelationships error:' + err);
			return callback(err);
		}
		console.log('result' + result);
		callback(null, result);
	});
}

User.getUserRelationships = function(id, callback) {
	var qp = {
		query: [
			//'START n=node({userId})',
			'MATCH (n)-[r]-(m)',
			'WHERE n.id = {userId}',
			'RETURN n,r,m'
		].join('\n'),
		params: {
			userId: id
		}
	}

	db.cypher(qp, function (err, result) {
		if (err) {
			console.log('User.getUserRelationships error:' + err);
			return callback(err);
		}
		//wonder what this result looks like...
		callback(null, result);
	});
}

//eg. get groups owned by the user
User.getTargetsOfUserRelationship = function(id, relationship, callback) {
	console.log('getting targets of rel ' + relationship + ' for user id ' + id);
	var qp = {
		query: [
			//'START n=node({userId})',
			'MATCH (n)-[r:' + relationship + ']-(m)',
			'WHERE n.id = {userId}',
			'RETURN m'
		].join('\n'),
		params: {
			userId: id
		}
	}

	db.cypher(qp, function (err, result) {
		if (err) {
			console.log('User.getTargetsOfUserRelationship error:' + err);
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

//eg. get groups which invited the user
User.getSourcesOfUserRelationship = function(id, relationship, callback) {
	var qp = {
		query: [
			//'START m=node({userId})',
			'MATCH (n)-[r:' + relationship + ']-m',
			'WHERE m.id = {userId}',
			'RETURN n'
		].join('\n'),
		params: {
			userId: id
		}
	}

	db.cypher(qp, function (err, result) {
		if (err) {
			console.log('User.getSourcesOfUserRelationship error:' + err);
			return callback(err);
		}
		//project to remove the m-layer and get just the Nodes
        var projectedResult = result.map(function(item) {
            return item.n;
        });
		callback(null, projectedResult);
	});
}

// creates the user and persists (saves) it to the db, incl. indexing it:
User.create = function (data, callback) {
	var qp = {
		query: [
			'CREATE (user:User {data})',
			'RETURN user',
		].join('\n'),
		params: {
			data: data
		}
	}

	db.cypher(qp, function (err, results) {
		if (err) {
			console.log('User.create error:' + err);
			return callback(err);
		}
		callback(null, results[0]['user']);
	});
};

User.update = function (data, callback) {
	//we should remove data.props.id from the passed in data,
	//as current semantics allow id change, which is likely a very bad thing
	var qp = {
		query: [
			'MATCH (user:User)',
			'WHERE user.id = {userId}',
			'SET user += {props}',
			'RETURN user',
		].join('\n'),
		params: {
			userId: data.id,
			props: data.props,
		}
	}

	db.cypher(qp, function (err, results) {
		if (err) {
			console.log('User.update error:' + err);
			return callback(err);
		}
		callback(null, results[0]['user']);
	});
}

User.detachDeleteBy = function (field, value, callback) {
	console.log('in detachDeleteBy');
	var qp = {
		query: [
			'MATCH (user:User)',
			'WHERE user.' + field + ' = {value}',
			'DETACH DELETE user',
		].join('\n'),
		params: {
			value: value
		}
	}

	db.cypher(qp, function (err) {
		if (err) {
			console.log('User.detachDeleteBy error:' + err + '; field: ' + field + ' value: ' + value);
			return callback(err);
		}
	});
}

// generating a hash
User.generateHash = function(password, next) {
	return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null, next);
};

// checking if password is valid
User.validPassword = function(password, pass, next) {
	return bcrypt.compareSync(password, pass, next);
};