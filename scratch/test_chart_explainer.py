"""
test_chart_explainer.py
Tests the ChartExplainer mathematical heuristic engine and LLM routing.
"""

import sys
import os

# Include backend directory in path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from modules.chart_explainer import ChartExplainer
from config import Config

def run_tests():
    print("=" * 60)
    print("  Testing ChartExplanationEngine Diagnostics (Offline Heuristics)")
    print("=" * 60)

    # Force Heuristic Diagnostics by mocking has_llm to False
    original_has_llm = Config.has_llm
    Config.has_llm = lambda: False

    explainer = ChartExplainer()

    # 1. Dummy Q4 Sales Dataset with a major spike in November (index 10)
    dummy_series = [
        {"name": "Jan 23", "value": 7500},
        {"name": "Feb 23", "value": 7800},
        {"name": "Mar 23", "value": 8100},
        {"name": "Apr 23", "value": 8200},
        {"name": "May 23", "value": 8600},
        {"name": "Jun 23", "value": 8400},
        {"name": "Jul 23", "value": 8900},
        {"name": "Aug 23", "value": 8700},
        {"name": "Sep 23", "value": 9000},
        {"name": "Oct 23", "value": 9200},
        {"name": "Nov 23", "value": 14500},  # <--- Spike!
        {"name": "Dec 23", "value": 8200},
    ]

    print("\n[Test 1] Explaining General Trend (Finance Domain):")
    explanation_general = explainer.explain_chart(
        chart_title="Monthly Operational Revenue",
        chart_type="area",
        series_data=dummy_series,
        clicked_point=None,
        domain="finance"
    )
    print(explanation_general)
    assert "Monthly Operational Revenue" in explanation_general
    assert "Nov 23" in explanation_general
    print("[OK] General Trend test passed!")

    print("\n[Test 2] Explaining Point Spike (November Clicked - Finance Domain):")
    explanation_spike = explainer.explain_chart(
        chart_title="Monthly Operational Revenue",
        chart_type="area",
        series_data=dummy_series,
        clicked_point={"name": "Nov 23", "value": 14500},
        domain="finance"
    )
    print(explanation_spike)
    assert "spike" in explanation_spike.lower() or "surge" in explanation_spike.lower()
    assert "Nov 23" in explanation_spike
    assert "14,500" in explanation_spike
    print("[OK] Point Spike explanation test passed!")

    # 2. Dummy HR fatigue series with a contraction
    dummy_hr_series = [
        {"x": "Week 1", "y": 6.5},
        {"x": "Week 2", "y": 6.8},
        {"x": "Week 3", "y": 4.1},  # <--- Drop-off!
        {"x": "Week 4", "y": 6.7},
    ]

    print("\n[Test 3] Explaining Point Contraction (Week 3 Clicked - HR Domain):")
    explanation_contraction = explainer.explain_chart(
        chart_title="Weekly Team Fatigue Score",
        chart_type="line",
        series_data=dummy_hr_series,
        clicked_point={"x": "Week 3", "y": 4.1},
        domain="hr"
    )
    print(explanation_contraction)
    assert "drop" in explanation_contraction.lower() or "contraction" in explanation_contraction.lower() or "below" in explanation_contraction.lower()
    assert "Week 3" in explanation_contraction
    print("[OK] Point Contraction explanation test passed!")

    # Restore LLM configuration
    Config.has_llm = original_has_llm

    # Test LLM routing if active
    if Config.has_llm():
        print("\n" + "=" * 60)
        print("  Testing Live LLM Routing")
        print("=" * 60)
        print("\n[Test 4] Live LLM Chart Explanation:")
        explanation_llm = explainer.explain_chart(
            chart_title="Monthly Operational Revenue",
            chart_type="area",
            series_data=dummy_series,
            clicked_point={"name": "Nov 23", "value": 14500},
            domain="finance"
        )
        print(explanation_llm)
        assert len(explanation_llm) > 10
        print("[OK] Live LLM explanation routing test passed!")

    print("\n" + "=" * 60)
    print("  All Chart Explanation Tests PASSED Successfully!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
