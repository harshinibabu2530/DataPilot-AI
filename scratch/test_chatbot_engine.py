import sys
import os
import pandas as pd
import numpy as np

# Adjust python path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from backend.modules.chatbot import ChatbotEngine
from backend.config import Config

# Setup dummy sleep dataset
data = {
    "Age": [22, 25, 45, 30, 35, 50, 19, 60],
    "Gender": ["Male", "Female", "Male", "Female", "Male", "Female", "Male", "Female"],
    "Sleep Duration": [7.5, 8.0, 5.5, 6.0, 7.0, 5.0, 8.5, 6.2],
    "Disruption Score": [2, 1, 8, 5, 3, 9, 0, 7],
    "Anxiety Level": [3, 2, 8, 5, 4, 9, 1, 6]
}
df = pd.DataFrame(data)

# Create ChatbotEngine
print("Initializing ChatbotEngine with sleep dataset...")
engine = ChatbotEngine(df)

# Test 1: Aggregate question
print("\n--- Test 1: Analytical Query ---")
q1 = "which age group sleeps less?"
print(f"User: {q1}")
try:
    res1 = engine.chat(q1)
    print(f"Bot: {res1['reply']}")
except Exception as e:
    print(f"Error in Test 1: {e}")

# Test 2: Another analytical question
print("\n--- Test 2: Gender Anxiety Query ---")
q2 = "who has higher average anxiety, males or females?"
print(f"User: {q2}")
try:
    res2 = engine.chat(q2)
    print(f"Bot: {res2['reply']}")
except Exception as e:
    print(f"Error in Test 2: {e}")

# Test 3: Non-analytical fallback query
print("\n--- Test 3: Greeting fallback ---")
q3 = "hello! who are you?"
print(f"User: {q3}")
try:
    res3 = engine.chat(q3)
    print(f"Bot: {res3['reply']}")
except Exception as e:
    print(f"Error in Test 3: {e}")
