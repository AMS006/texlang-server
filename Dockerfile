# Use an official Node.js runtime as a parent image
FROM node:18-alpine as build

# Set the working directory to /app
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies
RUN npm ci --ignore-scripts

# Copy the rest of the application code to the container
COPY . .

# Make port 4000 available to the world outside this container
EXPOSE 4000

# Run index.js when the container launches
CMD ["npm", "start"]

