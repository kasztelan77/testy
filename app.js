var express = require('express');
var passport = require('passport');
var passportLocalStrategy = require('passport-local').Strategy;
var flash = require('connect-flash');
var session = require('express-session');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var db = require('./config/db');
var auth = require('./config/auth');
var questions = require('./model/questions');
var categories = require('./model/categories');
var levels = require('./model/levels');
var users = require('./model/users');
var groups = require('./model/groups');
var tests = require('./model/tests');

var mainRoutes = require('./routes/index');
//var users = require('./routes/users');
var questionRoutes = require('./routes/questionRoutes');
var categoryRoutes = require('./routes/categoryRoutes');
var levelRoutes = require('./routes/levelRoutes');
var userRoutes = require('./routes/userRoutes');
var groupRoutes = require('./routes/groupRoutes');
var testRoutes = require('./routes/testRoutes');

require('./config/passport')(passport); // pass passport for configuration

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));
//app.use(cookieParser('BroniaSieJeszczeTwierdzeGrenadyAleWGrenadzieZaraza'));
app.use(cookieParser('JuzWGruzachLezaMaurowPosadyNarodIchDzwigaZelaza'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({ secret: 'JuzWGruzachLezaMaurowPosadyNarodIchDzwigaZelaza'}));
app.use(passport.initialize());
app.use(passport.session()); //persistent login session
app.use(flash());

app.use('/', mainRoutes);
//app.use('/users', users);
//app.use('/login', loginRoutes);
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
  console.log('in error handler; error: ' + err.message);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

// passport config
//passport.use(new passportLocalStrategy(accounts.authenticate()));
passport.use(new passportLocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    session: true
  },
users.authenticate()));
passport.serializeUser(users.serializeUser());
passport.deserializeUser(users.deserializeUser());

module.exports = app;
