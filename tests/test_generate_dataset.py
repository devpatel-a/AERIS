"""Tests for the synthetic dataset generator's planning and single-sample logic."""

from __future__ import annotations

from pathlib import Path

from scripts.generate_dataset import FAULTY_CLASSES, _plan_samples, _run_one


def test_plan_samples_has_healthy_and_faulty_mix():
    """~30% of planned samples should be healthy, the rest spread across fault classes."""
    plans = _plan_samples(20, seed=1)
    assert len(plans) == 20
    n_healthy = sum(1 for p in plans if p.fault_type == "healthy")
    assert 3 <= n_healthy <= 9
    faulty_types = {p.fault_type for p in plans if p.fault_type != "healthy"}
    assert faulty_types.issubset(set(FAULTY_CLASSES))


def test_run_one_produces_labeled_parquet(tmp_path: Path):
    """A single planned sample should run end-to-end and produce a labeled Parquet file."""
    plans = _plan_samples(6, seed=2)
    faulty = next(p for p in plans if p.fault_type != "healthy")
    faulty.duration_s = 60.0  # keep the test fast
    faulty.n_segments = 2

    row = _run_one(faulty, tmp_path)
    assert row["fault_type"] == faulty.fault_type
    assert (tmp_path / f"{faulty.sample_id}.parquet").exists()

    import pandas as pd

    df = pd.read_parquet(tmp_path / f"{faulty.sample_id}.parquet")
    assert (df["fault_type"] == faulty.fault_type).all()
    assert "measured_rpm" in df.columns
