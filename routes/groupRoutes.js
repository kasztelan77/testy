var express = require('express'),
    router = express.Router(),
    mongoose = require('mongoose'), //mongo connection
    bodyParser = require('body-parser'), //parses information from POST
    methodOverride = require('method-override'); //used to manipulate POST

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
    })
    //POST a new group
    .post(function(req, res) {
        // Get values from POST request. These can be done through forms or REST calls. These rely on the "name" attributes for forms
        var name = req.body.name;
        // var owner = req.body.owner;
        var users = req.body.users;
        //ma1ke sure user is logged in
        if (!req.user) {
          res.send("You must be logged in to create a group.");
        } else {
          //call the create function for our database
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
        }
    });

/* GET New groups page. */
router.get('/new', function(req, res) {
    res.render('groups/new',
      {
        title: 'Add New group',
        "user": req.user
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
//retrieves the set of groups a user can subscribe to (currently this means: is not an owner if,
//and has not subscribed already), and renders a page where a user can click to subscribe
//json response should be that set of groups, I think
router.get('/subscribe', function(req, res) {
  //retrieve groups from Monogo
  if (!req.user) {
    res.send("You must be logged in to subscribe to groups.");
  } else {
    mongoose.model('Group').find(
    {
      owner: {$ne: req.user.email},
      'pending_subscriptions.id': {$ne: req.user.id}
    }, function (err, groups) {
      if (err) {
        return console.error(err);
      } else {
        //respond to both HTML and JSON. JSON responses require 'Accept: application/json;' in the Request Header
        res.format({
        //HTML response will render the index.jade file in the views/groups folder. We are also setting "groups" to be an accessible variable in our jade view
        html: function() {
          res.render('groups/subscribe', {
            title: 'Subscribe to groups',
            "groups" : groups,
            "user": req.user
          });
        },
        //JSON response will send these groups in JSON format
        json: function(){
          res.json(groups);
          }
        });
      };
    });
  }
});

// route middleware to validate :id
router.param('id', function(req, res, next, id) {
    console.log('validating group id' + id);
    //find the ID in the Database
    mongoose.model('Group').findById(id, function (err, group) {
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
            //uncomment this next line if you want to see every JSON document response for every GET/PUT/DELETE call
            //console.log(group);
            // once validation is done save the new item in the req
            req.id = id;
            req.groupById = group;
            // go to the next thing
            next(); 
        } 
    });
});

// route middleware to validate :subid (in groups/:id/subscriptions/:subid routes)
router.param('subid', function(req, res, next, subid) {
    console.log('validating user subid' + subid);
    //find the ID in the Database
    mongoose.model('User').findById(subid, function (err, user) {
        //if it isn't found, we are going to repond with 404
        if (err) {
            console.log('User ' + subid + ' was not found');
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
            //console.log(group);
            // once validation is done save the new item in the req
            req.subid = subid;
            req.userBySubId = user;
            // go to the next thing
            next(); 
        } 
    });
});

router.route('/:id')
  .get(function(req, res) {
    mongoose.model('Group').findById(req.id, function (err, group) {
      if (err) {
        console.log('GET Error: There was a problem retrieving: ' + err);
      } else {
        console.log('GET Retrieving ID: ' + group._id);
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
  });

//GET the individual group by Mongo ID
router.get('/:id/edit', function(req, res) {
    //search for the group within Mongo
    mongoose.model('Group').findById(req.id, function (err, group) {
        if (err) {
            console.log('GET Error: There was a problem retrieving: ' + err);
        } else {
            //Return the group
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

//POST to subscribe current user to a group - special case of an update of a group by ID
//should this be a PUT? maybe, but I cannot make PUT work, possibly because I don't GET
//the whole group resource first
//this works, so I'm not going to waste time just for the sake of API purity
//these are keyed off the logged on user; ie only I can subscribe myself to a group
//need authorization? - I think this one should be open to any logged on user
router.post('/:id/subscribtions', function(req, res) {
    // Get our REST or form values. These rely on the "name" attributes
    var user = req.user;
    var email = null;
    if (user) {
      id = req.user.id;
      email = req.user.email;
    }

    if (!id) {
      res.redirect("/");
    }

    //udpate the group resource
    req.groupById.update(
    {
      $addToSet: {
        pending_subscriptions : {
          id: id,
          email: email
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
            res.redirect('back');
          },
          //JSON responds showing the updated values
          json: function(){
            res.json(group);
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
router.post('/:id/subscriptions/:subid/accept', function(req, res) {
    var email = null;
    if (req.userBySubId && req.groupById && req.user /* && authorize_operation() */) {
      email = req.userBySubId.email;
    }
    
    if (!email) {
      console.log('redirecting back');
      res.redirect('back');
    } else {
      //update it
      req.groupById.update(
      {
        $addToSet: {
          users : email
        },
        $pull: {
          pending_subscriptions :
            {
              email: email,
              id: req.userBySubId.id
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
      
    }
});

//reject subscription, analogous to accept above
//NOTE!: needs authorization
router.post('/:id/subscriptions/:subid/reject', function(req, res) {
    var email = null;
    if (req.userBySubId && req.groupById && req.user /* && authorize_operation() */) {
      email = req.userBySubId.email;
    }

    if (!email) {
      res.redirect('back');
    } else {
      //update it
      req.groupById.update(
      {
        $pull: {
          pending_subscriptions :
          {
            email: email,
            id: req.userBySubId.id
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
      var Utils = require('util');
      console.log('email:' + email  + ":");
      console.log('orig url: ' + req.originalUrl);
      console.log('url: ' + req.url);
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
    }
    
    //respond
    //ideally we should not respond until we have processed, successfully or not
    //all of the emails in the list
    //right now I do not know how to do that, so we'll redirect back and for multiple updates
    //likely not see the updated results unless we refresh
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
router.delete('/:id/edit', function (req, res){
    //find group by ID
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