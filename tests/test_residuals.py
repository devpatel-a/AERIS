"""Tests for residual normalization, EWMA/CUSUM change detection, and fault locus classification."""

from __future__ import annotations

from aerotwin.twin.residuals import (
    EwmaCusumDetector,
    classify_fault_locus,
    compute_residuals,
    normalize_residuals,
)


def test_compute_and_normalize_residuals():
    """Residuals should be observed-expected, then scaled by measurement-noise sigma."""
    measured = {"rpm": 4010.0, "map_kpa": 100.5}
    expected = {"rpm": 4000.0, "map_kpa": 100.0}
    residuals = compute_residuals(measured, expected)
    assert residuals["rpm"] == 10.0
    normalized = normalize_residuals(residuals)
    assert normalized["rpm"] == 10.0 / 8.0  # MEASUREMENT_NOISE_STD["rpm"] == 8.0


def test_cusum_detector_flags_sustained_shift():
    """A sustained normalized-residual shift should eventually trigger a CUSUM alarm."""
    detector = EwmaCusumDetector(alpha=0.3, threshold=3.0, drift=0.3)
    alarm = False
    for _ in range(50):
        alarms = detector.update({"cht_1_k": 5.0})
        alarm = alarm or alarms["cht_1_k"]
    assert alarm


def test_cusum_detector_stays_quiet_for_noise():
    """Small zero-mean noise should not trigger a CUSUM alarm."""
    import numpy as np

    rng = np.random.default_rng(0)
    detector = EwmaCusumDetector(alpha=0.3, threshold=5.0, drift=0.5)
    alarm = False
    for _ in range(200):
        alarms = detector.update({"cht_1_k": float(rng.normal(0, 1.0))})
        alarm = alarm or alarms["cht_1_k"]
    assert not alarm


def test_classify_fault_locus_sensor_vs_engine():
    """One deviating channel -> sensor; all channels deviating together -> engine."""
    sensor_case = {"cht_1_k": 8.0, "cht_2_k": 0.2, "cht_3_k": 0.1, "cht_4_k": -0.1}
    engine_case = {"cht_1_k": 6.0, "cht_2_k": 6.5, "cht_3_k": 5.8, "cht_4_k": 6.2}

    sensor_result = classify_fault_locus(sensor_case)
    assert sensor_result["cht_1_k"] == "sensor"

    engine_result = classify_fault_locus(engine_case)
    assert all(v == "engine" for k, v in engine_result.items() if k.startswith("cht_"))
