# TSB App

This serves as an application hosted through the [TSB Domain](https://www.texassciencebowl.com/) in order to edit packets every year. This includes
- Login page to secure all problem-writing
- A page to upload questions, allowing for storage in a consistent format and an easy viewing experience
- The ability to export all questions in a round in a LaTeX PDF, allowing for easy packet generation
- An easy password-protected reset switch, so that questions can be completely cleared for the next year

# .env Instructions
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/tsbapp
SESSION_SECRET=insert_secret_here
APP_PASSWORD=pw1 # this is the login password
RESET_KEY=pw2 # this is the reset all questions password
```
To generate a secret, run `openssl rand -hex 32` in the terminal.

# Running the App (Locally)

First, ensure that both `npm` and `MongoDB` are installed. Refer [here](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) for `npm` and [here](https://www.mongodb.com/docs/manual/installation/) for `MongoDB`. Then, run the following (note this is MacOS specific).
```
brew services start mongodb-community # Start MongoDB
npm install # Install dependencies
npm run build:css # Build the Tailwind css
npm run dev # Run the app in development mode
```
To end the app, press `Ctrl+C` in the terminal, and then run `brew services stop mongodb-community` to stop MongoDB.