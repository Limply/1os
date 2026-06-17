_site_url_cache = None


def _get_site_url():
    global _site_url_cache
    if _site_url_cache is None:
        try:
            from services.auth.models import Tenant
            tenant = Tenant.objects.first()
            _site_url_cache = tenant.site_url.rstrip('/') if tenant and tenant.site_url else ''
        except Exception:
            _site_url_cache = ''
    return _site_url_cache


class DynamicCORSMiddleware:
    """Allows CORS from the site_url stored in the Tenant record (+ localhost for dev)."""

    DEV_ORIGINS = {
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'https://1os-dev.astronic.com.sg',
        'https://ast1-dev.sim-eng.com',
    }

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.META.get('HTTP_ORIGIN', '')

        if request.method == 'OPTIONS' and origin:
            response = self._preflight(origin)
            if response:
                return response

        response = self.get_response(request)

        if origin and self._is_allowed(origin):
            response['Access-Control-Allow-Origin'] = origin
            response['Access-Control-Allow-Credentials'] = 'true'

        return response

    def _preflight(self, origin):
        if not self._is_allowed(origin):
            return None
        from django.http import HttpResponse
        response = HttpResponse()
        response['Access-Control-Allow-Origin'] = origin
        response['Access-Control-Allow-Credentials'] = 'true'
        response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Authorization, Content-Type, X-CSRFToken'
        response['Access-Control-Max-Age'] = '86400'
        return response

    def _is_allowed(self, origin):
        return origin in self.DEV_ORIGINS or origin == _get_site_url()


class TenantMiddleware:
    """JWT middleware — validates the bearer token (tenant attachment removed)."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)
