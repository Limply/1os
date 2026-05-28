from rest_framework.response import Response


def success(data=None, message='', status=200):
    return Response({'success': True, 'data': data or {}, 'message': message, 'errors': []}, status=status)


def error(errors=None, message='', status=400):
    return Response({'success': False, 'data': {}, 'message': message, 'errors': errors or []}, status=status)
