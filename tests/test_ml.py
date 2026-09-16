"""Tests for the M6 AI/ML layer components (feature extraction, anomaly, classifier, RUL, edge)."""

from __future__ import annotations

import numpy as np
import pytest

from aerotwin.faults.injector import FaultInjector
from aerotwin.faults.specs import FaultSpec
from aerotwin.ml.anomaly import get_feature_columns, train_anomaly_models
from aerotwin.ml.classifier import train_classifier
from aerotwin.ml.edge_export import benchmark_onnx_model, export_autoencoder_onnx
from aerotwin.ml.features import build_windowed_features
from aerotwin.ml.rul import RulParticleFilter
from aerotwin.simulation.mission import (
    EnvironmentConfig,
    MissionConfig,
    MissionRunner,
    SegmentConfig,
)
from aerotwin.twin.config import EngineRegistry


@pytest.fixture(scope="module")
def engine_config():
    """Reference engine config, loaded once."""
    return EngineRegistry().get("rotax914_like")


def _short_run(engine_config, fault_specs, duration_s=120.0):
    mission = MissionConfig(
        mission_id="ml_test", display_name="ml test", environment=EnvironmentConfig(),
        segments=[SegmentConfig(name="c", duration_s=duration_s, target_altitude_m=1000.0,
                                 target_airspeed_mps=35.0, throttle=0.65)],
    )
    runner = MissionRunner(engine_config, mission)
    injector = FaultInjector(fault_specs, seed=0)
    df = runner.run(log_interval_s=1.0, step_callback=injector.step_callback)
    return injector.postprocess(df)


def test_build_windowed_features_labels_fault_window(engine_config):
    """Windows after fault onset should be labeled with the fault type, earlier ones healthy."""
    df = _short_run(
        engine_config,
        [FaultSpec(fault_type="lubrication_issue", onset_s=0.0, profile="step", severity=0.6)],
        duration_s=120.0,
    )
    feats = build_windowed_features(df, engine_config, sample_id="s1", window_s=30.0, stride_s=30.0)
    assert len(feats) > 0
    assert (feats["label"] == "lubrication_issue").any()
    assert "oil_pressure_kpa_resid_mean" in feats.columns


def test_anomaly_models_score_faulty_higher_than_healthy(engine_config):
    """Anomaly scores fit on healthy data should score a faulty window higher than a healthy one."""
    healthy_df = _short_run(engine_config, [], duration_s=150.0)
    healthy_feats = build_windowed_features(healthy_df, engine_config, "healthy1", window_s=30.0, stride_s=15.0)
    faulty_df = _short_run(
        engine_config,
        [FaultSpec(fault_type="cooling_degradation", onset_s=0.0, profile="step", severity=0.7)],
        duration_s=150.0,
    )
    faulty_feats = build_windowed_features(faulty_df, engine_config, "fault1", window_s=30.0, stride_s=15.0)

    feature_cols = get_feature_columns(healthy_feats)
    X_healthy = healthy_feats[feature_cols].fillna(0.0).to_numpy()
    X_faulty = faulty_feats[feature_cols].fillna(0.0).to_numpy()

    models = train_anomaly_models(X_healthy, feature_cols)
    healthy_scores = models.score(X_healthy)
    faulty_scores = models.score(X_faulty)
    assert faulty_scores["autoencoder"].mean() > healthy_scores["autoencoder"].mean()


def test_classifier_trains_and_predicts_known_classes(engine_config):
    """A classifier trained on a couple of classes should predict labels within those classes."""
    rng = np.random.default_rng(0)
    n = 40
    feature_cols = ["f1", "f2", "f3"]
    X_healthy = rng.normal(0, 1, size=(n, 3))
    X_fault = rng.normal(5, 1, size=(n, 3))
    X = np.vstack([X_healthy, X_fault])
    y = ["healthy"] * n + ["cooling_degradation"] * n

    clf = train_classifier(X, y, feature_cols)
    preds = clf.predict(X)
    assert set(preds).issubset({"healthy", "cooling_degradation"} | set(clf.encoder.classes_))
    acc = np.mean(np.array(preds) == np.array(y))
    assert acc > 0.85

    explanations = clf.explain(X[:2])
    assert len(explanations) == 2
    assert all(isinstance(e, str) and len(e) > 0 for e in explanations)


def test_rul_particle_filter_converges_on_synthetic_exponential():
    """The particle filter's RUL mean should land within a reasonable range of the true value."""
    true_log_d0, true_k = np.log(2.0), 0.002
    t_s = np.arange(0, 1000, 10.0)
    deg = np.exp(true_log_d0 + true_k * t_s)
    health_index = np.clip(100.0 - deg, 0.0, 100.0)

    pf = RulParticleFilter(seed=1)
    for t, idx in zip(t_s, health_index, strict=True):
        pf.update(float(t), float(idx))
    est = pf.estimate_rul(float(t_s[-1]), float(health_index[-1]))

    true_t_fail = (np.log(80.0) - true_log_d0) / true_k
    true_rul_hours = max(true_t_fail - t_s[-1], 0.0) / 3600.0
    assert est.p05_hours <= est.mean_hours <= est.p95_hours
    assert abs(est.mean_hours - true_rul_hours) < max(2.0, true_rul_hours)


def test_edge_export_and_benchmark(engine_config, tmp_path):
    """The autoencoder should export to ONNX and run inference with plausible latency."""
    rng = np.random.default_rng(0)
    feature_cols = [f"f{i}" for i in range(10)]
    X = rng.normal(size=(60, 10))
    models = train_anomaly_models(X, feature_cols)

    onnx_path = tmp_path / "ae.onnx"
    export_autoencoder_onnx(models.autoencoder, len(feature_cols), onnx_path)
    assert onnx_path.exists()

    bench = benchmark_onnx_model(onnx_path, len(feature_cols), n_runs=20)
    assert bench["latency_ms_mean"] < 50.0
    assert bench["model_size_kb"] > 0
