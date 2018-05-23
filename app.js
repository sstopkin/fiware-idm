var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var csrf = require('csurf')
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
//var session = require('express-session');
var session = require('cookie-session');
var partials = require('express-partials');
var sassMiddleware = require('node-sass-middleware');
var forceSsl = require('express-force-ssl');
var clc = require('cli-color');
var cors = require('cors');

// Obtain secret from config file
var config = require ('./config.js');

// Create vars that store routes
var index = require('./routes/web/index');
var api = require('./routes/api/index');
var oauth2 = require('./routes/oauth2/oauth2');

var app = express();
app.use(cors());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Set logs in development
app.use(logger('dev'));

// Disabled header 
app.disable('x-powered-by');

// Parse request
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

// Set routes for api
app.use('/v1', api);
app.use('/v3', api); // REDIRECT OLD KEYSTONE REQUESTS TO THE SAME API

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(partials());
app.use(cookieParser(config.session.secret));
app.use(session({
  secret: config.session.secret,
  name: 'session',
  secure: config.https.enabled,
  maxAge: config.session.expires
}));

var styles = config.site.theme || 'default';
// Middleware to convert sass files to css
app.use(sassMiddleware({
    src: path.join(__dirname, 'themes/' + styles),
    dest: path.join(__dirname, 'public/stylesheets'),
    debug: true,
    // outputStyle: 'compressed',
    outputStyle: 'extended',
    prefix:  '/stylesheets'  // Where prefix is at <link rel="stylesheets" href="prefix/style.css"/>
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));


// Helpers dinamicos:
app.use(function(req, res, next) {

  res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');

  // init req.session.redir
  if (!req.session.redir) {
    req.session.redir = '/';
  }

  // To make visible req.session in the view
  res.locals.session = req.session;
  
  // {text: 'message text', type: 'info | success | warning | danger'}
  res.locals.message = {};

  res.locals.site = config.site;
  res.locals.fs = require('fs');
  
  next();
});


// Set routes for oauth2
app.use('/oauth2', oauth2);
app.get('/user', require('./controllers/oauth2/oauth2').authenticate_token);

// Force HTTPS connection to web server
if (config.https.enabled) {
  app.use('/', forceSsl, index);
} else {
  app.use('/', index);
}

// Check connection with Authzforce
if (config.authzforce.enabled) {
  require('./lib/authzforce.js').check_connection().then(function(status) {
    console.log(clc.green('Connection with Authzforce: ' + status))
  }).catch(function(error) {
    console.log(clc.red(error))
  })
}

module.exports = app;

