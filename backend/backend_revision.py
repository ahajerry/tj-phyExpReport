"""Fingerprint report backend code so the dev server cannot reuse stale workers."""

from hashlib import sha256
from pathlib import Path


def backend_revision() -> str:
    digest = sha256()
    for path in sorted(Path(__file__).parent.glob("*.py")):
        if path.name.startswith("test_"):
            continue
        digest.update(path.name.encode("utf-8"))
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()
