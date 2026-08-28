FROM nginx:1.27-alpine

# Reemplaza la config por defecto por la del reverse proxy de LUMI.
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/lumi.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
