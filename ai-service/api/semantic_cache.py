import redis
import hashlib
import json
import os

# Phase 5: AI Semantic Caching
# Connects to Redis to cache LLM responses and save expensive API calls during traffic spikes.
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

try:
    cache = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
except Exception as e:
    print(f"Failed to connect to Redis for semantic caching: {e}")
    cache = None

def get_query_hash(query: str) -> str:
    """Generate a consistent hash for a user query."""
    normalized_query = " ".join(query.lower().strip().split())
    return hashlib.sha256(normalized_query.encode()).hexdigest()

def get_cached_response(query: str):
    """Retrieve an AI response from cache if it exists."""
    if not cache: return None
    
    query_hash = get_query_hash(query)
    cached_data = cache.get(f"ai_cache:{query_hash}")
    
    if cached_data:
        print(f"[Semantic Cache] Hit for query: {query}")
        return json.loads(cached_data)
    
    print(f"[Semantic Cache] Miss for query: {query}")
    return None

def set_cached_response(query: str, response: dict, ttl_seconds: int = 86400):
    """Store an AI response in Redis with a TTL (default 24 hours)."""
    if not cache: return
    
    query_hash = get_query_hash(query)
    try:
        cache.setex(
            f"ai_cache:{query_hash}", 
            ttl_seconds, 
            json.dumps(response)
        )
        print(f"[Semantic Cache] Cached response for query: {query}")
    except Exception as e:
        print(f"[Semantic Cache] Error setting cache: {e}")
