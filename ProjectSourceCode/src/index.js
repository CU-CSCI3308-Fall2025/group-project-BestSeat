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
// <!-- Section 1.5 : API Normalization Helpers -->
// *****************************************************

/**
 * Normalizes event data from different API providers into a standard format
 */
function normalizeEventData(eventData, source) {
  if (source === 'ticketmaster') {
    return normalizeTicketmasterEvent(eventData);
  }
  // TODO: add more providers here
  // else if (source === 'stubhub') { return normalizeStubhubEvent(eventData); }
  
  // Default fallback
  return {
    id: eventData.id || null,
    name: eventData.name || 'Untitled Event',
    data_source: source,
  };
}

/**
 * Normalizes Ticketmaster event data to our standard format
 */
function normalizeTicketmasterEvent(event) {
  // Extract classification data
  const primaryClassification = event.classifications?.[0] || {};
  
  // Extract venue information
  const venue = event._embedded?.venues?.[0] || {};
  
  // Extract date/time information
  const dates = event.dates?.start || {};
  
  // Extract price information
  const priceRanges = event.priceRanges?.[0] || {};
  
  // Extract promoter information
  const promoter = event.promoter || event.promoters?.[0] || {};
  
  return {
    // Core Identifiers
    id: event.id,
    data_source: 'ticketmaster',
    
    // Basic Information
    name: event.name || 'Untitled Event',
    description: event.info || event.pleaseNote || null,
    type: event.type || 'event',
    
    // Classification
    category: primaryClassification.segment?.name || null,
    genre: primaryClassification.genre?.name || null,
    subGenre: primaryClassification.subGenre?.name || null,
    
    // URLs and Media
    url: event.url || null,
    images: event.images?.map(img => ({
      url: img.url,
      width: img.width,
      height: img.height,
      ratio: img.ratio,
      fallback: img.fallback || false,
    })) || [],
    
    // Date and Time
    date: {
      start: dates.localDate || null,
      time: dates.localTime || null,
      datetime: dates.dateTime || null,
      timezone: dates.timezone || null,
      tba: dates.dateTBA || false,
      tbd: dates.dateTBD || false,
      noSpecificTime: dates.noSpecificTime || false,
    },
    
    // Venue Information
    venue: {
      id: venue.id || null,
      name: venue.name || null,
      address: venue.address?.line1 || null,
      city: venue.city?.name || null,
      state: venue.state?.name || null,
      stateCode: venue.state?.stateCode || null,
      postalCode: venue.postalCode || null,
      country: venue.country?.name || null,
      countryCode: venue.country?.countryCode || null,
      location: {
        latitude: venue.location?.latitude || null,
        longitude: venue.location?.longitude || null,
      },
      timezone: venue.timezone || null,
      url: venue.url || null,
    },
    
    // Pricing
    pricing: {
      currency: priceRanges.currency || 'USD',
      min: priceRanges.min || null,
      max: priceRanges.max || null,
      type: priceRanges.type || null,
    },
    
    // Sales Information
    sales: {
      public: {
        startDateTime: event.sales?.public?.startDateTime || null,
        endDateTime: event.sales?.public?.endDateTime || null,
      },
      presales: event.sales?.presales?.map(presale => ({
        name: presale.name || null,
        startDateTime: presale.startDateTime || null,
        endDateTime: presale.endDateTime || null,
      })) || [],
    },
    
    // Status
    status: event.dates?.status?.code || 'unknown',
    
    // Additional Information
    accessibility: event.accessibility || null,
    ageRestrictions: event.ageRestrictions?.legalAgeEnforced || null,
    seatmap: event.seatmap?.staticUrl || null,
    promoter: {
      id: promoter.id || null,
      name: promoter.name || null,
    },
    
    // Products (Attractions/Performers)
    attractions: event._embedded?.attractions?.map(attraction => ({
      id: attraction.id,
      name: attraction.name,
      type: attraction.type || null,
      url: attraction.url || null,
      image: attraction.images?.[0]?.url || null,
    })) || [],
  };
}

/*
Finds an event by its source from the results of Real-Time Events
*/
function searchEventBySource(events, source) {
  return events.find(event => event.source === source);
}


// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
  helpers: {
    // Check if a source is selected
    isSourceSelected: function(selectedSources, source) {
      if (!selectedSources || !Array.isArray(selectedSources)) return false;
      return selectedSources.includes(source);
    },
    // Compare two values for equality
    eq: function(a, b) {
      return a === b;
    }
  }
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

app.get('/', (req, res) => {
  res.render('pages/login');
});


//Register Route
app.get('/register', (req, res) => {
  res.render('pages/register');
});

app.post('/register', async (req, res) => {
  const hash = await bcrypt.hash(req.body.password, 10);
  const email = req.body.email.toLowerCase();
  const query = `INSERT INTO users (email, pass) VALUES ($1, $2);`;
  try 
  {
    await db.none(query, [email, hash]);
    res.redirect('/login');
  }
  catch(err)
  {
    console.error(err);
    res.status(400).render('pages/register', { error: 'Registration failed. Email may already exist.' });
  }
});

//Login Route
app.get('/login', (req, res) => {
  res.render('pages/login');
});

app.post('/login', async (req, res) => {
  const email = req.body.email.toLowerCase();
  let query = `SELECT * FROM users WHERE email = $1;`;
  let user = await db.oneOrNone(query, [email]);
  if (!user) {
    return res.render('pages/login', { error: "User not found" });
  }
  else
  {
    const match = await bcrypt.compare(req.body.password, user.pass);
    if (match) {
      user.email = email;
      user.displayName = email.split('@')[0];

      req.session.user = user;
      req.session.save(() => {
        res.redirect('/search');
      });
    }
    else {
      res.render('pages/login', {error: "Invalid password"});
    }
    //console.log(user.email);
    //console.log(user.displayName);
    //console.log(user.password);
  }
});

// Authentication Middleware.
const auth = (req, res, next) => {
  if (!req.session.user)
    return res.redirect('/login');
  next();
};

app.get('/search', auth, async (req, res) => {
  const searchTerm = req.query.searchTerm || '';
  const genre = req.query.genre || '';
  const date = req.query.date || '';
  const location = req.query.location || '';
  const priceRange = req.query.priceRange || '';
  const sources = req.query.source || [];
  
  // Normalize sources to array
  const sourcesArray = Array.isArray(sources) ? sources : (sources ? [sources] : []);
  
  try
  {
    // Ticketmaster API parameters
    const apiParams = {
      apikey: process.env.API_KEY,
      size: 30,
    };
    
    // Add keyword search if provided
    if (searchTerm) {
      apiParams.keyword = searchTerm;
    }
    
    // Add genre filter if provided
    if (genre) {
      apiParams.classificationName = genre;
    }
    
    // Add date filter if provided
    if (date) {
      // Format: YYYY-MM-DD
      const startDateTime = `${date}T00:00:00Z`;
      const endDateTime = `${date}T23:59:59Z`;
      apiParams.startDateTime = startDateTime;
      apiParams.endDateTime = endDateTime;
    }
    
    // Add location filter if provided (city/state)
    if (location) {
      apiParams.city = location;
    }

    const results = await axios({
        url: 'https://app.ticketmaster.com/discovery/v2/events.json',
        method: 'GET',
        params: {
          apikey: process.env.TICKETMASTER_API_KEY,
          keyword: searchTerm,
          size: 30,
        }
      });
      
    if(!results.data._embedded || !results.data._embedded.events)
    {
      return res.render('pages/search', { 
        results: [], 
        message: 'No events found', 
        isSearchPage: true,
        searchTerm,
        genre,
        date,
        location,
        priceRange,
        selectedSources: sourcesArray
      });
    }
    else
    {
      // Normalize all events from Ticketmaster to our standard format
      let normalizedEvents = results.data._embedded.events.map(event => 
        normalizeEventData(event, 'ticketmaster')
      );
      
      // Apply client-side filters that can't be handled by the API
      
      // Filter by price range if provided
      if (priceRange && priceRange !== '0') {
        const maxPrice = parseFloat(priceRange);
        normalizedEvents = normalizedEvents.filter(event => {
          if (!event.pricing || !event.pricing.min) return true; // Include events without price info
          return event.pricing.min <= maxPrice;
        });
      }
      
      // Filter by data source if any are selected
      if (sourcesArray.length > 0) {
        normalizedEvents = normalizedEvents.filter(event => {
          const eventSource = event.data_source.toLowerCase();
          return sourcesArray.some(source => source.toLowerCase() === eventSource);
        });
      }
      
      res.render('pages/search', { 
        results: normalizedEvents, 
        isSearchPage: true,
        searchTerm,
        genre,
        date,
        location,
        priceRange,
        selectedSources: sourcesArray
      });
    }
  }
  catch(error)
  {
    console.error(error);
    res.render('pages/search', { 
      results: [], 
      message: 'Error loading events', 
      error: true,
      searchTerm,
      genre,
      date,
      location,
      priceRange,
      selectedSources: sourcesArray
    });
  }
});

//profile route
app.get('/profile', auth, (req, res) => {
  res.render('pages/profile', { 
    isProfilePage: true,
    user: req.session.user
  });
});

app.post('/profile/update-name', auth, (req, res) => {
  const { displayName } = req.body;

  req.session.user.displayName = displayName;

  res.json({ success: true, displayName });
});


//comparisons route
app.get('/comparisons', auth, async (req, res) => {
  const eventId = req.query.eventId || '';
  let ticketMasterResponse = null;
  let ticketMasterEvent = null;
  //Get event data from Ticketmaster
  try
  {
    ticketMasterResponse = await axios({
        url: `https://app.ticketmaster.com/discovery/v2/events/${eventId}.json`,
        method: 'GET',
        params: {
          apikey: process.env.TICKETMASTER_API_KEY,
        }
      });

    if(!ticketMasterResponse.data)
    {
        return res.render('pages/comparisons', { results: [], message: 'Event not found on TicketMaster', isComparisonsPage: true });
    }
    else
    {
        // Normalize event from Ticketmaster to our standard format
        ticketMasterEvent = normalizeEventData(ticketMasterResponse.data, 'ticketmaster');
        console.log('TicketMaster Event:', ticketMasterEvent);
    }
  }
  catch(error)
  {
    console.error(error);
    return res.render('pages/comparisons', { results: [], message: 'Error loading event from TicketMaster', error: true });
  }

  //Using Real-Time Events API 
  const query = {
    method: 'GET',
    url: 'https://real-time-events-search.p.rapidapi.com/search-events',
    params: {
      query: ticketMasterEvent.name,
      start: '0'
    },
    headers: {
      'x-rapidapi-key': process.env.RAPID_API_KEY,
      'x-rapidapi-host': 'real-time-events-search.p.rapidapi.com'
    }
  };

  try
  {
    const rteResponse = await axios.request(query);
    console.log('Real-Time Events Response:', rteResponse.data);
    if(!rteResponse.data || rteResponse.data.length == 0)
    {
      return res.render('pages/comparisons', { ticketMaster: ticketMasterEvent, listings: [], message: 'No other sellers found', isComparisonsPage: true });
    }

    // Extrac the sellers from the response
    const event_sellers = rteResponse.data.data.ticket_links;

    // const normalizedEvents = rteResponse.data.data.map(event => {
    //   let source_index = 0;
    //   return normalizeEventData(event, sourceNames[source_index] || 'unknown');
    // });

    res.render('pages/comparisons', { ticketMaster: ticketMasterEvent, listings: event_sellers, message: 'Loaded successfully', isComparisonsPage: true })
  }
  catch(error)
  {
    console.error(error);
    return res.render('pages/comparisons', { ticketMaster: ticketMasterEvent, listings: [], message: 'Error loading event', error: true });
  }

});

app.get('/discover', auth, async (req, res) => {
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
    // Normalize all events from Ticketmaster to our standard format
    const normalizedEvents = results.data._embedded.events.map(event => 
      normalizeEventData(event, 'ticketmaster')
    );
    res.render('pages/discover', { results: normalizedEvents });
  } catch (error) {
    console.error(error);
    res.render('pages/discover', { results: [], message: 'Error loading events', error: true });
  }
});
//change password route
app.post('/profile/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.session.user.id;
    if (newPassword !== confirmPassword) {
      return res.render('pages/profile', {
        user: req.session.user,
        error: 'New passwords do not match.',
        isProfilePage: true
      });
    }


    const query = 'SELECT pass FROM users WHERE id = $1;';
    const user = await db.oneOrNone(query, [userId]);


    if (!user) {
      return res.render('pages/profile', {
        user: req.session.user,
        error: 'User not found.',
        isProfilePage: true
      });
    }
    const passwordMatch = await bcrypt.compare(currentPassword, user.pass);
    if (!passwordMatch) {
      return res.render('pages/profile', {
        user: req.session.user,
        error: 'Current password is incorrect.',
        isProfilePage: true
      });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updateQuery = 'UPDATE users SET pass = $1 WHERE id = $2;';
    await db.none(updateQuery, [hashedPassword, userId]);


    res.render('pages/profile', {
      user: req.session.user,
      message: 'Password successfully changed!',
      isProfilePage: true
    });
  } catch (error) {
    console.error(error);
    res.render('pages/profile', {
      user: req.session.user,
      error: 'An error occurred while changing the password.',
      isProfilePage: true
    });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});

// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');