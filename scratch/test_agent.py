import pandas as pd
import numpy as np
from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="c:/Users/Admin/Desktop/DataPilot AI/backend/.env")
api_key = os.getenv("GROQ_API_KEY")
model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# Setup dummy sleep dataset
data = {
    "Age": [22, 25, 45, 30, 35, 50, 19, 60],
    "Gender": ["Male", "Female", "Male", "Female", "Male", "Female", "Male", "Female"],
    "Sleep Duration": [7.5, 8.0, 5.5, 6.0, 7.0, 5.0, 8.5, 6.2],
    "Disruption Score": [2, 1, 8, 5, 3, 9, 0, 7],
    "Anxiety Level": [3, 2, 8, 5, 4, 9, 1, 6]
}
df = pd.DataFrame(data)

schema = "\n".join([f"- {col} ({str(dtype)})" for col, dtype in df.dtypes.items()])
sample = df.head(3).to_string()

user_message = "which age group sleeps less"

PANDAS_GEN_PROMPT = f"""You are an expert pandas code generator.
Your task is to write a short, safe Python script to query a pandas DataFrame named `df` to answer the user's analytical question.

DataFrame Schema:
{schema}

Sample data (first 3 rows):
{sample}

Rules:
1. Write code that computes the exact answer and assigns it to a variable named `result`.
2. Do not use external files or modify the DataFrame in-place.
3. Keep the code as simple and direct as possible.
4. Return ONLY the code block starting with ```python and ending with ```. Do not include any explanations, markdown text outside the code block, or preambles.
"""

client = Groq(api_key=api_key)

# Step 1: Generate Code
response = client.chat.completions.create(
    model=model,
    messages=[
        {"role": "system", "content": PANDAS_GEN_PROMPT},
        {"role": "user", "content": user_message}
    ],
    temperature=0.0,
    max_tokens=200,
)
code_reply = response.choices[0].message.content
print("--- Generated Code ---")
print(code_reply)

# Extract code
import re
code_match = re.search(r"```python\s*(.*?)\s*```", code_reply, re.DOTALL)
code = code_match.group(1) if code_match else code_reply

# Step 2: Execute Code
local_vars = {"df": df, "pd": pd, "np": np, "result": None}
try:
    exec(code, {}, local_vars)
    result = local_vars.get("result")
    print("--- Execution Result ---")
    print(result)
except Exception as e:
    print("Execution failed:", e)
    result = None

# Step 3: Draft Response
RESPONSE_DRAFT_PROMPT = f"""You are InsightForge AI, a premium conversational data analyst.
The user asked: "{user_message}"

To answer this, we executed a pandas query on the dataset and obtained the following raw result:
{result}

Draft a clear, friendly, and concise analytical response to the user.
Explain the numerical or group findings clearly (e.g. mention the exact numbers, groups, and context).
Keep your answer under 100 words. Format with markdown bold or lists where appropriate.
If the result is None or empty, explain that no matching records were found.
"""

response2 = client.chat.completions.create(
    model=model,
    messages=[
        {"role": "user", "content": RESPONSE_DRAFT_PROMPT}
    ],
    temperature=0.3,
    max_tokens=200,
)
print("--- Final Response ---")
print(response2.choices[0].message.content)
