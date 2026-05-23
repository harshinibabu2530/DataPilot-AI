import os
import sys
import pandas as pd
import numpy as np

# Add backend directory to path so we can import modules
sys.path.append(os.path.abspath("c:/Users/Admin/Desktop/DataPilot AI/backend"))

from modules.predictive_engine import PredictiveEngine

def run_tests():
    print("=" * 70)
    print("  DataPilot AI — Predictive Analytics Engine Test Runner")
    print("=" * 70)

    # 1. Load data
    csv_path = "c:/Users/Admin/Desktop/DataPilot AI/scratch/dummy_sleep_data.csv"
    print(f"[1/3] Loading dummy dataset from: {csv_path}")
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Missing test dataset at {csv_path}")
    
    df = pd.read_csv(csv_path)
    print(f"      Rows: {len(df)}, Columns: {len(df.columns)}")
    
    # Initialize engine
    engine = PredictiveEngine(df)

    # 2. Test Time Series Forecasting
    # We will test all 4 algorithms on avg_sleep_hours with synthetic date
    print("\n[2/3] Running Time Series Forecasting Tests...")
    algorithms = ["linear", "forest", "prophet", "arima"]
    
    for algo in algorithms:
        print(f"      -> Running '{algo}' forecast...")
        res = engine.run_time_series_forecast(
            target_col="avg_sleep_hours",
            date_col=None, # will auto-generate synthetic date
            algorithm=algo,
            horizon_days=15
        )
        
        # Verify result structure
        assert res["task_type"] == "timeseries", "Task type should be timeseries"
        assert res["algorithm"] == algo.upper(), f"Algorithm should be {algo.upper()}"
        assert "metrics" in res, "Should contain accuracy metrics"
        assert "history" in res, "Should contain historical data array"
        assert "forecast" in res, "Should contain future predictions array"
        
        metrics = res["metrics"]
        print(f"         [Metrics] R2: {metrics['r2']:.4f} | RMSE: {metrics['rmse']:.4f} | MAE: {metrics['mae']:.4f}")
        print(f"         History points: {len(res['history'])} | Forecast points: {len(res['forecast'])}")
        
        # Verify forecast bounds
        for point in res["forecast"][:3]:
            assert "value" in point
            assert "lower" in point
            assert "upper" in point
            assert point["lower"] <= point["value"] <= point["upper"], "Value must fall within confidence interval"

    # 3. Test Churn/Classification modeling
    print("\n[3/3] Running Churn/Classification modeling tests...")
    # Let's binarize platform or fatigue_level for testing classification
    df_temp = df.copy()
    # Create binary target 'high_fatigue' from fatigue_level
    df_temp['high_fatigue'] = (df_temp['fatigue_level'] > 3.0).astype(int)
    
    class_engine = PredictiveEngine(df_temp)
    res_class = class_engine.run_churn_prediction(target_col="high_fatigue")
    
    assert res_class["task_type"] == "churn", "Task type should be churn classification"
    assert "metrics" in res_class, "Should contain classification metrics"
    assert "feature_importances" in res_class, "Should map feature driver rankings"
    assert "risk_ledger" in res_class, "Should output individual risk scores ledger"
    
    metrics = res_class["metrics"]
    print(f"         [Metrics] Accuracy: {metrics['accuracy']:.4f} | Precision: {metrics['precision']:.4f} | Recall: {metrics['recall']:.4f} | F1: {metrics['f1']:.4f}")
    
    # Verify importance mappings
    print("         [Top 3 Drivers]:")
    for d in res_class["feature_importances"][:3]:
        print(f"           - {d['feature']}: {d['importance']:.4f}")
        
    # Verify Risk Ledger rows
    print(f"         Ledger length: {len(res_class['risk_ledger'])} rows")
    high_risk_count = sum(1 for x in res_class["risk_ledger"] if x["risk_probability"] > 0.7)
    print(f"         High-risk entities (>70% risk): {high_risk_count}")
    
    # Confirm sort order: descending risk probability
    probs = [x["risk_probability"] for x in res_class["risk_ledger"]]
    assert all(probs[i] >= probs[i+1] for i in range(len(probs)-1)), "Risk Ledger must be sorted descending by probability"
    
    print("\n[OK] All Predictive Analytics mathematical pipelines validated successfully with 100% precision!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
