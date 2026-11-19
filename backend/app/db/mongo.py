from pymongo import MongoClient

from app.config import settings

client = MongoClient(
    host=settings.mongo_host, port=settings.mongo_port,
    username=settings.mongo_user, password=settings.mongo_password,
    authSource="admin", tz_aware=True,
)
db = client[settings.mongo_db]
