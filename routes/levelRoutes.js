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

//build the REST operations at the base for levels
//this will be accessible from http://127.0.0.1:3000/levels if the default route for / is left unchanged
router.route('/')
    //GET all levels
    .get(function(req, res, next) {
        //retrieve all levels from Monogo
        mongoose.model('Level').find({}, function (err, levels) {
              if (err) {
                  return console.error(err);
              } else {
                  //respond to both HTML and JSON. JSON responses require 'Accept: application/json;' in the Request Header
                  res.format({
                    //HTML response will render the index.jade file in the views/levels folder. We are also setting "levels" to be an accessible variable in our jade view
                    html: function(){
                        res.render('levels/index', {
                              title: 'All Levels',
                              "levels" : levels
                          });
                    },
                    //JSON response will show all levels in JSON format
                    json: function(){
                        res.json(levels);
                    }
                });
              }     
        });
    })
    //POST a new level
    .post(function(req, res) {
        // Get values from POST request. These can be done through forms or REST calls. These rely on the "name" attributes for forms
        var name = req.body.name;
        var equivalent_levels = req.body.equivalent_levels;
        //call the create function for our database
        mongoose.model('Level').create({
            name : name,
            equivalent_levels : equivalent_levels
        }, function (err, level) {
              if (err) {
                  res.send("There was a problem adding the information to the database.");
              } else {
                  //Level has been created
                  console.log('POST creating new level: ' + level);
                  res.format({
                      //HTML response will set the location and redirect back to the home page. You could also create a 'success' page if that's your thing
                    html: function(){
                        // If it worked, set the header so the address bar doesn't still say /adduser
                        res.location("levels");
                        // And forward to success page
                        res.redirect("/levels");
                    },
                    //JSON response will show the newly created level
                    json: function(){
                        res.json(level);
                    }
                });
              }
        })
    });

/* GET New Levels page. */
router.get('/new', function(req, res) {
    res.render('levels/new', { title: 'Add New Level' });
});

// route middleware to validate :id
router.param('id', function(req, res, next, id) {
    //console.log('validating ' + id + ' exists');
    //find the ID in the Database
    mongoose.model('Level').findById(id, function (err, level) {
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
            //console.log(level);
            // once validation is done save the new item in the req
            req.id = id;
            // go to the next thing
            next(); 
        } 
    });
});

router.route('/:id')
  .get(function(req, res) {
    mongoose.model('Level').findById(req.id, function (err, level) {
      if (err) {
        console.log('GET Error: There was a problem retrieving: ' + err);
      } else {
        console.log('GET Retrieving ID: ' + level._id);
        res.format({
          html: function(){
              res.render('levels/show', {
                "level" : level
              });
          },
          json: function(){
              res.json(level);
          }
        });
      }
    });
  });

//GET the individual level by Mongo ID
router.get('/:id/edit', function(req, res) {
    //search for the level within Mongo
    mongoose.model('Level').findById(req.id, function (err, level) {
        if (err) {
            console.log('GET Error: There was a problem retrieving: ' + err);
        } else {
            //Return the level
            console.log('GET Retrieving ID: ' + level._id);
            res.format({
                //HTML response will render the 'edit.jade' template
                html: function(){
                       res.render('levels/edit', {
                          title: 'Level' + level._id,
                          "level" : level
                      });
                 },
                 //JSON response will return the JSON output
                json: function(){
                       res.json(level);
                }
            });
        }
    });
});

//PUT to update a level by ID
router.put('/:id/edit', function(req, res) {
    // Get our REST or form values. These rely on the "name" attributes
    var name = req.body.name;
    var equivalent_levels = req.body.equivalent_levels;

   //find the document by ID
        mongoose.model('Level').findById(req.id, function (err, level) {
            //update it
            level.update({
                name : name,
                equivalent_levels : equivalent_levels
            }, function (err, levelID) {
              if (err) {
                  res.send("There was a problem updating the information to the database: " + err);
              } 
              else {
                      //HTML responds by going back to the page or you can be fancy and create a new view that shows a success page.
                      res.format({
                          html: function(){
                               res.redirect("/levels/" + level._id);
                         },
                         //JSON responds showing the updated values
                        json: function(){
                               res.json(level);
                         }
                      });
               }
            })
        });
});

//DELETE a Level by ID
router.delete('/:id/edit', function (req, res){
    //find level by ID
    mongoose.model('Level').findById(req.id, function (err, level) {
        if (err) {
            return console.error(err);
        } else {
            //remove it from Mongo
            level.remove(function (err, level) {
                if (err) {
                    return console.error(err);
                } else {
                    //Returning success messages saying it was deleted
                    console.log('DELETE removing ID: ' + level._id);
                    res.format({
                        //HTML returns us back to the main page, or you can create a success page
                          html: function(){
                               res.redirect("/levels");
                         },
                         //JSON returns the item with the message that is has been deleted
                        json: function(){
                               res.json({message : 'deleted',
                                   item : level
                               });
                         }
                      });
                }
            });
        }
    });
});

module.exports = router;