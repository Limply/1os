import os
import uuid
import requests
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible
from decouple import config


@deconstructible
class FileBrowserStorage(Storage):
    """
    Custom storage backend that saves files to FileBrowser via its REST API.
    Credentials and URL are read from .env — never hardcoded.
    """

    def __init__(self):
        self.base_url = config('FILEBROWSER_URL', 'https://files.sim-eng.com').rstrip('/')
        self.username = config('FILEBROWSER_USER', '1os-api')
        self.password = config('FILEBROWSER_PASS', '')
        self.scope    = config('FILEBROWSER_SCOPE', '/1os/')
        self._token   = None

    def _login(self):
        res = requests.post(
            f'{self.base_url}/api/login',
            json={'username': self.username, 'password': self.password},
            timeout=10,
        )
        res.raise_for_status()
        self._token = res.text.strip('"')

    def _headers(self):
        if not self._token:
            self._login()
        return {'Authorization': f'Bearer {self._token}'}

    def _save(self, name, content):
        ext = os.path.splitext(name)[1].lower()
        filename = f"{uuid.uuid4().hex}{ext}"

        def do_upload(headers):
            content.seek(0)
            return requests.post(
                f'{self.base_url}/api/upload',
                headers=headers,
                params={'destination': self.scope, 'override': 'true'},
                files={'files': (filename, content, 'application/octet-stream')},
                timeout=30,
            )

        res = do_upload(self._headers())
        if res.status_code == 401:
            self._login()
            res = do_upload(self._headers())
        res.raise_for_status()
        return filename

    def url(self, name):
        return f'{self.base_url}/files{self.scope}{name}'

    def exists(self, name):
        # UUID filenames — always unique, no collision check needed
        return False

    def delete(self, name):
        try:
            headers = self._headers()
            requests.delete(
                f'{self.base_url}/api/resources{self.scope}{name}',
                headers=headers,
                timeout=10,
            )
        except Exception:
            pass

    def path(self, name):
        raise NotImplementedError('FileBrowserStorage does not support local paths.')
