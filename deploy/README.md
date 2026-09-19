# Ishlab chiqarish (production) sozlamalari

Sayt: **https://darspilot.com** — O'zbekistondagi VPS da Docker Compose bilan ishlaydi.

| Fayl | Nima |
|---|---|
| `docker-compose.prod.yml` | Serverdagi override: 443 port, lokal fayl ombori, eski protsessor uchun yig'ish argumentlari |
| `nginx-ssl.conf` | web konteyneridagi nginx: 80 → 443 yo'naltirish, TLS, `/api` proksisi, SPA fallback |
| `cert-yangilash.sh` | Let's Encrypt sertifikatlarini yangilash (cron: har dushanba 04:17) |

## O'rnatish tartibi

```bash
git clone https://github.com/DiyorbekBoltayev/darspilot /opt/darspilot
cd /opt/darspilot
cp deploy/docker-compose.prod.yml docker-compose.override.yml
cp .env.example .env                 # OPENAI_API_KEY va parollar shu yerda
docker compose build api web
docker compose up -d
curl -s https://darspilot.com/api/health     # {"ok":true}
```

## Serverning protsessori eski bo'lsa

VPS ning CPU si `x86-64-v1` (sse4.2/popcnt yo'q) bo'lgani uchun standart `numpy`/`opencv` va MinIO
ishga tushmaydi. Shuning uchun:

- `docker-compose.override.yml` da `api.build.args`: `PY=3.12`, `REQ=requirements-oldcpu.txt`
- `MINIO_ENDPOINT` bo'sh qoldiriladi → `app/storage.py` lokal papkaga yozadi (`LOCAL_STORAGE_DIR`)

Tekshirish: `lscpu | grep -o 'sse4_2\|popcnt'` — natija bo'sh bo'lsa, eski CPU varianti kerak.
