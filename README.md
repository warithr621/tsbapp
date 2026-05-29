# TSB App

This serves as an application hosted locally to edit [TSB Domain](https://www.texassciencebowl.org/) packets every year. This includes
- A page to upload questions, allowing for storage in a consistent format and an easy viewing experience
- The ability to export all questions in a round in a LaTeX PDF, allowing for easy packet generation
- An easy password-protected reset switch, so that questions can be completely cleared for the next year

# .env Instructions
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/tsbapp
SESSION_SECRET=insert_secret_here
RESET_KEY=pw # this is the reset all questions password
```
To generate a secret, run `openssl rand -hex 32` in the terminal (macOS/Linux/WSL). See the Windows section below for a PowerShell alternative.

# Running the App (Locally)

First, ensure that both `npm` and `MongoDB` are installed. Refer [here](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) for `npm` and [here](https://www.mongodb.com/docs/manual/installation/) for `MongoDB`.

### macOS
```
brew services start mongodb-community # Start MongoDB
npm install # Install dependencies
npm run build:css # Build the Tailwind css
npm run dev # Run the app in development mode
```
To end the app, press `Ctrl+C` in the terminal, and then run `brew services stop mongodb-community` to stop MongoDB.

### Windows
MongoDB on Windows runs as a service. Start it from an elevated PowerShell or Command Prompt:
```
net start MongoDB
npm install
npm run build:css
npm run dev
```
To end the app, press `Ctrl+C` in the terminal, and then run `net stop MongoDB` to stop MongoDB.

To generate a `SESSION_SECRET` on Windows, use PowerShell:
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```
Or install Git Bash / WSL and use the same `openssl rand -hex 32` command as macOS.
