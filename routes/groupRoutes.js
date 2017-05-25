var express = require('express'),
    router = express.Router(),
    mongoose = require('mongoose'), //mongo connection
    bodyParser = require('body-parser'), //parses information from POST
    methodOverride = require('method-override'); //used to manipulate POST
    Group = require('../model/groups'); //neo4j group handle
    User = require('../model/user'); //neo4j user handle; TODO: user/users inconsistency
    ShortId = require('shortid');
    Util = require('util');

router.use(bodyParser.urlencoded({ extended: true }))
router.use(methodOverride(function(req, res){
      if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        // look in urlencoded POST bodies and delete it
        var method = req.body._method
        delete req.body._method
        return method
      }
}))

//build the REST operations at the base for groups
//this will be accessible from http://127.0.0.1:3000/groups if the default route for / is left unchanged
router.route('/')
    //GET all groups
    .get(function(req, res, next) {
      Group.getAll(function(err, groups) {
              if (err) {
                  return console.error(err);
              } else {
                  //respond to both HTML and JSON. JSON responses require 'Accept: application/json;' in the Request Header
                  var loggedUser = null;
                  if (req.user) {
                    loggedUser = req.user.properties;
                  }
                  //project just the properties part to remove neo4j-ness
                  var projectedGroupProperties = groups.map(function(group) {
                    return group.group.properties;
                  });
                  res.format({
                    //HTML response will render the index.jade file in the views/users folder. We are also setting "users" to be an accessible variable in our jade view
                    html: function(){
                        res.render('groups/index', {
                              title: 'All groups',
                              "groups" : projectedGroupProperties,
                              "user": loggedUser
                          });
                    },
                    //JSON response will show all groups in JSON format
                    json: function(){
                        res.json(projectedGroupProperties);
                    }
                });
              }     
        });
      /*
        //retrieve all groups from Monogo
        mongoose.model('Group').find({}, function (err, groups) {
              if (err) {
                  return console.error(err);
              } else {
                  //respond to both HTML and JSON. JSON responses require 'Accept: application/json;' in the Request Header
                  res.format({
                    //HTML response will render the index.jade file in the views/groups folder. We are also setting "groups" to be an accessible variable in our jade view
                    html: function(){
                        res.render('groups/index', {
                              title: 'All groups',
                              "groups" : groups,
                              "user": req.user
                          });
                    },
                    //JSON response will show all groups in JSON format
                    json: function(){
                        res.json(groups);
                    }
                });
              }     
        });
        */
    })
    //POST a new group
    .post(function(req, res) {
        // Get values from POST request. These can be done through forms or REST calls. These rely on the "name" attributes for forms
        console.log('post on groups');
        var name = req.body.name;
        // var owner = req.body.owner;
        var users = req.body.users;
        //make sure user is logged in
        console.log('name: ' + name + ", users: " + Util.inspect(users) + ", req.user.email: " + req.user.properties.email);
        if (!req.user) {
          res.send("You must be logged in to create a group.");
        } else {
          //call the create function for our database
          /*
          mongoose.model('Group').create({
              name : name,
              owner: req.user.email,
              users : users
          }, function (err, group) {
                if (err) {
                    res.send("There was a problem adding the information to the database.");
                } else {
                    //group has been created
                    console.log('POST creating new group: ' + group);
                    res.format({
                        //HTML response will set the location and redirect back to the home page. You could also create a 'success' page if that's your thing
                      html: function(){
                          // If it worked, set the header so the address bar doesn't still say /adduser
                          //res.location("groups");
                          // And forward to success page
                          res.redirect("/");
                      },
                      //JSON response will show the newly created group
                      json: function(){
                          res.json(group);
                      }
                  });
                }
          })
          */
          //group creation is a two-step operation
          //a group record is created with the provided field values except the users
          //for each entry in the passed-in users, we invite the user
          //the user needs to accept the invitation to become a member of the group
          //the acceptance process can included accepting rules, EULAs etc
          //failure to invite users is not fatal, ie it does not result in rollback of creation,
          //but we should probbaly find a way to inform the caller if we failed to invite anyone
          //TODO: setting invite relationship is async, we should use Promise or something
          //to delay return until all are done (or not? - either way, this should be decided on merit)
          Group.create(
            req.user.properties.id,
            {
              name : name,
              id: ShortId.generate(),
              creator: req.user.properties.email,
              owner: req.user.properties.email,
            },
            function (err, group) {
              if (err) {
                  res.send("There was a problem adding the information to the database.");
              } else {
                  //group has been created
                  console.log('POST created new group: ' + group);
                  var emailList = null;
                  if (users.length > 0) {
                    emailList = users.split(",");
                  }
                  var successful = [];
                  var failed_at_user = [];
                  var failed_at_group = [];
                  var failed_not_found = [];

//this probably doesn't work properly as we should wait for the loop to finish beofre returning
                  for (i in emailList) {
                    email = emailList[i].replace(/ /g,'');
                    console.log('user \'' + email + '\'');
                    //invite each user by setting the invited relationship
                    if (email != null) {
                      Group.addGroupUserRelationshipByUserField('invite', group.properties.id, 'email', email, function (err, rel)
                        {
                          if (err) {
                            console.log('error inviting user ' + email + ' to group ' + name + ': ' + err);
                          } else {
                            console.log('sent invitation to user ' + email + ' for group ' + name);
                            if (rel == null) {
                              console.log('rel null');
                            } else {
                              console.log('rel non-null: ' + Util.inspect(rel));
                            }
                          }
                        }
                      );
                    }
                  }

                  res.format({
                    //HTML response will set the location and redirect back to the home page. You could also create a 'success' page if that's your thing
                    html: function(){
                      // If it worked, set the header so the address bar doesn't still say /adduser
                      //res.location("groups");
                      // And forward to success page
                      res.redirect("/");
                    },
                    //JSON response will show the newly created group
                    json: function(){
                      res.json(group);
                    }
                  });
              }
          })
        }
    });

/* GET New groups page. */
router.get('/new', function(req, res) {
    res.render('groups/new',
      {
        title: 'Add New group',
        "user": req.user.properties
      });
});

/*
moved to /users/:id/waiting_subscriptions
//GET the groups owned by this user which have subscriptions waiting to be accepted
//this isn't really a group property, need to find a better place for this
router.get('/waiting_subscriptions', function(req, res) {
    //search for the groups with owner:user.email within Mongo
    if (req.user) {
      mongoose.model('Group').find(
        {
          "owner": req.user.email,
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
              title: 'Groups owned by ' + req.user.email + ' with waiting subscriptions',
              user : req.user,
              waitingSubsGroups: waitingSubsGroups });
            }
        });
    } else {
      res.render('/', {
      });
    }
});
*/

//GET groups/subscribe page.
//retrieves the set of groups a user can subscribe to (currently this means: is not an owner of,
//and has not subscribed already), and renders a page where a user can click to subscribe
//json response should be that set of groups, I think
//NOTE: need to support filtering and paging
router.get('/subscribe', function(req, res) {
  //retrieve groups from Monogo
  if (!req.user) {
    res.send("You must be logged in to subscribe to groups.");
  } else {
    /*mongoose.model('Group').find(
    {
      owner: {$ne: req.user.email},
      'pending_subscriptions.id': {$ne: req.user.id}
    }, function (err, groups) {
      */
    //getSubscribable filters out our groups and the one we subscribed to already
    console.log('email: ' + req.user.properties.email + ', full user + ' + Util.inspect(req.user));
    Group.getSubscribable(req.user.properties.email, function(err, groups) {
      if (err) {
        return console.error(err);
      } else {
        //respond to both HTML and JSON. JSON responses require 'Accept: application/json;' in the Request Header
        //project just the user properties part to remove neo4j-ness
        var projectedGroupProperties = groups.map(function(group) {
          return group.group.properties;
        }).sort(function(a,b) {
              return a.name.toLowerCase() > b.name.toLowerCase();
        });
        res.format({
          //HTML response will render the index.jade file in the views/groups folder. We are also setting "groups" to be an accessible variable in our jade view
          html: function() {
            res.render('groups/subscribe', {
              title: 'Subscribe to groups',
              "groups" : projectedGroupProperties,
              "user": req.user
            });
          },
          //JSON response will send these groups in JSON format
          json: function() {
            res.json(projectedGroupProperties);
          }
        });
      };
    });
  }
});

// route middleware to validate :id
router.param('id', function(req, res, next, id) {
    console.log('validating group id ' + id);
    //find the ID in the Database
    //mongoose.model('Group').findById(id, function (err, group) {
    //Group.getBy('group.id', id, function(err, existingGroup) {
    Group.getBy('id', id, function(err, existingGroup) {
        //if it isn't found, we are going to repond with 404
        if (err) {
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
        //if it is found we continue on
        } else {
          console.log('found');
            //uncomment this next line if you want to see every JSON document response for every GET/PUT/DELETE call
            //console.log(existingGroup);
            // once validation is done save the new item in the req
            req.id = id;
            req.groupById = existingGroup.properties;
            // go to the next thing
            next(); 
        } 
    });
});

// route middleware to validate :uid (eg in groups/:id/subscriptions/:uid or other routes)
router.param('uid', function(req, res, next, uid) {
    console.log('validating user uid ' + uid);
    //find the ID in the Database
    //mongoose.model('User').findById(uid, function (err, user) {
    User.getBy('id', uid, function(err, existingUser) {
        //if it isn't found, we are going to repond with 404
        if (err) {
            console.log('User ' + id + ' was not found');
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
            //console.log(existingUser);
            // once validation is done save the new item in the req
            req.uid = uid;
            req.userByUId = existingUser.properties;
            // go to the next thing
            next(); 
        } 
    });
});

router.route('/:id')
  .get(function(req, res) {
    //mongoose.model('Group').findById(req.id, function (err, group) {
    //middleware validated it by now, just return req.groupById.properties
    /*
    Group.getBy('id', id, function(err, group) {
      if (err) {
        console.log('GET Error: There was a problem retrieving: ' + err);
      } else {
        console.log('GET Retrieving ID: ' + group.properties.id);
        res.format({
          html: function(){
              res.render('groups/show', {
                "group" : group
              });
          },
          json: function(){
              res.json(group);
          }
        });
      }
    });
    */
    console.log('req.groupById: ' + Util.inspect(req.groupById));
    if (req && req.groupById) {
      res.format({
        html: function(){
          res.render('groups/show', {
            "group" : req.groupById
          });
        },
        json: function(){
          res.json(req.groupById);
        }
      });
    } else {
      console.log('GET Error: group id ' + req.id + ' was not found');
      //redirect to some error page, or referrer
    }
  });

//GET the individual group by Mongo ID
router.get('/:id/edit', function(req, res) {
    //search for the group within Mongo
    //mongoose.model('Group').findById(req.id, function (err, group) {
    //middleware validated it by now, just return req.groupById.properties
    /*
      Group.getBy('id', id, function(err, group) {
        if (err) {
            console.log('GET Error: There was a problem retrieving: ' + err);
        } else {
            //Return the group
            console.log('GET Retrieving ID: ' + group.id);
            res.format({
                //HTML response will render the 'edit.jade' template
                html: function(){
                       res.render('groups/edit', {
                          title: 'group' + group.id,
                          "group" : group
                      });
                 },
                 //JSON response will return the JSON output
                json: function(){
                       res.json(group);
                }
            });
        }
    });
    */
    if (req && req.groupById) {
      res.format({
        html: function(){
          res.render('groups/edit', {
            title: 'group' + req.groupById.id,
            "group" : req.groupById
          });
        },
        json: function(){
          res.json(req.groupById);
        }
      });
    } else {
      console.log('GET Error: group id ' + id + ' was not found');
      //redirect to some error page, or referrer
    }
});

//PUT to update a group by ID
router.put('/:id/edit', function(req, res) {
    // Get our REST or form values. These rely on the "name" attributes
    var name = req.body.name;
    var owner = req.body.owner;
    var users = req.body.users;

   //find the document by ID
        mongoose.model('Group').findById(req.id, function (err, group) {
            //update it
            group.update({
                name : name,
                owner : owner,
                users: users
            }, function (err, groupID) {
              if (err) {
                  res.send("There was a problem updating the information to the database: " + err);
              } 
              else {
                      //HTML responds by going back to the page or you can be fancy and create a new view that shows a success page.
                      res.format({
                          html: function(){
                               res.redirect("/groups/" + group._id);
                         },
                         //JSON responds showing the updated values
                        json: function(){
                               res.json(group);
                         }
                      });
               }
            })
        });
});

//GET the group subscriptions
router.get('/:id/subscriptions', function(req, res) {
    //find the sources of 'subscribed' relationship for this group
    //form the array of tuples [<group_name, group_id>]
    if (req.user) {
      var subscriptions = null;
      Group.getSourcesOfGroupRelationship(req.id, 'subscribed', function(err, users) {
        if (err) {
          console.log("error: " + err);
          res.render('/', {
          });
        } else {     
          //sort and project just the properties part to remove neo4j-ness
            users = users.map(function(user) {
            return user.properties;
          }).sort(function(a,b) {
            return a.name.toLowerCase() > b.name.toLowerCase();
          });
          if (!users || users.length <= 0) {
            users = [];
          } else {
            //form array of name,id tuples
            subscriptions = users.map(function(user) {
              return {
                name: user.name,
                id: user.id
              };
            });
          }
          res.render('groups/subscriptions', {
            title: 'Active group subscriptions for ' + req.groupById.name,
            user : req.user.properties,
            group: req.groupById,
            subscriptions: subscriptions });
        }
      });
    } else {
      res.render('/', {
      });
    }
});

//POST to subscribe current user to a group
//this is keyed off the logged on user; ie only I can subscribe myself to a group
//need authorization? - I think this one should be open to any logged on user
router.post('/:id/subscriptions', function(req, res) {
    // Get our REST or form values. These rely on the "name" attributes
    var user = req.user;
    var email = null;
    if (user) {
      id = req.user.properties.id;
      email = req.user.properties.email;
    }

    if (!id) {
      res.redirect("/");
    }

    console.log('id: ' + id + ', req.id: ' + req.id);
    console.log('groupById: ' + Util.inspect(req.groupById));
    console.log('user: ' + Util.inspect(user));
    //udpate the relationships - find the user and set subscribe relationship
    User.addUserGroupRelationship('subscribe', id, req.id,
    /*req.groupById.update(
    {
      $addToSet: {
        pending_subscriptions : {
          id: id,
          email: email
        }
      }
    }
    ,*/ function (err, groupID) {
      if (err) {
        res.send("There was a problem updating the information to the database: " + err);
      } 
      else {
        //HTML responds by going back to the page or you can be fancy and create a new view that shows a success page.
        res.format({
          html: function(){
            res.redirect('back');
          },
          //JSON should respond showing the updated values
          json: function(){
            //res.json(group);
          }
        });
      }
    })
});

//POST to accept a subscription to a group - special case of an update of a group by ID
//should this be a PUT? maybe, but I cannot make PUT work, possibly because I don't GET
//the whole group resource first
//this works, so I'm not going to waste time just for the sake of API purity
//
//This one should be authorized only for the group owner or admins with right level of access
//currently open to everybody
//
//currently does not enforce that the email is on the pending_subscription list (at least
//I don't think it enforces that - unless $pull errors out in this case); so it may be possible
//to add someone to a group by POST'ing their email here; this may be useful, although
//in the ideal model I envision only conscious subscribe/invite/accept, ie either a user
//subscribes to a group and group owner accepts subscription, or a group owner invites a user
//and the user accepts invitation - this way lets us long term eg enforce display of terms of use
//and such
//
//NOTE!: needs authorization
router.post('/:id/subscriptions/:uid/accept', function(req, res) {
    var email = null;
    if (req.userByUid && req.groupById && req.user /* && authorize_operation() */) {
      email = req.userByUid.email;
    }
    
    if (!email) {
      console.log('redirecting back');
      res.redirect('back');
    } else {
      //update it
      /*
      req.groupById.update(
      {
        $addToSet: {
          users : email
        },
        $pull: {
          pending_subscriptions :
            {
              email: email,
              id: req.userByUid.id
            }
        }
      }, function (err, groupID) {
        if (err) {
          res.send("There was a problem updating the information to the database: " + err);
        } 
        else {
          //HTML responds by going back to the page or you can be fancy and create a new view that shows a success page.
          res.format({
            html: function(){
              //res.redirect("/users/" + req.user._id + "/groups/waiting_subscriptions");
              res.redirect('back');
            },
            //JSON responds showing the updated values
            json: function(){
              res.json(req.groupById);
            }
          });
        }
      })
      */
      Group.addGroupUserRelationshipByUserField('accept', req.id, 'id', req.uid, function(err) {
        if (err) {
          res.send("There was a problem updating the information to the database: " + err);
        } else {
          res.redirect('back');
        }
      });
    }
});

//reject subscription, analogous to accept above
//NOTE!: needs authorization
router.post('/:id/subscriptions/:uid/reject', function(req, res) {
    var email = null;
    if (req.userByUid && req.groupById && req.user /* && authorize_operation() */) {
      email = req.userByUid.email;
    }

    if (!email) {
      res.redirect('back');
    } else {
      //update it
      /*
      req.groupById.update(
      {
        $pull: {
          pending_subscriptions :
          {
            email: email,
            id: req.userByUid.id
          }
        }
      }, function (err, groupID) {
        if (err) {
          res.send("There was a problem updating the information to the database: " + err);
        } 
        else {
          //HTML responds by going back to the page or you can be fancy and create a new view that shows a success page.
          res.format({
            html: function(){
              //res.redirect("/users/" + req.user._id + "/groups/waiting_subscriptions");
              res.redirect('back');
            },
            //JSON responds showing the updated values
            json: function(){
              res.json(req.groupById);
            }
          });
        }
      })
      */
      Group.addGroupUserRelationshipByUserField('reject', req.id, 'id', req.uid, function(err) {
        if (err) {
          res.send("There was a problem updating the information to the database: " + err);
        } else {
          res.redirect('back');
        }
      });
    }
});

//POST to invite users to this group
//body.emails should contain comma-separated list of emails
//all whitespace will be stripped
router.post('/:id/invite', function(req, res) {
    // Get our REST or form values. These rely on the "name" attributes
    var emails = req.body.emails.split(",");
    var successful = [];
    var failed_at_user = [];
    var failed_at_group = [];
    var failed_not_found = [];

    console.log('emails: '  + emails);
    for (i in emails) {
      email = emails[i].replace(/ /g,'');
      console.log('email:' + email  + ":");
      console.log('orig url: ' + req.originalUrl);
      console.log('url: ' + req.url);
      Group.addGroupUserRelationshipByUserField('invite', req.id, 'email', email, function(err, result) {
        if (err) {
          console.log('err:' + err);
        } else {
          console.log('success: ' + result);
        }
      });
      /*
      //find the user record by email (unique)
      mongoose.model('User').findOne({ "email": email }, function (err, user) {
        if (err) {
          console.log('err:' + err);
        } else if (user == null) {
          console.log('not found');
          failed_not_found.push(email);
        } else {
          console.log('updating user ' + user.email + ' invites with: ' + req.body.groupname);
          user.update(
          {
            $addToSet: {
              invites: { 'name': req.body.groupname, 'id': req.id },
              invites_ids: req.id
            }
          }, function(err, userID) {
            if (err) {
              res.send("There was a problem updating the information to the database: " + err);
              failed_at_user.push(user.email);
            } 
            else {
              mongoose.model('Group').findById(req.id, function (err, group) {
                console.log('adding ' + user.email + ' to pending invitation')
                group.update(
                  {
                    $addToSet: {
                      pending_invitations : user.email
                    }
                  }, function (err, groupID) {
                    if (err) {
                      res.send("There was a problem updating the information to the database: " + err);
                      failed_at_group.push(user.email);
                    } 
                    else {
                      successful.push(user.email);
                    }
                  })
              });
            }
          })
        }
      });
      */
    }
    
    //respond
    //ideally we should not respond until we have processed, successfully or not
    //all of the emails in the list
    //right now I do not know how to do that, so we'll redirect back and for multiple updates
    //likely not see the updated results unless we refresh
    //should use promises above, or something
    res.format({
      html: function(){
        res.redirect(/*{
                      title: 'Groups owned by ' + req.email,
                      user: res.user,
                      successful : successful,
                      failed_not_found: failed_not_found,
                      failed_at_group: failed_at_group,
                      failed_at_user: failed_at_user
                    },
                    */
                    //'/users/' + req.user._id + '/groups'
                    'back'
                  );
                  /*
        res.render({
                      title: 'Groups owned by ' + req.email,
                      user: res.user,
                      successful : successful,
                      failed_not_found: failed_not_found,
                      failed_at_group: failed_at_group,
                      failed_at_user: failed_at_user
                    },
                    '/users/' + req.user._id + '/groups'
                  );
                  */
      },
      //JSON responds showing the updated values
      json: function(){
        res.json(user);
      }
    });
});

//DELETE a group by ID
router.delete('/:id', function (req, res){
  console.log('deleting group ' + req.id);
  //detach delete (delete node along with relationship to/from) group by ID
  Group.detachDeleteBy('id', req.id, function(err, deletedGroup) {
        //if it isn't found, we are going to respond with 404
        if (err) {
            res.status(404)
            var err = new Error('Failed to delete group');
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
            res.format({
              //HTML returns us back to the previous URL, or we can create a success page
              html: function(){
                //res.redirect("/user/{req.user.id}/groups");
                //it would be better if we went back to the referrer, for now this hardcode will do
                res.redirect('back');
                //res.redirect("/users/" + req.user.properties.id + '/groups');
              },
              //JSON returns the item with the message that is has been deleted
              json: function(){
                res.json({message : 'deleted',
                            item : deletedGroup  //with neo4j deletedGroup is null, rethink the reply here
                });
              }
            }); 
        } 
    });

/*
    mongoose.model('Group').findById(req.id, function (err, group) {
        if (err) {
            return console.error(err);
        } else {
            //remove it from Mongo
            group.remove(function (err, group) {
                if (err) {
                    return console.error(err);
                } else {
                    //Returning success messages saying it was deleted
                    console.log('DELETE removing ID: ' + group._id);
                    res.format({
                        //HTML returns us back to the main page, or you can create a success page
                          html: function(){
                               res.redirect("/groups");
                         },
                         //JSON returns the item with the message that is has been deleted
                        json: function(){
                               res.json({message : 'deleted',
                                   item : group
                               });
                         }
                      });
                }
            });
        }
    });
    */
});

//GET the tests assigned to the group
router.get('/:id/assigned', function(req, res) {
    //search for the user within Mongo
    mongoose.model('Group').findById(req.id, function (err, group) {
        if (err) {
            console.log('GET Error: There was a problem retrieving: ' + err);
        } else {
            //Return the user
            console.log('GET Retrieving ID: ' + group._id);
            res.format({
                //HTML response will render the 'edit.jade' template
                html: function(){
                       res.render('groups/edit', {
                          title: 'group' + group._id,
                          "group" : group
                      });
                 },
                 //JSON response will return the JSON output
                json: function(){
                       res.json(group);
                }
            });
        }
    });
});

module.exports = router;