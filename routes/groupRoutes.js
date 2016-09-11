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
                              "groups" : groups
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
        var owner = req.body.owner;
        var users = req.body.users;
        //call the create function for our database
        mongoose.model('Group').create({
            name : name,
            owner: owner,
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
                        res.location("groups");
                        // And forward to success page
                        res.redirect("/groups");
                    },
                    //JSON response will show the newly created group
                    json: function(){
                        res.json(group);
                    }
                });
              }
        })
    });

/* GET New groups page. */
router.get('/new', function(req, res) {
    res.render('groups/new', { title: 'Add New group' });
});

// route middleware to validate :id
router.param('id', function(req, res, next, id) {
    //console.log('validating ' + id + ' exists');
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