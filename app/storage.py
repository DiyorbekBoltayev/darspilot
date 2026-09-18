"""Fayl ombori: MinIO (S3-mos). MINIO_ENDPOINT bo'sh bo'lsa — lokal papka (test va oflayn ishlash uchun)."""
import io
import time

from . import config


class MinioStorage:
    def __init__(self):
        from minio import Minio

        self.client = Minio(config.MINIO_ENDPOINT, access_key=config.MINIO_ACCESS_KEY,
                            secret_key=config.MINIO_SECRET_KEY, secure=config.MINIO_SECURE)
        self.bucket = config.MINIO_BUCKET

    def ensure(self, retries: int = 30):
        for attempt in range(retries):
            try:
                if not self.client.bucket_exists(self.bucket):
                    self.client.make_bucket(self.bucket)
                return
            except Exception:
                if attempt == retries - 1:
                    raise
                time.sleep(2)

    def put(self, key: str, data: bytes, content_type: str):
        self.client.put_object(self.bucket, key, io.BytesIO(data), len(data), content_type=content_type)

    def get(self, key: str) -> bytes:
        resp = self.client.get_object(self.bucket, key)
        try:
            return resp.read()
        finally:
            resp.close()
            resp.release_conn()

    def delete(self, key: str):
        self.client.remove_object(self.bucket, key)

    def exists(self, key: str) -> bool:
        try:
            self.client.stat_object(self.bucket, key)
            return True
        except Exception:
            return False


class LocalStorage:
    def __init__(self):
        self.root = config.LOCAL_STORAGE_DIR

    def ensure(self, retries: int = 1):
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key):
        path = (self.root / key).resolve()
        if self.root.resolve() not in path.parents:
            raise ValueError("noto'g'ri kalit")
        return path

    def put(self, key, data, content_type):
        p = self._path(key)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)

    def get(self, key):
        return self._path(key).read_bytes()

    def exists(self, key):
        return self._path(key).exists()

    def delete(self, key):
        self._path(key).unlink(missing_ok=True)


storage = MinioStorage() if config.MINIO_ENDPOINT else LocalStorage()
