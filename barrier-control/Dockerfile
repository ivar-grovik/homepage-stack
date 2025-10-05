FROM node:18-alpine

WORKDIR /app

# Install necessary packages for process management
RUN apk add --no-cache procps

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install

# Copy the server code
COPY server.js ./

# Expose port 3004
EXPOSE 3004

# Start the server
CMD ["node", "server.js"]