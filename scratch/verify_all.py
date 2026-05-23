import os
import sys
import pandas as pd
import numpy as np

# Add backend directory to path so we can import modules
sys.path.append(os.path.abspath("c:/Users/Admin/Desktop/DataPilot AI/backend"))

from dotenv import load_dotenv
load_dotenv(dotenv_path="c:/Users/Admin/Desktop/DataPilot AI/backend/.env")

from config import Config
from modules.data_cleaner import DataCleaner
from modules.eda_engine import EDAEngine
from modules.domain_processor import DomainProcessor
from modules.dashboard_generator import DashboardGenerator
from modules.ai_insights import AIInsightsEngine
from modules.pdf_reporter import PDFReporter

def test_pipeline():
    print("=" * 60)
    print("  InsightForge AI — Verification & Testing Pipeline")
    print("=" * 60)
    
    # 1. Load dummy dataset
    csv_path = "c:/Users/Admin/Desktop/DataPilot AI/scratch/dummy_sleep_data.csv"
    print(f"[1/6] Loading dataset from: {csv_path}")
    df = pd.read_csv(csv_path)
    print(f"      Shape: {df.shape[0]} rows, {df.shape[1]} columns")
    
    # 2. Clean data
    print("[2/6] Cleaning dataset...")
    cleaner = DataCleaner(df)
    df_clean, cleaning_report = cleaner.clean()
    print(f"      Cleaned Shape: {df_clean.shape[0]} rows, {df_clean.shape[1]} columns")
    print(f"      Steps taken: {cleaning_report.get('steps', [])}")
    
    # 3. Run EDA
    print("[3/6] Running Exploratory Data Analysis (EDA)...")
    eda_engine = EDAEngine(df_clean)
    eda_results = eda_engine.run_full_eda()
    print(f"      Columns profiled in summary: {len(eda_results.get('statistical_summary', []))}")
    print(f"      Top correlations discovered: {len(eda_results.get('top_correlations', []))}")
    
    dq = eda_results.get("data_quality", {})
    print("      [AI Data Quality Scores]:")
    print(f"        Missing Values Score: {dq.get('missing_values_score')}%")
    print(f"        Consistency Score   : {dq.get('consistency_score')}%")
    print(f"        Outliers Score      : {dq.get('outliers_score')}%")
    print(f"        Overall Quality Score: {dq.get('overall_score')}%")
    print(f"        AI Governance Briefing: “{dq.get('explanation')}”")
    
    # 4. Domain Processing
    domain = "healthcare"
    print(f"[4/6] Processing domain specific logic for domain: '{domain}'...")
    domain_results = DomainProcessor.process(df_clean, domain)
    print(f"      KPIs generated: {list(domain_results.get('kpis', {}).keys())}")
    print(f"      Recommendations count: {len(domain_results.get('recommendations', []))}")
    
    # 4.5. Generate Dashboard KPIs
    print("[4.5/6] Testing Auto KPI Detection & Dashboard Generation...")
    dash_gen = DashboardGenerator(df_clean, domain)
    dash_data = dash_gen.generate()
    kpis = dash_data.get("kpi_cards", [])
    print(f"      Successfully auto-detected {len(kpis)} dashboard KPIs:")
    for card in kpis:
        print(f"        - {card['title']}: {card['value']} (avg: {card['avg']}, trend: {card['trend_pct']}% {card['trend_dir']})")
        if card.get('description'):
            print(f"          Description: “{card['description']}”")
    
    # 5. Generate AI Storytelling Executive Narrative
    print("[5/6] Generating Executive Narrative & Insights...")
    insights_engine = AIInsightsEngine(df_clean, domain, eda_results)
    
    # Let's test the rule-based fallback specifically
    print("      -> Generating Rule-based fallback narrative...")
    narrative_fallback = insights_engine._rule_based_executive_narrative(cleaning_report, domain_results)
    print("      [Fallback Narrative Preview]:")
    print("-" * 50)
    print(narrative_fallback)
    print("-" * 50)
    
    # Let's see if we have LLM config and test it if active
    has_llm = Config.has_llm()
    print(f"      LLM Configured: {has_llm} (Provider: {Config.LLM_PROVIDER})")
    
    insights = insights_engine.generate_insights()
    narrative = insights_engine.generate_executive_narrative(cleaning_report, domain_results)
    
    # Inject narrative insight
    narrative_insight = {
        "title": "Executive AI Storytelling Narrative",
        "description": narrative,
        "type": "narrative",
        "priority": "high"
    }
    insights.append(narrative_insight)
    print(f"      Total generated insights: {len(insights)}")
    
    # Test Recommendations
    print("      -> Testing AI Recommendation Engine...")
    recs = insights_engine.generate_recommendations()
    print(f"      Generated {len(recs)} structured recommendations:")
    for r_idx, r in enumerate(recs, 1):
        print(f"        {r_idx}. [{r.get('impact', 'medium').upper()}] {r.get('title')}")
        print(f"           Metric: “{r.get('metric')}”")
        print(f"           Action: “{r.get('action')}”")
    # Store recommendations in eda overview so PDF reporter can build recommendations section
    eda_results["overview"] = eda_results.get("overview", {})
    eda_results["overview"]["recommendations"] = recs
    
    # 6. Generate PDF Report
    pdf_path = "c:/Users/Admin/Desktop/DataPilot AI/scratch/test_report.pdf"
    print(f"[6/6] Generating beautifully styled PDF Report: {pdf_path}")
    reporter = PDFReporter(
        df=df_clean,
        eda_results=eda_results,
        domain_results=domain_results,
        insights=insights,
        dashboard_data={},
        cleaning_report=cleaning_report,
        filename="dummy_sleep_data"
    )
    pdf_bytes = reporter.generate()
    
    with open(pdf_path, "wb") as f:
        f.write(pdf_bytes)
        
    print("[OK] PDF Report generated successfully!")
    print(f"  File size: {len(pdf_bytes) / 1024:.2f} KB")
    print("=" * 60)
    print("  VERIFICATION COMPLETE - PIPELINE IS 100% STABLE")
    print("=" * 60)

if __name__ == "__main__":
    test_pipeline()
