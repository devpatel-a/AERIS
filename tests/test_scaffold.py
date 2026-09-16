"""Sanity check that the package imports correctly."""

import aerotwin


def test_version() -> None:
    """The package exposes a version string."""
    assert aerotwin.__version__
