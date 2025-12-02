// ********************** Initialize server **********************************

const server = require('../src/index'); //TODO: Make sure the path to your index.js is correctly added

// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************

describe('Server!', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
  });
});

// *********************** TODO: WRITE 2 UNIT TESTCASES **************************

// ********************************************************************************

// Example Positive Testcase :
// API: /register
// Input: {email: 'JohnDoe@email.com', password: 'pwd'}
// Expect: res.status == 200 and res.body.message == 'Success'
// Result: This test case should pass and return a status 200 along with a "Success" message.
// Explanation: The testcase will call the /register API with the following input
// and expects the API to return a status of 200 along with the "Success" message.

const uniqueEmail = `test${Date.now()}@email.com`;

describe('Testing Register API - positive', () => {//proper registration test
  it('positive : /register', done => {
    const uniqueEmailPositive = `test${Date.now()}@email.com`;
    chai
      .request(server)
      .post('/register')
      .send({ email: uniqueEmailPositive, password: 'pwd' })
      .end((err, res) => {

        res.should.have.status(200);
        res.redirects[0].should.include('/login'); 
        done();
      });
  });
});


describe('Testing Register API - negative', () => {//duplicate email test
  it('negative : /register', done => {
    chai
      .request(server)
      .post('/register')
      .send({ email: uniqueEmail, password: 'pwd' })
      .end((err, res) => {

        res.should.have.status(400);
        res.text.should.include('Registration failed'); 
        done();
      });
  });
});

before(done => {
  chai.request(server)
    .post('/register')
    .send({ email: uniqueEmail, password: 'pwd'})
    .end((err, res) => {
      done();
    });
});


describe('Testing Login API', () => {//positive login
  it('positive : /login', done => {
    chai
      .request(server)
      .post('/login')
      .send({ email: uniqueEmail, password: 'pwd' })
      .end((err, res) => {
        res.should.have.status(200);
        res.redirects[0].should.include('/search');
        done();
      });
  });
});


describe('Testing Login API', () => {//negative login wrong password
  it('negative : /login - wrong password', done => {
    chai
      .request(server)
      .post('/login')
      .send({ email: uniqueEmail, password: 'wrongpassword' })
      .end((err, res) => {
        res.should.have.status(200);
        res.text.should.include('Invalid password');
        done();
      });
  });
});

describe('Testing Login API', () => {//negative login non-existent user
  it('negative : /login - non-existent user', done => {
    chai
      .request(server)
      .post('/login')
      .send({ email: 'doesnotexist@email.com', password: 'pwd' })
      .end((err, res) => {
        res.should.have.status(200);
        res.text.should.include('User not found');
        done();
      });
  });
});


describe('Testing Render', () => {
  it('test "/login" route should render with an html response', done => {
    chai
      .request(server)
      .get('/login')
      .end((err, res) => {
        res.should.have.status(200); 
        res.should.be.html; 
        done();
      });
  });
});
