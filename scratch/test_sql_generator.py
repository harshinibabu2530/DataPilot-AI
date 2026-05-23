"""
test_sql_generator.py
Unit tests verifying mathematical compiling fallbacks and SQL query translation mechanics.
"""

import sys
import os
import unittest
import pandas as pd
import numpy as np

# Adjust sys.path to find backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from modules.sql_generator import SQLGenerator
from config import Config


class TestSQLGeneratorOffline(unittest.TestCase):
    """
    Tests the offline heuristic compiler matching natural language to standard SQL patterns in isolation.
    """

    def setUp(self):
        # Force offline mode for heuristic testing
        self.original_has_llm = Config.has_llm
        Config.has_llm = lambda: False
        
        # Create a mock DataFrame matching a standard retail/sales domain
        data = {
            "customer_name": ["Alice", "Bob", "Charlie", "David", "Eve", "Frank"],
            "revenue": [120.5, 450.0, 95.0, 300.0, 600.0, 150.0],
            "category": ["Electronics", "Furniture", "Electronics", "Furniture", "Electronics", "Office"],
            "purchase_date": ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05", "2026-01-06"]
        }
        self.df = pd.DataFrame(data)
        self.generator = SQLGenerator(self.df, domain="retail")

    def tearDown(self):
        # Restore original LLM setting
        Config.has_llm = self.original_has_llm

    def test_top_5_customers_fallback(self):
        """
        Verify the static match exact template requested by the user: "Show top 5 customers"
        """
        res = self.generator.generate_sql("Show top 5 customers")
        print("\n[TEST FALLBACK] top 5 customers query generated:\n", res["sql"])
        
        # Verify schema keys map to correct variables
        self.assertIn("SELECT customer_name, revenue", res["sql"])
        self.assertIn("FROM sales", res["sql"])
        self.assertIn("ORDER BY revenue DESC", res["sql"])
        self.assertIn("LIMIT 5;", res["sql"])
        self.assertIn("explanation", res)
        self.assertTrue(len(res["explanation"]) > 0)

    def test_top_n_records(self):
        """
        Verify regex matches 'top N' pattern for generic metric fields.
        """
        res = self.generator.generate_sql("Give me the top 3 items")
        print("\n[TEST FALLBACK] top N records query generated:\n", res["sql"])
        
        self.assertIn("SELECT customer_name, revenue", res["sql"])
        self.assertIn("FROM sales", res["sql"])
        self.assertIn("ORDER BY revenue DESC", res["sql"])
        self.assertIn("LIMIT 3;", res["sql"])

    def test_average_grouped_by_category(self):
        """
        Verify grouped aggregations: "average revenue by category"
        """
        res = self.generator.generate_sql("Calculate average revenue by category")
        print("\n[TEST FALLBACK] group average query generated:\n", res["sql"])
        
        self.assertIn("SELECT category, AVG(revenue)", res["sql"])
        self.assertIn("GROUP BY category", res["sql"])
        self.assertIn("ORDER BY average_revenue DESC", res["sql"])

    def test_total_aggregation(self):
        """
        Verify total sums: "total revenue"
        """
        res = self.generator.generate_sql("What is the total revenue?")
        print("\n[TEST FALLBACK] total aggregation query generated:\n", res["sql"])
        
        self.assertIn("SELECT SUM(revenue) AS total_revenue", res["sql"])

    def test_simple_average(self):
        """
        Verify simple column average: "average revenue"
        """
        res = self.generator.generate_sql("Show average revenue")
        print("\n[TEST FALLBACK] simple average query generated:\n", res["sql"])
        
        self.assertIn("SELECT AVG(revenue) AS average_revenue", res["sql"])

    def test_record_count(self):
        """
        Verify counting rows: "how many records are there?"
        """
        res = self.generator.generate_sql("how many records are there?")
        print("\n[TEST FALLBACK] record count query generated:\n", res["sql"])
        
        self.assertIn("SELECT COUNT(*) AS total_records", res["sql"])

    def test_empty_dataframe_fallback(self):
        """
        Verify empty dataset gracefully returns a SELECT * LIMIT 0 query.
        """
        empty_df = pd.DataFrame()
        gen = SQLGenerator(empty_df, domain="generic")
        res = gen.generate_sql("Show everything")
        
        self.assertEqual(res["sql"], "SELECT * FROM data LIMIT 0;")
        self.assertIn("dataset is empty", res["explanation"])


class TestSQLGeneratorOnline(unittest.TestCase):
    """
    Tests live LLM compilation query synthesis.
    """

    def setUp(self):
        # Create a mock DataFrame matching a standard retail/sales domain
        data = {
            "customer_name": ["Alice", "Bob", "Charlie", "David", "Eve", "Frank"],
            "revenue": [120.5, 450.0, 95.0, 300.0, 600.0, 150.0],
            "category": ["Electronics", "Furniture", "Electronics", "Furniture", "Electronics", "Office"],
            "purchase_date": ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05", "2026-01-06"]
        }
        self.df = pd.DataFrame(data)
        self.generator = SQLGenerator(self.df, domain="retail")

    def test_live_llm_synthesis(self):
        """
        Runs a live API generation call to ensure end-to-end integration and JSON parsing stability.
        """
        if not Config.has_llm():
            self.skipTest("No active LLM provider configuration found. Skipping live LLM integration tests.")

        print(f"\n[TEST LIVE] Requesting live SQL synthesis from provider: {Config.LLM_PROVIDER.upper()}")
        res = self.generator.generate_sql("Show top 5 customers")
        print("\n[TEST LIVE] Live SQL query generated:\n", res["sql"])
        print("\n[TEST LIVE] Live Explanation:\n", res["explanation"])

        # Structured validations
        self.assertIn("sql", res)
        self.assertIn("explanation", res)
        self.assertTrue(len(res["sql"]) > 0)
        self.assertTrue(len(res["explanation"]) > 0)
        self.assertIn("sales", res["sql"].lower())


if __name__ == "__main__":
    unittest.main()
