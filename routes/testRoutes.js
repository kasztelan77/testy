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

//build the REST operations at the base for tests
//this will be accessible from http://127.0.0.1:3000/tests if the default route for / is left unchanged
router.route('/')
    //GET all tests
    .get(function(req, res, next) {
        //retrieve all tests from Monogo
        mongoose.model('Test').find({}, function (err, tests) {
              if (err) {
                  return console.error(err);
              } else {
                  //respond to both HTML and JSON. JSON responses require 'Accept: application/json;' in the Request Header
                  res.format({
                    //HTML response will render the index.jade file in the views/tests folder. We are also setting "tests" to be an accessible variable in our jade view
                    html: function(){
                        res.render('tests/index', {
                              title: 'All Tests',
                              "tests" : tests
                          });
                    },
                    //JSON response will show all tests in JSON format
                    json: function(){
                        res.json(tests);
                    }
                });
              }     
        });
    })
    //POST a new test
    .post(function(req, res) {
        // Get values from POST request. These can be done through forms or REST calls. These rely on the "name" attributes for forms
        var name = req.body.name;
        var owner = req.body.owner;
        var questions = req.body.questions;
        //call the create function for our database
        mongoose.model('Test').create({
            name : name,
            owner : owner,
            questions : questions
        }, function (err, test) {
              if (err) {
                  res.send("There was a problem adding the information to the database." + err);
              } else {
                  //Test has been created
                  console.log('POST creating new test: ' + test);
                  res.format({
                      //HTML response will set the location and redirect back to the home page. You could also create a 'success' page if that's your thing
                    html: function(){
                        // If it worked, set the header so the address bar doesn't still say /addtest
                        res.location("tests");
                        // And forward to success page
                        res.redirect("/tests");
                    },
                    //JSON response will show the newly created test
                    json: function(){
                        res.json(test);
                    }
                });
              }
        })
    });

/* GET New Tests page. */
router.get('/new', function(req, res) {
    //res.render('tests/new', { title: 'Add New Test' });
    mongoose.model('Question').find({},{"qn":1,"_id":0}, function (err, questions) {
      if (err) {
        console.log("error: " + err);
      } else {
        console.log("questions before: " + questions);
        var questionNames = _.map(questions, function(element) {
          return element.qn;
        });
        console.log("questions after: " + questionNames);
        res.render('tests/new', {
          title: 'Add New Test',
          filteredQuestions: questionNames
        });
      }
    });
});

// route middleware to validate :id
router.param('id', function(req, res, next, id) {
    //console.log('validating ' + id + ' exists');
    //find the ID in the Database
    mongoose.model('Test').findById(id, function (err, test) {
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
            //console.log(test);
            // once validation is done save the new item in the req
            req.id = id;
            // go to the next thing
            next(); 
        } 
    });
});

router.route('/:id')
  .get(function(req, res) {
    mongoose.model('Test').findById(req.id, function (err, test) {
      if (err) {
        console.log('GET Error: There was a problem retrieving: ' + err);
      } else {
        console.log('GET Retrieving ID: ' + test._id);
        res.format({
          html: function(){
              res.render('tests/show', {
                "test" : test
              });
          },
          json: function(){
              res.json(test);
          }
        });
      }
    });
  });

//GET the individual test by Mongo ID
router.get('/:id/edit', function(req, res) {
    //search for the test within Mongo
    mongoose.model('Test').findById(req.id, function (err, test) {
        if (err) {
            console.log('GET Error: There was a problem retrieving: ' + err);
        } else {
            //Return the test
            console.log('GET Retrieving ID: ' + test._id);
            res.format({
                //HTML response will render the 'edit.jade' template
                html: function(){
                       res.render('tests/edit', {
                          title: 'Test' + test._id,
                          "test" : test
                      });
                 },
                 //JSON response will return the JSON output
                json: function(){
                       res.json(test);
                }
            });
        }
    });
});

//PUT to update a test by ID
router.put('/:id/edit', function(req, res) {
    // Get our REST or form values. These rely on the "name" attributes
    var name = req.body.name;
    var owner = req.body.owner;
    var questions = req.body.questions;

   //find the document by ID
        mongoose.model('Test').findById(req.id, function (err, test) {
            //update it
            test.update({
                name : name,
                owner : owner,
                questions : questions
            }, function (err, testID) {
              if (err) {
                  res.send("There was a problem updating the information to the database: " + err);
              } 
              else {
                      //HTML responds by going back to the page or you can be fancy and create a new view that shows a success page.
                      res.format({
                          html: function(){
                               res.redirect("/tests/" + test._id);
                         },
                         //JSON responds showing the updated values
                        json: function(){
                               res.json(test);
                         }
                      });
               }
            })
        });
});

//DELETE a Test by ID
router.delete('/:id/edit', function (req, res){
    //find test by ID
    mongoose.model('Test').findById(req.id, function (err, test) {
        if (err) {
            return console.error(err);
        } else {
            //remove it from Mongo
            test.remove(function (err, test) {
                if (err) {
                    return console.error(err);
                } else {
                    //Returning success messages saying it was deleted
                    console.log('DELETE removing ID: ' + test._id);
                    res.format({
                        //HTML returns us back to the main page, or you can create a success page
                          html: function(){
                               res.redirect("/tests");
                         },
                         //JSON returns the item with the message that is has been deleted
                        json: function(){
                               res.json({message : 'deleted',
                                   item : test
                               });
                         }
                      });
                }
            });
        }
    });
});

module.exports = router;