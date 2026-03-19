# 🐳 Municipal Microservice Dockerfile
# Suvidha Kiosk Platform

FROM node:20-alpine

# Use production environment
ENV NODE_ENV=production

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy source code
COPY . .

# Expose microservice port
EXPOSE 5004

CMD ["node", "app.js"]
