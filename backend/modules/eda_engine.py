"""
eda_engine.py
Automated Exploratory Data Analysis:
- Statistical summaries (describe)
- Correlation analysis
- Missing value report
- Distribution data (histogram buckets)
- Feature relationships
- Heatmap data
"""

import pandas as pd
import numpy as np
from scipy import stats
from config import Config


class EDAEngine:

    def __init__(self, df: pd.DataFrame):
        self.df = df.copy()

    def run_full_eda(self) -> dict:
        """Run all EDA modules and return combined JSON-serializable results."""
        results = {
            "overview": self.get_overview(),
            "statistical_summary": self.get_statistical_summary(),
            "missing_values": self.get_missing_value_report(),
            "correlation": self.get_correlation_matrix(),
            "distributions": self.get_distributions(),
            "categorical_summaries": self.get_categorical_summaries(),
            "top_correlations": self.get_top_correlations(),
        }
        results["data_quality"] = self.get_data_quality_score()
        return results

    def get_data_quality_score(self) -> dict:
        """Calculate high-fidelity dataset quality scores across multiple dimensions."""
        rows = len(self.df)
        cols = len(self.df.columns)
        total_cells = rows * cols
        
        # 1. Missing Values Score
        if total_cells > 0:
            total_missing = int(self.df.isnull().sum().sum())
            missing_pct = (total_missing / total_cells) * 100.0
            missing_score = round(max(0.0, 100.0 - missing_pct), 1)
        else:
            total_missing = 0
            missing_score = 100.0
            
        # 2. Consistency Score (Duplicates penalty)
        if rows > 0:
            duplicate_rows = int(self.df.duplicated().sum())
            dup_pct = (duplicate_rows / rows) * 100.0
            consistency_score = round(max(0.0, 100.0 - dup_pct), 1)
        else:
            duplicate_rows = 0
            consistency_score = 100.0
            
        # 3. Outliers Score (IQR method)
        numeric_df = self.df.select_dtypes(include=[np.number])
        total_numeric_cells = numeric_df.size
        total_outliers = 0
        
        if total_numeric_cells > 0:
            for col in numeric_df.columns:
                series = numeric_df[col].dropna()
                if len(series) < 4:
                    continue
                q1 = series.quantile(0.25)
                q3 = series.quantile(0.75)
                iqr = q3 - q1
                if iqr == 0:
                    continue
                lower = q1 - 1.5 * iqr
                upper = q3 + 1.5 * iqr
                outliers = series[(series < lower) | (series > upper)].count()
                total_outliers += int(outliers)
            
            outlier_pct = (total_outliers / total_numeric_cells) * 100.0
            outliers_score = round(max(0.0, 100.0 - outlier_pct * 2.0), 1)
        else:
            outliers_score = 100.0
            
        # 4. Overall Score (Weighted average: 40% Missing, 30% Consistency, 30% Outliers)
        overall_score = round((missing_score * 0.4) + (consistency_score * 0.3) + (outliers_score * 0.3), 1)
        
        # 5. Generate single-sentence executive data quality review statement
        explanation = self._generate_quality_explanation(missing_score, consistency_score, outliers_score, overall_score)
        
        return {
            "missing_values_score": missing_score,
            "consistency_score": consistency_score,
            "outliers_score": outliers_score,
            "overall_score": overall_score,
            "explanation": explanation,
            "total_missing": total_missing,
            "duplicate_rows": duplicate_rows,
            "total_outliers": total_outliers
        }

    def _generate_quality_explanation(self, missing_score: float, consistency_score: float, outliers_score: float, overall_score: float) -> str:
        """Generate a premium context-aware data quality governance explanation."""
        if Config.has_llm():
            try:
                system_prompt = "You are a senior data governance and QA officer. You generate concise, highly professional single-sentence data quality assessments."
                prompt = f"""
Analyze the following dataset quality scores and generate a single-sentence governance briefing explaining the quality status.

Quality Metrics:
- Missing Values Score: {missing_score}%
- Consistency Score (Duplicates): {consistency_score}%
- Outliers Score (Anomalies): {outliers_score}%
- Overall Data Quality Score: {overall_score}%

Dataset Context:
- Rows: {len(self.df)}
- Columns: {len(self.df.columns)}
- Duplicate Rows: {self.df.duplicated().sum()}
- Total Missing Values: {self.df.isnull().sum().sum()}
- Columns with Missing Values: {list(self.df.columns[self.df.isnull().any()])[:5]}

Requirements:
1. Return EXACTLY one single professional sentence.
2. Be specific and context-aware (e.g. "Dataset quality reduced due to high missing values in financial columns." if there are missing financial values).
3. Do not include any intro, outro, quotes, or markdown wrappers. Start directly with the sentence.
"""
                if Config.LLM_PROVIDER == "openai":
                    from openai import OpenAI
                    client = OpenAI(api_key=Config.OPENAI_API_KEY)
                    response = client.chat.completions.create(
                        model=Config.OPENAI_MODEL,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": prompt},
                        ],
                        temperature=0.3,
                        max_tokens=150,
                    )
                    return response.choices[0].message.content.strip().strip('"').strip("'")
                elif Config.LLM_PROVIDER == "groq":
                    from groq import Groq
                    client = Groq(api_key=Config.GROQ_API_KEY)
                    response = client.chat.completions.create(
                        model=Config.GROQ_MODEL,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": prompt},
                        ],
                        temperature=0.3,
                        max_tokens=150,
                    )
                    return response.choices[0].message.content.strip().strip('"').strip("'")
            except Exception as e:
                print(f"[EDA Engine] LLM quality explanation failed ({e}), using fallback.")

        # Fallback logic
        if overall_score >= 95:
            return "The dataset exhibits exceptional quality and high integrity, with negligible missing values, anomalies, or duplicates, making it highly reliable for downstream modeling."
        
        # Check if missingness is the primary issue
        null_counts = self.df.isnull().sum()
        high_missing_cols = [col for col in self.df.columns if null_counts[col] > 0]
        if missing_score < 90 and high_missing_cols:
            financial_keywords = ["price", "amount", "cost", "revenue", "income", "salary", "financial", "budget", "spend", "balance"]
            financial_cols = [col for col in high_missing_cols if any(kw in col.lower() for kw in financial_keywords)]
            if financial_cols:
                return f"Dataset quality reduced due to high missing values in financial columns ({', '.join(financial_cols[:2])})."
            else:
                return f"Dataset quality reduced due to high missing values in columns: {', '.join(high_missing_cols[:3])}."
        
        # Check if consistency/duplicates is the primary issue
        if consistency_score < 95:
            dup_count = self.df.duplicated().sum()
            return f"Dataset integrity is impacted by a significant presence of duplicate records ({dup_count} duplicate rows), requiring deduplication before modeling."
            
        # Check if outliers is the primary issue
        if outliers_score < 85:
            return "Dataset quality is slightly degraded due to a noticeable volume of numerical outliers and distribution anomalies in key variables."
            
        # Default fallback
        return f"The dataset is of good overall quality ({overall_score}%), presenting low missingness and clean distributions suitable for general descriptive and predictive analysis."

    # ------------------------------------------------------------------ #
    #  Overview
    # ------------------------------------------------------------------ #
    def get_overview(self) -> dict:
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = self.df.select_dtypes(include=["object", "category"]).columns.tolist()
        datetime_cols = self.df.select_dtypes(include=["datetime64"]).columns.tolist()

        return {
            "rows": int(len(self.df)),
            "columns": int(len(self.df.columns)),
            "numeric_columns": numeric_cols,
            "categorical_columns": categorical_cols,
            "datetime_columns": datetime_cols,
            "memory_usage_kb": round(self.df.memory_usage(deep=True).sum() / 1024, 2),
            "duplicate_rows": int(self.df.duplicated().sum()),
            "total_missing": int(self.df.isnull().sum().sum()),
        }

    # ------------------------------------------------------------------ #
    #  Statistical Summary
    # ------------------------------------------------------------------ #
    def get_statistical_summary(self) -> list[dict]:
        numeric_df = self.df.select_dtypes(include=[np.number])
        if numeric_df.empty:
            return []

        summary = []
        for col in numeric_df.columns:
            series = numeric_df[col].dropna()
            if len(series) == 0:
                continue
            try:
                skewness = float(series.skew())
                kurtosis = float(series.kurtosis())
            except Exception:
                skewness = 0.0
                kurtosis = 0.0

            summary.append({
                "column": col,
                "count": int(series.count()),
                "mean": round(float(series.mean()), 4),
                "std": round(float(series.std()), 4),
                "min": round(float(series.min()), 4),
                "q1": round(float(series.quantile(0.25)), 4),
                "median": round(float(series.median()), 4),
                "q3": round(float(series.quantile(0.75)), 4),
                "max": round(float(series.max()), 4),
                "skewness": round(skewness, 4),
                "kurtosis": round(kurtosis, 4),
                "missing": int(self.df[col].isnull().sum()),
            })
        return summary

    # ------------------------------------------------------------------ #
    #  Missing Value Report
    # ------------------------------------------------------------------ #
    def get_missing_value_report(self) -> list[dict]:
        total = len(self.df)
        null_counts = self.df.isnull().sum()
        report = []
        for col in self.df.columns:
            count = int(null_counts[col])
            report.append({
                "column": col,
                "missing_count": count,
                "missing_pct": round(count / total * 100, 2),
                "dtype": str(self.df[col].dtype),
            })
        return sorted(report, key=lambda x: -x["missing_pct"])

    # ------------------------------------------------------------------ #
    #  Correlation Matrix
    # ------------------------------------------------------------------ #
    def get_correlation_matrix(self) -> dict:
        numeric_df = self.df.select_dtypes(include=[np.number])
        if numeric_df.shape[1] < 2:
            return {"columns": [], "matrix": []}

        corr = numeric_df.corr(method="pearson").round(3)
        # Replace NaN in corr with None
        corr = corr.where(pd.notna(corr), None)

        return {
            "columns": list(corr.columns),
            "matrix": corr.values.tolist(),
        }

    # ------------------------------------------------------------------ #
    #  Distribution data (for histogram rendering)
    # ------------------------------------------------------------------ #
    def get_distributions(self, bins: int = 20) -> dict:
        numeric_df = self.df.select_dtypes(include=[np.number])
        distributions = {}
        for col in numeric_df.columns:
            series = numeric_df[col].dropna()
            if len(series) < 2:
                continue
            counts, bin_edges = np.histogram(series, bins=bins)
            distributions[col] = {
                "counts": counts.tolist(),
                "bin_edges": [round(float(e), 4) for e in bin_edges],
                "mean": round(float(series.mean()), 4),
                "std": round(float(series.std()), 4),
            }
        return distributions

    # ------------------------------------------------------------------ #
    #  Categorical Summaries
    # ------------------------------------------------------------------ #
    def get_categorical_summaries(self, top_n: int = 10) -> dict:
        cat_df = self.df.select_dtypes(include=["object", "category"])
        summaries = {}
        for col in cat_df.columns:
            vc = self.df[col].value_counts().head(top_n)
            summaries[col] = {
                "unique_count": int(self.df[col].nunique()),
                "top_values": [
                    {"value": str(v), "count": int(c)}
                    for v, c in zip(vc.index, vc.values)
                ],
            }
        return summaries

    # ------------------------------------------------------------------ #
    #  Top correlated pairs
    # ------------------------------------------------------------------ #
    def get_top_correlations(self, top_n: int = 10) -> list[dict]:
        numeric_df = self.df.select_dtypes(include=[np.number])
        if numeric_df.shape[1] < 2:
            return []

        corr = numeric_df.corr(method="pearson").abs()
        # Get upper triangle
        upper = corr.where(np.triu(np.ones(corr.shape), k=1).astype(bool))
        pairs = (
            upper.stack()
            .reset_index()
            .rename(columns={"level_0": "feature_a", "level_1": "feature_b", 0: "correlation"})
            .sort_values("correlation", ascending=False)
            .head(top_n)
        )
        return [
            {
                "feature_a": row["feature_a"],
                "feature_b": row["feature_b"],
                "correlation": round(float(row["correlation"]), 4),
            }
            for _, row in pairs.iterrows()
        ]
