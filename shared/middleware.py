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
