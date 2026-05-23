"""
dashboard_generator.py
Generates dashboard-ready chart data from a cleaned DataFrame.
Returns structured JSON for Recharts/Chart.js frontend rendering.
"""

import pandas as pd
import numpy as np
import json
from config import Config


class DashboardGenerator:

    def __init__(self, df: pd.DataFrame, domain: str = "generic"):
        self.df = df.copy()
        self.domain = domain.lower()

    def generate(self) -> dict:
        """Generate full dashboard data."""
        return {
            "kpi_cards": self.get_kpi_cards(),
            "line_charts": self.get_line_charts(),
            "bar_charts": self.get_bar_charts(),
            "pie_charts": self.get_pie_charts(),
            "heatmap": self.get_heatmap_data(),
            "scatter_pairs": self.get_scatter_pairs(),
        }

    # ------------------------------------------------------------------ #
    #  KPI Cards
    # ------------------------------------------------------------------ #
    def get_kpi_cards(self) -> list[dict]:
        """Automatically detect, map, and calculate key business KPIs from dataset schema."""
        kpi_configs = []
        
        # 1. Try LLM-based detection if configured
        if Config.has_llm():
            try:
                sample_df = self.df.head(3).copy()
                schema_info = {
                    "columns": list(self.df.columns),
                    "dtypes": {col: str(dtype) for col, dtype in self.df.dtypes.items()},
                    "samples": sample_df.to_dict(orient="records"),
                    "domain": self.domain
                }
                
                system_prompt = """You are an expert dashboard designer and data analyst.
Your task is to review the schema (column names, data types, and 3 sample rows) of a dataset, and determine the optimal 4 to 6 business Key Performance Indicators (KPIs) to display on an executive dashboard.

For each KPI, identify:
1. "title": A beautiful business title (e.g. "Total Revenue", "Profit Margin", "Average Customer Age", "Click-Through Rate"). Keep it under 28 characters.
2. "column": The exact column name in the dataset to calculate from.
3. "calculation": The type of Pandas aggregation. Must be one of:
   - "sum": Standard sum of a numeric column.
   - "avg": Standard average of a numeric column.
   - "nunique": Number of unique values (ideal for Customer ID, Order ID, etc.).
   - "ratio": Ratio of two columns, computed as (sum of column / sum of denominator_column) * 100.
4. "denominator_column": If calculation is "ratio", specify the exact denominator column name (otherwise leave null or omit).
5. "prefix": A prefix to add when formatting (e.g. "$" for currency, or "" if none).
6. "suffix": A suffix to add when formatting (e.g. "%" for ratio, or "" if none).
7. "description": A concise description of what this KPI measures.

Return ONLY a valid JSON array of KPI config objects. Do not include markdown formatting, extra comments, or introductory text.
"""
                prompt = f"Dataset Domain: {self.domain}\nDataset Schema:\n{json.dumps(schema_info, indent=2)}\n\nPlease select the best 4 to 6 business KPIs to show on a dashboard for this dataset."
                
                response_text = ""
                if Config.LLM_PROVIDER == "openai":
                    from openai import OpenAI
                    client = OpenAI(api_key=Config.OPENAI_API_KEY)
                    response = client.chat.completions.create(
                        model=Config.OPENAI_MODEL,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": prompt},
                        ],
                        temperature=0.2,
                        max_tokens=1000,
                    )
                    response_text = response.choices[0].message.content
                elif Config.LLM_PROVIDER == "groq":
                    from groq import Groq
                    client = Groq(api_key=Config.GROQ_API_KEY)
                    response = client.chat.completions.create(
                        model=Config.GROQ_MODEL,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": prompt},
                        ],
                        temperature=0.2,
                        max_tokens=1000,
                    )
                    response_text = response.choices[0].message.content
                
                response_text = response_text.strip()
                if response_text.startswith("```"):
                    response_text = response_text.split("```")[1]
                    if response_text.startswith("json"):
                        response_text = response_text[4:]
                
                configs = json.loads(response_text)
                if isinstance(configs, list) and len(configs) > 0:
                    kpi_configs = configs
            except Exception as e:
                print(f"[Dashboard Auto KPI] LLM detection failed ({e}), falling back to heuristic engine.")

        # 2. Heuristic fallback mapper if LLM failed or is offline
        if not kpi_configs:
            cols = [c.lower() for c in self.df.columns]
            col_map = {c.lower(): c for c in self.df.columns}

            def find_matching_col(keywords, exclude=None):
                if exclude is None:
                    exclude = []
                for kw in keywords:
                    for c in cols:
                        if kw in c and not any(ex in c for ex in exclude):
                            return col_map[c]
                return None

            revenue_col = find_matching_col(["revenue", "sales", "income", "billing"], exclude=["cost", "expense", "profit"])
            revenue_col = revenue_col or find_matching_col(["amount"], exclude=["cost", "expense", "profit"])
            profit_col = find_matching_col(["profit", "net_income", "earnings"], exclude=["cost", "expense", "revenue", "sales"])
            cost_col = find_matching_col(["cost", "expense", "spend", "expenses", "expenditure"])
            cust_col = find_matching_col(["customer_id", "user_id", "transaction_id", "invoice_id", "client_id", "member_id", "patient_id", "order_id"])
            cust_col = cust_col or find_matching_col(["customer", "user", "transaction", "invoice", "client", "member", "patient", "order"], exclude=["name", "type", "date"])
            salary_col = find_matching_col(["salary", "wage", "compensation", "pay"])
            age_col = find_matching_col(["age"])
            clicks_col = find_matching_col(["click", "clicks"])
            impressions_col = find_matching_col(["impression", "impressions"])
            sleep_hours_col = find_matching_col(["sleep_hours", "avg_sleep_hours", "sleep_duration"])
            sleep_quality_col = find_matching_col(["sleep_quality", "sleep_score"])
            fatigue_col = find_matching_col(["fatigue"])
            late_night_col = find_matching_col(["late_night", "night_usage"])

            if revenue_col:
                kpi_configs.append({
                    "title": "Total Revenue",
                    "column": revenue_col,
                    "calculation": "sum",
                    "prefix": "$",
                    "suffix": "",
                    "description": "Total revenue generated"
                })
            if profit_col:
                if revenue_col:
                    kpi_configs.append({
                        "title": "Profit Margin",
                        "column": profit_col,
                        "calculation": "ratio",
                        "denominator_column": revenue_col,
                        "prefix": "",
                        "suffix": "%",
                        "description": "Net profit margin ratio"
                    })
                else:
                    kpi_configs.append({
                        "title": "Total Profit",
                        "column": profit_col,
                        "calculation": "sum",
                        "prefix": "$",
                        "suffix": "",
                        "description": "Total profit generated"
                    })
            if cost_col:
                kpi_configs.append({
                    "title": "Total Operational Cost",
                    "column": cost_col,
                    "calculation": "sum",
                    "prefix": "$",
                    "suffix": "",
                    "description": "Total expenses incurred"
                })
            if clicks_col and impressions_col:
                kpi_configs.append({
                    "title": "Click-Through Rate",
                    "column": clicks_col,
                    "calculation": "ratio",
                    "denominator_column": impressions_col,
                    "prefix": "",
                    "suffix": "%",
                    "description": "Ad click-through efficiency"
                })
            if cust_col:
                title_lbl = "Total Customers"
                if "user" in cust_col.lower():
                    title_lbl = "Total Users"
                elif "transaction" in cust_col.lower() or "invoice" in cust_col.lower():
                    title_lbl = "Total Transactions"
                kpi_configs.append({
                    "title": title_lbl,
                    "column": cust_col,
                    "calculation": "nunique",
                    "prefix": "",
                    "suffix": "",
                    "description": "Distinct active count"
                })
            if salary_col:
                kpi_configs.append({
                    "title": "Average Salary",
                    "column": salary_col,
                    "calculation": "avg",
                    "prefix": "$",
                    "suffix": "",
                    "description": "Average staff compensation"
                })
            if age_col:
                kpi_configs.append({
                    "title": "Average Age",
                    "column": age_col,
                    "calculation": "avg",
                    "prefix": "",
                    "suffix": " yrs",
                    "description": "Average cohort age"
                })
            if sleep_hours_col:
                kpi_configs.append({
                    "title": "Average Sleep Hours",
                    "column": sleep_hours_col,
                    "calculation": "avg",
                    "prefix": "",
                    "suffix": " hrs",
                    "description": "Average daily sleep duration"
                })
            if sleep_quality_col:
                kpi_configs.append({
                    "title": "Average Sleep Quality",
                    "column": sleep_quality_col,
                    "calculation": "avg",
                    "prefix": "",
                    "suffix": "/10",
                    "description": "Average sleep quality rating"
                })
            if fatigue_col:
                kpi_configs.append({
                    "title": "Average Fatigue Level",
                    "column": fatigue_col,
                    "calculation": "avg",
                    "prefix": "",
                    "suffix": "",
                    "description": "Average reported fatigue index"
                })
            if late_night_col:
                kpi_configs.append({
                    "title": "Average Late Night Use",
                    "column": late_night_col,
                    "calculation": "avg",
                    "prefix": "",
                    "suffix": " hrs",
                    "description": "Average late night device usage"
                })

            # Fill remaining cards with other numeric columns up to 6 total
            numeric_cols = list(self.df.select_dtypes(include=[np.number]).columns)
            added_cols = {cfg["column"] for cfg in kpi_configs if "column" in cfg}
            for c in numeric_cols:
                if len(kpi_configs) >= 6:
                    break
                if c in added_cols or any(kw in c.lower() for kw in ["id", "index", "date", "year", "month"]):
                    continue
                
                is_avg_keyword = any(kw in c.lower() for kw in ["rate", "pct", "percent", "ratio", "score", "grade", "level", "index", "average", "avg", "satisfaction", "rating", "val"])
                calc = "avg" if is_avg_keyword else "sum"
                prefix = ""
                suffix = ""
                if "pct" in c.lower() or "percent" in c.lower() or "ratio" in c.lower():
                    suffix = "%"
                
                title_prefix = "Average" if calc == "avg" else "Total"
                kpi_configs.append({
                    "title": f"{title_prefix} {c.replace('_', ' ').title()}",
                    "column": c,
                    "calculation": calc,
                    "prefix": prefix,
                    "suffix": suffix,
                    "description": f"{title_prefix} of {c}"
                })

        # 3. Perform Pandas calculations on the mapped configs
        return self._calculate_kpis_from_configs(kpi_configs)

    def _calculate_kpis_from_configs(self, configs: list[dict]) -> list[dict]:
        cards = []
        for cfg in configs:
            col = cfg.get("column")
            if not col or col not in self.df.columns:
                continue
                
            calc = cfg.get("calculation", "sum")
            prefix = cfg.get("prefix", "")
            suffix = cfg.get("suffix", "")
            title = cfg.get("title", col.replace("_", " ").title())
            desc = cfg.get("description", "")
            
            series = self.df[col].dropna()
            if len(series) == 0:
                continue
                
            mid = len(series) // 2
            
            if calc == "sum":
                primary_val = float(series.sum())
                avg_val = float(series.mean())
                
                first_half_mean = series.iloc[:mid].mean() if mid > 0 else series.mean()
                second_half_mean = series.iloc[mid:].mean()
                change_pct = ((second_half_mean - first_half_mean) / max(abs(first_half_mean), 1)) * 100
                
            elif calc == "avg":
                primary_val = float(series.mean())
                avg_val = float(series.mean())
                
                first_half_mean = series.iloc[:mid].mean() if mid > 0 else series.mean()
                second_half_mean = series.iloc[mid:].mean()
                change_pct = ((second_half_mean - first_half_mean) / max(abs(first_half_mean), 1)) * 100
                
            elif calc == "nunique":
                primary_val = float(series.nunique())
                avg_val = float(len(self.df))
                
                first_half_unique = series.iloc[:mid].nunique() if mid > 0 else series.nunique()
                second_half_unique = series.iloc[mid:].nunique()
                change_pct = ((second_half_unique - first_half_unique) / max(abs(first_half_unique), 1)) * 100
                
            elif calc == "ratio":
                denom_col = cfg.get("denominator_column")
                if not denom_col or denom_col not in self.df.columns:
                    continue
                denom_series = self.df[denom_col].dropna()
                if len(denom_series) == 0:
                    continue
                
                aligned_df = pd.concat([series, denom_series], axis=1, join="inner").dropna()
                if len(aligned_df) == 0:
                    continue
                
                sum_num = aligned_df.iloc[:, 0].sum()
                sum_den = aligned_df.iloc[:, 1].sum()
                
                primary_val = (sum_num / sum_den) * 100 if sum_den != 0 else 0
                row_ratios = (aligned_df.iloc[:, 0] / aligned_df.iloc[:, 1].replace(0, np.nan)) * 100
                avg_val = float(row_ratios.mean())
                
                mid_aligned = len(aligned_df) // 2
                fh_df = aligned_df.iloc[:mid_aligned] if mid_aligned > 0 else aligned_df
                sh_df = aligned_df.iloc[mid_aligned:]
                
                fh_ratio = (fh_df.iloc[:, 0].sum() / fh_df.iloc[:, 1].sum() * 100) if fh_df.iloc[:, 1].sum() != 0 else 0
                sh_ratio = (sh_df.iloc[:, 0].sum() / sh_df.iloc[:, 1].sum() * 100) if sh_df.iloc[:, 1].sum() != 0 else 0
                change_pct = ((sh_ratio - fh_ratio) / max(abs(fh_ratio), 1)) * 100
                
            else:
                continue
                
            formatted_val = self._format_kpi_value(primary_val, prefix, suffix)
            
            if calc == "nunique":
                formatted_avg = f"{int(avg_val):,} total"
            elif calc == "ratio":
                formatted_avg = f"{avg_val:.1f}% avg"
            else:
                formatted_avg = self._format_kpi_value(avg_val, prefix, suffix)
                
            cards.append({
                "title": title,
                "value": formatted_val,
                "avg": formatted_avg,
                "trend_pct": round(float(change_pct), 2) if not pd.isna(change_pct) and not np.isinf(change_pct) else 0.0,
                "trend_dir": "up" if change_pct >= 0 else "down",
                "description": desc
            })
            
        return cards

    def _format_kpi_value(self, val: float, prefix: str = "", suffix: str = "") -> str:
        if pd.isna(val) or np.isnan(val) or np.isinf(val):
            return "N/A"
        
        abs_val = abs(val)
        if abs_val >= 1_000_000:
            formatted = f"{val/1_000_000:.2f}M"
        elif abs_val >= 1_000:
            formatted = f"{val/1_000:.2f}K"
        elif val == int(val):
            formatted = f"{int(val):,}"
        else:
            formatted = f"{val:,.2f}"
            
        return f"{prefix}{formatted}{suffix}"

    # ------------------------------------------------------------------ #
    #  Line Charts (time series or sequential)
    # ------------------------------------------------------------------ #
    def get_line_charts(self) -> list[dict]:
        charts = []
        date_col = self._find_date_col()
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns[:4]

        if date_col and len(numeric_cols) > 0:
            clean_numeric_cols = [c for c in numeric_cols if c != date_col]
            df_time = self.df[[date_col] + clean_numeric_cols].copy()
            df_time[date_col] = pd.to_datetime(df_time[date_col], errors="coerce")
            df_time = df_time.dropna(subset=[date_col]).sort_values(date_col)
            # Resample by month if enough data
            if len(df_time) > 30:
                df_time = df_time.set_index(date_col).resample("ME").mean().reset_index()
                df_time[date_col] = df_time[date_col].dt.strftime("%Y-%m")

            data = []
            for _, row in df_time.iterrows():
                point = {"x": str(row[date_col])}
                for col in clean_numeric_cols:
                    val = row.get(col)
                    point[col] = round(float(val), 4) if pd.notna(val) else None
                data.append(point)

            charts.append({
                "title": f"Trend Over Time ({date_col})",
                "x_key": date_col,
                "series": [{"key": c, "label": c.replace("_"," ").title()} for c in clean_numeric_cols],
                "data": data,
            })
        else:
            # Sequential line chart (row index)
            if len(numeric_cols) > 0:
                col = numeric_cols[0]
                sample = self.df[col].dropna().reset_index(drop=True)
                if len(sample) > 200:
                    sample = sample.iloc[::len(sample)//200]
                data = [{"x": i, col: round(float(v), 4)} for i, v in enumerate(sample)]
                charts.append({
                    "title": f"{col.replace('_',' ').title()} Distribution",
                    "x_key": "x",
                    "series": [{"key": col, "label": col.replace("_"," ").title()}],
                    "data": data,
                })
        return charts

    # ------------------------------------------------------------------ #
    #  Bar Charts
    # ------------------------------------------------------------------ #
    def get_bar_charts(self) -> list[dict]:
        charts = []
        cat_cols = self.df.select_dtypes(include=["object", "category"]).columns
        num_cols = self.df.select_dtypes(include=[np.number]).columns

        for cat_col in cat_cols[:3]:
            if self.df[cat_col].nunique() > 30 or len(num_cols) == 0:
                continue
            num_col = num_cols[0]
            
            x_key = cat_col
            grouped_cat = cat_col
            temp_df = self.df[[cat_col, num_col]].copy()
            if cat_col == "value":
                x_key = "category_name"
                temp_df.columns = ["category_name", num_col]
                grouped_cat = "category_name"

            grouped = (
                temp_df.groupby(grouped_cat)[num_col]
                .mean()
                .reset_index()
                .rename(columns={num_col: "value"})
                .sort_values("value", ascending=False)
                .head(15)
                .round({"value": 2})
            )
            grouped["value"] = grouped["value"].astype(float)
            charts.append({
                "title": f"Avg {num_col.replace('_',' ').title()} by {cat_col.replace('_',' ').title()}",
                "x_key": x_key,
                "series": [{"key": "value", "label": num_col.replace("_"," ").title()}],
                "data": grouped.to_dict("records"),
            })
        return charts

    # ------------------------------------------------------------------ #
    #  Pie Charts
    # ------------------------------------------------------------------ #
    def get_pie_charts(self) -> list[dict]:
        charts = []
        cat_cols = self.df.select_dtypes(include=["object", "category"]).columns

        for col in cat_cols[:2]:
            if self.df[col].nunique() > 15:
                continue
            vc = self.df[col].value_counts().head(10)
            data = [{"name": str(k), "value": int(v)} for k, v in zip(vc.index, vc.values)]
            charts.append({
                "title": f"Distribution of {col.replace('_',' ').title()}",
                "data": data,
            })
        return charts

    # ------------------------------------------------------------------ #
    #  Heatmap (correlation)
    # ------------------------------------------------------------------ #
    def get_heatmap_data(self) -> dict:
        numeric = self.df.select_dtypes(include=[np.number])
        if numeric.shape[1] < 2:
            return {"columns": [], "data": []}

        # Limit to 12 columns for readability
        numeric = numeric.iloc[:, :12]
        corr = numeric.corr(method="pearson").round(3)
        corr = corr.where(pd.notna(corr), 0)

        cols = list(corr.columns)
        data = []
        for i, row_col in enumerate(cols):
            for j, col_col in enumerate(cols):
                data.append({
                    "x": col_col,
                    "y": row_col,
                    "value": float(corr.iloc[i, j]),
                })

        return {"columns": cols, "data": data}

    # ------------------------------------------------------------------ #
    #  Scatter Plot Pairs (top 3 correlated pairs)
    # ------------------------------------------------------------------ #
    def get_scatter_pairs(self) -> list[dict]:
        numeric = self.df.select_dtypes(include=[np.number])
        if numeric.shape[1] < 2:
            return []

        corr = numeric.corr(method="pearson").abs()
        upper = corr.where(np.triu(np.ones(corr.shape), k=1).astype(bool))
        pairs = (
            upper.stack()
            .reset_index()
            .rename(columns={"level_0": "a", "level_1": "b", 0: "corr"})
            .sort_values("corr", ascending=False)
            .head(3)
        )

        charts = []
        for _, row in pairs.iterrows():
            col_a, col_b = row["a"], row["b"]
            sample = self.df[[col_a, col_b]].dropna().sample(min(300, len(self.df)))
            data = [
                {"x": round(float(r[col_a]), 4), "y": round(float(r[col_b]), 4)}
                for _, r in sample.iterrows()
            ]
            charts.append({
                "title": f"{col_a.replace('_',' ').title()} vs {col_b.replace('_',' ').title()}",
                "x_key": col_a,
                "y_key": col_b,
                "correlation": round(float(row["corr"]), 4),
                "data": data,
            })
        return charts

    # ------------------------------------------------------------------ #
    #  Helpers
    # ------------------------------------------------------------------ #
    def _find_date_col(self) -> str | None:
        # First: datetime-typed columns
        dt_cols = self.df.select_dtypes(include=["datetime64"]).columns
        if len(dt_cols) > 0:
            return dt_cols[0]
        # Second: object columns with date-like names
        for col in self.df.columns:
            if any(kw in col.lower() for kw in ["date", "time", "month", "year", "period"]):
                return col
        return None

    @staticmethod
    def _fmt(val: float) -> str:
        if abs(val) >= 1_000_000:
            return f"{val/1_000_000:.2f}M"
        elif abs(val) >= 1_000:
            return f"{val/1_000:.2f}K"
        return f"{val:.2f}"
