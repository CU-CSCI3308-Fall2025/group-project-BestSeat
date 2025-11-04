// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcryptjs'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part C.

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
});

// database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************

// API Routes
// These endpoints return JSON data for frontend use

/**
 * GET /events
 * Search/browse events from Ticketmaster
 * Query params: keyword (optional), city (optional), page (optional), size (optional)
 * Returns: JSON array of events with data_source field
 */
app.get('/events', async (req, res) => {
  try {
    const { keyword, city, page, size } = req.query;
    
    const params = {
      apikey: process.env.API_KEY,
      size: size || 20, // Defaults to 20 results
      page: page || 0,   // Defaults to first page
    };
    
    // Add optional search parameters if provided
    if (keyword) params.keyword = keyword;
    if (city) params.city = city;
    
    const response = await axios({
      url: 'https://app.ticketmaster.com/discovery/v2/events.json',
      method: 'GET',
      headers: {
        'Accept-Encoding': 'application/json',
      },
      params: params,
    });
    
    // Transform the Ticketmaster data to our standardized format
    // TODO: Expand
    const events = response.data._embedded?.events.map(event => {
      return {
        id: event.id,
        name: event.name,
        url: event.url,
        data_source: 'ticketmaster', // Identifies the API source
      };
    }) || [];
    
    res.status(200).json({
      success: true,
      data_source: 'ticketmaster',
      events: events,
    });
  } catch (error) {
    console.error('Error fetching events:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching events from provider',
      error: error.message,
    });
  }
});

/**
 * GET /events/:eventId
 * Get detailed information for a specific event
 * Returns: JSON object with event details and data_source field
 */
app.get('/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const response = await axios({
      url: `https://app.ticketmaster.com/discovery/v2/events/${eventId}.json`,
      method: 'GET',
      headers: {
        'Accept-Encoding': 'application/json',
      },
      params: {
        apikey: process.env.API_KEY,
      },
    });
    
    const event = response.data;
    
    // Transform to our standardized format with more detailed information
    // TODO: Expand
    const eventDetails = {
      id: event.id,
      name: event.name,
      url: event.url,
      data_source: 'ticketmaster', // Identifies the API source
    };
    
    res.status(200).json({
      success: true,
      data_source: 'ticketmaster',
      event: eventDetails,
    });
  } catch (error) {
    console.error('Error fetching event details:', error.message);
    
    if (error.response?.status === 404) {
      res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error fetching event details',
        error: error.message,
      });
    }
  }
});

/**
 * GET /events/:eventId/listings
 * Get ticket listings from all integrated providers for a specific event
 * Returns: JSON object with listings from multiple sources
 */
app.get('/events/:eventId/listings', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Array to hold listings from multiple providers
    const allListings = [];
    
    // Get Ticketmaster listings (primary source)
    try {
      const tmResponse = await axios({
        url: `https://app.ticketmaster.com/discovery/v2/events/${eventId}.json`,
        method: 'GET',
        headers: {
          'Accept-Encoding': 'application/json',
        },
        params: {
          apikey: process.env.API_KEY,
        },
      });
      
      const event = tmResponse.data;
      
      // Add it in as a generic listing for now
      // TODO: Expand
      if (allListings.length === 0) {
        allListings.push({
          event_id: eventId,
          event_name: event.name,
          provider_url: event.url,
          data_source: 'ticketmaster',
        });
      }
    } catch (tmError) {
      console.error('Error fetching Ticketmaster listings:', tmError.message);
    }
    
    // TODO: In the future, integrate additional providers here
    // Each API provider would add their listings to the allListings array
    // with their own data_source identifier
    
    res.status(200).json({
      success: true,
      event_id: eventId,
      listing_count: allListings.length,
      providers: [...new Set(allListings.map(l => l.provider))], // List all unique providers
      listings: allListings,
    });
  } catch (error) {
    console.error('Error fetching listings:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching ticket listings',
      error: error.message,
    });
  }
});

// Existing page routes below
app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/register', (req, res) => {
  res.render('pages/register');
});

app.post('/register', async (req, res) => {
  const hash = await bcrypt.hash(req.body.password, 10);
  try {
    await db.none('INSERT INTO users(username, password) VALUES($1, $2)', [
      req.body.username,
      hash,
    ]);
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    res.render('pages/register', { message: 'Registration failed.', error: true });
  }
});

app.get('/login', (req, res) => {
  res.render('pages/login');
});

app.post('/login', async (req, res) => {
  try {
    const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [
      req.body.username,
    ]);
    if (!user) return res.redirect('/register');

    const match = await bcrypt.compare(req.body.password, user.password);
    if (!match)
      return res.render('pages/login', { message: 'Incorrect username or password.', error: true });

    req.session.user = user;
    req.session.save();
    res.redirect('/discover');
  } catch (err) {
    console.error(err);
    res.render('pages/login', { message: 'Login failed.', error: true });
  }
});

const auth = (req, res, next) => {
  if (!req.session.user) 
    return res.redirect('/login');
  next();
};
app.use(auth);

app.get('/discover', async (req, res) => {
  try {
    const results = await axios({
      url: 'https://app.ticketmaster.com/discovery/v2/events.json',
      method: 'GET',
      params: {
        apikey: process.env.API_KEY,
        keyword: 'edm',
        size: 10,
      },
    });
    res.render('pages/discover', { results: results.data._embedded.events });
  } catch (error) {
    console.error(error);
    res.render('pages/discover', { results: [], message: 'Error loading events', error: true });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.render('pages/home', { message: 'Logged out Successfully' });
  });
});

// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log('Server is listening on port 3000');