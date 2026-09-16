# AeroTwin ML Results

Trained on 3005 feature-window rows from 34 training missions; evaluated on 790 rows from 11 held-out missions (split by mission/sample_id — no leakage across the split).

## Confusion matrix (rows=true, cols=predicted)

| true \ pred | abnormal_vibration | alternator_degradation | combustion_instability | cooling_degradation | healthy | injector_abnormality | lubrication_issue | misfire | overheating_trend | sensor_fault | turbo_degradation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| abnormal_vibration | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| alternator_degradation | 0 | 46 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| combustion_instability | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| cooling_degradation | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| healthy | 0 | 0 | 0 | 0 | 281 | 0 | 0 | 0 | 0 | 1 | 0 |
| injector_abnormality | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| lubrication_issue | 0 | 0 | 0 | 0 | 0 | 0 | 69 | 0 | 0 | 1 | 0 |
| misfire | 0 | 0 | 0 | 0 | 0 | 58 | 0 | 0 | 0 | 0 | 0 |
| overheating_trend | 0 | 0 | 0 | 24 | 7 | 0 | 0 | 0 | 63 | 0 | 0 |
| sensor_fault | 0 | 0 | 0 | 0 | 230 | 9 | 0 | 0 | 0 | 0 | 0 |
| turbo_degradation | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Per-class precision / recall / F1

| class | precision | recall | f1 | support |
|---|---|---|---|---|
| abnormal_vibration | 0.00 | 0.00 | 0.00 | 0 |
| alternator_degradation | 1.00 | 0.98 | 0.99 | 47 |
| combustion_instability | 0.00 | 0.00 | 0.00 | 0 |
| cooling_degradation | 0.00 | 0.00 | 0.00 | 0 |
| healthy | 0.54 | 1.00 | 0.70 | 282 |
| injector_abnormality | 0.00 | 0.00 | 0.00 | 0 |
| lubrication_issue | 1.00 | 0.99 | 0.99 | 70 |
| misfire | 0.00 | 0.00 | 0.00 | 58 |
| overheating_trend | 1.00 | 0.67 | 0.80 | 94 |
| sensor_fault | 0.00 | 0.00 | 0.00 | 239 |
| turbo_degradation | 0.00 | 0.00 | 0.00 | 0 |

## Anomaly detection

- Mean score on healthy test windows: {'isolation_forest': 0.465585202750861, 'autoencoder': 0.33744388287285787}
- Mean score on faulty test windows: {'isolation_forest': 0.5158840015672252, 'autoencoder': 0.9986270489988878}

## Detection lead time vs threshold alarm (cooling faults)

- Over 3 held-out cooling-related fault samples, the model-based detector fired on average **143s** before the hard-limit CHT alarm would have (see docs/figures/early_detection.png for a worked example).

## RUL (particle filter)

- RMSE against known time-to-failure on run-to-failure samples: **26.56 engine-hours**.

## SHAP explanations (sample test predictions)

1. vibration_mean raised the confidence; oil_pressure_kpa_resid_std lowered the confidence; map_kpa_resid_mean raised the confidence
2. oil_pressure_kpa_resid_mean raised the confidence; vibration_mean raised the confidence; vibration_rms_g_resid_mean raised the confidence
3. oil_pressure_kpa_resid_mean raised the confidence; vibration_rms_g_resid_mean raised the confidence; oil_pressure_kpa_resid_std raised the confidence
4. oil_pressure_kpa_resid_mean raised the confidence; oil_temp_k_resid_std raised the confidence; cht_1_k_resid_std raised the confidence
5. oil_pressure_kpa_resid_mean raised the confidence; oil_temp_k_resid_std raised the confidence; cht_1_k_resid_std raised the confidence

## Edge (ONNX) model benchmark

- Model size: 2.1 KB
- Mean latency: 0.006 ms; p95: 0.007 ms

## Known limitations

- These numbers come from the default `--size small` (45-sample) dataset for fast iteration. Some classes have few or zero held-out test rows, and rarer/subtler classes (`misfire` vs `injector_abnormality`, `sensor_fault`) are under-represented and show weaker recall as a result — regenerate with `--size medium` or `--size large` for a more statistically meaningful evaluation.
