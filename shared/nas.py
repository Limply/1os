"""NAS project-file tree service.

Pure filesystem utility for the Projects tree described in
PROGRESS/NAS_INTEGRATION_PLAN.md. Operates on plain names/paths only — no
cross-service model imports — so each service passes in the folder names it
derives (Company.nas_folder, Client.nas_folder, project_no, ...).

Hard safety rule: this module NEVER deletes or truncates anything. It only
creates folders and writes new files. Writes that would overwrite an existing
file are auto-renamed (" (2)", " (3)", ...) instead of clobbering it.
"""
from __future__ import annotations

import os
import re
import shutil
from pathlib import Path
from urllib.parse import quote

from django.conf import settings

# Characters illegal on the SMB/Windows side, plus path separators.
_ILLEGAL = re.compile(r'[<>:"/\\|?*\x00-\x1f]')


def sanitize_segment(name: str) -> str:
    """Make one path segment safe: no separators, no traversal, no leading dots.

    Guards against path traversal ('..', absolute paths) and SMB-illegal chars.
    Raises ValueError if nothing valid remains (empty, or traversal-only input like
    '..') — callers must derive a real folder name before writing to the NAS.
    """
    # Collapse whitespace, drop illegal chars (this also removes '/', '\\', ':').
    cleaned = _ILLEGAL.sub('', str(name or '')).strip()
    # Strip leading/trailing dots and spaces (no hidden/'..' segments; Windows also
    # rejects a trailing dot or space).
    cleaned = cleaned.strip('. ')
    cleaned = re.sub(r'\s+', ' ', cleaned)
    if not cleaned:
        raise ValueError(f'Invalid NAS path segment: {name!r}')
    return cleaned


def month_folder(name: str, dt) -> str:
    """Build a chronologically-sortable customer folder name: 'YYYY-MM_Name'.

    `dt` is a date/datetime (falls back to no prefix if None). The whole result is
    sanitized as a single segment.
    """
    label = sanitize_segment(name)
    if dt is None:
        return label
    return sanitize_segment(f'{dt:%Y-%m}_{label}')


def projects_root() -> Path:
    """Absolute base of the Projects tree for THIS server (env-driven)."""
    return Path(settings.NAS_PROJECTS_ROOT)


def _resolve_within(*segments: str) -> Path:
    """Join sanitized segments under the root and verify the result stays inside it."""
    root = projects_root().resolve()
    path = root
    for seg in segments:
        path = path / sanitize_segment(seg)
    resolved = (root / path.relative_to(root)).resolve() if path != root else root
    # Defence in depth: never escape the root, even if sanitize somehow let something through.
    if root != resolved and root not in resolved.parents:
        raise ValueError(f'Refusing path outside NAS root: {resolved}')
    return resolved


def ensure_folder(*segments: str) -> Path:
    """Create (idempotently) the folder at root/<segments...> and return it.

    Never removes anything. Safe to call repeatedly.
    """
    path = _resolve_within(*segments)
    os.makedirs(path, mode=0o775, exist_ok=True)
    return path


def folder_path(*segments: str) -> Path:
    """Resolve root/<segments...> WITHOUT creating it (sanitized + traversal-guarded)."""
    return _resolve_within(*segments)


def _nonclobber_target(folder: Path, filename: str) -> Path:
    """Return a path in `folder` for `filename`, auto-suffixing if it already exists."""
    safe = sanitize_segment(filename)
    target = folder / safe
    if not target.exists():
        return target
    stem, suffix = os.path.splitext(safe)
    i = 2
    while True:
        candidate = folder / f'{stem} ({i}){suffix}'
        if not candidate.exists():
            return candidate
        i += 1


def _write_atomic(folder: Path, filename: str, src) -> Path:
    """No-clobber atomic write of `src` into an already-resolved `folder`."""
    target = _nonclobber_target(folder, filename)
    tmp = target.with_name(f'.{target.name}.part')

    if isinstance(src, (bytes, bytearray)):
        with open(tmp, 'wb') as fh:
            fh.write(src)
    elif hasattr(src, 'read'):
        with open(tmp, 'wb') as fh:
            shutil.copyfileobj(src, fh)
    else:  # treat as a source path to copy from
        shutil.copyfile(src, tmp)

    os.chmod(tmp, 0o664)
    os.replace(tmp, target)  # atomic; target name is guaranteed new, so nothing is lost
    return target


def save_document(folder_segments, filename: str, src) -> Path:
    """Write `src` into root/<folder_segments...>/<filename>, never overwriting.

    `src` may be bytes, a path to an existing file, or a file-like object with .read().
    Returns the final path.
    """
    if isinstance(folder_segments, (str, bytes)):
        folder_segments = [folder_segments]
    folder = ensure_folder(*folder_segments)
    return _write_atomic(folder, filename, src)


def save_into(folder: Path | str, filename: str, src) -> Path:
    """Write `src` into an already-resolved `folder` (must be inside the NAS root)."""
    folder = Path(folder).resolve()
    root = projects_root().resolve()
    if folder != root and root not in folder.parents:
        raise ValueError(f'Refusing to write outside NAS root: {folder}')
    os.makedirs(folder, mode=0o775, exist_ok=True)
    return _write_atomic(folder, filename, src)


def folder_url(path: Path | str) -> str:
    """Deep-link to a folder/file in the public FileBrowser (scope root '/')."""
    abs_path = str(Path(path))
    base = settings.NAS_FILEBROWSER_PUBLIC_URL.rstrip('/')
    return f'{base}/files{quote(abs_path)}'


def smb_path(path: Path | str) -> str:
    """Windows/SMB display path (e.g. N:\\1os\\SE-Bizz\\Projects\\...), for staff who
    mapped the drive. Copyable text only — browsers block \\server\\ links."""
    s = str(Path(path))
    posix_prefix = settings.NAS_SMB_POSIX_PREFIX
    if posix_prefix and s.startswith(posix_prefix):
        s = settings.NAS_SMB_WIN_BASE + s[len(posix_prefix):]
    return s.replace('/', '\\')
