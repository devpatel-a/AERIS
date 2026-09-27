"""Test isolation: every test session gets its own data directory (SQLite DB,
mission logs, reports), so tests never write sorties into the real fleet history.
Must run before any aerotwin module computes its data paths.
"""

from __future__ import annotations

import os
import tempfile

os.environ.setdefault("AEROTWIN_DATA_DIR", tempfile.mkdtemp(prefix="aerotwin-test-"))
