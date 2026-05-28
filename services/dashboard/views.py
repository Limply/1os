from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def overview(request):
    """Placeholder: aggregate summary across services."""
    return Response({
        'success': True,
        'data': {},
        'message': 'Dashboard overview — coming soon',
        'errors': [],
    })
