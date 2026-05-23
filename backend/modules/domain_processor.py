"""
domain_processor.py
Domain-specific preprocessing logic for:
Finance, HR, Retail, Healthcare, Marketing, Stock Market
Each domain returns enriched KPIs and domain-specific metrics.
"""

import pandas as pd
import numpy as np


class DomainProcessor:

    DOMAINS = ["finance", "hr", "retail", "healthcare", "marketing", "stock"]

    @classmethod
    def detect_domain(cls, df: pd.DataFrame) -> str:
        """
        Automatically categorizes the dataset based on column header name analysis.
        Returns one of: 'finance', 'healthcare', 'retail', 'hr', 'marketing', 'stock', or 'generic'.
        """
        if df is None or len(df.columns) == 0:
            return "generic"

        columns = [str(c).lower() for c in df.columns]
        
        # Initialize scoring tracker
        scores = {
            "finance": 0.0,
            "healthcare": 0.0,
            "retail": 0.0,
            "hr": 0.0,
            "marketing": 0.0,
            "stock": 0.0
        }

        # Domain matching keyword profiles
        keywords = {
            "finance": [
                "revenue", "profit", "net_profit", "net_income", "earnings", "cost", "expense",
                "expenses", "expenditure", "transaction", "payment", "invoice", "budget", 
                "balance", "capital", "cash_flow", "operating_income", "ebitda", "financial",
                "sales_amount"
            ],
            "hr": [
                "attrition", "churn", "left", "turnover", "salary", "monthlyincome", "monthly_income",
                "compensation", "wage", "employee", "emp_id", "employee_id", "satisfaction",
                "jobsatisfaction", "job_satisfaction", "department", "dept", "performance",
                "rating", "hire_date", "termination", "recruitment", "headcount", "onboarding"
            ],
            "retail": [
                "product", "product_name", "item", "product_id", "sku", "quantity", "qty",
                "units", "units_sold", "order_id", "customer_id", "store", "retail", "discount",
                "unit_price", "purchase", "purchased", "inventory", "stock_level", "sales_channel",
                "price_per_unit"
            ],
            "healthcare": [
                "patient", "patient_id", "glucose", "blood_glucose", "bloodglucose", "bmi",
                "body_mass_index", "outcome", "diagnosis", "symptom", "heart_rate", "cholesterol",
                "insulin", "blood_pressure", "systolic", "diastolic", "admission", "treatment",
                "doctor", "physician", "medical", "clinical", "health", "hospital", "disease",
                "bloodtype", "patientname"
            ],
            "marketing": [
                "clicks", "click", "impressions", "views", "reach", "conversions", "leads",
                "signups", "spend", "ad_spend", "channel", "campaign", "platform", "marketing",
                "ctr", "cpc", "roas"
            ],
            "stock": [
                "close", "closing_price", "adj_close", "price", "open", "opening_price",
                "volume", "high", "low", "ticker", "stock", "dividend", "nasdaq", "nyse",
                "portfolio", "share_price"
            ]
        }

        # Primary pattern scanning
        for col in columns:
            # Strip punctuation and common separators for perfect matching
            cleaned = col.replace("_", "").replace(" ", "").replace("-", "")
            
            for domain, kws in keywords.items():
                for kw in kws:
                    kw_clean = kw.replace("_", "").replace(" ", "").replace("-", "")
                    if kw_clean == cleaned:
                        scores[domain] += 3.0  # Exact match weight
                    elif kw_clean in cleaned:
                        scores[domain] += 1.5  # Substring match weight

        # Shared cross-domain metric heuristic adjustments
        for col in columns:
            if any(term in col for term in ["sales", "amount"]):
                scores["finance"] += 0.5
                scores["retail"] += 0.5
            if "date" in col:
                scores["retail"] += 0.2
                scores["finance"] += 0.2
                scores["stock"] += 0.2
            if "age" in col:
                scores["healthcare"] += 0.5
                scores["hr"] += 0.5

        print(f"[AI Domain Classification] Scores: {scores}")

        # Extract classification
        max_domain = max(scores, key=scores.get)
        max_score = scores[max_domain]

        # Require a minimum cumulative confidence score to qualify
        if max_score < 1.0:
            return "generic"

        return max_domain

    @classmethod
    def process(cls, df: pd.DataFrame, domain: str) -> dict:
        """
        Run domain-specific analysis.
        Returns {
            "domain": str,
            "kpis": dict,
            "metrics": list[dict],
            "recommendations": list[str]
        }
        """
        domain = domain.lower()
        processors = {
            "finance":     cls._finance,
            "hr":          cls._hr,
            "retail":      cls._retail,
            "healthcare":  cls._healthcare,
            "marketing":   cls._marketing,
            "stock":       cls._stock,
        }
        processor = processors.get(domain, cls._generic)
        return processor(df)

    # ------------------------------------------------------------------ #
    #  Finance
    # ------------------------------------------------------------------ #
    @staticmethod
    def _finance(df: pd.DataFrame) -> dict:
        kpis = {}
        metrics = []
        recommendations = []

        # Try common finance column names
        revenue_col = _find_col(df, ["revenue", "sales", "income", "amount"])
        profit_col  = _find_col(df, ["profit", "net_income", "net_profit", "earnings"])
        cost_col    = _find_col(df, ["cost", "expense", "expenses", "expenditure"])

        if revenue_col:
            total_revenue = float(df[revenue_col].sum())
            avg_revenue   = float(df[revenue_col].mean())
            kpis["total_revenue"]   = round(total_revenue, 2)
            kpis["avg_revenue"]     = round(avg_revenue, 2)
            kpis["max_revenue"]     = round(float(df[revenue_col].max()), 2)
            metrics.append({"label": "Total Revenue", "value": total_revenue, "col": revenue_col})

        if profit_col:
            total_profit = float(df[profit_col].sum())
            kpis["total_profit"]    = round(total_profit, 2)
            kpis["profit_margin"]   = round(total_profit / kpis.get("total_revenue", 1) * 100, 2) if "total_revenue" in kpis else None
            metrics.append({"label": "Total Profit", "value": total_profit, "col": profit_col})

        if cost_col:
            total_cost = float(df[cost_col].sum())
            kpis["total_cost"] = round(total_cost, 2)
            if "total_revenue" in kpis:
                kpis["roi"] = round((kpis.get("total_profit", 0) / total_cost) * 100, 2)
            metrics.append({"label": "Total Cost", "value": total_cost, "col": cost_col})

        if not kpis:
            return _generic_fallback(df, "finance")

        if kpis.get("profit_margin", 0) and kpis["profit_margin"] < 10:
            recommendations.append("Profit margin is below 10%. Consider reducing operational costs.")
        if kpis.get("roi", 0) and kpis["roi"] < 15:
            recommendations.append("ROI is below 15%. Review investment allocation.")

        return {"domain": "finance", "kpis": kpis, "metrics": metrics, "recommendations": recommendations}

    # ------------------------------------------------------------------ #
    #  HR
    # ------------------------------------------------------------------ #
    @staticmethod
    def _hr(df: pd.DataFrame) -> dict:
        kpis = {}
        metrics = []
        recommendations = []

        attrition_col  = _find_col(df, ["attrition", "churn", "left", "turnover"])
        salary_col     = _find_col(df, ["salary", "monthlyincome", "monthly_income", "compensation", "wage"])
        age_col        = _find_col(df, ["age"])
        dept_col       = _find_col(df, ["department", "dept"])
        satisfaction   = _find_col(df, ["satisfaction", "jobsatisfaction", "job_satisfaction"])

        kpis["total_employees"] = len(df)

        if attrition_col:
            attrition_rate = df[attrition_col].astype(str).str.lower().isin(["yes", "1", "true"]).mean() * 100
            kpis["attrition_rate_pct"] = round(attrition_rate, 2)
            if attrition_rate > 15:
                recommendations.append(f"Attrition rate is {attrition_rate:.1f}% — above industry average. Investigate employee engagement.")

        if salary_col:
            kpis["avg_salary"]  = round(float(df[salary_col].mean()), 2)
            kpis["max_salary"]  = round(float(df[salary_col].max()), 2)
            metrics.append({"label": "Avg Salary", "value": kpis["avg_salary"], "col": salary_col})

        if satisfaction:
            avg_sat = float(df[satisfaction].mean())
            kpis["avg_satisfaction"] = round(avg_sat, 2)
            if avg_sat < 3:
                recommendations.append("Average job satisfaction is low. Consider employee wellness programs.")

        if dept_col and attrition_col:
            dept_attrition = (
                df.groupby(dept_col)[attrition_col]
                .apply(lambda x: x.astype(str).str.lower().isin(["yes","1","true"]).mean() * 100)
                .reset_index()
                .rename(columns={attrition_col: "attrition_pct"})
                .round(2)
            )
            metrics.append({"label": "Attrition by Department", "data": dept_attrition.to_dict("records")})

        return {"domain": "hr", "kpis": kpis, "metrics": metrics, "recommendations": recommendations}

    # ------------------------------------------------------------------ #
    #  Retail
    # ------------------------------------------------------------------ #
    @staticmethod
    def _retail(df: pd.DataFrame) -> dict:
        kpis = {}
        metrics = []
        recommendations = []

        sales_col    = _find_col(df, ["sales", "revenue", "amount", "total"])
        product_col  = _find_col(df, ["product", "product_name", "item", "product_id"])
        region_col   = _find_col(df, ["region", "location", "city", "state", "country"])
        quantity_col = _find_col(df, ["quantity", "qty", "units", "units_sold"])
        date_col     = _find_col(df, ["date", "order_date", "purchase_date"])

        if sales_col:
            kpis["total_sales"]  = round(float(df[sales_col].sum()), 2)
            kpis["avg_sales"]    = round(float(df[sales_col].mean()), 2)
            metrics.append({"label": "Total Sales", "value": kpis["total_sales"], "col": sales_col})

        if quantity_col:
            kpis["total_units_sold"] = int(df[quantity_col].sum())

        if product_col and sales_col:
            top5 = (
                df.groupby(product_col)[sales_col].sum()
                .nlargest(5)
                .reset_index()
                .rename(columns={sales_col: "total_sales"})
                .round(2)
            )
            metrics.append({"label": "Top 5 Products", "data": top5.to_dict("records")})
            recommendations.append(f"Focus marketing on top product: {top5.iloc[0][product_col]}" if len(top5) else "")

        if region_col and sales_col:
            region_sales = (
                df.groupby(region_col)[sales_col].sum()
                .reset_index()
                .rename(columns={sales_col: "total_sales"})
                .sort_values("total_sales", ascending=False)
                .round(2)
            )
            metrics.append({"label": "Sales by Region", "data": region_sales.to_dict("records")})

        return {"domain": "retail", "kpis": kpis, "metrics": metrics, "recommendations": recommendations}

    # ------------------------------------------------------------------ #
    #  Healthcare
    # ------------------------------------------------------------------ #
    @staticmethod
    def _healthcare(df: pd.DataFrame) -> dict:
        kpis = {}
        metrics = []
        recommendations = []

        age_col       = _find_col(df, ["age"])
        outcome_col   = _find_col(df, ["outcome", "result", "diagnosis", "status", "survived"])
        glucose_col   = _find_col(df, ["glucose", "blood_glucose", "bloodglucose"])
        bmi_col       = _find_col(df, ["bmi", "body_mass_index"])

        kpis["total_patients"] = len(df)

        if age_col:
            kpis["avg_age"]  = round(float(df[age_col].mean()), 1)
            kpis["max_age"]  = int(df[age_col].max())
            kpis["min_age"]  = int(df[age_col].min())

        if outcome_col:
            pos_rate = df[outcome_col].astype(str).str.lower().isin(["1","yes","true","positive","survived"]).mean() * 100
            kpis["positive_outcome_pct"] = round(pos_rate, 2)

        if glucose_col:
            avg_glucose = float(df[glucose_col].mean())
            kpis["avg_glucose"] = round(avg_glucose, 2)
            if avg_glucose > 140:
                recommendations.append("Average glucose levels exceed normal range (>140 mg/dL). High diabetes risk population.")

        if bmi_col:
            avg_bmi = float(df[bmi_col].mean())
            kpis["avg_bmi"] = round(avg_bmi, 2)
            obese_pct = (df[bmi_col] > 30).mean() * 100
            kpis["obesity_pct"] = round(obese_pct, 2)
            if obese_pct > 30:
                recommendations.append(f"{obese_pct:.1f}% of patients have BMI > 30 (obese). Consider weight management programs.")

        return {"domain": "healthcare", "kpis": kpis, "metrics": metrics, "recommendations": recommendations}

    # ------------------------------------------------------------------ #
    #  Marketing
    # ------------------------------------------------------------------ #
    @staticmethod
    def _marketing(df: pd.DataFrame) -> dict:
        kpis = {}
        metrics = []
        recommendations = []

        clicks_col    = _find_col(df, ["clicks", "click"])
        impressions   = _find_col(df, ["impressions", "views", "reach"])
        conversions   = _find_col(df, ["conversions", "leads", "signups"])
        spend_col     = _find_col(df, ["spend", "cost", "ad_spend", "budget"])
        channel_col   = _find_col(df, ["channel", "platform", "source", "medium"])

        if clicks_col and impressions:
            ctr = df[clicks_col].sum() / max(df[impressions].sum(), 1) * 100
            kpis["ctr_pct"] = round(float(ctr), 4)

        if conversions and clicks_col:
            conv_rate = df[conversions].sum() / max(df[clicks_col].sum(), 1) * 100
            kpis["conversion_rate_pct"] = round(float(conv_rate), 4)

        if spend_col and conversions:
            cpa = df[spend_col].sum() / max(df[conversions].sum(), 1)
            kpis["cost_per_acquisition"] = round(float(cpa), 2)

        if channel_col and clicks_col:
            channel_perf = (
                df.groupby(channel_col)[clicks_col].sum()
                .reset_index()
                .sort_values(clicks_col, ascending=False)
            )
            metrics.append({"label": "Clicks by Channel", "data": channel_perf.to_dict("records")})

        return {"domain": "marketing", "kpis": kpis, "metrics": metrics, "recommendations": recommendations}

    # ------------------------------------------------------------------ #
    #  Stock Market
    # ------------------------------------------------------------------ #
    @staticmethod
    def _stock(df: pd.DataFrame) -> dict:
        kpis = {}
        metrics = []
        recommendations = []

        close_col  = _find_col(df, ["close", "closing_price", "adj_close", "price"])
        open_col   = _find_col(df, ["open", "opening_price"])
        volume_col = _find_col(df, ["volume"])
        high_col   = _find_col(df, ["high"])
        low_col    = _find_col(df, ["low"])

        if close_col:
            prices = df[close_col].dropna()
            kpis["current_price"] = round(float(prices.iloc[-1]), 4)
            kpis["max_price"]     = round(float(prices.max()), 4)
            kpis["min_price"]     = round(float(prices.min()), 4)
            # Daily returns
            returns = prices.pct_change().dropna()
            kpis["avg_daily_return_pct"] = round(float(returns.mean()) * 100, 4)
            kpis["volatility_pct"]       = round(float(returns.std()) * 100, 4)
            if kpis["volatility_pct"] > 3:
                recommendations.append("High daily volatility detected. Consider risk management strategies.")

        if volume_col:
            kpis["avg_volume"] = round(float(df[volume_col].mean()), 0)

        return {"domain": "stock", "kpis": kpis, "metrics": metrics, "recommendations": recommendations}

    # ------------------------------------------------------------------ #
    #  Generic fallback
    # ------------------------------------------------------------------ #
    @staticmethod
    def _generic(df: pd.DataFrame) -> dict:
        return _generic_fallback(df, "generic")


# ------------------------------------------------------------------ #
#  Helpers
# ------------------------------------------------------------------ #
def _find_col(df: pd.DataFrame, candidates: list[str]) -> str | None:
    """Find the first matching column name (case-insensitive)."""
    cols_lower = {c.lower(): c for c in df.columns}
    for candidate in candidates:
        if candidate.lower() in cols_lower:
            col = cols_lower[candidate.lower()]
            if pd.api.types.is_numeric_dtype(df[col]):
                return col
            # also return object columns for attrition etc.
            return col
    return None


def _generic_fallback(df: pd.DataFrame, domain: str) -> dict:
    numeric = df.select_dtypes(include=[np.number])
    kpis = {}
    for col in numeric.columns[:5]:
        kpis[f"sum_{col}"] = round(float(numeric[col].sum()), 2)
        kpis[f"mean_{col}"] = round(float(numeric[col].mean()), 2)
    return {
        "domain": domain,
        "kpis": kpis,
        "metrics": [],
        "recommendations": ["Provide a more specific domain for tailored insights."]
    }
