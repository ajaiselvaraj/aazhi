# 🐳 Gateway Microservice Dockerfile
# Suvidha Kiosk Platform

FROM node:20-alpine

# Set directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy source code
COPY . .

# Expose gateway port
EXPOSE 5000

# Start command
CMD ["node", "app.js"]
