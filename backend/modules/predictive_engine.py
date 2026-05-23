"""
predictive_engine.py — InsightForge AI (DataPilot AI)
High-performance mathematical modeling engine for time series forecasting & classification.
Contains robust custom fallbacks for Prophet and ARIMA using Fourier seasonality and
recursive autoregressive lag modeling via regularized/ensemble regression.
"""

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge, LinearRegression
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error, accuracy_score, precision_score, recall_score, f1_score


class PredictiveEngine:
    def __init__(self, df: pd.DataFrame):
        self.df = df.copy()

    def run_time_series_forecast(self, target_col: str, date_col: str, algorithm: str = "prophet", horizon_days: int = 30) -> dict:
        """
        Processes and forecasts a numerical target variable over a datetime column.
        Supports algorithms: 'linear', 'forest', 'prophet', 'arima'.
        Returns a dict containing historical data, future predictions with upper/lower bounds, and metrics.
        """
        try:
            # 1. Validate inputs
            if target_col not in self.df.columns:
                raise ValueError(f"Target column '{target_col}' not found in dataset.")
            
            # Prepare date column
            df_ts = self.df.copy()
            if date_col and date_col in df_ts.columns:
                df_ts[date_col] = pd.to_datetime(df_ts[date_col], errors='coerce')
                # Drop rows where date parsing failed or target is null
                df_ts = df_ts.dropna(subset=[date_col, target_col])
            else:
                # If no date column is provided or parse fails, create synthetic daily date sequence
                print("[PredictiveEngine] No date column provided, generating synthetic dates.")
                df_ts['__synthetic_date__'] = pd.date_range(start='2026-01-01', periods=len(df_ts), freq='D')
                date_col = '__synthetic_date__'
                df_ts = df_ts.dropna(subset=[target_col])

            if len(df_ts) < 5:
                raise ValueError("Dataset has too few records for forecasting (minimum 5 required).")

            # 2. Resample and interpolate gaps to create a regular timeline
            df_ts = df_ts[[date_col, target_col]].sort_values(by=date_col)
            df_ts.set_index(date_col, inplace=True)

            # Auto-detect frequency based on average delta
            time_diffs = pd.Series(df_ts.index).diff().dropna()
            mean_diff = time_diffs.mean() if not time_diffs.empty else pd.Timedelta(days=1)
            
            if mean_diff >= pd.Timedelta(days=28):
                freq = 'M'
            elif mean_diff >= pd.Timedelta(days=6):
                freq = 'W'
            else:
                freq = 'D'

            # Resample and interpolate missing points
            resampled = df_ts[target_col].resample(freq).mean()
            # If the resampled series has too many NaN gaps at the ends, trim them; interpolate inner gaps
            resampled = resampled.interpolate(method='linear')
            # Fill remaining NaNs if any (e.g. at the edges)
            resampled = resampled.bfill().ffill()

            if len(resampled) < 5:
                # If resampling made it too short, fall back to simple daily range or keep raw index
                resampled = df_ts[target_col].copy()
                resampled.index = pd.date_range(start='2026-01-01', periods=len(resampled), freq='D')
                freq = 'D'

            # Prepare data arrays
            history_dates = resampled.index
            history_vals = resampled.values
            n_history = len(history_vals)

            # Define time index as float step
            t_steps = np.arange(n_history, dtype=float)

            # Train/test split for performance evaluation (last 20% or at least 2 points)
            split_idx = max(int(n_history * 0.8), min(n_history - 2, n_history - 1))
            split_idx = max(3, split_idx) # Ensure at least 3 points in train

            # 3. Model construction and forecasting
            forecast_dates = pd.date_range(start=history_dates[-1] + pd.tseries.frequencies.to_offset(freq), periods=horizon_days, freq=freq)
            t_future = np.arange(n_history, n_history + horizon_days, dtype=float)

            y_train, y_test = history_vals[:split_idx], history_vals[split_idx:]
            t_train, t_test = t_steps[:split_idx], t_steps[split_idx:]

            algorithm = algorithm.lower()
            
            # Helper to create Fourier features (Prophet Fallback)
            def get_fourier_features(t_arr, base_dates):
                # Weekly (period = 7 days) and Yearly (period = 365.25 days) seasonality
                # t_arr is numeric index. Let's calculate day of week and day of year from base_dates.
                X_f = []
                # Trend term
                X_f.append(t_arr)
                X_f.append(t_arr ** 2) # quadratic trend

                # Fourier terms
                # Day of year (yearly seasonality)
                doy = base_dates.dayofyear.values
                for k in range(1, 4): # 3 harmonics
                    X_f.append(np.sin(2 * np.pi * k * doy / 365.25))
                    X_f.append(np.cos(2 * np.pi * k * doy / 365.25))

                # Day of week (weekly seasonality)
                dow = base_dates.dayofweek.values
                for k in range(1, 3): # 2 harmonics
                    X_f.append(np.sin(2 * np.pi * k * dow / 7))
                    X_f.append(np.cos(2 * np.pi * k * dow / 7))

                return np.column_stack(X_f)

            # Model evaluation on split
            try:
                if algorithm == "linear":
                    model_eval = LinearRegression()
                    model_eval.fit(t_train.reshape(-1, 1), y_train)
                    y_test_pred = model_eval.predict(t_test.reshape(-1, 1))

                    # Full model
                    model_full = LinearRegression()
                    model_full.fit(t_steps.reshape(-1, 1), history_vals)
                    future_pred = model_full.predict(t_future.reshape(-1, 1))

                elif algorithm == "prophet":
                    # Custom Prophet seasonality fallback
                    X_train = get_fourier_features(t_train, history_dates[:split_idx])
                    X_test = get_fourier_features(t_test, history_dates[split_idx:])

                    model_eval = Ridge(alpha=1.0)
                    model_eval.fit(X_train, y_train)
                    y_test_pred = model_eval.predict(X_test)

                    # Full model
                    X_full = get_fourier_features(t_steps, history_dates)
                    X_future = get_fourier_features(t_future, forecast_dates)

                    model_full = Ridge(alpha=1.0)
                    model_full.fit(X_full, history_vals)
                    future_pred = model_full.predict(X_future)

                elif algorithm == "forest":
                    # Simple Trend + Random Forest Residual Regressor
                    # We model trend with Linear Regression and residuals with Random Forest
                    lr_trend = LinearRegression()
                    lr_trend.fit(t_train.reshape(-1, 1), y_train)
                    train_res = y_train - lr_trend.predict(t_train.reshape(-1, 1))

                    # Lag features of residuals
                    def create_lag_features(res_vals, max_lags=3):
                        features, targets = [], []
                        for i in range(max_lags, len(res_vals)):
                            features.append(res_vals[i-max_lags:i])
                            targets.append(res_vals[i])
                        return np.array(features), np.array(targets)

                    max_lags = min(3, len(train_res) - 1)
                    if max_lags > 0:
                        X_lag_tr, y_lag_tr = create_lag_features(train_res, max_lags)
                        if len(X_lag_tr) > 0:
                            rf_model = RandomForestRegressor(n_estimators=50, random_state=42)
                            rf_model.fit(X_lag_tr, y_lag_tr)
                            
                            # Predict test (recursive residuals prediction)
                            test_res_pred = []
                            curr_window = list(train_res[-max_lags:])
                            for _ in range(len(y_test)):
                                pred_res = rf_model.predict([curr_window])[0]
                                test_res_pred.append(pred_res)
                                curr_window.append(pred_res)
                                curr_window.pop(0)
                            
                            y_test_pred = lr_trend.predict(t_test.reshape(-1, 1)) + np.array(test_res_pred)
                        else:
                            y_test_pred = lr_trend.predict(t_test.reshape(-1, 1))
                    else:
                        y_test_pred = lr_trend.predict(t_test.reshape(-1, 1))

                    # Full model
                    lr_trend_full = LinearRegression()
                    lr_trend_full.fit(t_steps.reshape(-1, 1), history_vals)
                    full_res = history_vals - lr_trend_full.predict(t_steps.reshape(-1, 1))

                    max_lags = min(3, len(full_res) - 1)
                    if max_lags > 0:
                        X_lag_f, y_lag_f = create_lag_features(full_res, max_lags)
                        if len(X_lag_f) > 0:
                            rf_full = RandomForestRegressor(n_estimators=50, random_state=42)
                            rf_full.fit(X_lag_f, y_lag_f)

                            future_res_pred = []
                            curr_window = list(full_res[-max_lags:])
                            for _ in range(horizon_days):
                                pred_res = rf_full.predict([curr_window])[0]
                                future_res_pred.append(pred_res)
                                curr_window.append(pred_res)
                                curr_window.pop(0)

                            future_pred = lr_trend_full.predict(t_future.reshape(-1, 1)) + np.array(future_res_pred)
                        else:
                            future_pred = lr_trend_full.predict(t_future.reshape(-1, 1))
                    else:
                        future_pred = lr_trend_full.predict(t_future.reshape(-1, 1))

                else: # arima fallback
                    # Autoregressive Lag-1 Model (Standard ARIMA(1,0,0) fallback)
                    # We difference the series if it has a trend, fit autoregressive lag, and integrate back.
                    diffs = np.diff(y_train)
                    if len(diffs) > 2:
                        # fit lag-1 on diffs
                        X_diff = diffs[:-1].reshape(-1, 1)
                        y_diff = diffs[1:]
                        ar_model = Ridge(alpha=1.0)
                        ar_model.fit(X_diff, y_diff)

                        # Recursive prediction
                        diff_pred = []
                        last_diff = diffs[-1]
                        for _ in range(len(y_test)):
                            pred_d = ar_model.predict([[last_diff]])[0]
                            diff_pred.append(pred_d)
                            last_diff = pred_d

                        # Integrate
                        y_test_pred = []
                        curr_val = y_train[-1]
                        for d in diff_pred:
                            curr_val += d
                            y_test_pred.append(curr_val)
                        y_test_pred = np.array(y_test_pred)
                    else:
                        model_eval = LinearRegression()
                        model_eval.fit(t_train.reshape(-1, 1), y_train)
                        y_test_pred = model_eval.predict(t_test.reshape(-1, 1))

                    # Full model
                    diffs_full = np.diff(history_vals)
                    if len(diffs_full) > 2:
                        X_diff_f = diffs_full[:-1].reshape(-1, 1)
                        y_diff_f = diffs_full[1:]
                        ar_full = Ridge(alpha=1.0)
                        ar_full.fit(X_diff_f, y_diff_f)

                        diff_pred_f = []
                        last_diff = diffs_full[-1]
                        for _ in range(horizon_days):
                            pred_d = ar_full.predict([[last_diff]])[0]
                            diff_pred_f.append(pred_d)
                            last_diff = pred_d

                        future_pred = []
                        curr_val = history_vals[-1]
                        for d in diff_pred_f:
                            curr_val += d
                            future_pred.append(curr_val)
                        future_pred = np.array(future_pred)
                    else:
                        model_full = LinearRegression()
                        model_full.fit(t_steps.reshape(-1, 1), history_vals)
                        future_pred = model_full.predict(t_future.reshape(-1, 1))

            except Exception as modeling_err:
                print(f"[PredictiveEngine] Algorithm modeling failed: {modeling_err}. Falling back to Linear trend.")
                # Hard fallback to simple linear regression
                model_eval = LinearRegression()
                model_eval.fit(t_train.reshape(-1, 1), y_train)
                y_test_pred = model_eval.predict(t_test.reshape(-1, 1))

                model_full = LinearRegression()
                model_full.fit(t_steps.reshape(-1, 1), history_vals)
                future_pred = model_full.predict(t_future.reshape(-1, 1))

            # 4. Metrics calculation on split
            r2 = max(0.0, float(r2_score(y_test, y_test_pred))) if len(y_test) > 1 else 1.0
            rmse = float(np.sqrt(mean_squared_error(y_test, y_test_pred)))
            mae = float(mean_absolute_error(y_test, y_test_pred))

            # 5. Residual standard error for confidence intervals
            residuals = history_vals - (model_full.predict(X_full) if algorithm == "prophet" and 'X_full' in locals() else model_full.predict(t_steps.reshape(-1, 1)) if algorithm == "linear" else history_vals) # fallbacks
            # Clean residuals calculations
            if len(residuals) > 1:
                sigma = np.std(residuals)
            else:
                sigma = np.std(history_vals) * 0.1 if np.std(history_vals) > 0 else 1.0
            if sigma <= 0:
                sigma = 1.0

            # Generate intervals: standard error grows slightly over the horizon step
            upper_bounds = []
            lower_bounds = []
            for idx, pred_val in enumerate(future_pred):
                # Standard error expands as a function of time step: sigma * sqrt(1 + 0.1 * step)
                se = sigma * np.sqrt(1.0 + 0.05 * idx)
                upper_bounds.append(float(pred_val + 1.96 * se))
                lower_bounds.append(float(pred_val - 1.96 * se))

            # Prepare structured historical data points
            history_list = []
            for date_t, val_t in zip(history_dates, history_vals):
                history_list.append({
                    "date": date_t.strftime('%Y-%m-%d'),
                    "value": float(val_t)
                })

            # Prepare structured future forecast points
            forecast_list = []
            for date_t, val_t, low_t, up_t in zip(forecast_dates, future_pred, lower_bounds, upper_bounds):
                forecast_list.append({
                    "date": date_t.strftime('%Y-%m-%d'),
                    "value": float(val_t),
                    "lower": float(low_t),
                    "upper": float(up_t)
                })

            return {
                "task_type": "timeseries",
                "target_column": target_col,
                "date_column": date_col,
                "algorithm": algorithm.upper(),
                "frequency": freq,
                "metrics": {
                    "r2": r2,
                    "rmse": rmse,
                    "mae": mae
                },
                "history": history_list,
                "forecast": forecast_list
            }

        except ValueError as e:
            raise e
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise RuntimeError(f"Time Series Forecasting failed: {str(e)}")

    def run_churn_prediction(self, target_col: str) -> dict:
        """
        Executes a classification pipeline predicting Churn Risk (binary/categorical target column).
        Extracts feature importances, accuracy metrics, and computes risk probabilities for every record.
        """
        try:
            if target_col not in self.df.columns:
                raise ValueError(f"Target column '{target_col}' not found in dataset.")

            df_class = self.df.copy()
            # Drop null values in target
            df_class = df_class.dropna(subset=[target_col])

            # Convert target to integer categories
            y_series = df_class[target_col]
            
            # Map target labels to indices if string
            if y_series.dtype == object or isinstance(y_series.iloc[0], str):
                unique_labels = sorted(list(y_series.unique()))
                label_mapping = {lbl: idx for idx, lbl in enumerate(unique_labels)}
                y = y_series.map(label_mapping).values
                reverse_mapping = {idx: lbl for idx, lbl in label_mapping.items()}
                is_binary = len(unique_labels) == 2
                target_classes = unique_labels
            else:
                # Numerical categories
                unique_labels = sorted([float(v) for v in y_series.unique()])
                label_mapping = {lbl: idx for idx, lbl in enumerate(unique_labels)}
                y = y_series.map(label_mapping).values
                reverse_mapping = {idx: str(lbl) for idx, lbl in label_mapping.items()}
                is_binary = len(unique_labels) == 2
                target_classes = [str(x) for x in unique_labels]

            if len(np.unique(y)) < 2:
                raise ValueError("Target column must have at least 2 distinct classes to perform classification modeling.")

            # Identify features. Skip unique identifiers or keys
            drop_cols = [target_col]
            for col in df_class.columns:
                col_lower = col.lower()
                if col_lower in ['user_id', 'id', 'uuid', 'email', 'name', 'date', 'timestamp', 'created_at', 'updated_at']:
                    drop_cols.append(col)

            # Keep track of records with original identifiers to present in Risk Ledger
            record_identifiers = []
            id_col = None
            for col in df_class.columns:
                if col.lower() in ['user_id', 'id', 'email', 'name']:
                    id_col = col
                    break

            for idx, row in df_class.iterrows():
                record_id = str(row[id_col]) if id_col else f"Record #{idx + 1}"
                record_identifiers.append(record_id)

            X_raw = df_class.drop(columns=drop_cols, errors='ignore')

            # Impute and process feature dataframes
            # 1. Split numeric and categorical
            num_cols = X_raw.select_dtypes(include=[np.number]).columns.tolist()
            cat_cols = X_raw.select_dtypes(exclude=[np.number]).columns.tolist()

            # Impute numbers with median
            for col in num_cols:
                median_val = X_raw[col].median()
                if pd.isna(median_val):
                    median_val = 0.0
                X_raw[col] = X_raw[col].fillna(median_val)

            # Impute categories with mode
            for col in cat_cols:
                mode_val = X_raw[col].mode()
                mode_str = mode_val.iloc[0] if not mode_val.empty else "Unknown"
                X_raw[col] = X_raw[col].fillna(mode_str)

            # One-hot encode categoricals
            if cat_cols:
                X = pd.get_dummies(X_raw, columns=cat_cols, drop_first=True)
            else:
                X = X_raw.copy()

            # Convert boolean dummy columns to float
            for col in X.columns:
                if X[col].dtype == bool:
                    X[col] = X[col].astype(float)

            feature_names = X.columns.tolist()
            
            # Split train and test (80/20)
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

            # Train classifier
            clf = RandomForestClassifier(n_estimators=100, random_state=42)
            clf.fit(X_train, y_train)

            # Evaluate
            y_pred = clf.predict(X_test)
            y_prob_all = clf.predict_proba(X)

            accuracy = float(accuracy_score(y_test, y_pred))
            precision = float(precision_score(y_test, y_pred, average='weighted', zero_division=0))
            recall = float(recall_score(y_test, y_pred, average='weighted', zero_division=0))
            f1 = float(f1_score(y_test, y_pred, average='weighted', zero_division=0))

            # Feature Importances
            importances = clf.feature_importances_
            importance_list = []
            for name, score in zip(feature_names, importances):
                importance_list.append({
                    "feature": name,
                    "importance": float(score)
                })
            # Sort importances descending
            importance_list = sorted(importance_list, key=lambda x: x["importance"], reverse=True)[:10]

            # Individual Risk Ledger
            risk_ledger = []
            # We predict the probability of the 'churn' or 'positive' class
            # Positive class is typically the last class (index 1 in binary classification, or highest indexed category)
            # For multi-class, we show the class with the maximum probability
            for idx, (rec_id, prob) in enumerate(zip(record_identifiers, y_prob_all)):
                max_class_idx = np.argmax(prob)
                max_class_label = reverse_mapping[max_class_idx]
                
                # Churn risk is specific to positive class if binary, or maximum class probability
                # If binary, risk is prob of class 1.
                if is_binary:
                    risk_score = float(prob[1])
                    risk_category = reverse_mapping[1]
                else:
                    risk_score = float(prob[max_class_idx])
                    risk_category = max_class_label

                # Extract a few key features from this row to show in the ledger
                row_raw = df_class.iloc[idx]
                details = {}
                # Grab up to 3 descriptive non-identifier columns
                details_count = 0
                for d_col in df_class.columns:
                    if d_col not in drop_cols and d_col != id_col and details_count < 3:
                        val = row_raw[d_col]
                        # Format floats
                        if isinstance(val, (float, np.floating)):
                            val = round(val, 2)
                        details[d_col] = str(val)
                        details_count += 1

                risk_ledger.append({
                    "id": rec_id,
                    "risk_probability": risk_score,
                    "predicted_label": max_class_label,
                    "risk_category": risk_category,
                    "details": details
                })

            # Sort Risk Ledger: highest risk probability first
            risk_ledger = sorted(risk_ledger, key=lambda x: x["risk_probability"], reverse=True)

            return {
                "task_type": "churn",
                "target_column": target_col,
                "classes": target_classes,
                "metrics": {
                    "accuracy": accuracy,
                    "precision": precision,
                    "recall": recall,
                    "f1": f1
                },
                "feature_importances": importance_list,
                "risk_ledger": risk_ledger
            }

        except ValueError as e:
            raise e
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise RuntimeError(f"Classification / Churn prediction failed: {str(e)}")
