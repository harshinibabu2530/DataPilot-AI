"""
data_cleaner.py
Intelligent data cleaning pipeline:
- Removes duplicates
- Handles null values (smart imputation)
- Detects and caps outliers
- Converts data types
- Formats date/time columns
- Encodes categorical variables
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder


class DataCleaner:

    def __init__(self, df: pd.DataFrame):
        self.original = df.copy()
        self.df = df.copy()
        self.report = {
            "original_shape": list(df.shape),
            "steps": [],
            "issues_found": [],
        }

    def clean(self) -> tuple[pd.DataFrame, dict]:
        """Run the full cleaning pipeline. Returns (cleaned_df, report)."""
        self._remove_duplicates()
        self._fix_column_names()
        self._detect_and_convert_dtypes()
        self._handle_nulls()
        self._handle_outliers()
        self._encode_booleans()

        self.report["final_shape"] = list(self.df.shape)
        self.report["rows_removed"] = self.report["original_shape"][0] - self.report["final_shape"][0]
        self.report["columns_processed"] = len(self.df.columns)
        return self.df, self.report

    # ------------------------------------------------------------------ #
    #  Step 1 – Duplicates
    # ------------------------------------------------------------------ #
    def _remove_duplicates(self):
        before = len(self.df)
        self.df.drop_duplicates(inplace=True)
        removed = before - len(self.df)
        if removed > 0:
            self.report["steps"].append(f"Removed {removed} duplicate rows.")
            self.report["issues_found"].append({"type": "duplicates", "count": removed})

    # ------------------------------------------------------------------ #
    #  Step 2 – Column name sanitization
    # ------------------------------------------------------------------ #
    def _fix_column_names(self):
        self.df.columns = (
            self.df.columns
            .str.strip()
            .str.lower()
            .str.replace(r"[^a-z0-9_]", "_", regex=True)
            .str.replace(r"__+", "_", regex=True)
            .str.strip("_")
        )
        self.report["steps"].append("Sanitized column names.")

    # ------------------------------------------------------------------ #
    #  Step 3 – Auto dtype detection
    # ------------------------------------------------------------------ #
    def _detect_and_convert_dtypes(self):
        converted = []
        for col in self.df.columns:
            if self.df[col].dtype == object:
                # Try numeric
                converted_numeric = pd.to_numeric(self.df[col], errors="coerce")
                if converted_numeric.notna().sum() / max(len(self.df), 1) > 0.7:
                    self.df[col] = converted_numeric
                    converted.append(f"{col} → numeric")
                    continue
                # Try datetime
                try:
                    converted_dt = pd.to_datetime(self.df[col], infer_datetime_format=True, errors="coerce")
                    if converted_dt.notna().sum() / max(len(self.df), 1) > 0.7:
                        self.df[col] = converted_dt
                        converted.append(f"{col} → datetime")
                except Exception:
                    pass
        if converted:
            self.report["steps"].append(f"Auto-converted columns: {', '.join(converted)}")

    # ------------------------------------------------------------------ #
    #  Step 4 – Null handling
    # ------------------------------------------------------------------ #
    def _handle_nulls(self):
        null_counts = self.df.isnull().sum()
        null_cols = null_counts[null_counts > 0]

        if len(null_cols) == 0:
            self.report["steps"].append("No null values found.")
            return

        null_summary = {}
        for col in null_cols.index:
            pct = null_counts[col] / len(self.df) * 100

            # Drop column if > 60% missing
            if pct > 60:
                self.df.drop(columns=[col], inplace=True)
                null_summary[col] = f"dropped ({pct:.1f}% missing)"
                continue

            dtype = self.df[col].dtype
            if pd.api.types.is_numeric_dtype(dtype):
                median_val = self.df[col].median()
                self.df[col].fillna(median_val, inplace=True)
                null_summary[col] = f"filled with median ({median_val:.2f})"
            elif pd.api.types.is_datetime64_any_dtype(dtype):
                self.df[col].fillna(method="ffill", inplace=True)
                null_summary[col] = "forward-filled"
            else:
                mode_val = self.df[col].mode()
                if len(mode_val) > 0:
                    self.df[col].fillna(mode_val[0], inplace=True)
                    null_summary[col] = f"filled with mode ('{mode_val[0]}')"
                else:
                    self.df[col].fillna("Unknown", inplace=True)
                    null_summary[col] = "filled with 'Unknown'"

        self.report["steps"].append("Handled null values.")
        self.report["null_handling"] = null_summary
        self.report["issues_found"].append({"type": "nulls", "details": null_summary})

    # ------------------------------------------------------------------ #
    #  Step 5 – Outlier capping (IQR method)
    # ------------------------------------------------------------------ #
    def _handle_outliers(self):
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns
        outlier_summary = {}
        for col in numeric_cols:
            Q1 = self.df[col].quantile(0.25)
            Q3 = self.df[col].quantile(0.75)
            IQR = Q3 - Q1
            lower = Q1 - 1.5 * IQR
            upper = Q3 + 1.5 * IQR
            outliers = ((self.df[col] < lower) | (self.df[col] > upper)).sum()
            if outliers > 0:
                self.df[col] = self.df[col].clip(lower=lower, upper=upper)
                outlier_summary[col] = int(outliers)

        if outlier_summary:
            self.report["steps"].append("Capped outliers using IQR method.")
            self.report["outlier_capping"] = outlier_summary
            self.report["issues_found"].append({"type": "outliers", "details": outlier_summary})

    # ------------------------------------------------------------------ #
    #  Step 6 – Boolean encoding
    # ------------------------------------------------------------------ #
    def _encode_booleans(self):
        bool_map = {
            "yes": 1, "no": 0, "true": 1, "false": 0,
            "y": 1, "n": 0, "1": 1, "0": 0
        }
        encoded = []
        for col in self.df.select_dtypes(include=object).columns:
            unique = self.df[col].dropna().str.lower().unique()
            if set(unique).issubset(set(bool_map.keys())):
                self.df[col] = self.df[col].str.lower().map(bool_map)
                encoded.append(col)
        if encoded:
            self.report["steps"].append(f"Encoded boolean columns: {', '.join(encoded)}")

    # ------------------------------------------------------------------ #
    #  Utility – Label encode categoricals (optional, called by domain)
    # ------------------------------------------------------------------ #
    @staticmethod
    def label_encode(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
        df = df.copy()
        le = LabelEncoder()
        for col in columns:
            if col in df.columns and df[col].dtype == object:
                df[col] = le.fit_transform(df[col].astype(str))
        return df

    @staticmethod
    def get_null_report(df: pd.DataFrame) -> dict:
        null_counts = df.isnull().sum()
        total = len(df)
        return {
            col: {
                "count": int(null_counts[col]),
                "percentage": round(null_counts[col] / total * 100, 2)
            }
            for col in null_counts[null_counts > 0].index
        }
