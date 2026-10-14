# -*- mode: python ; coding: utf-8 -*-

from pathlib import Path
import sys

root = Path(SPECPATH)
sys.path.insert(0, str(root))
from backend.backend_revision import backend_revision

revision = root / 'build' / 'backend-metadata' / 'revision.txt'
revision.parent.mkdir(parents=True, exist_ok=True)
revision.write_text(backend_revision(), encoding='utf-8')

a = Analysis(
    [str(root / 'scripts' / 'backend_entry.py')],
    pathex=[str(root)],
    binaries=[],
    datas=[(str(root / 'tex' / 'templates'), 'tex/templates'),
           (str(revision), 'backend')],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='report-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
