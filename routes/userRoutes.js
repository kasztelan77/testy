var express = require('express'),
    router = express.Router(),
    mongoose = require('mongoose'), //mongo connection
    bodyParser = require('body-parser'), //parses information from POST
    methodOverride = require('method-override'), //used to manipulate POST
    User = require('../model/user'); //neo4j user handle

router.use(bodyParser.urlencoded({ extended: true }))
router.use(methodOverride(function(req, res){
      if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        // look in urlencoded POST bodies and delete it
        var method = req.body._method
        delete req.body._method
        return method
      }
}))

var Util = require('util');
//build the REST operations at the base for users
//this will be accessible from http://127.0.0.1:3000/users if the default route for / is left unchanged
router.route('/')
    //GET all users
    .get(function(req, res, next) {
        //retrieve all users from Mongo
        //mongoose.model('User').find({}, function (err, users) {
        //retrieve all users from neo4j
        User.getAll(function(err, users) {
              if (err) {
                  return console.error(err);
              } else {
                  //respond to both HTML and JSON. JSON responses require 'Accept: application/json;' in the Request Header
                  var loggedUser = null;
                  if (req.user) {
                    loggedUser = req.user.properties;
                  }
                  //project just the user properties part to remove neo4j-ness
                  var projectedUserProperties = users.map(function(user) {
                    return user.user.properties;
                  });
                  res.format({
                    //HTML response will render the index.jade file in the views/users folder. We are also setting "users" to be an accessible variable in our jade view
                    html: function(){
                        res.render('users/index', {
                              title: 'All users',
                              "users" : projectedUserProperties,
                              "user": loggedUser
                          });
                    },
                    //JSON response will show all users in JSON format
                    json: function(){
                        res.json(users);
                    }
                });
              }     
        });
    })
    //POST a new user
    .post(function(req, res) {
        // Get values from POST request. These can be done through forms or REST calls. These rely on the "name" attributes for forms
        var name = req.body.name;
        var email = req.body.email;
        //call the create function for our database
        mongoose.model('User').create({
            name : name,
            email : email
        }, function (err, user) {
              if (err) {
                  res.send("There was a problem adding the information to the database.");
              } else {
                  //user has been created
                  console.log('POST creating new user: ' + user);
                  res.format({
                      //HTML response will set the location and redirect back to the home page. You could also create a 'success' page if that's your thing
                    html: function(){
                        // If it worked, set the header so the address bar doesn't still say /adduser
                        res.location("users");
                        // And forward to success page
                        res.redirect("/users");
                    },
                    //JSON response will show the newly created user
                    json: function(){
                        res.json(user);
                    }
                });
              }
        })
    });

/* GET New users page. */
router.get('/new', function(req, res) {
    res.render('users/new', { title: 'Add New user' });
});

// route middleware to validate :id
router.param('id', function(req, res, next, id) {
    console.log('validating ' + id + ' exists');
    //find the ID in the Database
    User.getBy('user.id', id, function(err, existingUser) {
        // if there are any errors, return the error
        if (err || !existingUser) {
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
          console.log(id + ' was found');
          //user found; set the validated fields
          req.id = id;
          req.userById = existingUser;
          // go to the next thing
          next(); 
        }
    });
});

// route middleware to validate :inviteid (in users/:id/invitations/:inviteid routes)
router.param('inviteid', function(req, res, next, inviteid) {
    //console.log('validating ' + id + ' exists');
    //find the ID in the Database
    //mongoose.model('Group').findById(inviteid, function (err, group) {
    Group.getBy('id', inviteid, function(err, existingGroup) {
        //if it isn't found, we are going to repond with 404
        if (err) {
            console.log(inviteid + ' was not found');
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
        //if it is found we continue on
        } else {
            //uncomment this next line if you want to see every JSON document response for every GET/PUT/DELETE call
            //console.log(user);
            // once validation is done save the new item in the req
            req.inviteid = inviteid;
            req.groupByInviteid = existingGroup.properties;
            // go to the next thing
            next(); 
        }
    });
});

router.route('/:id')
  .get(function(req, res) {
    res.format({
        html: function(){
            res.render('users/show', {
              "user" : req.userById.properties
            });
        },
        json: function(){
            res.json(req.userById.properties);
        }
      });

/*
    mongoose.model('User').findById(req.id, function (err, user) {
      if (err) {
        console.log('GET Error: There was a problem retrieving: ' + err);
      } else {
        console.log('GET Retrieving ID: ' + user._id);
        res.format({
          html: function(){
              res.render('users/show', {
                "user" : user
              });
          },
          json: function(){
              res.json(user);
          }
        });
      }
    });
    */
  });

//GET the individual user by Mongo ID
router.get('/:id/edit', function(req, res) {
    //search for the user within Mongo
    mongoose.model('User').findById(req.id, function (err, user) {
        if (err) {
            console.log('GET Error: There was a problem retrieving: ' + err);
        } else {
            //Return the user
            console.log('GET Retrieving ID: ' + user._id);
            res.format({
                //HTML response will render the 'edit.jade' template
                html: function(){
                       res.render('users/edit', {
                          title: 'user' + user._id,
                          "user" : user
                      });
                 },
                 //JSON response will return the JSON output
                json: function(){
                       res.json(user);
                }
            });
        }
    });
});

//PUT to update a user by ID
router.put('/:id/edit', function(req, res) {
    // Get our REST or form values. These rely on the "name" attributes
    var name = req.body.name;
    var email = req.body.email;

   //find the document by ID
        mongoose.model('User').findById(req.id, function (err, user) {
            //update it
            user.update({
                name : name,
                email : email
            }, function (err, userID) {
              if (err) {
                  res.send("There was a problem updating the information to the database: " + err);
              } 
              else {
                      //HTML responds by going back to the page or you can be fancy and create a new view that shows a success page.
                      res.format({
                          html: function(){
                               res.redirect("/users/" + user._id);
                         },
                         //JSON responds showing the updated values
                        json: function(){
                               res.json(user);
                         }
                      });
               }
            })
        });
});

//DELETE a user by ID
router.delete('/:id/edit', function (req, res){
    //find user by ID
    //mongoose.model('User').findById(req.id, function (err, user) {
    console.log('DELETE removing ID: ' + req.id);
    User.detachDeleteBy('id', req.id, function(err, deletedUser) {
        if (err) {
            return console.error(err);
        } else {
          res.format({
            //HTML returns us back to the main page, or you can create a success page
            html: function(){
              res.redirect("/users");
            },
            //JSON returns the item with the message that is has been deleted
            json: function(){
              res.json({message : 'deleted',
                item : user
              });
            }
          });
        }
    });
});

//GET the groups owned by this user
router.get('/:id/groups', function(req, res) {
    //search for the groups with owner:user.email within Mongo
    if (req.user) {
      console.log('executing query for groups owned by ' + req.user.properties.email + ' id: ' + req.id);
      //User.getBy('user.id', id, function(err, existingUser) {
      //User.getTargetsOfUserRelationship = function(id, relationship, callback)
      //mongoose.model('Group').find({"owner": req.user.email}, function (err, myGroups) {
      User.getTargetsOfUserRelationship(req.id, 'own', function(err, myGroups) {
          if (err) {
            console.log("error: " + err);
          } else {     
            //sort and project just the properties part to remove neo4j-ness
            myGroups = myGroups.map(function(group) {
              return group.properties;
            }).sort(function(a,b) {
              return a.name.toLowerCase() > b.name.toLowerCase();
            });
            if (!myGroups || myGroups.length <= 0) {
              myGroups = [];
            }
            res.render('users/groups', {
              title: 'Groups owned by ' + req.user.properties.name,
              user : req.user,
              myGroups: myGroups });
          }
      });
    } else {
      res.render('users/groups', {});
    }
});

//GET the group invitations active for this user
router.get('/:id/invitations', function(req, res) {
    //should we search for the groups with owner:user.email within Mongo?
    //find the targets of invited_by relationship for this user
    //form the array of tuples [<group_name, group_id>]
    if (req.user) {
      var invites = null;
      User.getTargetsOfUserRelationship(req.id, 'invited_by', function(err, groups) {
        if (err) {
          console.log("error: " + err);
          res.render('/', {
          });
        } else {     
          //sort and project just the properties part to remove neo4j-ness
            groups = groups.map(function(group) {
            return group.properties;
          }).sort(function(a,b) {
            return a.name.toLowerCase() > b.name.toLowerCase();
          });
          if (!groups || groups.length <= 0) {
            groups = [];
          } else {
            //form array of name,id tuples
            invites = groups.map(function(group) {
              return {
                name: group.name,
                id: group.id
              };
            });
          }
          res.render('users/invitations', {
            title: 'Active group invitations for ' + req.userById.properties.email,
            user : req.user.properties,
            invites: invites });
        }
      });
    } else {
      res.render('/', {
      });
    }
});

//GET a single group invitation for this user
//do we need this???
router.get('/:id/invitations/:inviteid', function(req, res) {
    //search for the groups with owner:user.email within Mongo
    if (req.user /* && authorize_operation() */) {
      res.render('users/invitation', {
        title: 'Invitations for ' + req.userById.email + ' to group ' + req.groupById.name + '(' + req.inviteid + ')',
        user : req.user,
        invites: req.userById.invites });
    } else {
      res.render('/', {
      });
    }
});

//POST on :inviteid/accept to accept group invitation
router.post('/:id/invitations/:inviteid/accept', function(req, res) {
    //process invitation
    //push the user to the list of users in the group
    //pop the invite from our list of invitations
    //pop the invite from group's list of active invites
    //NOTE! the whole operation is not atomic
    //should have rollback in case of an error, otherwise we can get inconsistencies
    if (req.groupByInviteid && req.userById && req.user /* && authorize_operation() */) {
      console.log('processing invite accept for user id ' + req.id + ' by group ' + req.inviteid);
      /*
      //update it
      req.groupByInviteid.update(
      {
        $addToSet: {
          users : req.userById.email
        },
        $pull: {
          pending_invitations : req.userById.email
        }
      }, function (err, groupID) { //what do I get on success?
        if (err) {
          res.send("There was a problem updating the information to the database: " + err);
        } 
        else {
          req.userById.update(
          {
            $pull: {
              invites : {
                id: req.groupByInviteid.id,
                name: req.groupByInviteid.name
              }
            }
          }, function (err, id) {
            if (err) {
              res.send("There was a problem updating the information to the database: " + err);
            } else {
              res.redirect('back');
            } 
          })
        }
      })
      */
      User.addUserGroupRelationship('accept', req.id, req.inviteid, function(err) {
        if (err) {
          res.send("There was a problem updating the information to the database: " + err);
        } else {
          res.redirect('back');
        }
      });
    } else {
      res.render('/', {
      });
    }
});

//POST on :inviteid/reject to reject group invitation
router.post('/:id/invitations/:inviteid/reject', function(req, res) {
    //process invitation
    //pop the invite from our list of invitations
    //pop the invite from group's list of active invites
    if (req.groupByInviteid && req.userById && req.user /* && authorize_operation() */) {
      console.log('processing invite reject for user id ' + req.id + ' by group ' + req.inviteid);
      /*
      //update it
      req.groupByInviteid.update(
      {
        $addToSet: {
          rejected_invitations : req.userById.email
        },
        $pull: {
          pending_invitations : req.userById.email
        }
      }, function (err, groupID) { //what do I get on success?
        if (err) {
          res.send("There was a problem updating the information to the database: " + err);
        } 
        else {
          req.userById.update(
          {
            $pull: {
              invites : {
                id: req.groupByInviteid.id,
                name: req.groupByInviteid.name
              }
            }
          }, function (err, id) {
            if (err) {
              res.send("There was a problem updating the information to the database: " + err);
            } else {
              res.redirect('back');
            } 
          })
        }
      })
      */
      User.addUserGroupRelationship('reject', req.id, req.inviteid, function(err) {
        if (err) {
          res.send("There was a problem updating the information to the database: " + err);
        } else {
          res.redirect('back');
        }
      });
    } else {
      res.render('/', {
      });
    }
});

//GET the groups owned by this user which have subscriptions waiting to be accepted
router.get('/:id/waiting_subscriptions', function(req, res) {
    //search for the groups with owner:userById.email within Mongo
    //note that userById is the user referenced by :id, not necessarily req.user
    //ie someone else, eg admin, can use this endpoint to process these subscriptions
    //this means we should do authorization on req.user
    if (req.userById && req.userById.email /*&& authorize(req.user)*/) {
      mongoose.model('Group').find(
        {
          "owner": req.userById.email,
          "pending_subscriptions": { $exists: true, $gt: [] }
        }, function (err, waitingSubsGroups) {
          if (err) {
            console.log("error: " + err);
          } else {
            waitingSubsGroups = waitingSubsGroups.sort(function(a,b)
                {return a.name.toLowerCase() > b.name.toLowerCase()});
            if (!waitingSubsGroups || waitingSubsGroups.length <= 0) {
              waitingSubsGroups = null;
            }
            res.render('groups/waiting_subscriptions', {
              title: 'Groups owned by ' + req.userById.email + ' with waiting subscriptions',
              user : req.user,
              waitingSubsGroups: waitingSubsGroups });
            }
        });
    } else {
      res.render('/', {
      });
    }
});

//GET the tests assigned to the individual user
router.get('/:id/assigned', function(req, res) {
    //search for the user within Mongo
    mongoose.model('User').findById(req.id, function (err, user) {
        if (err) {
            console.log('GET Error: There was a problem retrieving: ' + err);
        } else {
            //Return the user
            console.log('GET Retrieving ID: ' + user._id);
            res.format({
                //HTML response will render the 'edit.jade' template
                html: function(){
                       res.render('users/edit', {
                          title: 'user' + user._id,
                          "user" : user
                      });
                 },
                 //JSON response will return the JSON output
                json: function(){
                       res.json(user);
                }
            });
        }
    });
});

//GET the tests saved by this user
router.get('/:id/saved', function(req, res) {
    //search for the user within Mongo
    mongoose.model('User').findById(req.id, function (err, user) {
        if (err) {
            console.log('GET Error: There was a problem retrieving: ' + err);
        } else {
            //Return the user
            console.log('GET Retrieving ID: ' + user._id);
            res.format({
                //HTML response will render the 'edit.jade' template
                html: function(){
                       res.render('users/edit', {
                          title: 'user' + user._id,
                          "user" : user
                      });
                 },
                 //JSON response will return the JSON output
                json: function(){
                       res.json(user);
                }
            });
        }
    });
});

//GET the tests submitted by this user
router.get('/:id/submitted', function(req, res) {
    //search for the user within Mongo
    mongoose.model('User').findById(req.id, function (err, user) {
        if (err) {
            console.log('GET Error: There was a problem retrieving: ' + err);
        } else {
            //Return the user
            console.log('GET Retrieving ID: ' + user._id);
            res.format({
                //HTML response will render the 'edit.jade' template
                html: function(){
                       res.render('users/edit', {
                          title: 'user' + user._id,
                          "user" : user
                      });
                 },
                 //JSON response will return the JSON output
                json: function(){
                       res.json(user);
                }
            });
        }
    });
});

module.exports = router;