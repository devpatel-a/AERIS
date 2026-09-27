"""Fault classification: XGBoost multi-class classifier + SHAP explanations."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import shap
import xgboost as xgb
from sklearn.preprocessing import LabelEncoder


@dataclass
class FaultClassifier:
    """Wraps an XGBoost classifier + label encoder + SHAP explainer."""

    model: xgb.XGBClassifier
    encoder: LabelEncoder
    feature_cols: list[str]
    explainer: shap.TreeExplainer | None = None

    def _predict_indices(self, X: np.ndarray) -> np.ndarray:
        y = self.model.predict(X)
        if y.ndim > 1:  # some xgboost versions return raw per-class probabilities here
            y = np.argmax(y, axis=1)
        return y

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Return predicted class name for each row."""
        return self.encoder.inverse_transform(self._predict_indices(X))

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Return per-class probabilities, columns ordered per `self.encoder.classes_`."""
        return self.model.predict_proba(X)

    def explain(self, X: np.ndarray, top_k: int = 3) -> list[str]:
        """Return a plain-English top-k SHAP explanation string per row."""
        if self.explainer is None:
            self.explainer = shap.TreeExplainer(self.model)
        shap_values = self.explainer.shap_values(X)
        pred = self._predict_indices(X)

        explanations = []
        for i in range(X.shape[0]):
            row_shap = shap_values[i] if shap_values.ndim == 2 else shap_values[i, :, pred[i]]
            order = np.argsort(-np.abs(row_shap))[:top_k]
            parts = []
            for j in order:
                direction = "raised" if row_shap[j] > 0 else "lowered"
                parts.append(f"{self.feature_cols[j]} {direction} the confidence")
            explanations.append("; ".join(parts))
        return explanations

    def explain_structured(self, X: np.ndarray, top_k: int = 5) -> list[list[dict[str, float | str]]]:
        """Return the top-k signed SHAP contributions per row, as {feature, value} —
        for a bipolar SHAP bar chart (positive = raised confidence in the predicted
        class, negative = lowered it), rather than the plain-English text `explain()` gives.
        """
        if self.explainer is None:
            self.explainer = shap.TreeExplainer(self.model)
        shap_values = self.explainer.shap_values(X)
        pred = self._predict_indices(X)

        rows: list[list[dict[str, float | str]]] = []
        for i in range(X.shape[0]):
            row_shap = shap_values[i] if shap_values.ndim == 2 else shap_values[i, :, pred[i]]
            order = np.argsort(-np.abs(row_shap))[:top_k]
            rows.append([{"feature": self.feature_cols[j], "value": float(row_shap[j])} for j in order])
        return rows


def train_classifier(
    X: np.ndarray,
    y: list[str],
    feature_cols: list[str],
    seed: int = 0,
) -> FaultClassifier:
    """Train the multi-class fault classifier."""

    encoder = LabelEncoder().fit(sorted(set(y)))
    y_enc = encoder.transform(y)

    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.1,
        objective="multi:softprob",
        num_class=len(encoder.classes_),
        random_state=seed,
        eval_metric="mlogloss",
        n_jobs=1,
        tree_method="hist",
    )

    model.fit(X, y_enc)

    return FaultClassifier(
        model=model,
        encoder=encoder,
        feature_cols=feature_cols,
    )
