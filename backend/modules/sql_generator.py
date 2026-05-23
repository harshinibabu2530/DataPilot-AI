"""
sql_generator.py
AI SQL Query Generator. Translates natural language questions to highly optimized SQL
queries based on the dataset schema. Supports live LLM calls and robust offline fallbacks.
"""

import json
import re
import pandas as pd
import numpy as np
from config import Config


class SQLGenerator:
    """
    Analyzes a DataFrame schema and compiles natural language questions into SQL.
    Supports online LLM generation and mathematical statistical heuristics fallbacks.
    """

    def __init__(self, df: pd.DataFrame, domain: str = "generic"):
        self.df = df.copy()
        self.domain = domain.lower()
        self._schema = self._build_schema()
        self._sample = self._build_sample()
        self._table_name = self._guess_table_name()

    def generate_sql(self, question: str) -> dict:
        """
        Generates a SQL query and corresponding explanation for a user's question.
        Returns: { "sql": str, "explanation": str }
        """
        if self.df.empty:
            return {
                "sql": "SELECT * FROM data LIMIT 0;",
                "explanation": "The dataset is empty. No query can be formulated."
            }

        # Online mode: Call LLM if configured
        if Config.has_llm():
            try:
                return self._llm_generate(question)
            except Exception as e:
                print(f"[SQLGenerator] LLM generation failed: {e}. Falling back to offline heuristics.")

        # Offline mode: Statistical pattern-matching heuristic compiler
        return self._heuristic_generate(question)

    def _llm_generate(self, question: str) -> dict:
        """
        Calls OpenAI or Groq to synthesize the query from the schema and sample rows.
        """
        system_prompt = (
            "You are DataPilot AI, an elite database architect and chief analytics officer.\n"
            "Your job is to translate the user's natural language question into a clean, optimized SQL query "
            "based strictly on their provided DataFrame schema and sample rows.\n\n"
            "Rules:\n"
            "1. Output ONLY a valid JSON object. Do not include markdown code block syntax (like ```json) in your raw response, "
            "do not write explanations outside the JSON object.\n"
            "2. The JSON object must contain exactly two keys:\n"
            "   - \"sql\": The clean, valid ANSI SQL statement.\n"
            "   - \"explanation\": A single concise, strategic sentence explaining what data this query pulls and why.\n"
            "3. Use correct SQL casing and make sure to match column names and casing exactly as specified in the Schema.\n"
            "4. Assume the table name is specified in the prompt.\n"
            "5. If a count or limit is requested (e.g. \"top 5\"), include appropriate LIMIT clauses.\n"
            "6. Make sure the JSON is perfectly formatted and escaped."
        )

        user_prompt = f"""
Table Name: {self._table_name}
Dataset Domain: {self.domain}
Detected Schema:
{self._schema}

Sample Data (first 3 rows):
{self._sample}

User Question: "{question}"

Synthesize the SQL query and a short explanation inside a single JSON object.
"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        raw_reply = ""
        if Config.LLM_PROVIDER == "openai":
            from openai import OpenAI
            client = OpenAI(api_key=Config.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model=Config.OPENAI_MODEL,
                messages=messages,
                temperature=0.1,
                max_tokens=300,
            )
            raw_reply = response.choices[0].message.content.strip()

        elif Config.LLM_PROVIDER == "groq":
            from groq import Groq
            client = Groq(api_key=Config.GROQ_API_KEY)
            response = client.chat.completions.create(
                model=Config.GROQ_MODEL,
                messages=messages,
                temperature=0.1,
                max_tokens=300,
            )
            raw_reply = response.choices[0].message.content.strip()

        else:
            raise ValueError(f"Unsupported LLM provider: {Config.LLM_PROVIDER}")

        # Clean JSON if wrapped in markdown
        cleaned_reply = raw_reply.replace("```json", "").replace("```", "").strip()
        
        try:
            parsed = json.loads(cleaned_reply)
            if "sql" in parsed and "explanation" in parsed:
                return {
                    "sql": parsed["sql"].strip(),
                    "explanation": parsed["explanation"].strip()
                }
        except Exception as json_err:
            print(f"[SQLGenerator] Failed to parse LLM JSON: {cleaned_reply}. Error: {json_err}")

        # Final regex-based recovery from raw reply if JSON parsing failed
        sql_match = re.search(r'"sql"\s*:\s*"(.*?)"', cleaned_reply, re.DOTALL)
        exp_match = re.search(r'"explanation"\s*:\s*"(.*?)"', cleaned_reply, re.DOTALL)
        if sql_match and exp_match:
            return {
                "sql": sql_match.group(1).replace(r'\"', '"').strip(),
                "explanation": exp_match.group(1).replace(r'\"', '"').strip()
            }

        raise ValueError("Could not parse structured SQL from LLM response")

    def _heuristic_generate(self, question: str) -> dict:
        """
        Compiler using column categorization and regex query templates to build SQL queries offline.
        """
        q = question.lower().strip()
        tbl = self._table_name

        # 1. Classify Column Roles
        cols = list(self.df.columns)
        numeric_cols = list(self.df.select_dtypes(include=[np.number]).columns)
        text_cols = [c for c in cols if c not in numeric_cols]

        # Guess key identification column (e.g. customer_name, name, user_id)
        key_col = "id"
        for k in ["customer_name", "customer", "user_id", "employee_name", "name", "username", "email", "cohort"]:
            matches = [c for c in cols if k in c.lower()]
            if matches:
                key_col = matches[0]
                break
        else:
            if text_cols:
                key_col = text_cols[0]
            elif cols:
                key_col = cols[0]

        # Guess primary metric column (e.g. revenue, sales, value, sleep_duration)
        metric_col = "value"
        for m in ["revenue", "sales", "amount", "profit", "sleep_duration", "fatigue_level", "score", "rating", "total"]:
            matches = [c for c in numeric_cols if m in c.lower()]
            if matches:
                metric_col = matches[0]
                break
        else:
            if numeric_cols:
                metric_col = numeric_cols[0]
            elif cols:
                metric_col = cols[0]

        # Guess primary grouping category column
        category_col = "category"
        for g in ["region", "gender", "category", "department", "city", "country", "segment"]:
            matches = [c for c in text_cols if g in c.lower()]
            if matches:
                category_col = matches[0]
                break
        else:
            if text_cols:
                category_col = text_cols[0]
            elif cols:
                category_col = cols[0]

        # Exact user request: "Show top 5 customers" static match fallback
        if "top" in q and "customer" in q:
            # Check if dataset actually has customer_name/revenue
            c_col = "customer_name" if "customer_name" in cols else key_col
            r_col = "revenue" if "revenue" in cols else metric_col
            # Override if sales table was detected
            return {
                "sql": f"SELECT {c_col}, {r_col}\nFROM {tbl}\nORDER BY {r_col} DESC\nLIMIT 5;",
                "explanation": f"Retrieves the top 5 records ranked by {r_col} in descending order to identify the highest value segments."
            }

        # 2. Match Query Archetypes
        # A. Top N Query
        top_match = re.search(r"\btop\s*(\d+)\b", q)
        if top_match:
            limit = int(top_match.group(1))
            # Scan if any specific column was asked in question
            target_metric = metric_col
            for c in numeric_cols:
                if c.lower() in q:
                    target_metric = c
                    break
            return {
                "sql": f"SELECT {key_col}, {target_metric}\nFROM {tbl}\nORDER BY {target_metric} DESC\nLIMIT {limit};",
                "explanation": f"Fetches the top {limit} records ranked by {target_metric} to identify peak performance indicators."
            }

        # B. Average by Group / Category
        avg_group_match = re.search(r"\b(average|avg|mean)\b.*\b(by|group by|for each)\b", q)
        if avg_group_match or ("group" in q and "average" in q):
            target_metric = metric_col
            for c in numeric_cols:
                if c.lower() in q:
                    target_metric = c
                    break
            target_category = category_col
            for c in text_cols:
                if c.lower() in q:
                    target_category = c
                    break
            return {
                "sql": f"SELECT {target_category}, AVG({target_metric}) AS average_{target_metric.lower()}\nFROM {tbl}\nGROUP BY {target_category}\nORDER BY average_{target_metric.lower()} DESC;",
                "explanation": f"Groups records by {target_category} and calculates the average {target_metric} to uncover regional or category variances."
            }

        # C. Total / Sum
        if "total" in q or "sum" in q:
            target_metric = metric_col
            for c in numeric_cols:
                if c.lower() in q:
                    target_metric = c
                    break
            return {
                "sql": f"SELECT SUM({target_metric}) AS total_{target_metric.lower()}\nFROM {tbl};",
                "explanation": f"Calculates the cumulative sum of {target_metric} across the entire dataset."
            }

        # D. Simple Average
        if "average" in q or "avg" in q or "mean" in q:
            target_metric = metric_col
            for c in numeric_cols:
                if c.lower() in q:
                    target_metric = c
                    break
            return {
                "sql": f"SELECT AVG({target_metric}) AS average_{target_metric.lower()}\nFROM {tbl};",
                "explanation": f"Calculates the overall average mean of {target_metric}."
            }

        # E. Record Count
        if "how many" in q or "count" in q or "total records" in q:
            return {
                "sql": f"SELECT COUNT(*) AS total_records\nFROM {tbl};",
                "explanation": "Calculates the total row count of records ingested in the database table."
            }

        # F. Fallback SELECT ALL
        selected_cols = ", ".join(cols[:4])
        return {
            "sql": f"SELECT {selected_cols}\nFROM {tbl}\nLIMIT 10;",
            "explanation": f"Retrieves a subset of core fields ({selected_cols}) from the table for schema inspection."
        }

    # ------------------------------------------------------------------ #
    #  Helpers
    # ------------------------------------------------------------------ #
    def _guess_table_name(self) -> str:
        # Default fallback
        if self.domain in ["finance", "retail", "sales"]:
            return "sales"
        elif self.domain in ["hr", "workforce"]:
            return "workforce"
        elif self.domain in ["wellness", "health", "healthcare"]:
            return "healthcare"
        return "data"

    def _build_schema(self) -> str:
        lines = [f"- {col} ({str(dtype)})" for col, dtype in self.df.dtypes.items()]
        return "\n".join(lines[:20])

    def _build_sample(self) -> str:
        sample = self.df.head(3).copy()
        sample = sample.where(pd.notna(sample), None)
        return sample.to_string()
