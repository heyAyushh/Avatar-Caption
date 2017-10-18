const express = require('express');
const passport = require('passport');
const GitHubStrategy = require('passport-github').Strategy;
const request = require('request');

// asetup, uthentication and session boilerplate
// -------------------------------------------------------------------------------
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "https://github-graphql-example-app.glitch.me/callback"
}, function(accessToken, refreshToken, profile, cb) {
    const user = {
      token: accessToken
    }
    cb(null, user);
  }
));

passport.serializeUser(function(obj, cb) {
  cb(null, obj);
});

passport.deserializeUser(function(accessToken, cb) {
  cb(null, accessToken);
});const app = express();

// logging, parsing, and session handling.
app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: process.env.COOKIE_SECRET, resave: true, saveUninitialized: true }));

// Initialize Passport and restore authentication state, if any, from the session.
app.use(passport.initialize());
app.use(passport.session());

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get('/login', passport.authenticate('github'));

app.get(
  '/callback', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  }
);
// --------------------------------------------------------------------------------
// Actual interesting code starts here
app.get("/hi", function (req, res) {
  console.log(req.isAuthenticated());
  res.send(req.user);
});
app.get('/test', (req, res) => {
  console.log(req.isAuthenticated());
  console.log(req.user);
  if (req.user) {
    // render actual page with data
    const graphqlQuery = `
      query {
        viewer {
          repositories(first: 100) {
            edges {
              node {
                languages(first: 100) {
                  edges {
                    node {
                      name
                      color

                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    const body = { query: graphqlQuery };
    request.post('https://api.github.com/graphql', {
      body,
      headers: {
        'User-Agent': 'my glitch app',
        'Authorization': `Bearer ${req.user.token}`,
      },
      json: true,
    }, (error, response, body) => {
      if (error) {
         console.log('error', error); 
      }
      console.log('body', body);
      res.send(JSON.stringify(body));
    })
  } else {
     // render homepage with login to GitHub button
    res.redirect('/login'); 
  }
})


// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
