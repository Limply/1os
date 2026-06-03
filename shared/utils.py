import uuid
from math import radians, cos, sin, asin, sqrt


def generate_ref(prefix: str, length: int = 6) -> str:
    """Generate a short reference number like JOB-000001."""
    import random
    n = random.randint(1, 10 ** length - 1)
    return f"{prefix}-{str(n).zfill(length)}"


def haversine_distance(lat1, lng1, lat2, lng2):
    """Return distance in meters between two GPS coordinates."""
    lat1, lng1, lat2, lng2 = map(radians, [float(lat1), float(lng1), float(lat2), float(lng2)])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
    return 2 * asin(sqrt(a)) * 6371000  # metres
