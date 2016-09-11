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

//build the REST operations at the base for categories
//this will be accessible from http://127.0.0.1:3000/categories if the default route for / is left unchanged
router.route('/')
    //GET all categories
    .get(function(req, res, next) {
        //retrieve all categories from Monogo
        mongoose.model('Category').find({}, function (err, categories) {
              if (err) {
                  return console.error(err);
              } else {
                  //respond to both HTML and JSON. JSON responses require 'Accept: application/json;' in the Request Header
                  res.format({
                    //HTML response will render the index.jade file in the views/categories folder. We are also setting "categories" to be an accessible variable in our jade view
                    html: function(){
                        res.render('categories/index', {
                              title: 'All Categories',
                              "categories" : categories
                          });
                    },
                    //JSON response will show all categries in JSON format
                    json: function(){
                        res.json(categories);
                    }
                });
              }     
        });
    })
    //POST a new category
    .post(function(req, res) {
        // Get values from POST request. These can be done through forms or REST calls. These rely on the "name" attributes for forms
        var name = req.body.name;
        var subcategories = req.body.subcategories;
        //call the create function for our database
        mongoose.model('Category').create({
            name : name,
            subcategories : subcategories
        }, function (err, category) {
              if (err) {
                  res.send("There was a problem adding the information to the database.");
              } else {
                  //Category has been created
                  console.log('POST creating new category: ' + category);
                  res.format({
                      //HTML response will set the location and redirect back to the home page. You could also create a 'success' page if that's your thing
                    html: function(){
                        // If it worked, set the header so the address bar doesn't still say /adduser
                        res.location("categories");
                        // And forward to success page
                        res.redirect("/categories");
                    },
                    //JSON response will show the newly created category
                    json: function(){
                        res.json(category);
                    }
                });
              }
        })
    });

/* GET New Categories page. */
router.get('/new', function(req, res) {
    res.render('categories/new', { title: 'Add New Category' });
});

// route middleware to validate :id
router.param('id', function(req, res, next, id) {
    //console.log('validating ' + id + ' exists');
    //find the ID in the Database
    mongoose.model('Category').findById(id, function (err, category) {
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
            //console.log(category);
            // once validation is done save the new item in the req
            req.id = id;
            // go to the next thing
            next(); 
        } 
    });
});

router.route('/:id')
  .get(function(req, res) {
    mongoose.model('Category').findById(req.id, function (err, category) {
      if (err) {
        console.log('GET Error: There was a problem retrieving: ' + err);
      } else {
        console.log('GET Retrieving ID: ' + category._id);
        res.format({
          html: function(){
              res.render('categories/show', {
                "category" : category
              });
          },
          json: function(){
              res.json(category);
          }
        });
      }
    });
  });

//GET the individual category by Mongo ID
router.get('/:id/edit', function(req, res) {
    //search for the category within Mongo
    mongoose.model('Category').findById(req.id, function (err, category) {
        if (err) {
            console.log('GET Error: There was a problem retrieving: ' + err);
        } else {
            //Return the category
            console.log('GET Retrieving ID: ' + category._id);
            res.format({
                //HTML response will render the 'edit.jade' template
                html: function(){
                       res.render('categories/edit', {
                          title: 'Category' + category._id,
                          "category" : category
                      });
                 },
                 //JSON response will return the JSON output
                json: function(){
                       res.json(category);
                }
            });
        }
    });
});

//PUT to update a category by ID
router.put('/:id/edit', function(req, res) {
    // Get our REST or form values. These rely on the "name" attributes
    var name = req.body.name;
    var subcategories = req.body.subcategories;

   //find the document by ID
        mongoose.model('Category').findById(req.id, function (err, category) {
            //update it
            category.update({
                name : name,
                subcategories : subcategories
            }, function (err, catID) {
              if (err) {
                  res.send("There was a problem updating the information to the database: " + err);
              } 
              else {
                      //HTML responds by going back to the page or you can be fancy and create a new view that shows a success page.
                      res.format({
                          html: function(){
                               res.redirect("/categories/" + category._id);
                         },
                         //JSON responds showing the updated values
                        json: function(){
                               res.json(category);
                         }
                      });
               }
            })
        });
});

//DELETE a Category by ID
router.delete('/:id/edit', function (req, res){
    //find category by ID
    mongoose.model('Category').findById(req.id, function (err, category) {
        if (err) {
            return console.error(err);
        } else {
            //remove it from Mongo
            category.remove(function (err, category) {
                if (err) {
                    return console.error(err);
                } else {
                    //Returning success messages saying it was deleted
                    console.log('DELETE removing ID: ' + category._id);
                    res.format({
                        //HTML returns us back to the main page, or you can create a success page
                          html: function(){
                               res.redirect("/categories");
                         },
                         //JSON returns the item with the message that is has been deleted
                        json: function(){
                               res.json({message : 'deleted',
                                   item : category
                               });
                         }
                      });
                }
            });
        }
    });
});

module.exports = router;