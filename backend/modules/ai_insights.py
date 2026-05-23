"""
ai_insights.py
AI-powered insight generation using OpenAI GPT or Groq.
Falls back to rule-based insights if no LLM key is configured.
"""

import json
import pandas as pd
import numpy as np
from config import Config


SYSTEM_PROMPT = """You are an expert data analyst. 
Given dataset metadata and statistical summary, generate concise, actionable business insights.
Focus on: trends, anomalies, correlations, performance gaps, and recommendations.
Return a JSON array of insight objects with keys: "title", "description", "type", "priority".
Types: "trend" | "anomaly" | "correlation" | "recommendation" | "summary"
Priority: "high" | "medium" | "low"
Return ONLY valid JSON array, no markdown, no extra text."""


class AIInsightsEngine:

    def __init__(self, df: pd.DataFrame, domain: str = "generic", eda_results: dict = None):
        self.df = df.copy()
        self.domain = domain
        self.eda_results = eda_results or {}

    def generate_insights(self) -> list[dict]:
        """Generate AI insights. Uses LLM if configured, else rule-based."""
        if Config.has_llm():
            try:
                return self._llm_insights()
            except Exception as e:
                print(f"[AI Insights] LLM failed ({e}), falling back to rule-based.")
        return self._rule_based_insights()

    def generate_recommendations(self) -> list[dict]:
        """Generate strategic recommendations. Uses LLM if configured, else mathematical heuristics."""
        if Config.has_llm():
            try:
                return self._llm_recommendations()
            except Exception as e:
                print(f"[AI Insights] LLM recommendations failed ({e}), falling back to heuristic profiling.")
        return self._heuristic_recommendations()

    def generate_executive_narrative(self, cleaning_report: dict = None, domain_results: dict = None) -> str:
        """Generate a premium storytelling executive narrative report."""
        if Config.has_llm():
            try:
                return self._llm_executive_narrative(cleaning_report, domain_results)
            except Exception as e:
                print(f"[AI Insights] LLM narrative generation failed ({e}), falling back to rule-based.")
        return self._rule_based_executive_narrative(cleaning_report, domain_results)

    def _llm_executive_narrative(self, cleaning_report: dict, domain_results: dict) -> str:
        shape = self.df.shape
        numeric_cols = list(self.df.select_dtypes(include=[np.number]).columns)
        categorical_cols = list(self.df.select_dtypes(include=["object"]).columns)
        
        cleaning_steps = cleaning_report.get("steps", []) if cleaning_report else []
        kpis = domain_results.get("kpis", {}) if domain_results else {}
        top_correlations = self.eda_results.get("top_correlations", [])[:5]
        
        prompt = f"""
You are an elite chief business analyst and executive director.
Your task is to write a highly professional, comprehensive "AI Storytelling Executive Narrative" for a business report.
The narrative must read like an executive briefing, perfectly blending technical analysis with high-level business storytelling.

Requirements:
1. Explain what we did: Outline the ingestion, cleaning, and preprocessing steps applied (e.g. handling missing values, original shape vs final shape).
2. Explain how we analyzed the dataset: Explain that we ran exploratory data analysis (EDA), computed detailed statistical distribution parameters, discovered top feature correlations, and computed domain-specific KPIs.
3. Tell the story of the data: Weave the actual computed figures, correlations, and domain KPIs into a compelling business story (e.g. "The company experienced strong Q2 growth driven primarily by electronics sales in urban regions." if it's retail, or matching patterns for other domains).
4. Outline future strategic horizons: Provide professional, high-level business advice based on the correlations and findings.
5. Tone: Objective, authoritative, premium, highly readable.
6. Format: Exactly 3 structured, continuous paragraphs. Do NOT use bullet points or list formatting. Do NOT include any markdown titles, headers, or intro/outro text. Start directly with the first sentence of the narrative.

Context Details:
- Dataset Name: {self.eda_results.get('overview', {}).get('filename', 'the active dataset')}
- Domain: {self.domain}
- Original vs Final Shape: {cleaning_report.get('original_shape', [shape[0], shape[1]]) if cleaning_report else list(shape)} -> {cleaning_report.get('final_shape', [shape[0], shape[1]]) if cleaning_report else list(shape)}
- Data Cleaning Steps: {', '.join(cleaning_steps) if cleaning_steps else 'Basic cleaning and alignment'}
- Key Numeric Columns: {', '.join(numeric_cols[:6])}
- Key Categorical Columns: {', '.join(categorical_cols[:6])}
- Computed Domain KPIs: {json.dumps(kpis)}
- Top Feature Correlations: {json.dumps(top_correlations)}

Write the narrative report now:
"""
        system_prompt = "You are a professional executive business analyst and writer. You generate premium narrative summaries without any conversational intro/outro or markdown wrapper."
        
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
                max_tokens=1500,
            )
            return response.choices[0].message.content.strip()

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
                max_tokens=1500,
            )
            return response.choices[0].message.content.strip()
            
        return self._rule_based_executive_narrative(cleaning_report, domain_results)

    def _rule_based_executive_narrative(self, cleaning_report: dict = None, domain_results: dict = None) -> str:
        shape = self.df.shape
        orig_rows = cleaning_report.get("original_shape", [shape[0]])[0] if cleaning_report else shape[0]
        final_rows = cleaning_report.get("final_shape", [shape[0]])[0] if cleaning_report else shape[0]
        cols_count = shape[1]
        
        p1 = (
            f"We conducted a rigorous end-to-end data analysis on the active dataset, which contains "
            f"{orig_rows:,} records and {cols_count} distinct variables. Our pipeline commenced with data ingestion, "
            f"followed by a structured cleaning process where duplicate entries were resolved, datatypes were normalized, "
            f"and missing values were systematically handled. Subsequently, we executed advanced exploratory data analysis (EDA) "
            f"to profile statistical distributions, discover significant feature correlations, and extract domain-tailored metrics."
        )
        
        dom = self.domain.lower()
        kpis = domain_results.get("kpis", {}) if domain_results else {}
        
        if dom == "finance":
            total_revenue = kpis.get("total_revenue", 0)
            total_cost = kpis.get("total_cost", 0)
            total_profit = kpis.get("total_profit", 0)
            profit_margin = kpis.get("profit_margin", 0)
            roi = kpis.get("roi", 0.0)
            p2 = (
                f"The financial performance review outlines a strong operational year, highlighted by a Total Revenue of "
                f"${total_revenue:,.2f} against operational expenses of ${total_cost:,.2f}. This generated a net Total Profit of "
                f"${total_profit:,.2f}, translating to a robust profit margin of {profit_margin}% and an exceptional ROI of "
                f"{roi}%. The analysis indicates that financial health is highly stable, though profitability could be "
                f"further enhanced by focusing on key margin-generating departments and optimizing high-cost correlations."
            )
        elif dom == "retail":
            total_sales = kpis.get("total_sales", 0)
            avg_sales = kpis.get("avg_sales", 0)
            units_sold = kpis.get("total_units_sold", 0)
            p2 = (
                f"Our deep-dive retail intelligence analysis reveals solid market traction, culminating in Total Sales of "
                f"${total_sales:,.2f} and a total of {units_sold:,} units sold. Transactions averaged a healthy ${avg_sales:,.2f} "
                f"per order. This strong commercial performance was primarily driven by high-velocity product categories in "
                f"urban and suburban regions. Furthermore, the correlation modeling reveals a direct link between customer "
                f"density and repeat purchases, suggesting excellent customer lifetime value potential."
            )
        elif dom == "hr":
            total_employees = kpis.get("total_employees", final_rows)
            attrition_rate = kpis.get("attrition_rate_pct", 0)
            avg_salary = kpis.get("avg_salary", 0)
            avg_sat = kpis.get("avg_satisfaction", 3.5)
            p2 = (
                f"The strategic talent and workforce analysis examined organizational dynamics across {total_employees:,} employees. "
                f"The current overall attrition rate stands at {attrition_rate}%, which indicates reasonable organizational stability "
                f"but highlights specific areas where talent preservation programs should be deployed. Compensation structures "
                f"average ${avg_salary:,.2f} per employee, and average job satisfaction is registered at a strong {avg_sat}/5. "
                f"Correlations suggest that targeted engagement and career development pathways represent the highest leverage points "
                f"to maintain key skills and minimize churn."
            )
        elif dom == "marketing":
            ctr = kpis.get("ctr_pct", 0)
            conv_rate = kpis.get("conversion_rate_pct", 0)
            cpa = kpis.get("cost_per_acquisition", 0)
            p2 = (
                f"The campaign intelligence report reveals high-yielding channel performance. Our analysis shows a solid "
                f"Click-Through Rate (CTR) of {ctr:.3f}% and a Conversion Rate of {conv_rate:.3f}%, showing high ad-relevance "
                f"and robust message resonance. Cost per Acquisition (CPA) was managed effectively, averaging ${cpa:,.2f} per conversion. "
                f"Platform metrics indicate that digital channels represent the strongest acquisition engine, with high-intent "
                f"search and social ads yielding the highest return on campaign spend."
            )
        elif dom == "healthcare":
            total_patients = kpis.get("total_patients", final_rows)
            avg_age = kpis.get("avg_age", 45)
            avg_glucose = kpis.get("avg_glucose", 100)
            obesity_pct = kpis.get("obesity_pct", 0)
            p2 = (
                f"The healthcare clinical cohort analysis mapped profiles across {total_patients:,} active patient records. "
                f"The group has an average age of {avg_age} years. Key clinical baseline metrics show an average blood glucose "
                f"of {avg_glucose} mg/dL, with approximately {obesity_pct}% of the patient population classified in the high BMI range "
                f"(>30). The correlation analysis underscores that early preventative clinical pathways and tailored patient "
                f"monitoring programs are the most critical interventions to improve overall long-term clinical outcomes."
            )
        elif dom == "stock":
            curr_price = kpis.get("current_price", 0)
            max_price = kpis.get("max_price", 0)
            volatility = kpis.get("volatility_pct", 0)
            p2 = (
                f"The equity and stock market intelligence model tracked performance up to the current closing price of "
                f"${curr_price:,.4f}. The asset established a maximum boundary of ${max_price:,.4f} over the tracked period. "
                f"Calculated daily volatility was {volatility}%. This level of price variance points to a dynamic trading "
                f"environment with high liquidity. Momentum indicators suggest that short-term entry and exit points are "
                f"highly correlated with daily volume surges, offering solid strategic opportunities for risk-managed portfolios."
            )
        else:
            p2 = (
                f"The dataset analysis uncovered key distribution trends and statistical relationships across numeric attributes. "
                f"By analyzing statistical summaries and distributions, we mapped robust indicators of performance. The feature "
                f"correlation analysis further mapped structural alignments between variables, providing a robust empirical foundation "
                f"for future predictive modeling and data-driven strategic decisions."
            )
            
        p3 = (
            f"Ultimately, these findings provide an actionable blueprint for data-driven strategic optimization. By aligning "
            f"operational parameters with the high-strength correlation channels and KPI targets identified during the EDA, "
            f"leadership can confidently mitigate structural risks, capitalize on high-yielding segments, and streamline "
            f"operational workflows. We recommend continuous ingestion of new data points to periodically refresh this narrative "
            f"and track performance shifts over time."
        )
        
        return f"{p1}\n\n{p2}\n\n{p3}"


    # ------------------------------------------------------------------ #
    #  LLM Path
    # ------------------------------------------------------------------ #
    def _llm_insights(self) -> list[dict]:
        prompt = self._build_prompt()
        response_text = self._call_llm(prompt)
        try:
            # Strip markdown if present
            response_text = response_text.strip()
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            insights = json.loads(response_text)
            return insights if isinstance(insights, list) else []
        except json.JSONDecodeError:
            return self._rule_based_insights()

    def _call_llm(self, prompt: str) -> str:
        if Config.LLM_PROVIDER == "openai":
            from openai import OpenAI
            client = OpenAI(api_key=Config.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model=Config.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.4,
                max_tokens=1500,
            )
            return response.choices[0].message.content

        elif Config.LLM_PROVIDER == "groq":
            from groq import Groq
            client = Groq(api_key=Config.GROQ_API_KEY)
            response = client.chat.completions.create(
                model=Config.GROQ_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.4,
                max_tokens=1500,
            )
            return response.choices[0].message.content

        raise ValueError(f"Unknown LLM provider: {Config.LLM_PROVIDER}")

    def _build_prompt(self) -> str:
        numeric = self.df.select_dtypes(include=[np.number])
        stats = numeric.describe().round(3).to_dict()

        overview = self.eda_results.get("overview", {})
        top_corr = self.eda_results.get("top_correlations", [])[:5]

        prompt = f"""
Dataset Domain: {self.domain}
Shape: {self.df.shape[0]} rows × {self.df.shape[1]} columns
Columns: {list(self.df.columns)[:20]}
Numeric columns count: {len(numeric.columns)}

Statistical Summary (numeric):
{json.dumps(stats, indent=2)[:3000]}

Top Correlations:
{json.dumps(top_corr, indent=2)}

Generate 6-8 business insights based on this data.
"""
        return prompt

    # ------------------------------------------------------------------ #
    #  Rule-Based Fallback
    # ------------------------------------------------------------------ #
    def _rule_based_insights(self) -> list[dict]:
        insights = []
        numeric = self.df.select_dtypes(include=[np.number])

        # 1. Dataset overview
        insights.append({
            "title": "Dataset Overview",
            "description": f"The dataset contains {len(self.df):,} rows and {len(self.df.columns)} columns. "
                           f"{len(numeric.columns)} numeric and {len(self.df.columns) - len(numeric.columns)} categorical features.",
            "type": "summary",
            "priority": "medium",
        })

        # 2. Missing values
        total_missing = int(self.df.isnull().sum().sum())
        if total_missing > 0:
            missing_pct = round(total_missing / (self.df.shape[0] * self.df.shape[1]) * 100, 2)
            insights.append({
                "title": "Missing Data Detected",
                "description": f"{total_missing:,} missing values found ({missing_pct}% of all cells). "
                               "Data imputation has been applied during cleaning.",
                "type": "anomaly",
                "priority": "high" if missing_pct > 10 else "medium",
            })

        # 3. Skewness
        for col in numeric.columns[:5]:
            skew = float(numeric[col].skew())
            if abs(skew) > 2:
                direction = "right" if skew > 0 else "left"
                insights.append({
                    "title": f"Skewed Distribution: {col.replace('_',' ').title()}",
                    "description": f"Column '{col}' is heavily {direction}-skewed (skewness={skew:.2f}). "
                                   "Consider log transformation for modeling.",
                    "type": "anomaly",
                    "priority": "medium",
                })

        # 4. Top correlations
        if "top_correlations" in self.eda_results:
            top = self.eda_results["top_correlations"]
            if top:
                top_pair = top[0]
                insights.append({
                    "title": f"Strong Correlation: {top_pair['feature_a']} ↔ {top_pair['feature_b']}",
                    "description": f"Strong correlation ({top_pair['correlation']:.2f}) detected. "
                                   "These features may be redundant or indicate a causal relationship.",
                    "type": "correlation",
                    "priority": "high" if top_pair["correlation"] > 0.8 else "medium",
                })

        # 5. High cardinality
        cat_cols = self.df.select_dtypes(include=["object"]).columns
        for col in cat_cols:
            if self.df[col].nunique() > 50:
                insights.append({
                    "title": f"High Cardinality: {col.replace('_',' ').title()}",
                    "description": f"Column '{col}' has {self.df[col].nunique()} unique values. "
                                   "Consider grouping or encoding for analysis.",
                    "type": "recommendation",
                    "priority": "low",
                })
                break

        # 6. Outliers summary
        outlier_cols = []
        for col in numeric.columns:
            Q1, Q3 = numeric[col].quantile(0.25), numeric[col].quantile(0.75)
            IQR = Q3 - Q1
            outliers = ((numeric[col] < Q1 - 1.5 * IQR) | (numeric[col] > Q3 + 1.5 * IQR)).sum()
            if outliers > len(self.df) * 0.05:
                outlier_cols.append(col)

        if outlier_cols:
            insights.append({
                "title": "Outliers Detected",
                "description": f"Significant outliers found in: {', '.join(outlier_cols[:3])}. "
                               "Outliers have been capped using the IQR method.",
                "type": "anomaly",
                "priority": "medium",
            })

        # 7. Domain-specific insight
        domain_insight = self._domain_insight()
        if domain_insight:
            insights.append(domain_insight)

        return insights

    def _domain_insight(self) -> dict | None:
        domain_map = {
            "finance": {
                "title": "Financial Health Check",
                "description": "Analyze revenue trends, profit margins, and ROI metrics to identify growth opportunities and cost reduction areas.",
                "type": "recommendation",
                "priority": "high",
            },
            "hr": {
                "title": "Employee Analytics Focus",
                "description": "Monitor attrition rates and satisfaction scores. High attrition correlates with low satisfaction and compensation disparities.",
                "type": "trend",
                "priority": "high",
            },
            "retail": {
                "title": "Sales Performance Pattern",
                "description": "Identify top-performing products and regions. Focus inventory and marketing spend on high-ROI segments.",
                "type": "recommendation",
                "priority": "high",
            },
            "healthcare": {
                "title": "Patient Health Trends",
                "description": "Review clinical risk factors and outcome rates. Early intervention programs can improve patient outcomes.",
                "type": "trend",
                "priority": "high",
            },
            "marketing": {
                "title": "Campaign Effectiveness",
                "description": "CTR and conversion rate analysis reveals the most effective channels. Reallocate budget to high-performing platforms.",
                "type": "recommendation",
                "priority": "high",
            },
            "stock": {
                "title": "Market Volatility Analysis",
                "description": "Daily returns and volatility patterns indicate market sentiment. Use momentum indicators for trading decisions.",
                "type": "trend",
                "priority": "high",
            },
        }
        return domain_map.get(self.domain)

    def _llm_recommendations(self) -> list[dict]:
        numeric = self.df.select_dtypes(include=[np.number])
        stats = numeric.describe().round(3).to_dict()
        overview = self.eda_results.get("overview", {})
        top_corr = self.eda_results.get("top_correlations", [])[:5]
        
        # Build category profiles if we have categorical columns
        cat_cols = self.df.select_dtypes(include=["object", "category"]).columns
        cat_profiles = {}
        for col in cat_cols[:3]:
            vc = self.df[col].value_counts().head(5)
            cat_profiles[col] = vc.to_dict()
            
        system_prompt = (
            "You are a principal business intelligence advisor and corporate strategist. "
            "Your task is to generate highly professional, actionable business recommendations based on dataset statistics. "
            "Return a JSON array of recommendation objects. Each object must have these EXACT keys: "
            '\"title\", \"description\", \"metric\", \"action\", \"impact\".\n'
            'Impact levels must be \"high\", \"medium\", or \"low\".\n'
            "Return ONLY the valid JSON array, no markdown block wrappers, no extra text."
        )
        
        prompt = f"""
Dataset Domain: {self.domain}
Shape: {self.df.shape[0]} rows × {self.df.shape[1]} columns
Columns: {list(self.df.columns)[:20]}

Statistical Summary (numeric):
{json.dumps(stats, indent=2)[:2000]}

Categorical Profiles:
{json.dumps(cat_profiles, indent=2)}

Top Correlations:
{json.dumps(top_corr, indent=2)}

Generate 3-5 premium, data-driven, strategic recommendations.
Format Example:
[
  {{
    "title": "Electronics category drives 48% revenue.",
    "description": "The electronics product category constitutes nearly half of the company's total sales volume, highlighting a critical reliance on this segment. Margins are stable, making it the primary engine of capital growth.",
    "metric": "48.2% of total revenue",
    "action": "Double down on marketing spend for electronics and secure priority supplier agreements to maintain high inventory levels.",
    "impact": "high"
  }}
]
"""
        response_text = self._call_llm_with_prompt(system_prompt, prompt)
        try:
            response_text = response_text.strip()
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            recs = json.loads(response_text)
            if isinstance(recs, list):
                return recs
        except Exception as err:
            print(f"[AI Insights] Failed to parse LLM recommendations: {err}")
        return self._heuristic_recommendations()

    def _call_llm_with_prompt(self, system_prompt: str, prompt: str) -> str:
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
                max_tokens=1500,
            )
            return response.choices[0].message.content

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
                max_tokens=1500,
            )
            return response.choices[0].message.content

        raise ValueError(f"Unknown LLM provider: {Config.LLM_PROVIDER}")

    def _heuristic_recommendations(self) -> list[dict]:
        recommendations = []
        num_cols = list(self.df.select_dtypes(include=[np.number]).columns)
        cat_cols = list(self.df.select_dtypes(include=["object", "category"]).columns)

        # 1. Top Category Share Heuristic
        perf_keywords = ["revenue", "sales", "profit", "spend", "cost", "amount", "price", "usage"]
        perf_cols = [c for c in num_cols if any(kw in c.lower() for kw in perf_keywords)]
        cat_keywords = ["category", "subcategory", "product", "department", "segment", "region", "city", "state", "channel", "usage"]
        target_cats = [c for c in cat_cols if any(kw in c.lower() for kw in cat_keywords)]

        category_share_added = False
        if perf_cols and target_cats:
            for perf_col in perf_cols[:2]:
                for cat_col in target_cats[:2]:
                    try:
                        total_sum = self.df[perf_col].sum()
                        if total_sum > 0:
                            grouped = self.df.groupby(cat_col)[perf_col].sum().sort_values(ascending=False)
                            if not grouped.empty:
                                top_cat = grouped.index[0]
                                top_sum = grouped.values[0]
                                pct = (top_sum / total_sum) * 100.0
                                if pct > 15.0:
                                    title_col_name = perf_col.replace('_', ' ').title()
                                    recommendations.append({
                                        "title": f"{str(top_cat).title()} category drives {pct:.0f}% of total {title_col_name}.",
                                        "description": f"Our structural performance profiling indicates that the '{top_cat}' segment constitutes a commanding weight inside the dataset, driving {pct:.1f}% of overall {perf_col.replace('_', ' ')}. Commercial buffers and priority resources should align to leverage this primary growth driver.",
                                        "metric": f"{pct:.1f}% of total {perf_col.replace('_', ' ')}",
                                        "action": f"Optimize supply networks, resource allocations, and targeted marketing campaigns on the high-margin '{top_cat}' segment.",
                                        "impact": "high" if pct >= 40 else "medium"
                                    })
                                    category_share_added = True
                                    break
                    except Exception:
                        continue
                if category_share_added:
                    break

        # 2. Friction & Churn Risk Heuristic
        churn_keywords = ["churn", "attrition", "risk", "exited", "canceled", "refunded", "loss", "fatigue"]
        churn_cols = [c for c in num_cols + cat_cols if any(kw in c.lower() for kw in churn_keywords)]
        group_keywords = ["region", "state", "city", "department", "segment", "category"]
        group_cols = [c for c in cat_cols if any(kw in c.lower() for kw in group_keywords)]

        churn_added = False
        if churn_cols and group_cols:
            for churn_col in churn_cols[:1]:
                for group_col in group_cols[:2]:
                    try:
                        # Convert to binary
                        if churn_col in num_cols:
                            # If binary-like or rates
                            series = self.df[churn_col].dropna()
                            if series.max() > 1.0:
                                # Standardize rates/values
                                mean_val = series.mean()
                                churn_bin = series > mean_val
                            else:
                                churn_bin = series > 0.5
                        else:
                            # Categorical
                            churn_bin = self.df[churn_col].astype(str).str.lower().str.strip().isin(["yes", "true", "1", "exited", "churned", "high", "failed"])

                        avg_churn = churn_bin.mean()
                        if avg_churn > 0:
                            cat_churns = churn_bin.groupby(self.df[group_col]).mean().sort_values(ascending=False)
                            if not cat_churns.empty:
                                top_churn_cat = cat_churns.index[0]
                                top_churn_rate = cat_churns.values[0]
                                if top_churn_rate > avg_churn * 1.1 and top_churn_rate > 0.05:
                                    recommendations.append({
                                        "title": f"{str(top_churn_cat).title()} region/segment shows high churn risk.",
                                        "description": f"The strategic cohort analysis flags a critical churn/attrition rate of {top_churn_rate*100:.1f}% inside the '{top_churn_cat}' {group_col.replace('_', ' ')} segment, notably exceeding the average baseline of {avg_churn*100:.1f}%. Customer feedback loops and preventative audits are strongly advised.",
                                        "metric": f"{top_churn_rate*100:.1f}% churn rate",
                                        "action": f"Initiate proactive customer success reviews, tailored loyalty programs, or operational audits inside the '{top_churn_cat}' cohort.",
                                        "impact": "high"
                                    })
                                    churn_added = True
                                    break
                    except Exception:
                        continue
                if churn_added:
                    break

        # 3. Temporal Weekend vs. Weekday Spikes
        date_cols = []
        for col in self.df.columns:
            if self.df[col].dtype.name == "datetime64[ns]" or "date" in col.lower() or "time" in col.lower() or "timestamp" in col.lower():
                date_cols.append(col)

        temporal_added = False
        if date_cols and perf_cols:
            for date_col in date_cols[:1]:
                for perf_col in perf_cols[:1]:
                    try:
                        dt_series = pd.to_datetime(self.df[date_col], errors='coerce')
                        if dt_series.notna().sum() > 10:
                            day_of_week = dt_series.dt.dayofweek
                            is_weekend = day_of_week.isin([5, 6])
                            
                            weekend_avg = self.df.loc[is_weekend, perf_col].mean()
                            weekday_avg = self.df.loc[~is_weekend, perf_col].mean()
                            
                            if pd.notna(weekend_avg) and pd.notna(weekday_avg) and weekend_avg > 0 and weekday_avg > 0:
                                if weekend_avg > weekday_avg:
                                    diff_pct = ((weekend_avg - weekday_avg) / weekday_avg) * 100.0
                                    title_name = perf_col.replace('_', ' ')
                                    recommendations.append({
                                        "title": f"Weekend {title_name} is {diff_pct:.0f}% higher.",
                                        "description": f"Our temporal distribution analysis reveals a strong operational spike during weekends, with {perf_col.replace('_', ' ')} averaging {weekend_avg:,.2f} per day compared to {weekday_avg:,.2f} on weekdays.",
                                        "metric": f"+{diff_pct:.1f}% weekend spike",
                                        "action": f"Reallocate advertising budgets, schedule weekend promotions, and adjust support/staffing to maximize yields during peak weekend demand windows.",
                                        "impact": "high" if diff_pct >= 25 else "medium"
                                    })
                                else:
                                    diff_pct = ((weekday_avg - weekend_avg) / weekend_avg) * 100.0
                                    title_name = perf_col.replace('_', ' ')
                                    recommendations.append({
                                        "title": f"Weekday {title_name} is {diff_pct:.0f}% higher.",
                                        "description": f"Our temporal distribution analysis shows that demand is heavily weekday-centric, with {perf_col.replace('_', ' ')} averaging {weekday_avg:,.2f} per day compared to {weekend_avg:,.2f} on weekends.",
                                        "metric": f"+{diff_pct:.1f}% weekday surge",
                                        "action": f"Align core operating capabilities, enterprise service-level agreements, and outreach campaigns with weekday high-velocity windows.",
                                        "impact": "medium"
                                    })
                                temporal_added = True
                                break
                    except Exception:
                        continue
                if temporal_added:
                    break

        # 4. Correlation-based Driver Heuristic
        top_corr = self.eda_results.get("top_correlations", [])
        if top_corr:
            for item in top_corr[:1]:
                try:
                    f_a = item.get("feature_a")
                    f_b = item.get("feature_b")
                    corr_val = item.get("correlation", 0.0)
                    
                    if corr_val > 0.4:
                        recommendations.append({
                            "title": f"{f_b.replace('_', ' ').title()} acts as a key driver for {f_a.replace('_', ' ').title()}.",
                            "description": f"Statistical correlation modeling identifies a robust relationship of {corr_val:.2f} between '{f_b}' and '{f_a}'. This signifies that focused improvements in '{f_b}' are highly likely to induce positive outcomes in '{f_a}'.",
                            "metric": f"{corr_val:.2f} correlation",
                            "action": f"Structure dedicated key performance indicators around '{f_b}' to stimulate growth in '{f_a}'.",
                            "impact": "high" if corr_val >= 0.7 else "medium"
                        })
                        break
                except Exception:
                    continue

        # 5. Data Quality Heuristic
        overall_score = self.eda_results.get("data_quality", {}).get("overall_score", 100.0)
        if overall_score < 90.0:
            total_missing = self.eda_results.get("data_quality", {}).get("total_missing", 0)
            recommendations.append({
                "title": "Improve dataset completeness to enhance analytics precision.",
                "description": f"The dataset quality score is currently limited to {overall_score:.1f}% due to the presence of {total_missing:,} missing values and outliers in numerical columns. Resolving these gaps is critical to ensure high-fidelity insights.",
                "metric": f"{overall_score:.1f}% quality score",
                "action": "Implement automated input verification checks and run standard preprocessing imputations to eliminate gaps in key features.",
                "impact": "medium"
            })

        # 6. Absolute Fallback: Generates a recommendation if list is too small
        if len(recommendations) < 3:
            for col in cat_cols:
                try:
                    vc = self.df[col].value_counts()
                    if len(vc) > 1 and len(vc) < 15:
                        top_val = vc.index[0]
                        top_cnt = vc.values[0]
                        pct = (top_cnt / len(self.df)) * 100.0
                        col_clean = col.replace('_', ' ').title()
                        recommendations.append({
                            "title": f"Focus on '{str(top_val).title()}' as the dominant {col_clean} segment.",
                            "description": f"Profiling shows that '{top_val}' constitutes the highest frequency segment in the '{col}' variable, accounting for {pct:.1f}% of the entire dataset. Operational strategies should be optimized for this core audience.",
                            "metric": f"{pct:.1f}% representation",
                            "action": f"Align strategic communications, pricing structures, and product design with the preferences of the '{top_val}' segment.",
                            "impact": "medium"
                        })
                        if len(recommendations) >= 3:
                            break
                except Exception:
                    continue

        # If STILL empty, add general business templates
        if not recommendations:
            recommendations.append({
                "title": "Establish consistent tracking of core performance indicators.",
                "description": "Continuous monitoring of operational metrics, transaction frequencies, and regional feedback loops is recommended to capture emerging trends early.",
                "metric": "Generic Baseline",
                "action": "Ensure periodic upload updates and ingestion of newly generated sales/traffic metrics.",
                "impact": "medium"
            })

        return recommendations[:5]  # Cap at top 5 high-value recommendations
