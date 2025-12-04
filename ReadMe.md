# BestSeat

## Project Overview

**BestSeat** is an application that creates a hub for finding the best tickets for concerts or events. Users can sign on, search for the event they are interested in, and see a variety of vendors/websites to find their best ticket. 

Users will have their own account, which will have its own login and registration page, respectively. User data will include a hashed password and username/email, which will be stored in a database. Users will be able to change their password anytime they are logged in through the profile page. Users can log out at any time, destroying the session in the profile page

From the login page, Users are able to search and select the event they are searching for using a variety of filters, ranging from date, genre, keyword, and location. Once selected, they will be shown a list of available tickets from different vendors. Links and images of each vendor are present for the selected event, and the user is shown the event’s time, location, and name on this comparisons page.


## Contributors

- Kyle Behnken
- Tate Bullinger
- Blake Huhn
- Eyal Lahat

## Technology Stack

| Layer | Technology |
|-------|-------------|
| **Frontend** | HTML, CSS, JavaScript, Handlebars|
| **Backend** | Node.js, Express.js |
| **Database** | PostgreSQL 14 |
| **API Integrations** | Ticketmaster API, Rapid API|
| **Authentication** | bcryptjs (password hashing), express-session |
| **HTTP Client** | Axios |
| **Testing Framework** | Mocha, Chai, Chai-HTTP |
| **Version Control** | Git & GitHub |
| **Containerization** | Docker & Docker Compose |
| **Project Management** | Agile via GitHub Projects |

## Prerequisites

Before running the application locally, ensure you have the following installed:

- **Docker** and **Docker Compose** (for containerized setup)
- **Node.js** (v14 or higher) and **npm** (if running without Docker)
- **PostgreSQL** (v14 or higher, if running without Docker)
- **Git** (for version control)

## Directory Structure

```
ProjectSourceCode/
├── src/
│   ├── index.js                 # Main server file
│   ├── init_data/               # Database initialization scripts
│   │   ├── create.sql           # Database schema creation
│   │   └── insert.sql           # Initial data insertion
│   ├── resources/
│   │   ├── css/
│   │   │   └── style.css        # Application styling
│   │   ├── img/                 # Image assets
│   │   └── js/
│   │       └── script.js        # Client-side JavaScript
│   └── views/                   # Handlebars templates
│       ├── layouts/
│       │   └── main.hbs         # Main layout template
│       ├── pages/               # Page templates
│       │   ├── comparisons.hbs  # Ticket comparison page
│       │   ├── login.hbs        # Login page
│       │   ├── profile.hbs      # User profile page
│       │   ├── register.hbs     # Registration page
│       │   └── search.hbs       # Event search page
│       └── partials/            # Reusable template components
│           ├── footer.hbs
│           ├── header.hbs
│           ├── message.hbs
│           ├── navbar.hbs
│           └── title.hbs
├── test/
│   └── server.spec.js           # Test specifications using Mocha & Chai
├── package.json                 # Project dependencies and scripts
├── docker-compose.yaml          # Docker Compose configuration
└── .env                         # Environment variables (gitignored)
```

## Running the Application Locally

### Option 1: Using Docker Compose (Recommended)

Docker Compose handles both the Node.js server and PostgreSQL database setup automatically.

1. **Navigate to the project directory:**
   ```bash
   cd ProjectSourceCode
   ```

2. **Create a `.env` file** in the `ProjectSourceCode` directory with the following environment variables:
   ```
    POSTGRES_DB=""
    POSTGRES_USER=""
    POSTGRES_PASSWORD=""

    SESSION_SECRET=""
    API_KEY=""
    TICKETMASTER_API_KEY=""
    RAPID_API_KEY=""
   ```

3. **Start the application:**
   ```bash
   docker compose up
   ```

4. **Access the application:**
   Open your browser and navigate to `http://localhost:3000`

5. **Stop the application:**
   ```bash
   docker compose down
   ```
## Running Tests

### Using Docker Compose

Tests are automatically run when you start the application with Docker Compose. The `testandrun` script runs tests before starting the server.

### Running Tests Manually

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the test suite:**
   ```bash
   npm test
   ```
   This runs Mocha tests defined in `test/server.spec.js`

3. **Run tests and start the server:**
   ```bash
   npm run testandrun
   ```


## Application Link

**Deployed Application**: https://group-project-bestseat.onrender.com

## Docker Commands

```bash
Start Docker: docker compose up -d  
End Docker: docker compose down  
Start postgres: docker compose exec db psql -U postgres  
                \c bestseat_db
```