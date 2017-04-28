var express = require('express');
var passport = require('passport');
//var accounts = require('../model/accounts');
var users = require('../model/users');
var mongoose = require('mongoose'); //mongo connection
Group = require('../model/groups'); //neo4j group handle

var router = express.Router();

var Util = require('util');
/* GET home page. */
router.get('/', function(req, res, next) {
	var myGroups = null;
	var myGroupNames = null;
	console.log('handling get /');
	if (req.user) {
/*
		Group.getBy('group.id', id, function(err, existingGroup) {
			// if there are any errors, return the error
	        if (err || !existingGroup) {
	          console.log(id + ' was not found');
	          res.status(404)
	          var err = new Error('Not Found');
	          err.status = 404;
	          res.format({
	              html: function(){
	                  next(err);
	              },
	              json: function(){
	                     res.json({message : err.status  + ' ' + err});
	               }
	          });
	        } else {
	        }
	    });
*/
		//pick groups with owner set to curent user's email
		/*
		mongoose.model('Group').find({"owner": req.user.properties.email}, function (err, myGroups) {
	        if (err) {
	          console.log("error: " + err);
	        } else {
	        	//sort groups
	          myGroups = myGroups.sort(function(a,b)
	          	{return a.name.toLowerCase() > b.name.toLowerCase()});
		      if (!myGroups || myGroups.length <= 0) {
		      	myGroups = null;
		      }
		      //select list with subscriptions to be accepted
		      var myGroupsWithSubscriptions = [];
			  for (var i in myGroups) {
			    if (myGroups[i].pending_subscriptions && myGroups[i].pending_subscriptions.length > 0) {
			      myGroupsWithSubscriptions.push(myGroups[i]);
			    }
			  }
			  if (myGroupsWithSubscriptions.length == 0) {
			  	myGroupsWithSubscriptions = null;
			  }
		      res.render('index', {
				title: 'New education',
				user: req.user.properties,
				myGroups: myGroups,
				myGroupsWithSubscriptions: myGroupsWithSubscriptions });
	        }
	      });
	      */
	    res.render('index', {
			title: 'New education',
			user : req.user.properties });
	} else {
		//TODO: FIX
		//this is wrong; we have no req.user here
		res.render('index', {
			title: 'New education',
			user : req.user });
	}
});

/* log in */
router.get('/login', function(req, res) {
	res.render('login', { user : req.user.properties });
});
router.post('/login', passport.authenticate('local-login', {
	successRedirect : '/',
	failureRedirect : '/', //same for now
	failureFlash : true
}));

/* log out */
router.get('/logout', function(req, res) {
	req.logout();
	res.redirect('/');
});

/* register a new user */
router.get('/register', function(req, res) {
	res.render('register', { });
});

router.post('/register', passport.authenticate('local-signup', {
	successRedirect : '/', //success and go to new profile?
	failureRedirect : '/', //back to main
	failureFlash : true
/*
	accounts.register(new accounts({ email : req.body.email }), req.body.password, function(err, account) {
		if (err) {
			return res.render('register', { account : account });
		}
*/
/*
	users.register(new users({ email : req.body.email, name: req.body.name }), req.body.password, function(err, user) {
		console.log('user ' + Util.inspect(user));
		if (err) {
			return res.render('register', { user : user });
		}
		passport.authenticate('local') (req, res, function () {
			res.redirect('/');
		});
	});
	*/
}));

/* reset pwd */


module.exports = router;
