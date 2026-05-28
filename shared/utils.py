import uuid


def generate_ref(prefix: str, length: int = 6) -> str:
    """Generate a short reference number like JOB-000001."""
    import random
    n = random.randint(1, 10 ** length - 1)
    return f"{prefix}-{str(n).zfill(length)}"
