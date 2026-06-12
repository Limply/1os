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
        'https://dev.sim-eng.com',
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
    """Reads the JWT from the Authorization header and attaches the tenant to request.tenant."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.tenant = None

        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            try:
                from rest_framework_simplejwt.tokens import AccessToken
                from django.contrib.auth import get_user_model

                token = AccessToken(auth_header.split(' ')[1])
                User = get_user_model()
                user = User.objects.select_related('tenant').get(id=token['user_id'])
                request.tenant = user.tenant
            except Exception:
                pass

        return self.get_response(request)
