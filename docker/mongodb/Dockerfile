# Use the official MongoDB base image
FROM mongo:latest

# Set the working directory to /docker-entrypoint-initdb.d
# MongoDB will automatically run scripts in this directory when starting the container
WORKDIR /docker-entrypoint-initdb.d

# Copy the initialization script into the container
COPY mongo_init.sh /docker-entrypoint-initdb.d/

# Make sure the script is executable (optional but nice to have)
RUN chmod +x /docker-entrypoint-initdb.d/mongo_init.sh

# Expose MongoDB's default port
EXPOSE 27017
