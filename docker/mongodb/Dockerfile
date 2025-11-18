# Use the official MongoDB base image
FROM mongo:latest

# Set the working directory to /docker-entrypoint-initdb.d
WORKDIR /docker-entrypoint-initdb.d

# Copy the initialization script into the container
COPY mongo_init.sh /docker-entrypoint-initdb.d/

# This caused builds to fail if `.env` does not exist in the build context
# COPY .env /docker-entrypoint-initdb.d/

# Make sure the script is executable 
# (These were already commented out — leave them as-is)
# RUN chmod +x /docker-entrypoint-initdb.d/mongo_init.sh
# RUN chmod +x /docker-entrypoint-initdb.d/.env

# Expose MongoDB's default port
EXPOSE 27017

# Start script / CMD lines were previously commented out — keep them commented
# RUN /docker-entrypoint-initdb.d/mongo_init.sh
# CMD ['mongod']
