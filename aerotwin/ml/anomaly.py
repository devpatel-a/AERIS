"""Anomaly detection: IsolationForest baseline + a small PyTorch autoencoder,
both calibrated to a 0-1 score using thresholds fit on healthy validation data.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import torch
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from torch import nn

NON_FEATURE_COLS = {"label", "sample_id", "window_start_s", "window_center_s", "mean_severity", "true_fault_type"}


def get_feature_columns(df) -> list[str]:
    """Return the numeric feature-column names (everything except labels/metadata)."""
    return [c for c in df.columns if c not in NON_FEATURE_COLS]


class _Autoencoder(nn.Module):
    def __init__(self, n_features: int, latent_dim: int = 6) -> None:
        super().__init__()
        hidden = max(latent_dim * 2, 8)
        self.encoder = nn.Sequential(nn.Linear(n_features, hidden), nn.ReLU(), nn.Linear(hidden, latent_dim))
        self.decoder = nn.Sequential(nn.Linear(latent_dim, hidden), nn.ReLU(), nn.Linear(hidden, n_features))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.decoder(self.encoder(x))


@dataclass
class AnomalyModels:
    """Calibrated IsolationForest + autoencoder anomaly detectors, sharing one scaler."""

    scaler: StandardScaler
    iso_forest: IsolationForest
    iso_p95: float
    autoencoder: _Autoencoder
    ae_p95: float
    feature_cols: list[str]

    def score(self, X: np.ndarray) -> dict[str, np.ndarray]:
        """Return {"isolation_forest": scores, "autoencoder": scores}, each calibrated to ~0-1."""
        Xs = self.scaler.transform(X)
        iso_raw = -self.iso_forest.score_samples(Xs)  # higher = more anomalous
        iso_score = np.clip(iso_raw / max(self.iso_p95, 1e-9), 0.0, 2.0) / 2.0

        with torch.no_grad():
            xt = torch.tensor(Xs, dtype=torch.float32)
            recon = self.autoencoder(xt).numpy()
        ae_raw = np.mean((Xs - recon) ** 2, axis=1)
        ae_score = np.clip(ae_raw / max(self.ae_p95, 1e-9), 0.0, 2.0) / 2.0

        return {"isolation_forest": iso_score, "autoencoder": ae_score}


def train_anomaly_models(healthy_X: np.ndarray, feature_cols: list[str], seed: int = 0) -> AnomalyModels:
    """Fit both anomaly models on healthy-only feature rows and calibrate their 95th percentile."""
    scaler = StandardScaler().fit(healthy_X)
    Xs = scaler.transform(healthy_X)

    iso = IsolationForest(n_estimators=150, contamination=0.05, random_state=seed).fit(Xs)
    iso_scores = -iso.score_samples(Xs)
    iso_p95 = float(np.percentile(iso_scores, 95))

    torch.manual_seed(seed)
    n_features = Xs.shape[1]
    ae = _Autoencoder(n_features)
    opt = torch.optim.Adam(ae.parameters(), lr=1e-2)
    xt = torch.tensor(Xs, dtype=torch.float32)
    ae.train()
    for _ in range(200):
        opt.zero_grad()
        recon = ae(xt)
        loss = torch.mean((recon - xt) ** 2)
        loss.backward()
        opt.step()
    ae.eval()
    with torch.no_grad():
        recon = ae(xt).numpy()
    ae_errors = np.mean((Xs - recon) ** 2, axis=1)
    ae_p95 = float(np.percentile(ae_errors, 95))

    return AnomalyModels(
        scaler=scaler, iso_forest=iso, iso_p95=iso_p95, autoencoder=ae, ae_p95=ae_p95, feature_cols=feature_cols
    )
