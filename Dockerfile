# Use an official Node.js image as the base
FROM node:18-slim

# Install TeX Live (for xelatex - supports Unicode natively)
RUN apt-get update && \
    apt-get install -y texlive-latex-base texlive-xetex texlive-fonts-recommended texlive-fonts-extra texlive-latex-extra texlive-science && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your app
COPY . .

# Build CSS (if needed)
RUN npm run build:css

# Expose the port your app runs on
EXPOSE 3000

# Start the app
CMD ["node", "server.js"]