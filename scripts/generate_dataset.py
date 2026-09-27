"""Generate a synthetic labeled dataset of mission runs with injected faults.

Usage:
    python -m scripts.generate_dataset --size small --out data/dataset

Each sample is a short (5-40 min), randomly generated mission profile run
through the digital twin, optionally with one injected fault (engine or
sensor). About 30% of samples are healthy baselines; a subset of the
faulty runs are "run-to-failure" trajectories (fault ramps to full
severity by the end of the run) for RUL model training.
"""

from __future__ import annotations

import argparse
import json
import multiprocessing as mp
import time
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

from aerotwin.faults.injector import FaultInjector
from aerotwin.faults.specs import ENGINE_FAULT_TYPES, SENSOR_FAULT_TYPES, FaultSpec
from aerotwin.simulation.mission import (
    EnvironmentConfig,
    MissionConfig,
    MissionRunner,
    SegmentConfig,
)
from aerotwin.twin.config import EngineRegistry

DATA_DIR_DEFAULT = Path(__file__).resolve().parents[1] / "data" / "dataset"

SIZE_PRESETS = {"small": 45, "medium": 150, "large": 400}

SENSOR_TARGET_CHANNELS = [
    "rpm", "map_kpa", "oil_pressure_kpa", "oil_temp_k", "coolant_temp_k",
    "cht_1_k", "egt_1_k", "fuel_flow_kg_s", "alternator_voltage_v",
]

FAULTY_CLASSES = ENGINE_FAULT_TYPES + SENSOR_FAULT_TYPES


@dataclass
class SampleSpec:
    """Everything needed to reproduce one dataset sample deterministically."""

    sample_id: str
    engine_id: str
    seed: int
    duration_s: float
    isa_deviation_k: float
    n_segments: int
    fault_type: str  # "healthy" or one of FAULTY_CLASSES
    fault_target: int | str | None = None
    run_to_failure: bool = False


def _random_mission(rng: np.random.Generator, duration_s: float, isa_dev: float, n_segments: int) -> MissionConfig:
    """Build a short, randomized mission profile in memory (not from a YAML file)."""
    seg_duration = duration_s / n_segments
    segments = []
    altitude = 0.0
    for i in range(n_segments):
        if i == 0:
            altitude = float(rng.uniform(200, 2500))
        else:
            altitude = float(np.clip(altitude + rng.uniform(-600, 600), 50, 4500))
        airspeed = float(rng.uniform(20, 55))
        throttle = float(rng.uniform(0.25, 1.0))
        segments.append(
            SegmentConfig(
                name=f"phase_{i}",
                duration_s=seg_duration,
                target_altitude_m=altitude,
                target_airspeed_mps=airspeed,
                throttle=throttle,
            )
        )
    return MissionConfig(
        mission_id="synthetic",
        display_name="synthetic training mission",
        environment=EnvironmentConfig(base_isa_deviation_k=isa_dev),
        segments=segments,
    )


def _build_fault_specs(sample: SampleSpec, duration_s: float) -> list[FaultSpec]:
    if sample.fault_type == "healthy":
        return []
    onset_s = 0.0 if sample.run_to_failure else float(duration_s * 0.2)
    profile = "ramp" if sample.run_to_failure else "step"
    severity = 1.0 if sample.run_to_failure else 0.6
    ramp_duration = duration_s if sample.run_to_failure else 600.0
    return [
        FaultSpec(
            fault_type=sample.fault_type,
            target=sample.fault_target,
            onset_s=onset_s,
            profile=profile,
            severity=severity,
            ramp_duration_s=ramp_duration,
        )
    ]


def _run_one(sample: SampleSpec, out_dir: Path) -> dict:
    """Run one dataset sample and write its Parquet file; returns a manifest row."""
    rng = np.random.default_rng(sample.seed)
    mission = _random_mission(rng, sample.duration_s, sample.isa_deviation_k, sample.n_segments)
    engine_cfg = EngineRegistry().get(sample.engine_id)
    runner = MissionRunner(engine_cfg, mission)
    specs = _build_fault_specs(sample, sample.duration_s)
    injector = FaultInjector(specs, seed=sample.seed)
    df = runner.run(log_interval_s=1.0, step_callback=injector.step_callback)
    df = injector.postprocess(df)
    df["sample_id"] = sample.sample_id

    out_path = out_dir / f"{sample.sample_id}.parquet"
    df.to_parquet(out_path, index=False)

    return {
        "sample_id": sample.sample_id,
        "engine_id": sample.engine_id,
        "duration_s": sample.duration_s,
        "isa_deviation_k": sample.isa_deviation_k,
        "fault_type": sample.fault_type,
        "fault_target": "" if sample.fault_target is None else str(sample.fault_target),
        "run_to_failure": sample.run_to_failure,
        "n_rows": len(df),
        "path": str(out_path.relative_to(out_dir.parent)),
    }


def _plan_samples(n_samples: int, seed: int) -> list[SampleSpec]:
    rng = np.random.default_rng(seed)
    n_healthy = max(1, int(round(n_samples * 0.3)))
    n_faulty = n_samples - n_healthy
    n_run_to_failure = max(1, int(round(n_faulty * 0.15)))

    plans: list[SampleSpec] = []
    for i in range(n_healthy):
        plans.append(
            SampleSpec(
                sample_id=f"healthy_{i:04d}",
                engine_id="rotax914_like",
                seed=int(rng.integers(0, 2**31 - 1)),
                duration_s=float(rng.uniform(300, 2400)),
                isa_deviation_k=float(rng.uniform(-10, 30)),
                n_segments=int(rng.integers(3, 7)),
                fault_type="healthy",
            )
        )

    for i in range(n_faulty):
        fault_type = FAULTY_CLASSES[i % len(FAULTY_CLASSES)]
        target: int | str | None = None
        if fault_type in ("misfire", "injector_abnormality"):
            target = int(rng.integers(0, 4))
        elif fault_type == "cooling_degradation" and rng.uniform() < 0.5:
            # Half the cooling cases are localized to one cylinder (blocked duct/shroud).
            target = int(rng.integers(0, 4))
        elif fault_type in SENSOR_FAULT_TYPES:
            target = str(rng.choice(SENSOR_TARGET_CHANNELS))
        plans.append(
            SampleSpec(
                sample_id=f"fault_{fault_type}_{i:04d}",
                engine_id="rotax914_like",
                seed=int(rng.integers(0, 2**31 - 1)),
                duration_s=float(rng.uniform(300, 2400)),
                isa_deviation_k=float(rng.uniform(-10, 35)),
                n_segments=int(rng.integers(3, 7)),
                fault_type=fault_type,
                fault_target=target,
                run_to_failure=(i < n_run_to_failure and fault_type in ENGINE_FAULT_TYPES),
            )
        )
    rng.shuffle(plans)
    return plans


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(description="Generate the AeroTwin synthetic training dataset.")
    parser.add_argument("--size", default="small", help="small|medium|large or an integer sample count")
    parser.add_argument("--out", default=str(DATA_DIR_DEFAULT), help="output directory")
    parser.add_argument("--workers", type=int, default=0, help="0 = use all CPUs")
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def main() -> None:
    """Generate the dataset and write a manifest.parquet alongside per-sample Parquet files."""
    args = parse_args()
    n_samples = SIZE_PRESETS.get(args.size, None) or int(args.size)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    plans = _plan_samples(n_samples, args.seed)
    workers = args.workers or mp.cpu_count()
    print(f"Generating {len(plans)} samples with {workers} workers -> {out_dir}")

    start = time.perf_counter()
    if workers > 1:
        with mp.Pool(workers) as pool:
            rows = pool.starmap(_run_one, [(s, out_dir) for s in plans])
    else:
        rows = [_run_one(s, out_dir) for s in plans]
    wall_s = time.perf_counter() - start

    manifest = pd.DataFrame(rows)
    manifest.to_parquet(out_dir / "manifest.parquet", index=False)
    with (out_dir / "manifest_summary.json").open("w") as f:
        json.dump(
            {
                "n_samples": len(rows),
                "wall_seconds": wall_s,
                "class_counts": manifest["fault_type"].value_counts().to_dict(),
            },
            f,
            indent=2,
        )
    print(f"Done in {wall_s:.1f}s. Class counts:\n{manifest['fault_type'].value_counts()}")


if __name__ == "__main__":
    main()
