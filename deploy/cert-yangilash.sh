#!/bin/bash
# Har hafta: Let's Encrypt sertifikatlarini yangilash (qaysi nginx ishlab tursa, o'sha orqali)
docker run --rm \
  -v qarzdaftar_certbot_conf:/etc/letsencrypt \
  -v qarzdaftar_certbot_www:/var/www/certbot \
  certbot/certbot renew --webroot -w /var/www/certbot --quiet
docker exec darspilot-web-1 nginx -s reload 2>/dev/null || true
docker exec qarzdaftar-nginx nginx -s reload 2>/dev/null || true
