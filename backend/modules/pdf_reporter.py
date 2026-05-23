"""
pdf_reporter.py
Generates a downloadable PDF analytics report using ReportLab.
Contains: dataset overview, EDA summary, KPIs, AI insights, charts, recommendations.
"""

import io
import os
import json
from datetime import datetime
import pandas as pd
import numpy as np
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics import renderPDF


# ── Color Palette ──────────────────────────────────────────────────── #
PRIMARY   = colors.HexColor("#6366F1")  # Indigo
SECONDARY = colors.HexColor("#8B5CF6")  # Violet
ACCENT    = colors.HexColor("#10B981")  # Emerald
WARNING   = colors.HexColor("#F59E0B")  # Amber
DANGER    = colors.HexColor("#EF4444")  # Red
BG_LIGHT  = colors.HexColor("#F8FAFC")
BG_DARK   = colors.HexColor("#1E293B")
TEXT_DARK = colors.HexColor("#0F172A")
TEXT_GRAY = colors.HexColor("#64748B")
BORDER    = colors.HexColor("#E2E8F0")


class PDFReporter:

    def __init__(
        self,
        df: pd.DataFrame,
        eda_results: dict = None,
        domain_results: dict = None,
        insights: list = None,
        dashboard_data: dict = None,
        cleaning_report: dict = None,
        filename: str = "analytics_report",
    ):
        self.df = df.copy()
        self.eda = eda_results or {}
        self.domain = domain_results or {}
        self.insights = insights or []
        self.dashboard = dashboard_data or {}
        self.cleaning = cleaning_report or {}
        self.filename = filename
        self.generated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.styles = self._build_styles()

        # Extract narrative from insights or dynamically generate on the fly
        self.narrative = None
        for ins in self.insights:
            if isinstance(ins, dict) and ins.get("type") == "narrative":
                self.narrative = ins.get("description")
                break
        
        if not self.narrative:
            try:
                from modules.ai_insights import AIInsightsEngine
                engine = AIInsightsEngine(self.df, self.domain.get("domain", "generic"), self.eda)
                self.narrative = engine.generate_executive_narrative(self.cleaning, self.domain)
            except Exception as e:
                print(f"[PDF Reporter] Dynamic narrative generation failed: {e}")
                self.narrative = None

    # ------------------------------------------------------------------ #
    #  Public
    # ------------------------------------------------------------------ #
    def generate(self) -> bytes:
        """Generate PDF and return as bytes."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=1.5 * cm,
            rightMargin=1.5 * cm,
            topMargin=2 * cm,
            bottomMargin=2 * cm,
            title="InsightForge AI Analytics Report",
            author="InsightForge AI",
        )

        story = []
        story += self._build_cover_page()
        story.append(PageBreak())
        story += self._build_narrative_section()
        story.append(PageBreak())
        story += self._build_overview_section()
        story += self._build_cleaning_section()
        story.append(PageBreak())
        story += self._build_eda_section()
        story.append(PageBreak())
        story += self._build_kpi_section()
        story += self._build_insights_section()
        story.append(PageBreak())
        
        # Inject Predictive Analytics Suite if calculated
        predictive_elements = self._build_predictive_section()
        if predictive_elements:
            story += predictive_elements
            story.append(PageBreak())

        story += self._build_recommendations_section()
        story += self._build_footer()

        doc.build(story)
        return buffer.getvalue()

    def _build_narrative_section(self) -> list:
        s = self.styles
        elements = [
            Paragraph("1. Executive AI Storytelling Report", s["section_header"]),
            HRFlowable(width="100%", thickness=1, color=BORDER),
            Spacer(1, 0.2 * inch),
        ]
        if self.narrative:
            # We split the narrative text by double newlines to form separate paragraphs
            paragraphs = [p.strip() for p in self.narrative.split("\n\n") if p.strip()]
            for p in paragraphs:
                elements.append(Paragraph(p, s["narrative_body"]))
                elements.append(Spacer(1, 0.15 * inch))
        else:
            elements.append(Paragraph("No storytelling narrative summary available.", s["body"]))
        return elements

    # ------------------------------------------------------------------ #
    #  Cover Page
    # ------------------------------------------------------------------ #
    def _build_cover_page(self) -> list:
        s = self.styles
        domain_name = self.domain.get("domain", "General").title()

        elements = [
            Spacer(1, 1.5 * inch),
            Paragraph("InsightForge AI", s["brand"]),
            Paragraph("Analytics Report", s["cover_title"]),
            Spacer(1, 0.3 * inch),
            HRFlowable(width="100%", thickness=3, color=PRIMARY),
            Spacer(1, 0.3 * inch),
            Paragraph(f"Domain: {domain_name} Analytics", s["cover_subtitle"]),
            Spacer(1, 0.5 * inch),
            Paragraph(f"Dataset: <b>{self.df.shape[0]:,} rows × {self.df.shape[1]} columns</b>", s["cover_meta"]),
            Paragraph(f"Generated: {self.generated_at}", s["cover_meta"]),
            Spacer(1, 1 * inch),
        ]

        # Quick stats table
        stats_data = [
            ["Metric", "Value"],
            ["Total Records", f"{self.df.shape[0]:,}"],
            ["Features", str(self.df.shape[1])],
            ["Numeric Columns", str(len(self.df.select_dtypes(include=[np.number]).columns))],
            ["Categorical Columns", str(len(self.df.select_dtypes(include=["object"]).columns))],
            ["Missing Values", str(int(self.df.isnull().sum().sum()))],
            ["AI Insights", str(len(self.insights))],
        ]
        tbl = Table(stats_data, colWidths=[3 * inch, 3 * inch])
        tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 11),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
            ("ROUNDEDCORNERS", [4, 4, 4, 4]),
        ]))
        elements.append(tbl)
        return elements

    # ------------------------------------------------------------------ #
    #  Overview Section
    # ------------------------------------------------------------------ #
    def _build_overview_section(self) -> list:
        s = self.styles
        overview = self.eda.get("overview", {})
        elements = [
            Paragraph("2. Dataset Overview", s["section_header"]),
            HRFlowable(width="100%", thickness=1, color=BORDER),
            Spacer(1, 0.2 * inch),
        ]

        desc = (
            f"The dataset contains <b>{overview.get('rows', len(self.df)):,} records</b> across "
            f"<b>{overview.get('columns', len(self.df.columns))} features</b>. "
            f"Memory usage: {overview.get('memory_usage_kb', 0):.1f} KB. "
            f"Duplicate rows detected: {overview.get('duplicate_rows', 0)}."
        )
        elements.append(Paragraph(desc, s["body"]))
        elements.append(Spacer(1, 0.15 * inch))

        # AI Data Quality Score subsection
        dq = self.eda.get("data_quality", {})
        if dq:
            elements.append(Paragraph("AI Data Quality Assessment", s["subsection"]))
            elements.append(Spacer(1, 0.05 * inch))
            
            dq_data = [
                ["Quality Metric", "Score"],
                ["Missing Values", f"{dq.get('missing_values_score', 0):.1f}%"],
                ["Consistency (Duplicates)", f"{dq.get('consistency_score', 0):.1f}%"],
                ["Outliers (Anomalies)", f"{dq.get('outliers_score', 0):.1f}%"],
                ["Overall Data Quality", f"{dq.get('overall_score', 0):.1f}%"]
            ]
            
            dq_tbl = Table(dq_data, colWidths=[3.2 * inch, 3.2 * inch])
            
            # Style the quality score table, making the overall data quality row stand out
            overall_val = dq.get("overall_score", 0)
            status_color = ACCENT if overall_val >= 85 else (WARNING if overall_val >= 70 else DANGER)
            
            dq_style = TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), SECONDARY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, BG_LIGHT]),
                ("GRID", (0, 0), (-1, -1), 0.3, BORDER),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                
                # Highlight Overall Data Quality row (row 4)
                ("FONTNAME", (0, 4), (-1, 4), "Helvetica-Bold"),
                ("BACKGROUND", (0, 4), (-1, 4), BG_LIGHT),
                ("TEXTCOLOR", (1, 4), (1, 4), status_color),
            ])
            dq_tbl.setStyle(dq_style)
            elements.append(dq_tbl)
            elements.append(Spacer(1, 0.1 * inch))
            
            # AI Governance briefing box
            explanation = dq.get("explanation", "")
            if explanation:
                briefing_style = ParagraphStyle(
                    "briefing_style",
                    parent=s["body"],
                    textColor=SECONDARY,
                    fontName="Helvetica-Oblique",
                    backColor=BG_LIGHT,
                    borderPadding=6,
                    spaceAfter=4,
                    borderColor=BORDER,
                    borderWidth=0.5
                )
                elements.append(Paragraph(f"<b>AI Governance Briefing:</b> “{explanation}”", briefing_style))
                elements.append(Spacer(1, 0.15 * inch))

        # Column info table
        elements.append(Paragraph("Feature Profiling Summary", s["subsection"]))
        elements.append(Spacer(1, 0.05 * inch))
        col_data = [["Column", "Type", "Missing", "Missing %"]]
        missing_report = self.eda.get("missing_values", [])
        for item in missing_report[:15]:
            col_data.append([
                item.get("column", ""),
                item.get("dtype", ""),
                str(item.get("missing_count", 0)),
                f"{item.get('missing_pct', 0):.1f}%",
            ])

        if len(col_data) > 1:
            tbl = Table(col_data, colWidths=[2.5 * inch, 1.5 * inch, 1.2 * inch, 1.2 * inch])
            tbl.setStyle(self._table_style())
            elements.append(tbl)
        return elements

    # ------------------------------------------------------------------ #
    #  Cleaning Report
    # ------------------------------------------------------------------ #
    def _build_cleaning_section(self) -> list:
        s = self.styles
        elements = [
            Spacer(1, 0.3 * inch),
            Paragraph("3. Data Cleaning Report", s["section_header"]),
            HRFlowable(width="100%", thickness=1, color=BORDER),
            Spacer(1, 0.15 * inch),
        ]

        steps = self.cleaning.get("steps", [])
        if steps:
            for step in steps:
                elements.append(Paragraph(f"• {step}", s["body"]))
        else:
            elements.append(Paragraph("No cleaning steps were necessary.", s["body"]))

        orig = self.cleaning.get("original_shape", [len(self.df), len(self.df.columns)])
        final = self.cleaning.get("final_shape", orig)
        removed = self.cleaning.get("rows_removed", 0)

        summary = f"Original shape: {orig[0]:,} × {orig[1]} → Final shape: {final[0]:,} × {final[1]}. Rows removed: {removed}."
        elements.append(Spacer(1, 0.1 * inch))
        elements.append(Paragraph(summary, s["info_box"]))
        return elements

    # ------------------------------------------------------------------ #
    #  EDA Section
    # ------------------------------------------------------------------ #
    def _build_eda_section(self) -> list:
        s = self.styles
        elements = [
            Paragraph("4. Exploratory Data Analysis", s["section_header"]),
            HRFlowable(width="100%", thickness=1, color=BORDER),
            Spacer(1, 0.2 * inch),
        ]

        stat_summary = self.eda.get("statistical_summary", [])
        if stat_summary:
            elements.append(Paragraph("Statistical Summary", s["subsection"]))
            stat_data = [["Column", "Mean", "Std", "Min", "Median", "Max", "Skewness"]]
            for row in stat_summary[:12]:
                stat_data.append([
                    row.get("column", "")[:18],
                    f"{row.get('mean', 0):.3f}",
                    f"{row.get('std', 0):.3f}",
                    f"{row.get('min', 0):.3f}",
                    f"{row.get('median', 0):.3f}",
                    f"{row.get('max', 0):.3f}",
                    f"{row.get('skewness', 0):.3f}",
                ])
            tbl = Table(stat_data, colWidths=[2 * inch, 0.9 * inch, 0.9 * inch, 0.9 * inch, 0.9 * inch, 0.9 * inch, 0.9 * inch])
            tbl.setStyle(self._table_style())
            elements.append(tbl)
            elements.append(Spacer(1, 0.2 * inch))

        top_corr = self.eda.get("top_correlations", [])
        if top_corr:
            elements.append(Paragraph("Top Feature Correlations", s["subsection"]))
            corr_data = [["Feature A", "Feature B", "Correlation", "Strength"]]
            for item in top_corr[:8]:
                val = item.get("correlation", 0)
                strength = "Strong" if val > 0.7 else ("Moderate" if val > 0.4 else "Weak")
                corr_data.append([
                    item.get("feature_a", "")[:20],
                    item.get("feature_b", "")[:20],
                    f"{val:.4f}",
                    strength,
                ])
            tbl = Table(corr_data, colWidths=[2.2 * inch, 2.2 * inch, 1.5 * inch, 1.5 * inch])
            tbl.setStyle(self._table_style())
            elements.append(tbl)

        return elements

    # ------------------------------------------------------------------ #
    #  KPI Section
    # ------------------------------------------------------------------ #
    def _build_kpi_section(self) -> list:
        s = self.styles
        kpis = self.domain.get("kpis", {})
        elements = [
            Paragraph("5. Key Performance Indicators", s["section_header"]),
            HRFlowable(width="100%", thickness=1, color=BORDER),
            Spacer(1, 0.2 * inch),
        ]

        if kpis:
            kpi_data = [["KPI", "Value"]]
            for k, v in kpis.items():
                label = k.replace("_", " ").title()
                val_str = f"{v:,.2f}" if isinstance(v, (int, float)) and v is not None else str(v)
                kpi_data.append([label, val_str])
            tbl = Table(kpi_data, colWidths=[3 * inch, 3 * inch])
            tbl.setStyle(self._table_style())
            elements.append(tbl)
        else:
            elements.append(Paragraph("No domain-specific KPIs available.", s["body"]))

        return elements

    # ------------------------------------------------------------------ #
    #  Insights Section
    # ------------------------------------------------------------------ #
    def _build_insights_section(self) -> list:
        s = self.styles
        elements = [
            Spacer(1, 0.3 * inch),
            Paragraph("6. AI-Generated Insights", s["section_header"]),
            HRFlowable(width="100%", thickness=1, color=BORDER),
            Spacer(1, 0.15 * inch),
        ]

        priority_hex = {"high": "#EF4444", "medium": "#F59E0B", "low": "#10B981"}

        for i, insight in enumerate(self.insights[:8], 1):
            title = insight.get("title", "Insight")
            desc  = insight.get("description", "")
            prio  = insight.get("priority", "medium")
            itype = insight.get("type", "summary")

            elements.append(Paragraph(
                f"<b>{i}. {title}</b> <font color='{priority_hex.get(prio, '#64748B')}'>[{prio.upper()}]</font>",
                s["insight_title"]
            ))
            elements.append(Paragraph(desc, s["body"]))
            elements.append(Spacer(1, 0.1 * inch))

        return elements

    # ------------------------------------------------------------------ #
    #  Recommendations
    # ------------------------------------------------------------------ #
    def _build_recommendations_section(self) -> list:
        s = self.styles
        
        # Fetch structured recommendations from EDA results overview
        recommendations = self.eda.get("overview", {}).get("recommendations", [])
        
        elements = [
            Paragraph("7. Strategic Recommendation Engine", s["section_header"]),
            HRFlowable(width="100%", thickness=1, color=BORDER),
            Spacer(1, 0.15 * inch),
        ]

        if recommendations:
            for rec in recommendations:
                if not isinstance(rec, dict):
                    elements.append(Paragraph(f"➤ {rec}", s["recommendation"]))
                    continue
                
                title = rec.get("title", "Recommendation")
                desc = rec.get("description", "")
                metric = rec.get("metric", "")
                action = rec.get("action", "")
                impact = rec.get("impact", "medium").lower()
                
                # Colors based on impact
                if impact == "high":
                    bg_color = colors.HexColor("#FEF2F2")
                    border_color = colors.HexColor("#FCA5A5")
                    tag_color = "#EF4444"
                elif impact == "medium":
                    bg_color = colors.HexColor("#FFFBEB")
                    border_color = colors.HexColor("#FCD34D")
                    tag_color = "#D97706"
                else:
                    bg_color = colors.HexColor("#ECFDF5")
                    border_color = colors.HexColor("#6EE7B7")
                    tag_color = "#059669"
                
                # Custom sub-styles for the recommendation callout
                rec_style = ParagraphStyle(
                    "rec_title",
                    parent=s["body"],
                    fontSize=10.5,
                    fontName="Helvetica-Bold",
                    textColor=colors.HexColor("#1E293B")
                )
                
                desc_style = ParagraphStyle(
                    "rec_desc",
                    parent=s["body"],
                    fontSize=9,
                    fontName="Helvetica-Oblique",
                    textColor=colors.HexColor("#475569"),
                    leading=12.5
                )
                
                action_style = ParagraphStyle(
                    "rec_action",
                    parent=s["body"],
                    fontSize=9,
                    textColor=colors.HexColor("#0F172A"),
                    leading=12.5
                )
                
                content = [
                    Paragraph(f"<b>{title}</b> <font color='{tag_color}'>[{impact.upper()}]</font>", rec_style),
                    Spacer(1, 3),
                    Paragraph(desc, desc_style),
                    Spacer(1, 3),
                    Paragraph(f"<b>Supporting Metric:</b> {metric} &nbsp;&nbsp;|&nbsp;&nbsp; <b>Tactical Action:</b> {action}", action_style)
                ]
                
                # Wrap inside a bordered ReportLab table to mimic container aesthetics
                rec_table = Table([[content]], colWidths=[6.4 * inch])
                rec_table.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), bg_color),
                    ("BOX", (0, 0), (-1, -1), 1, border_color),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ]))
                elements.append(rec_table)
                elements.append(Spacer(1, 0.12 * inch))
        else:
            old_recs = self.domain.get("recommendations", [])
            if old_recs:
                for rec in old_recs:
                    if rec:
                        elements.append(Paragraph(f"➤ {rec}", s["recommendation"]))
            else:
                elements.append(Paragraph(
                    "Continue monitoring key performance indicators and perform periodic re-analysis as new data becomes available.",
                    s["body"]
                ))
        return elements

    # ------------------------------------------------------------------ #
    #  Predictive Section
    # ------------------------------------------------------------------ #
    def _build_predictive_section(self) -> list:
        predictions = self.eda.get("overview", {}).get("predictions")
        if not predictions:
            return []

        s = self.styles
        task_type = predictions.get("task_type", "timeseries")
        target_col = predictions.get("target_column", "")
        algo = predictions.get("algorithm", "PROPHET")

        elements = [
            Paragraph("6. Predictive Analytics Suite ⭐", s["section_header"]),
            HRFlowable(width="100%", thickness=1, color=BORDER),
            Spacer(1, 0.15 * inch),
        ]

        if task_type == "timeseries":
            freq = predictions.get("frequency", "D")
            metrics = predictions.get("metrics", {})
            elements.append(Paragraph(
                f"<b>Time Series Forecasting Profile</b> — Target column: <b>{target_col}</b> | "
                f"Algorithm: <b>{algo}</b> | Aggregate Frequency: <b>{freq}</b>",
                s["body"]
            ))
            elements.append(Spacer(1, 0.1 * inch))

            # Performance Table
            perf_data = [
                ["Evaluation Metric", "Score / Value", "Interpretation"],
                ["R-Squared (R²)", f"{metrics.get('r2', 0.0):.4f}", "Variance explained by the forecast model"],
                ["Root Mean Squared Error (RMSE)", f"{metrics.get('rmse', 0.0):.4f}", "Average magnitude of modeling error"],
                ["Mean Absolute Error (MAE)", f"{metrics.get('mae', 0.0):.4f}", "Average absolute difference of forecasting"]
            ]
            perf_table = Table(perf_data, colWidths=[2.2*inch, 1.3*inch, 3.2*inch])
            perf_table.setStyle(self._table_style())
            elements.append(perf_table)
            elements.append(Spacer(1, 0.2 * inch))

            elements.append(Paragraph("<b>Upcoming Out-of-Sample Forecast</b>", s["subsection"]))
            elements.append(Paragraph(
                "Below are the calculated forward projections along with statistical 95% confidence intervals "
                "(based on residual standard error):",
                s["body"]
            ))
            elements.append(Spacer(1, 0.1 * inch))

            # Forecast Table (Top 10 values)
            forecast_points = predictions.get("forecast", [])
            table_rows = [["Forecast Date", "Expected Value", "Lower 95% Bound", "Upper 95% Bound"]]
            for p in forecast_points[:10]: # Limit to top 10 for compactness
                table_rows.append([
                    p.get("date", ""),
                    f"{p.get('value', 0.0):.2f}",
                    f"{p.get('lower', 0.0):.2f}",
                    f"{p.get('upper', 0.0):.2f}"
                ])
            
            f_table = Table(table_rows, colWidths=[1.8*inch, 1.6*inch, 1.6*inch, 1.6*inch])
            f_table.setStyle(self._table_style())
            elements.append(f_table)

            if len(forecast_points) > 10:
                elements.append(Spacer(1, 0.05 * inch))
                elements.append(Paragraph(
                    f"<i>* Showing top 10 of {len(forecast_points)} forecast periods. Detailed projections are available in the Predictive Dashboard.</i>",
                    s["body"]
                ))

        else: # churn classification
            metrics = predictions.get("metrics", {})
            elements.append(Paragraph(
                f"<b>Strategic Risk & Classification Assessment</b> — Target column: <b>{target_col}</b> | "
                f"Algorithm: <b>RANDOM FOREST CLASSIFIER</b>",
                s["body"]
            ))
            elements.append(Spacer(1, 0.1 * inch))

            # Metrics
            perf_data = [
                ["Classification Metric", "Score / Value", "Business Target"],
                ["Model Accuracy", f"{metrics.get('accuracy', 0.0) * 100:.2f}%", "Overall prediction correctness"],
                ["F1-Score (Weighted)", f"{metrics.get('f1', 0.0) * 100:.2f}%", "Balance between Precision and Recall"],
                ["Precision", f"{metrics.get('precision', 0.0) * 100:.2f}%", "Proportion of positive flags that are correct"],
                ["Recall (Sensitivity)", f"{metrics.get('recall', 0.0) * 100:.2f}%", "Proportion of actual positive cases detected"]
            ]
            perf_table = Table(perf_data, colWidths=[2.2*inch, 1.3*inch, 3.2*inch])
            perf_table.setStyle(self._table_style())
            elements.append(perf_table)
            elements.append(Spacer(1, 0.2 * inch))

            # Feature drivers
            elements.append(Paragraph("<b>Top Driver Analysis (Feature Importances)</b>", s["subsection"]))
            drivers = predictions.get("feature_importances", [])
            driver_text = ""
            for idx, d in enumerate(drivers[:5], 1):
                driver_text += f"<b>{idx}. {d['feature']}</b> ({d['importance'] * 100:.1f}% impact) &nbsp;&nbsp;&nbsp;&nbsp; "
            
            elements.append(Paragraph(driver_text, s["body"]))
            elements.append(Spacer(1, 0.2 * inch))

            # Risk Ledger Summary
            elements.append(Paragraph("<b>Individual Strategic Risk Ledger</b>", s["subsection"]))
            elements.append(Paragraph(
                "Calculated churn probabilities mapped for the highest-risk entities in the dataset:",
                s["body"]
            ))
            elements.append(Spacer(1, 0.1 * inch))

            ledger = predictions.get("risk_ledger", [])
            ledger_rows = [["ID / Reference", "Churn Probability", "Predicted Target Class", "Segment Profile"]]
            for r in ledger[:5]: # Show top 5 highest-risk entities
                details_parts = [f"{k}: {v}" for k, v in r.get("details", {}).items()]
                details_str = " | ".join(details_parts)
                ledger_rows.append([
                    r.get("id", ""),
                    f"{r.get('risk_probability', 0.0) * 100:.1f}%",
                    r.get("predicted_label", ""),
                    details_str
                ])
            
            l_table = Table(ledger_rows, colWidths=[1.3*inch, 1.4*inch, 1.5*inch, 2.5*inch])
            
            # Custom style for risk ledger with danger color highlighting
            danger_tbl_style = TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EF4444")), # Rose Red header
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FFF1F2")]), # Rose tint rows
                ("GRID", (0, 0), (-1, -1), 0.3, BORDER),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ])
            l_table.setStyle(danger_tbl_style)
            elements.append(l_table)

        return elements

    # ------------------------------------------------------------------ #
    #  Footer
    # ------------------------------------------------------------------ #
    def _build_footer(self) -> list:
        s = self.styles
        return [
            Spacer(1, 0.5 * inch),
            HRFlowable(width="100%", thickness=1, color=BORDER),
            Paragraph(
                f"Report generated by <b>InsightForge AI (DataPilot)</b> on {self.generated_at}. "
                "Powered by AI analytics engine.",
                s["footer"]
            ),
        ]

    # ------------------------------------------------------------------ #
    #  Styles
    # ------------------------------------------------------------------ #
    def _build_styles(self) -> dict:
        base = getSampleStyleSheet()
        return {
            "brand": ParagraphStyle("brand", parent=base["Normal"],
                fontSize=14, textColor=TEXT_GRAY, alignment=TA_CENTER, spaceAfter=6),
            "cover_title": ParagraphStyle("cover_title", parent=base["Normal"],
                fontSize=32, textColor=PRIMARY, alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=10),
            "cover_subtitle": ParagraphStyle("cover_subtitle", parent=base["Normal"],
                fontSize=16, textColor=SECONDARY, alignment=TA_CENTER, spaceAfter=10),
            "cover_meta": ParagraphStyle("cover_meta", parent=base["Normal"],
                fontSize=12, textColor=TEXT_GRAY, alignment=TA_CENTER, spaceAfter=4),
            "section_header": ParagraphStyle("section_header", parent=base["Normal"],
                fontSize=16, textColor=PRIMARY, fontName="Helvetica-Bold",
                spaceBefore=12, spaceAfter=6),
            "subsection": ParagraphStyle("subsection", parent=base["Normal"],
                fontSize=13, textColor=SECONDARY, fontName="Helvetica-Bold",
                spaceBefore=8, spaceAfter=4),
            "body": ParagraphStyle("body", parent=base["Normal"],
                fontSize=10, textColor=TEXT_DARK, spaceAfter=4, leading=14),
            "narrative_body": ParagraphStyle("narrative_body", parent=base["Normal"],
                fontSize=11, textColor=TEXT_DARK, spaceAfter=8, leading=16),
            "info_box": ParagraphStyle("info_box", parent=base["Normal"],
                fontSize=10, textColor=PRIMARY, backColor=BG_LIGHT,
                borderPadding=6, spaceAfter=4),
            "insight_title": ParagraphStyle("insight_title", parent=base["Normal"],
                fontSize=11, textColor=TEXT_DARK, fontName="Helvetica-Bold", spaceAfter=2),
            "recommendation": ParagraphStyle("recommendation", parent=base["Normal"],
                fontSize=10, textColor=TEXT_DARK, spaceAfter=6, leftIndent=10),
            "footer": ParagraphStyle("footer", parent=base["Normal"],
                fontSize=8, textColor=TEXT_GRAY, alignment=TA_CENTER, spaceBefore=4),
        }

    def _table_style(self) -> TableStyle:
        return TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
            ("GRID", (0, 0), (-1, -1), 0.3, BORDER),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])
