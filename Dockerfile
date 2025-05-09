
FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY web /usr/share/nginx/html

# Expose port 80 (standard HTTP port Nginx listens on)
EXPOSE 80
