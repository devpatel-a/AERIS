"""Export a tiny anomaly-screening model to ONNX for the onboard edge unit,
and benchmark its latency/memory — this is the model referenced by the
Acquisition-side "Edge ML" box in ARCHITECTURE.md.
"""

from __future__ import annotations

import time
from pathlib import Path

import numpy as np
import onnxruntime as ort
import torch

from aerotwin.ml.anomaly import _Autoencoder


def export_autoencoder_onnx(autoencoder: _Autoencoder, n_features: int, out_path: Path) -> Path:
    """Export the trained autoencoder to ONNX at `out_path`."""
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    dummy = torch.zeros(1, n_features, dtype=torch.float32)
    torch.onnx.export(
        autoencoder,
        (dummy,),
        str(out_path),
        input_names=["features"],
        output_names=["reconstruction"],
        dynamic_axes={"features": {0: "batch"}, "reconstruction": {0: "batch"}},
        opset_version=17,
    )
    return out_path


def benchmark_onnx_model(onnx_path: Path, n_features: int, n_runs: int = 200) -> dict[str, float]:
    """Return latency (ms, mean/p95) and on-disk model size (KB) for the exported ONNX model."""
    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    x = np.random.default_rng(0).normal(size=(1, n_features)).astype(np.float32)

    # warmup
    for _ in range(10):
        session.run(None, {"features": x})

    latencies_ms = []
    for _ in range(n_runs):
        start = time.perf_counter()
        session.run(None, {"features": x})
        latencies_ms.append((time.perf_counter() - start) * 1000.0)

    size_kb = Path(onnx_path).stat().st_size / 1024.0
    return {
        "latency_ms_mean": float(np.mean(latencies_ms)),
        "latency_ms_p95": float(np.percentile(latencies_ms, 95)),
        "model_size_kb": size_kb,
    }
