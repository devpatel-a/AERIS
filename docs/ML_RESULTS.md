# AeroTwin ML Results

Trained on 9503 feature-window rows from 112 training missions; evaluated on 3484 rows from 38 held-out missions (split by mission/sample_id — no leakage across the split).

## Confusion matrix (rows=true, cols=predicted)

| true \ pred | abnormal_vibration | alternator_degradation | combustion_instability | cooling_degradation | healthy | injector_abnormality | lubrication_issue | misfire | overheating_trend | sensor_fault | turbo_degradation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| abnormal_vibration | 56 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| alternator_degradation | 0 | 75 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| combustion_instability | 0 | 0 | 330 | 0 | 32 | 0 | 0 | 2 | 0 | 0 | 0 |
| cooling_degradation | 0 | 0 | 0 | 149 | 0 | 0 | 0 | 0 | 2 | 0 | 0 |
| healthy | 0 | 0 | 0 | 0 | 1636 | 0 | 0 | 0 | 0 | 10 | 0 |
| injector_abnormality | 0 | 0 | 0 | 0 | 6 | 76 | 0 | 1 | 0 | 0 | 0 |
| lubrication_issue | 0 | 0 | 0 | 0 | 0 | 0 | 172 | 0 | 0 | 0 | 0 |
| misfire | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 188 | 0 | 0 | 0 |
| overheating_trend | 0 | 0 | 0 | 7 | 0 | 0 | 0 | 0 | 109 | 0 | 0 |
| sensor_fault | 0 | 0 | 0 | 0 | 184 | 0 | 0 | 0 | 0 | 342 | 0 |
| turbo_degradation | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 105 |

## Per-class precision / recall / F1

| class | precision | recall | f1 | support |
|---|---|---|---|---|
| abnormal_vibration | 1.00 | 1.00 | 1.00 | 56 |
| alternator_degradation | 1.00 | 1.00 | 1.00 | 75 |
| combustion_instability | 1.00 | 0.91 | 0.95 | 364 |
| cooling_degradation | 0.96 | 0.99 | 0.97 | 151 |
| healthy | 0.88 | 0.99 | 0.93 | 1646 |
| injector_abnormality | 0.97 | 0.92 | 0.94 | 83 |
| lubrication_issue | 1.00 | 1.00 | 1.00 | 172 |
| misfire | 0.98 | 0.99 | 0.99 | 190 |
| overheating_trend | 0.98 | 0.94 | 0.96 | 116 |
| sensor_fault | 0.97 | 0.65 | 0.78 | 526 |
| turbo_degradation | 1.00 | 1.00 | 1.00 | 105 |

## Anomaly detection

- Mean score on healthy test windows: {'isolation_forest': 0.44837602053789183, 'autoencoder': 0.3387973815856025}
- Mean score on faulty test windows: {'isolation_forest': 0.5313359089347448, 'autoencoder': 0.9131124728343971}

## Detection lead time vs threshold alarm (cooling faults)

- Over 16 held-out cooling-related fault samples, the model-based detector fired on average **243s** before the hard-limit CHT alarm would have (see docs/figures/early_detection.png for a worked example).

## RUL (particle filter)

- RMSE against known time-to-failure on run-to-failure samples: **8.26 engine-hours**.

## SHAP explanations (sample test predictions)

1. cht_spread_mean raised the confidence; vibration_mean raised the confidence; alternator_current_a_resid_mean lowered the confidence
2. cht_spread_mean raised the confidence; oil_pressure_kpa_resid_mean raised the confidence; vibration_mean raised the confidence
3. cht_spread_mean raised the confidence; oil_pressure_kpa_resid_mean raised the confidence; vibration_mean raised the confidence
4. cht_spread_mean raised the confidence; oil_pressure_kpa_resid_mean raised the confidence; vibration_mean raised the confidence
5. cht_spread_mean raised the confidence; oil_pressure_kpa_resid_mean raised the confidence; alternator_voltage_v_resid_std raised the confidence

## Edge (ONNX) model benchmark

- Model size: 2.0 KB
- Mean latency: 0.004 ms; p95: 0.005 ms

## Known limitations

- These numbers come from the default `--size small` (45-sample) dataset for fast iteration. Some classes have few or zero held-out test rows, and rarer/subtler classes (`misfire` vs `injector_abnormality`, `sensor_fault`) are under-represented and show weaker recall as a result — regenerate with `--size medium` or `--size large` for a more statistically meaningful evaluation.
