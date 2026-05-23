"""
chatbot.py
Conversational analytics chatbot using OpenAI / Groq.
Allows users to query the dataset in natural language.
Falls back to a pandas-based Q&A engine if no LLM is configured.
"""

import json
import re
import pandas as pd
import numpy as np
from config import Config


SYSTEM_PROMPT_TEMPLATE = """You are a highly capable and friendly AI assistant called InsightForge AI.
You have access to a dataset with the following schema:
{schema}

Sample data (first 3 rows):
{sample}

Instructions:
1. If the user's question is about the dataset, answer it clearly and concisely. If the question requires computation, describe the result numerically. If asked for a chart or visualization, describe what the chart would show. Keep answers under 150 words unless asked for detail. Do not generate code unless explicitly asked.
2. If the user's question is a greeting, general conversation, or entirely unrelated to the dataset (e.g. general knowledge, reasoning, advice, coding, writing, mathematics, jokes, etc.), answer it directly, comprehensively, and helpfully as a standard general AI assistant. Do not say that you can only answer questions about the dataset; answer any questions the user asks."""

PANDAS_GEN_PROMPT_TEMPLATE = """You are an expert pandas code generator.
Your task is to write a short, safe Python script to query a pandas DataFrame named `df` to answer the user's analytical question.

DataFrame Schema:
{schema}

Sample data (first 3 rows):
{sample}

Rules:
1. Write code that computes the exact answer and assigns it to a variable named `result`.
2. Do not use external files, write files, or modify the DataFrame in-place.
3. Keep the code as simple, direct, and robust as possible.
4. Avoid using columns that do not exist. Always inspect the Schema and Sample rows to match correct casing and exact column names.
5. If the user's question is a greeting, general conversation (like "hello", "who are you"), or a general knowledge/logic/coding question that does not require querying the dataset at all, write a simple script: `result = "SKIP_PANDAS"`.
6. Return ONLY the code block starting with ```python and ending with ```. Do not include any explanations, markdown text outside the code block, or preambles.
7. The script should assign the final answer to the local variable `result`. For example, if asked 'which age group sleeps less', you might do: `result = df.groupby('Age')['Sleep Duration'].mean().idxmin()`
"""

RESPONSE_DRAFT_PROMPT_TEMPLATE = """You are InsightForge AI, a premium conversational data analyst.
The user asked: "{user_message}"

To answer this, we executed a pandas query on the dataset and obtained the following raw result:
{result}

The code generated and executed was:
{code}

Draft a clear, friendly, and concise analytical response to the user.
Explain the numerical or group findings clearly (e.g. mention the exact numbers, groups, and context).
Keep your answer under 120 words. Format with markdown bold or lists where appropriate to make it visually premium.
If the result is None, empty, or an error occurred, explain that clearly and tell the user how they can rephrase their query.
"""


class ChatbotEngine:

    def __init__(self, df: pd.DataFrame, domain: str = "generic"):
        self.df = df.copy()
        self.domain = domain
        self._schema = self._build_schema()
        self._sample = self._build_sample()

    # ------------------------------------------------------------------ #
    #  Public API
    # ------------------------------------------------------------------ #
    def chat(self, user_message: str, history: list[dict] = None) -> dict:
        """
        Process a user message and return a response.
        history: list of {"role": "user"|"assistant", "content": str}
        Returns: {"reply": str, "data": dict|None}
        """
        history = history or []

        # First try pandas-based direct queries (always available)
        direct = self._try_direct_query(user_message)
        if direct:
            return {"reply": direct["reply"], "data": direct.get("data")}

        # Then use LLM if configured
        if Config.has_llm():
            try:
                reply = self._llm_chat(user_message, history)
                return {"reply": reply, "data": None}
            except Exception as e:
                print(f"[Chatbot] LLM error: {e}")

        return {
            "reply": self._fallback_response(user_message),
            "data": None,
        }

    # ------------------------------------------------------------------ #
    #  Direct Pandas Query Engine
    # ------------------------------------------------------------------ #
    def _try_direct_query(self, message: str) -> dict | None:
        msg = message.lower()

        # Shape
        if re.search(r"\b(how many|count|rows|records|size)\b", msg):
            return {"reply": f"The dataset has **{len(self.df):,} rows** and **{len(self.df.columns)} columns**."}

        # Columns list
        if re.search(r"\b(columns?|features?|fields?)\b", msg):
            cols = ", ".join(self.df.columns[:20])
            extra = f" (and {len(self.df.columns) - 20} more)" if len(self.df.columns) > 20 else ""
            return {"reply": f"The dataset has {len(self.df.columns)} columns: **{cols}**{extra}."}

        # Max / minimum
        for col in self.df.select_dtypes(include=[np.number]).columns:
            col_key = col.lower().replace("_", " ")
            pattern = rf"\b({re.escape(col_key)}|{re.escape(col.lower())})\b"
            if re.search(pattern, msg):
                if re.search(r"\b(max|maximum|highest|largest|top)\b", msg):
                    val = self.df[col].max()
                    return {"reply": f"The maximum value of **{col}** is **{val:,.4f}**."}
                if re.search(r"\b(min|minimum|lowest|smallest|bottom)\b", msg):
                    val = self.df[col].min()
                    return {"reply": f"The minimum value of **{col}** is **{val:,.4f}**."}
                if re.search(r"\b(average|mean|avg)\b", msg):
                    val = self.df[col].mean()
                    return {"reply": f"The average value of **{col}** is **{val:,.4f}**."}
                if re.search(r"\b(sum|total)\b", msg):
                    val = self.df[col].sum()
                    return {"reply": f"The total sum of **{col}** is **{val:,.4f}**."}

        # Missing values
        if re.search(r"\b(missing|null|nan|empty)\b", msg):
            missing = self.df.isnull().sum()
            cols_with_missing = missing[missing > 0]
            if len(cols_with_missing) == 0:
                return {"reply": "Great news! There are **no missing values** in this dataset."}
            details = ", ".join([f"{c}: {v}" for c, v in cols_with_missing.items()])
            return {"reply": f"Found missing values in {len(cols_with_missing)} columns: {details}."}

        # Top N
        top_match = re.search(r"top\s*(\d+)\s+(.+)", msg)
        if top_match:
            n = int(top_match.group(1))
            col_hint = top_match.group(2).strip()
            for col in self.df.select_dtypes(include=[np.number]).columns:
                if col.lower() in col_hint or col_hint in col.lower():
                    top = self.df.nlargest(n, col)[col]
                    vals = ", ".join([f"{v:,.2f}" for v in top])
                    return {"reply": f"Top {n} values of **{col}**: {vals}."}

        # Distribution
        if re.search(r"\b(distribution|spread|variance|std)\b", msg):
            numeric = self.df.select_dtypes(include=[np.number])
            if not numeric.empty:
                col = numeric.columns[0]
                std = numeric[col].std()
                return {"reply": f"**{col}** has a standard deviation of **{std:,.4f}**, "
                                 f"mean of **{numeric[col].mean():,.4f}**, "
                                 f"ranging from **{numeric[col].min():,.4f}** to **{numeric[col].max():,.4f}**."}

        # Correlation
        if re.search(r"\b(correlat|relationship)\b", msg):
            numeric = self.df.select_dtypes(include=[np.number])
            if numeric.shape[1] >= 2:
                corr = numeric.corr().abs()
                upper = corr.where(np.triu(np.ones(corr.shape), k=1).astype(bool))
                pair = upper.stack().idxmax()
                val = upper.loc[pair]
                return {"reply": f"Strongest correlation: **{pair[0]}** ↔ **{pair[1]}** "
                                 f"(r = {val:.3f}). {'This is a strong correlation.' if val > 0.7 else 'Moderate correlation.'}"}

        return None

    # ------------------------------------------------------------------ #
    #  LLM Chat
    # ------------------------------------------------------------------ #
    def _call_llm(self, messages: list[dict], max_tokens: int = 400, temperature: float = 0.3) -> str:
        if Config.LLM_PROVIDER == "openai":
            from openai import OpenAI
            client = OpenAI(api_key=Config.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model=Config.OPENAI_MODEL,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content

        elif Config.LLM_PROVIDER == "groq":
            from groq import Groq
            client = Groq(api_key=Config.GROQ_API_KEY)
            response = client.chat.completions.create(
                model=Config.GROQ_MODEL,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content

        raise ValueError("No LLM provider configured")

    def _llm_chat(self, user_message: str, history: list[dict]) -> str:
        # Step 1: Generate Pandas Code
        pandas_gen_system = PANDAS_GEN_PROMPT_TEMPLATE.format(
            schema=self._schema,
            sample=self._sample,
        )
        
        # Include conversation history context for code generation (last 4 turns)
        code_messages = [{"role": "system", "content": pandas_gen_system}]
        for turn in history[-4:]:
            code_messages.append({"role": turn["role"], "content": turn["content"]})
        code_messages.append({"role": "user", "content": user_message})

        try:
            code_reply = self._call_llm(code_messages, max_tokens=250, temperature=0.0)
            
            # Extract code block
            code_match = re.search(r"```python\s*(.*?)\s*```", code_reply, re.DOTALL)
            code = code_match.group(1) if code_match else code_reply.strip()
            # Clean up any residual markdown characters
            code = code.replace("```", "").strip()

            # If the LLM chose to skip pandas execution
            if "SKIP_PANDAS" in code or "SKIP_PANDAS" in code_reply:
                print("[Chatbot Agent] Skipping pandas execution, falling back to standard LLM chat.")
                return self._llm_chat_fallback(user_message, history)

            print(f"[Chatbot Agent] Executing generated pandas code:\n{code}")
            
            # Step 2: Safe sandbox execution
            local_vars = {"df": self.df.copy(), "pd": pd, "np": np, "result": None}
            exec(code, {}, local_vars)
            result = local_vars.get("result")
            print(f"[Chatbot Agent] Execution result: {result}")

            # Step 3: Draft friendly response using the executed result
            response_draft_prompt = RESPONSE_DRAFT_PROMPT_TEMPLATE.format(
                user_message=user_message,
                result=str(result),
                code=code,
            )
            
            draft_messages = [{"role": "system", "content": response_draft_prompt}]
            for turn in history[-4:]:
                draft_messages.append({"role": turn["role"], "content": turn["content"]})
            draft_messages.append({"role": "user", "content": user_message})

            reply = self._call_llm(draft_messages, max_tokens=400, temperature=0.3)
            return reply

        except Exception as e:
            print(f"[Chatbot Agent] Pandas Q&A Agent failed: {e}. Falling back to standard LLM chat.")
            return self._llm_chat_fallback(user_message, history)

    def _llm_chat_fallback(self, user_message: str, history: list[dict]) -> str:
        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
            schema=self._schema,
            sample=self._sample,
        )

        messages = [{"role": "system", "content": system_prompt}]
        for turn in history[-6:]:
            messages.append({"role": turn["role"], "content": turn["content"]})
        messages.append({"role": "user", "content": user_message})

        return self._call_llm(messages, max_tokens=400, temperature=0.3)

    # ------------------------------------------------------------------ #
    #  Fallback
    # ------------------------------------------------------------------ #
    def _fallback_response(self, message: str) -> str:
        return (
            f"I can answer questions about your dataset! Try asking: "
            f"'How many rows?', 'What are the columns?', 'What is the average [column]?', "
            f"'Show me missing values', or 'What is the top correlation?'. "
            f"(Add an OpenAI or Groq API key for full conversational analytics.)"
        )

    # ------------------------------------------------------------------ #
    #  Helpers
    # ------------------------------------------------------------------ #
    def _build_schema(self) -> str:
        lines = [f"- {col} ({str(dtype)})" for col, dtype in self.df.dtypes.items()]
        return "\n".join(lines[:30])

    def _build_sample(self) -> str:
        sample = self.df.head(3).copy()
        sample = sample.where(pd.notna(sample), None)
        return sample.to_string()
