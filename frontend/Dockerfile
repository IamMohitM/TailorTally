# Development Stage
FROM node:22-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm install
# Copy the rest of the code - this will be overridden by volume mount in compose
# but good for standalone build
COPY . .
# Expose default Vite port
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# Build Stage
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production Stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
