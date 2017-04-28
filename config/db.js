var mongoose = require('mongoose');
//transitionally, some stuff still comes from mongo
//mongoose.connect('mongodb://localhost/simple');
mongoose.connect('mongodb://heroku_bws0fjtq:gg0as2icfobmejbmfi4brkik0d@ds021026.mlab.com:21026/heroku_bws0fjtq');

var neo4j = require('neo4j');
var db = new neo4j.GraphDatabase(
	process.env['NEO4J_URL'] ||
	process.env['GRAPHENEDB_URL'] ||
	'http://localhost:7474'
);

module.exports = db;