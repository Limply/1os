import os
import time
import uuid
import requests
from django.core.files.storage import Storage
from django.http import HttpResponse, Http404
from django.utils.deconstruct import deconstructible
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from decouple import config

# Module-level token cache — shared across all FileBrowserStorage instances
# in the same Django process so we only log in once per hour.
_cached_token = None
_cached_token_expiry = 0.0


@deconstructible
class FileBrowserStorage(Storage):
    """
    Custom storage backend that saves files to FileBrowser via its REST API.
    subfolder: folder within the 1os-api user's FileBrowser root (e.g. 'database', 'attendance').
    """

    def __init__(self, subfolder='database'):
        self.base_url = config('FILEBROWSER_URL', 'http://localhost:8088').rstrip('/')
        self.username = config('FILEBROWSER_USER', '1os-api')
        self.password = config('FILEBROWSER_PASS', '')
        self.subfolder = subfolder

    def _login(self):
        global _cached_token, _cached_token_expiry
        res = requests.post(
            f'{self.base_url}/api/login',
            json={'username': self.username, 'password': self.password},
            timeout=10,
        )
        res.raise_for_status()
        _cached_token = res.text.strip('"')
        _cached_token_expiry = time.time() + 3600

    def _headers(self):
        global _cached_token, _cached_token_expiry
        if not _cached_token or time.time() >= _cached_token_expiry:
            self._login()
        return {'X-Auth': _cached_token}

    def _save(self, name, content):
        ext = os.path.splitext(name)[1].lower()
        filename = f"{uuid.uuid4().hex}{ext}"

        def do_upload(headers):
            content.seek(0)
            return requests.post(
                f'{self.base_url}/api/resources/{self.subfolder}/{filename}',
                headers=headers,
                data=content,
                timeout=30,
            )

        res = do_upload(self._headers())
        if res.status_code == 401:
            self._login()
            res = do_upload(self._headers())
        res.raise_for_status()
        return filename

    def url(self, name):
        return f'/api/files/proxy/?path={self.subfolder}/{name}'

    def exists(self, name):
        return False

    def delete(self, name):
        try:
            requests.delete(
                f'{self.base_url}/api/resources/{self.subfolder}/{name}',
                headers=self._headers(),
                timeout=10,
            )
        except Exception:
            pass

    def path(self, name):
        raise NotImplementedError('FileBrowserStorage does not support local paths.')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def filebrowser_proxy(request):
    """Proxy authenticated FileBrowser file downloads so <img> tags work."""
    path = request.query_params.get('path', '').lstrip('/')
    if not path:
        raise Http404

    storage = FileBrowserStorage()
    res = requests.get(
        f'{storage.base_url}/api/raw/{path}',
        headers=storage._headers(),
        timeout=15,
        stream=True,
    )
    if res.status_code == 401:
        storage._login()
        res = requests.get(
            f'{storage.base_url}/api/raw/{path}',
            headers=storage._headers(),
            timeout=15,
            stream=True,
        )
    if res.status_code != 200:
        raise Http404

    content_type = res.headers.get('Content-Type', 'application/octet-stream')
    return HttpResponse(res.content, content_type=content_type)
