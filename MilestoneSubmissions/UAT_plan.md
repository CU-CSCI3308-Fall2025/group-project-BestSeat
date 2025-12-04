# BestSeat - User Acceptance Test Plan

---

## Feature 1: User Registration

### Feature Description
New users can create an account by providing an email address and password. Passwords are securely hashed before storage.

### Prerequisites
- Application is running on `localhost:3000`
- User does not exist in database

### Test Data
- **Email:** `testuser@example.com`
- **Password:** `SecurePass123!`

### Test Steps
1. Go to `http://localhost:3000`
2. Click on "Register"
3. Enter email: `testuser@example.com`
4. Enter password: `SecurePass123!`
5. Submit

### Expected Results
- User is redirected to the login page (`/login`)
- User is created in the database with hashed password
- User can verify entry in database:
  ```sql
  SELECT * FROM users WHERE email = 'testuser@example.com';
  ```

### Acceptance Criteria
The test is considered passed if all the following are true: 
1. The user is redirected to /login immediately after registering
2. A new user is created in the db 
3. The user's password is hashed 
4. No server errors or form validation errors appear

The test is considered failed if any of the above conditions are not met.

**User Testers:**
The user is a friend running the program locally. They start at the register page from http://localhost:3000/register. They enter the test data credentials Email: testuser@example.com, Password: SecurePass123!. They click the register button. 

**Actual Results:**
They are redirected to http://localhost:3000/login. To verify the test was successful we connected back to the db and did a query to find a user with the specified email from the test:
docker compose exec db psql -U user -d users -c "SELECT * FROM users WHERE email = 'testuser@example.com';"
 id |        email         |                             pass                             
----+----------------------+--------------------------------------------------------------
 43 | testuser@example.com | $2a$10$xwD7Vb0N9skVqd3cN5EbB.5pnNdOyMqmYCzR0EIi4vi/4oEZGjKv.
(1 row)

This test passes as the user populated in the db and the redirect to login was as expected with a hashed password. 

---

## Feature 2: User Login and Authentication

### Feature Description
Registered users can log in using their email and password. The system validates credentials and creates a session for authenticated users. Authentication middleware protects routes requiring login.

### Prerequisites
- Application is running on `localhost:3000`
- User account exists in database

### Test Data
- **Email:** `testuser@example.com`
- **Password:** `SecurePass123!`

### Test Steps
1. Go to `http://localhost:3000/login`
2. Enter email: `testuser@example.com`
3. Enter password: `SecurePass123!`
4. Login

### Expected Results
- User is successfully authenticated
- User is redirected to `/search` page
- Session is created for the user
- User can access protected routes (profile, search, etc.)

### Acceptance Criteria
The test is considered passed if all the following are true: 
1. The login succeeds with valid credentials
2. The user is redirected to `/search` 
3. A session cookie is created and visible in the browser 
4. Logging out destroys the session and redirects to login

The test is considered failed if any of the above conditions are not met.

**User Testers:**
The user is a friend running the program locally. They start at the login page from http://localhost:3000/login. They enter the test data credentials Email: testuser@example.com, Password: SecurePass123!. They click the login button.

**Actual Results:**
The user is redirected to http://localhost:3000/search where they see the entire search page including navbar, filters, and ticketmaster api options. They are able to seamlessly go between profile and search/home page as expected and can logout at the profile page to destroy their session and are redirected to the login page.

This test was successful because a successful user season was created only when proper credentials were entered and all features work when logged in which was as expected. They were also able to logout with a destroyed session and properly redirected to login

---

## Feature 3: Event Search and Discovery

### Feature Description
Authenticated users can search for concert events using the Ticketmaster API. The application displays event details including name, date, time, and image.

### Prerequisites
- Application is running on `localhost:3000`
- User is logged in with valid session
- Valid Ticketmaster API key and Rapid API key is configured
- Internet connection is available

### Test Data
- **API Search Keyword:** "Denver Broncos"

### Test Steps
1. Login with valid credentials
2. Navigate to `/search` page
3. Observe the event listings displayed

### Expected Results
- Denver Broncos events are displayed
- Each event card contains:
  - Event image (or default image if unavailable)
  - Event name
  - Event date and time (if available)
  - Link to comparison page for that event
- No error messages are displayed

### Acceptance Criteria
The test is considered passed if all the following are true: 
1. Searching "Denver Broncos" displays events relevant to that query
2. Each event card includes a valid image, name, date, time, and link to comparisons page 
3. The URL updates with ?searchTerm=Denver+Broncos
4. No API errors or UI errors appear

The test is considered failed if any of the above conditions are not met.

**User Testers:**
The user is a friend running the program locally. They start at the login page from http://localhost:3000/search already logged into with a valid session. They go to the search bar located on the top middle of the navigation bar. They enter the keyword “Denver Broncos” and click the search button located next to the search bar. 

**Actual Results:**
The search url is now updated to: http://localhost:3000/search?searchTerm=Denver+Broncos, in the search page there are now results related to the Denver Broncos like:  Denver Broncos vs. Jacksonville Jaguars, Las Vegas Raiders vs. Denver Broncos, and Denver Broncos vs. Green Bay Packers. All of these cards include their respective image, date, time, and link. 

This test was successful because the user saw search results related to their keyword and were met with no errors or inconsistencies at any point. 

## Feature 4: Comparisons

### Feature Description
Authenticated users can search for event ticket options using the Rapid API. The application displays event details, including name, date, time, image, and location. The application displays options to purchase tickets from various ticket vendors of specific event. 

### Prerequisites
- Application is running on `localhost:3000`
- User is logged in with valid session
- Valid Ticketmaster API key and Rapid API key is configured
- Internet connection is available

### Test Data
- Any valid Ticketmaster event 

### Test Steps
1. Login with valid credentials
2. Navigate to `/search` page
3. Select an event to compare

### Expected Results
- A message with Loaded successfully is displayed
- An event card is present containing:
  - Event name
  - Event date and time (if available)
  - Event image (or default image if unavailable)
  - A list of various vendors is present containing: 
    - Name of the vendor
    - Logo of vendor 
    - Link to purchase a ticket for specified event at specified vendor
- No error messages are displayed

### Acceptance Criteria
The test is considered passed if all the following are true: 
1. User is redirect to comparisons page with a message of "loaded successfully"
2. Event details are displayed and correct
3. The URL updates with proper eventid for query param
4. No API errors or UI errors appear
5. User is able to click and go to diferent sites using the Buy Tickets button for each vendor available 

The test is considered failed if any of the above conditions are not met.

**User Testers:**
The user is a friend running the program locally. They start at the login page from http://localhost:3000/search already logged into with a valid session. They click on the first displayed event called "Minnesota Timberwolves vs. Pheonix Suns". 

**Actual Results:**
The search url is now updated to: http://localhost:3000/comparisons?eventId=G5vzZbPS8HV4n, the message of Loaded Successfully is at the top of the page, the event's name, date, time, location, and images are present at the top. Rows of boxes, buttons, and labels is present with different ticket vendors. These include the name of the vendor, logo, and a working link to buy tickets of the game specified at that vendor's site. The user clicks a few of these buttons and opens a new tab with options to but tickets to that game. 

This test was successful because the user saw all of the event information as expected, saw no errors, and was able to see different ticket vendors with working link.
