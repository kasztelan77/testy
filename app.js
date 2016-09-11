var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var db = require('./model/db');
var questions = require('./model/questions');
var categories = require('./model/categories');
var levels = require('./model/levels');
var users = require('./model/users');
var groups = require('./model/groups');
var tests = require('./model/tests');

var routes = require('./routes/index');
//var users = require('./routes/users');
var questionRoutes = require('./routes/questionRoutes');
var categoryRoutes = require('./routes/categoryRoutes');
var levelRoutes = require('./routes/levelRoutes');
var userRoutes = require('./routes/userRoutes');
var groupRoutes = require('./routes/groupRoutes');
var testRoutes = require('./routes/testRoutes');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
//app.use('/users', users);
app.use('/questions', questionRoutes);
app.use('/categories', categoryRoutes);
app.use('/levels', levelRoutes);
app.use('/users', userRoutes);
app.use('/groups', groupRoutes);
app.use('/tests', testRoutes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
