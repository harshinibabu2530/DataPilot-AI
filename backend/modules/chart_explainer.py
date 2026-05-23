"""
chart_explainer.py
AI Chart Explanation engine. Uses OpenAI GPT or Groq if configured,
otherwise falls back to an advanced statistical peak-detection heuristic engine.
"""

import json
import numpy as np
import pandas as pd
from config import Config


class ChartExplainer:
    """
    Analyzes chart data and explains specific clicked data points or overall trends.
    """

    def __init__(self):
        pass

    def explain_chart(
        self,
        chart_title: str,
        chart_type: str,
        series_data: list[dict],
        clicked_point: dict = None,
        domain: str = "generic"
    ) -> str:
        """
        Generates a premium explanation for a clicked chart or specific point.
        """
        if not series_data or not isinstance(series_data, list):
            return "No chart series data available to analyze."

        # Online mode: Call LLM if configured
        if Config.has_llm():
            try:
                return self._llm_explain(chart_title, chart_type, series_data, clicked_point, domain)
            except Exception as e:
                print(f"[ChartExplainer] LLM explanation failed: {e}. Falling back to heuristics.")

        # Offline mode: Mathematical peak-detection and domain-specific rule-based fallback
        return self._heuristic_explain(chart_title, chart_type, series_data, clicked_point, domain)

    def _llm_explain(
        self,
        chart_title: str,
        chart_type: str,
        series_data: list[dict],
        clicked_point: dict = None,
        domain: str = "generic"
    ) -> str:
        """
        Queries OpenAI or Groq to explain the chart data and clicked point.
        """
        system_prompt = (
            "You are DataPilot AI, an elite corporate business analyst and chief strategy advisor. "
            "Your job is to explain chart data trends and specific data points clicked by the user. "
            "Be highly concise, strategic, and professional. Write exactly a 2-to-3 sentence explanation. "
            "Avoid generic, robotic intro phrases like 'Based on the chart data provided...' or 'Looking at the chart...'. "
            "Start directly with the core analytical narrative. Blend technical data analysis with realistic business context "
            "tailored to the domain (e.g. Q4 sales, festival season surges, inventory realignments, fatigue correlation)."
        )

        user_prompt = f"""
Dataset Domain: {domain}
Chart Title: {chart_title}
Chart Type: {chart_type}
Full Chart Series Data (JSON format):
{json.dumps(series_data[:40], indent=2)}

Clicked Data Point context:
{json.dumps(clicked_point) if clicked_point else "None (explain the general chart trends, peaks, anomalies, or correlations)"}

Generate a premium, strategic, and extremely engaging explanation for this chart.
- If a clicked point is specified, explain exactly why that spike, drop-off, or value occurred (e.g. "The spike in November occurred because Q4 sales increased during the festival season.").
- If no clicked point is specified, explain the overall trend, maximum peak, and minimum baseline.
- Keep the narrative under 60 words and make it sound incredibly professional, executive-ready, and smart.
"""

        if Config.LLM_PROVIDER == "openai":
            from openai import OpenAI
            client = OpenAI(api_key=Config.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model=Config.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
                max_tokens=250,
            )
            return response.choices[0].message.content.strip()

        elif Config.LLM_PROVIDER == "groq":
            from groq import Groq
            client = Groq(api_key=Config.GROQ_API_KEY)
            response = client.chat.completions.create(
                model=Config.GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
                max_tokens=250,
            )
            return response.choices[0].message.content.strip()

        raise ValueError(f"Unsupported LLM provider: {Config.LLM_PROVIDER}")

    def _heuristic_explain(
        self,
        chart_title: str,
        chart_type: str,
        series_data: list[dict],
        clicked_point: dict = None,
        domain: str = "generic"
    ) -> str:
        """
        Advanced mathematical rule-based diagnostic fallback for offline analysis.
        Uses statistical peak and slope detection to write smart explanations.
        """
        # 1. Parse numeric values from series
        labels = []
        values = []

        # Guess the name and value keys
        first_item = series_data[0]
        name_key = "name"
        for k in ["x", "label", "date", "name", "category"]:
            if k in first_item:
                name_key = k
                break

        # Value key should be numeric and not name_key
        val_keys = []
        for k, v in first_item.items():
            if k != name_key and isinstance(v, (int, float)) and not isinstance(v, bool):
                val_keys.append(k)

        val_key = val_keys[0] if val_keys else "value"

        # Extract data vectors
        for item in series_data:
            lbl = item.get(name_key, "")
            val = item.get(val_key, None)
            if val is not None:
                labels.append(lbl)
                values.append(float(val))

        if not values:
            return f"The '{chart_title}' chart shows historical sequential data. All values are stable and within standard deviations."

        values_arr = np.array(values)
        mean_val = float(np.mean(values_arr))
        std_val = float(np.std(values_arr)) if len(values_arr) > 1 else 0.0
        max_idx = int(np.argmax(values_arr))
        min_idx = int(np.argmin(values_arr))

        max_label, max_val = labels[max_idx], values[max_idx]
        min_label, min_val = labels[min_idx], values[min_idx]

        # Fit a simple linear trend (y = mx + c)
        n = len(values_arr)
        if n > 1:
            x = np.arange(n)
            slope = float(np.polyfit(x, values_arr, 1)[0])
        else:
            slope = 0.0

        # General trend term
        trend_desc = "neutral"
        if slope > (0.02 * mean_val):
            trend_desc = "strong upward"
        elif slope > 0:
            trend_desc = "gradual upward"
        elif slope < -(0.02 * mean_val):
            trend_desc = "strong downward"
        elif slope < 0:
            trend_desc = "gradual downward"

        # Determine clicked point context
        clicked_label = None
        clicked_val = None

        if clicked_point:
            clicked_label = clicked_point.get("name") or clicked_point.get(name_key) or clicked_point.get("x")
            # Seek value
            for k in [val_key, "value", "y", "sales", "revenue"]:
                if k in clicked_point:
                    clicked_val = clicked_point[k]
                    break
            if clicked_val is None:
                # Fallback to values matching the clicked label
                for item in series_data:
                    if str(item.get(name_key)) == str(clicked_label):
                        clicked_val = item.get(val_key)
                        break

        # 2. Formulate diagnostic text based on Clicked Point or General Trend
        dom = domain.lower()

        # Formatting values beautifully
        def fmt(num):
            if num >= 1_000_000:
                return f"{num/1_000_000:.2f}M"
            elif num >= 1_000:
                return f"{num:,.2f}"
            return f"{num:.2f}"

        if clicked_label is not None and clicked_val is not None:
            clicked_val = float(clicked_val)
            deviation = ((clicked_val - mean_val) / mean_val * 100) if mean_val != 0 else 0.0
            z_score = ((clicked_val - mean_val) / std_val) if std_val > 0 else 0.0

            # Categorize the click (spike vs drop-off vs stable)
            if z_score > 1.2:
                # Clicked a SPIKE!
                if dom in ["finance", "retail", "sales"]:
                    return (
                        f"The spike occurred at {clicked_label} where value rose to {fmt(clicked_val)}, representing a "
                        f"{deviation:.1f}% surge over the baseline mean of {fmt(mean_val)}. This expansion is highly typical "
                        f"during the Q4 festive season, propelled by heightened customer transaction velocity and seasonal promotions."
                    )
                elif dom in ["hr", "workforce"]:
                    return (
                        f"The sharp increase occurred at {clicked_label} with a reading of {fmt(clicked_val)}. This is a "
                        f"{deviation:.1f}% positive anomaly above the team baseline average ({fmt(mean_val)}), showing "
                        f"temporarily elevated workload parameters or critical sprint fatigue metrics requiring observation."
                    )
                elif dom in ["wellness", "health", "healthcare"]:
                    return (
                        f"The spike at {clicked_label} reached {fmt(clicked_val)}, marking a {deviation:.1f}% surge "
                        f"above the typical baseline average of {fmt(mean_val)}. This rise indicates optimized health indicators "
                        f"or positive biological response cycles corresponding to adjusted wellness routines."
                    )
                elif dom in ["marketing", "campaign"]:
                    return (
                        f"A major conversion spike was recorded at {clicked_label} ({fmt(clicked_val)}), which is "
                        f"{deviation:.1f}% higher than the campaign mean of {fmt(mean_val)}. This spike reflects "
                        f"exceptionally high resonance from targeted promotional channels and successful audience segmentation."
                    )
                else:
                    return (
                        f"A significant statistical peak occurred at {clicked_label} ({fmt(clicked_val)}), which stands "
                        f"{deviation:.1f}% above the series average of {fmt(mean_val)}. This represents an outlier event "
                        f"signaling a sudden surge in underlying activity metrics."
                    )

            elif z_score < -1.2:
                # Clicked a CONTRACTION / DROP-OFF!
                if dom in ["finance", "retail", "sales"]:
                    return (
                        f"The drop-off at {clicked_label} fell to {fmt(clicked_val)}, showing a {abs(deviation):.1f}% "
                        f"contraction below the series mean ({fmt(mean_val)}). This contraction represents a typical "
                        f"post-holiday cyclic cooldown, standard during annual supply chain recalibrations."
                    )
                elif dom in ["hr", "workforce"]:
                    return (
                        f"A noticeable contraction occurred at {clicked_label} ({fmt(clicked_val)}), dropping "
                        f"{abs(deviation):.1f}% below the historical workforce baseline ({fmt(mean_val)}). This represents "
                        f"temporary resource reallocations or seasonal downtime periods."
                    )
                elif dom in ["wellness", "health", "healthcare"]:
                    return (
                        f"A clinical contraction occurred at {clicked_label} with a level of {fmt(clicked_val)}, representing "
                        f"a {abs(deviation):.1f}% drop below the average target ({fmt(mean_val)}). This suggests a temporary "
                        f"decline in vital markers, often linked to elevated stress levels or disruptions in sleep hygiene."
                    )
                else:
                    return (
                        f"A localized contraction was detected at {clicked_label} ({fmt(clicked_val)}), dropping "
                        f"{abs(deviation):.1f}% below the baseline mean of {fmt(mean_val)}. This represents a momentary "
                        f"dip in transaction volumes or operational throughput."
                    )

            else:
                # Clicked a standard baseline point
                if dom in ["finance", "retail", "sales"]:
                    return (
                        f"The point at {clicked_label} ({fmt(clicked_val)}) represents stable, standard operational baseline "
                        f"performance, maintaining close proximity (deviating by just {deviation:.1f}%) to the long-term "
                        f"series mean of {fmt(mean_val)}."
                    )
                else:
                    return (
                        f"Performance at {clicked_label} ({fmt(clicked_val)}) remains in equilibrium, exhibiting a minor "
                        f"{deviation:.1f}% variation from the historical baseline mean of {fmt(mean_val)}."
                    )

        # 3. Overall explanation (if no clicked point is provided)
        if dom in ["finance", "retail", "sales"]:
            return (
                f"The '{chart_title}' chart details a overall {trend_desc} trend across the {n} periods. "
                f"The series established a peak capacity at {max_label} reaching {fmt(max_val)}, "
                f"while forming a baseline support floor at {min_label} with {fmt(min_val)}."
            )
        elif dom in ["wellness", "health", "healthcare"]:
            return (
                f"The '{chart_title}' analysis tracks a {trend_desc} wellness baseline over {n} intervals. "
                f"Optimized vitals were captured at {max_label} ({fmt(max_val)}), while the lowest biological threshold "
                f"was noted at {min_label} ({fmt(min_val)})."
            )
        else:
            return (
                f"The '{chart_title}' series displays a {trend_desc} operational trend over {n} intervals. "
                f"The maximum capacity was recorded at {max_label} ({fmt(max_val)}), and the baseline "
                f"support registered at {min_label} ({fmt(min_val)})."
            )
