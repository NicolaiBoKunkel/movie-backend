FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Copy wait script (if using Docker Compose)
COPY wait-for-it.sh ./
RUN chmod +x wait-for-it.sh

# Run the migration
CMD ["npm", "start"]