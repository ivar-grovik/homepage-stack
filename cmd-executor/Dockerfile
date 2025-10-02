FROM node:18-alpine

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install

# Copy the server code
COPY server.js ./

# Create directory for mounted scripts
RUN mkdir -p /opt/homepage-scripts

# Expose port 3003
EXPOSE 3003

# Start the server
CMD ["node", "server.js"]
