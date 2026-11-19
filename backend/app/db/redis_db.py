import redis

from app.config import settings

r = redis.Redis(host=settings.redis_host, port=settings.redis_port,
                password=settings.redis_password, decode_responses=True)
