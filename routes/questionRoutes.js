var express = require('express'),
    router = express.Router(),
    async = require('async'),
    Question = require('../model/questions'); //neo4j 'questions' handle
    mongoose = require('mongoose'), //mongo connection
    bodyParser = require('body-parser'), //parses information from POST
    methodOverride = require('method-override'); //used to manipulate POST
    _ = require('underscore');

router.use(bodyParser.urlencoded({ extended: true }))
router.use(methodOverride(function(req, res){
      if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        // look in urlencoded POST bodies and delete it
        var method = req.body._method
        delete req.body._method
        return method
      }
}))

//build the REST operations at the base for questions
//this will be accessible from http://127.0.0.1:3000/questions if the default route for / is left unchanged
router.route('/')
    //GET all questions
    .get(function(req, res, next) {
        //retrieve all questions from Monogo
        /*
        mongoose.model('Question').find({ flags: "unverified"}, function (err, unverified_questions) {
          mongoose.model('Question').find({ flags: "accepted"}, function (err, accepted_questions) {
            //mongoose.model('Question').find({ reason_suspect: { $ne: null } }, function (err, suspect_questions) {
            mongoose.model('Question').find({ flags: "review_requested"}, function (err, suspect_questions) {
              if (err) {
                  return console.error(err);
              } else {

                  //respond to both HTML and JSON. JSON responses require 'Accept: application/json;' in the Request Header
                  res.format({
                    //HTML response will render the index.jade file in the views/questions folder. We are also setting "questions" to be an accessible variable in our jade view
                    html: function(){
                        res.render('questions/index', {
                              title: 'All Questions',
                              "unverified" : unverified_questions,
                              "accepted" : accepted_questions,
                              "suspect" : suspect_questions,
                          });
                    },
                    //JSON response will show all questions in JSON format
                    json: function(){
                        res.json(unverified_questions + accepted_questions + suspect_questions);
                    }
                });
              }
            });
          });     
        });
        */
        var unverified_questions = [];
        var accepted_questions = [];
        var suspect_questions = [];
        async.parallel( [
          function(callback) {
            Question.getBy('flags', 'unverified', function(err, results) {
              if (err) {
                console.error(err);
                callback(err);
                return;
              } else {
                if (results != null) {
                  unverified_questions = results.map(function(result) {
                    return result.question.properties;
                  });
                }
                callback();
              }
            });
          },
          function(callback) {
            Question.getBy('flags', 'accepted', function(err, results) {
              if (err) {
                console.error(err);
                callback(err);
                return;
              } else {
                if (results != null) {
                  accepted_questions = results.map(function(result) {
                    return result.question.properties;
                  });;
                }
                callback();
              }
            });
          },
          function(callback) {
            Question.getBy('flags', 'suspect', function(err, results) {
              if (err) {
                console.error(err);
                callback(err);
                return;
              } else {
                if (results != null) {
                  suspect_questions = results.map(function(result) {
                    return result.question.properties;
                  });;
                }
                callback();
              }
            });
          }
          ],
          function(err) {
            if (err) {
              //should be 500 or something
              return console.error(err);
            } else {
              //respond to both HTML and JSON. JSON responses require 'Accept: application/json;' in the Request Header
              res.format({
              //HTML response will render the index.jade file in the views/questions folder. We are also setting "questions" to be an accessible variable in our jade view
                html: function(){
                  res.render('questions/index', {
                    title: 'All Questions',
                    "unverified" : unverified_questions,
                    "accepted" : accepted_questions,
                    "suspect" : suspect_questions,
                  });
                },
                  //JSON response will show all questions in JSON format
                  json: function(){
                    res.json(unverified_questions + accepted_questions + suspect_questions);
                  }
              })
            }
          }
        );
    })
    //POST a new question
    .post(function(req, res) {
        // Get values from POST request. These can be done through forms or REST calls. These rely on the "name" attributes for forms
        var question = req.body.qn;
        var type = req.body.type;
        var categories = req.body.categories;
        var levels = req.body.levels;
        var answers = req.body.answers;
        var answers_options = req.body.answers_options;
        var hints = req.body.hints;
        var links = req.body.links;
  //      var flags = req.body.flags;
        //call the create function for our database
        //mongoose.model('Question').create({
        Question.create(req.id,
        {
            id: ShortId.generate(),
            qn : question,
            type : type,
            categories : categories,
            levels : levels,
            answers : answers,
            answers_options : answers_options,
            hints : hints,
            links : links,
            date_added: Date.now(),
            date_modified: Date.now(),
            flags : "unverified"
        }, function (err, question) {
              if (err) {
                  res.send("There was a problem adding the information to the database.");
              } else {
                  //Question has been created
                  console.log('POST creating new question: ' + question);
                  res.format({
                      //HTML response will set the location and redirect back to the home page. You could also create a 'success' page if that's your thing
                    html: function(){
                        // If it worked, set the header so the address bar is correct
                        res.location("questions");
                        // And forward to success page
                        res.redirect("/questions");
                    },
                    //JSON response will show the newly created question
                    json: function(){
                        res.json(question);
                    }
                });
              }
        })
    });

/* GET New Question page. */
router.get('/new', function(req, res) {
  mongoose.model('Category').find({},{"name":1,"_id":0}, function (err, foundCategories) {
    if (err) {
      console.log("error: " + err);
    } else {
      var categoryNames = _.unique(_.map(foundCategories, function(element) {
        return element.name;
      }),function(unique) {
        return unique;
      });
      mongoose.model('Level').find({},{"name":1,"_id":0}, function (err, foundLevels) {
        if (err) {
          console.log("error: " + err);
        } else {
          var levelNames = _.unique(_.map(foundLevels, function(element) {
            return element.name;
          }),function(unique){
            return unique;
          });
          res.render('questions/new', {
            title: 'Add New Question',
            definedCategories: categoryNames.sort(),
            definedLevels: levelNames.sort()
          });
        }
      });
    }
  });
});

// route middleware to validate :id
router.param('id', function(req, res, next, id) {
    //console.log('validating ' + id + ' exists');
    //find the ID in the Database
    //mongoose.model('Question').findById(id, function (err, question) {
    Question.getBy('id', id, function(err, existingQuestion) {
        //if it isn't found, we are going to respond with 404
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
            //console.log(question);
            // once validation is done save the new item in the req
            req.id = id;
            if (existingQuestion != null && existingQuestion[0] != null && existingQuestion[0].question != null) {
              req.questionById = existingQuestion[0].question.properties;
            }
            // go to the next thing
            next(); 
        } 
    });
});

router.route('/:id')
  .get(function(req, res) {
    /*
    mongoose.model('Question').findById(req.id, function (err, question) {
      if (err) {
        console.log('GET Error: There was a problem retrieving: ' + err);
      } else {
        console.log('GET Retrieving ID: ' + question._id);
        res.format({
          html: function(){
              res.render('questions/show', {
                "question" : question
              });
          },
          json: function(){
              res.json(question);
          }
        });
      }
    });
    */
    console.log('req.questionById: ' + Util.inspect(req.questionById));
    if (req && req.questionById) {
      res.format({
        html: function(){
          res.render('questions/show', {
            "question" : req.questionById
          });
        },
        json: function(){
          res.json(req.questionById);
        }
      });
    } else {
      console.log('GET Error: question id ' + req.id + ' was not found');
      //redirect to some error page, or referrer
    }
  });

//GET the individual question by Mongo ID
router.get('/:id/edit', function(req, res) {
    //search for the question within Mongo
    mongoose.model('Question').findById(req.id, function (err, question) {
        if (err) {
            console.log('GET Error: There was a problem retrieving: ' + err);
        } else {
            //Return the question
            console.log('GET Retrieving ID: ' + question._id);
            res.format({
                //HTML response will render the 'edit.jade' template
                html: function(){
                  mongoose.model('Category').find({},{"name":1,"_id":0}, function (err, foundCategories) {
                    if (err) {
                      console.log("error: " + err);
                    } else {
                      var categoryNames = _.unique(_.map(foundCategories, function(element) {
                        return element.name;
                      }),function(unique) {
                        return unique;
                      });
                      mongoose.model('Level').find({},{"name":1,"_id":0}, function (err, foundLevels) {
                        if (err) {
                          console.log("error: " + err);
                        } else {
                          var levelNames = _.unique(_.map(foundLevels, function(element) {
                            return element.name;
                          }),function(unique){
                            return unique;
                          });
                          res.render('questions/edit', {
                            title: 'Question' + question._id,
                            "question": question,
                            definedCategories: categoryNames.sort(),
                            definedLevels: levelNames.sort()
                          });
                        }
                      });
                    }
                  });
                       //res.render('questions/edit', {
                       //   title: 'Question' + question._id,
                       //   "question" : question
                      //});
                 },
                 //JSON response will return the JSON output
                json: function(){
                       res.json(question);
                 }
            });
        }
    });
});

//PUT to update a question by ID
router.put('/:id/edit', function(req, res) {
    // Get our REST or form values. These rely on the "name" attributes
    var qn = req.body.qn;
    var type = req.body.type;
    var category = req.body.category;
    var level = req.body.level;
    var answers = req.body.answers;
    var answers_options = req.body.answers_options;
    var hints = req.body.hints;
    var links = req.body.links;
    var flags = req.body.flags;
    var reason_suspect = req.body.reason_suspect;

   //find the document by ID
        mongoose.model('Question').findById(req.id, function (err, question) {
            //update it
            question.update({
                qn : qn,
                type : type,
                category : category,
                level : level,
                answers : answers,
                answers_options : answers_options,
                hints : hints,
                links : links,
                date_modified: Date.now(),
                flags : flags,
                reason_suspect : reason_suspect
            }, function (err, questionID) {
              if (err) {
                  res.send("There was a problem updating the information to the database: " + err);
              } 
              else {
                      //HTML responds by going back to the page or you can be fancy and create a new view that shows a success page.
                      res.format({
                          html: function(){
                              // If it worked, set the header so the address bar is correct
                              res.location("questions");
                              // And forward to success page
                              res.redirect("/questions");
                          },
                          //JSON responds showing the updated values
                          json: function(){
                              res.json(question);
                         }
                      });
               }
            })
        });
});

router.put('/:id/accept', function(req, res) {
    // Get our REST or form values. These rely on the "name" attributes
    var qn = req.body.qn;
    var type = req.body.type;
    var category = req.body.category;
    var level = req.body.level;
    var answers = req.body.answers;
    var answers_options = req.body.answers_options;
    var hints = req.body.hints;
    var links = req.body.links;
    var flags = "accepted";
    var reason_suspect = "";

    if (!req || !req.user || !req.questionById) {
      //bail if not logged on, or the question has not been resolved
    } else {
        //mongoose.model('Question').findById(req.id, function (err, question) {
            //update it
            Question.update(
              req.id,
              {
                flags : flags
                //accepted_by: req.id
              },
              function (err, question) {
                if (err) {
                  res.send("There was a problem updating the information to the database: " + err);
                } 
                else {
                      //HTML responds by going back to the page or you can be fancy and create a new view that shows a success page.
                      res.format({
                          html: function(){
                               res.redirect("/questions/");
                         },
                         //JSON responds showing the updated values
                        json: function(){
                               res.json(question);
                         }
                      });
                }
              }
            );
      //  });
      }
});

router.put('/:id/reject', function(req, res) {
    // Get our REST or form values. These rely on the "name" attributes
    var qn = req.body.qn;
    var type = req.body.type;
    var category = req.body.category;
    var level = req.body.level;
    var answers = req.body.answers;
    var answers_options = req.body.answers_options;
    var hints = req.body.hints;
    var links = req.body.links;
    var flags = "rejected";
    var reason_suspect = "";

    if (!req || !req.user || !req.questionById) {
      //bail if not logged on, or the question has not been resolved
    } else {
        //mongoose.model('Question').findById(req.id, function (err, question) {
            //update it
            Question.update(
              req.id,
              {
                flags : flags
                //accepted_by: req.id
              },
              function (err, question) {
                if (err) {
                  res.send("There was a problem updating the information to the database: " + err);
                } 
                else {
                      //HTML responds by going back to the page or you can be fancy and create a new view that shows a success page.
                      res.format({
                          html: function(){
                               res.redirect("/questions/");
                         },
                         //JSON responds showing the updated values
                        json: function(){
                               res.json(question);
                         }
                      });
                }
              }
            );
      //  });
      }
});

//DELETE a Question by ID
router.delete('/:id/edit', function (req, res){
  //detach delete (delete node along with relationship to/from) question by ID
  Question.detachDeleteBy('id', req.id, function(err, deletedQuestion) {
        //if it isn't found, we are going to respond with 404
        if (err) {
            res.status(404)
            var err = new Error('Failed to delete question');
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
          console.log('done delete');
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
                            item : deletedQuestion  //with neo4j deletedQuestion is null, rethink the reply here
                });
              }
            }); 
        } 
    });
  /*
    //find question by ID
    mongoose.model('Question').findById(req.id, function (err, question) {
        if (err) {
            return console.error(err);
        } else {
            //remove it from Mongo
            question.remove(function (err, question) {
                if (err) {
                    return console.error(err);
                } else {
                    //Returning success messages saying it was deleted
                    console.log('DELETE removing ID: ' + question._id);
                    res.format({
                        //HTML returns us back to the main page, or you can create a success page
                          html: function(){
                               res.redirect("/questions");
                         },
                         //JSON returns the item with the message that is has been deleted
                        json: function(){
                               res.json({message : 'deleted',
                                   item : question
                               });
                         }
                      });
                }
            });
        }
    });
    */
});

module.exports = router;