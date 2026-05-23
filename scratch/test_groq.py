import os
from dotenv import load_dotenv
from groq import Groq

# Load environment variables
load_dotenv(dotenv_path="c:/Users/Admin/Desktop/DataPilot AI/backend/.env")

api_key = os.getenv("GROQ_API_KEY")
model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

print(f"API Key: {api_key[:15]}...")
print(f"Model: {model}")

try:
    client = Groq(api_key=api_key)
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": "Hello! Answer in one word."}],
        temperature=0.3,
        max_tokens=10,
    )
    print("Success! Reply:", response.choices[0].message.content)
except Exception as e:
    print("Error calling Groq API:", e)
