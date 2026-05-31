# Science Bowl Packet Compiler

This serves as an application hosted locally to edit [TSB](https://www.texassciencebowl.org/) packets every year. This includes
- A page to upload questions, allowing for storage in a consistent format and an easy viewing experience
- The ability to export all questions in a round in a LaTeX PDF, allowing for easy packet generation
- An easy password-protected reset switch, so that questions can be completely cleared for the next year (and also not be accidentally clicked 😉)

## .env Instructions

Create a file called `.env` in the root of this directory, and add the below contents.
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/tsbapp
RESET_KEY=[insert_password_here] # this is the reset all questions password
```

## Local LaTeX Setup

This project uses `pdflatex` to compile the generated LaTeX files into PDFS. The below instructions explain how to install it and make it available in your system PATH.

### MacOS

Install [MacTeX](https://www.tug.org/mactex/) (full distribution, ~4 GB) or [BasicTeX](https://www.tug.org/mactex/morepackages.html) (minimal, ~100 MB). BasicTeX is sufficient but may need additional packages for some LaTeX features.

After installing, verify pdflatex is available:
```
pdflatex --version
```
If the command is not found after installing MacTeX, add it to your PATH:
```
export PATH="/Library/TeX/texbin:$PATH"
```
Add this line to your `~/.zshrc` (or `~/.bash_profile`) to make it permanent.

### Windows

Install [MiKTeX](https://miktex.org/download) or [TeX Live](https://www.tug.org/texlive/). Both installers add `pdflatex` to your PATH automatically.

After installing, verify in PowerShell or Command Prompt:
```
pdflatex --version
```
MiKTeX will auto-install missing packages on first compile. If you see a prompt asking to install packages, allow it — subsequent compilations will proceed without prompting.

## Running the App (Locally)

First, ensure that both `npm` and `MongoDB` are installed. Refer [here](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) for `npm` and [here](https://www.mongodb.com/docs/manual/installation/) for `MongoDB`.

### MacOS
```
brew services start mongodb-community
npm install
npm run dev
```
To end the app, press `Ctrl+C` in the terminal, and then run `brew services stop mongodb-community` to stop MongoDB.

### Windows
MongoDB on Windows runs as a service. Start it from an elevated PowerShell or Command Prompt:
```
net start MongoDB
npm install
npm run dev
```
To end the app, press `Ctrl+C` in the terminal, and then run `net stop MongoDB` to stop MongoDB.

## Formatting Questions (CSV Upload)

The app expects a slightly specific format when you are trying to use the CSV feature to batch-upload questions. [This Google Sheet](https://docs.google.com/spreadsheets/d/1Toyz2xTVll1dCaZuVIKIXezJtBBSTMCPefD-sbYfOD0/edit?usp=sharing) is our template for storing questions, which also includes formatting guidelines for things like LaTeX support.

In addition, if you have a specific tournament logo you wish to have on packets (e.g. the TSB logo that features on all Texas Science Bowl packets), simply replace the file `public/images/logo.png` with the new logo, ensuring that this same name (i.e. `logo.png`) is kept.