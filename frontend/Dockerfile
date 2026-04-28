# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# Using legacy-peer-deps might be needed for older react-scripts/craco combinations
RUN npm install --legacy-peer-deps

# Copy all files
COPY . .

# Set environment variables for build
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

ARG REACT_APP_ML_SERVICE_URL
ENV REACT_APP_ML_SERVICE_URL=$REACT_APP_ML_SERVICE_URL

# Build the app
RUN npm run build

# Serve stage
FROM nginx:alpine

# Copy the build output to replace the default nginx contents.
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
