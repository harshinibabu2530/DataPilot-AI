import sys
sys.path.append("backend")

from config import Config
import modules.supabase_client as supa

def inspect_tables():
    print("--- Inspecting columns of other tables ---")
    if not supa.supabase_client:
        print("Supabase client not initialized")
        return
    for table in ["analytics_sessions", "chat_history"]:
        try:
            res = supa.supabase_client.table(table).select("*").limit(1).execute()
            print(f"\nTable: {table}")
            if res.data:
                print("Columns:", list(res.data[0].keys()))
            else:
                # Fetch schema
                import requests
                url = f"{Config.SUPABASE_URL}/rest/v1/"
                headers = {"apikey": Config.SUPABASE_SERVICE_ROLE_KEY}
                openapi = requests.get(url, headers=headers).json()
                definitions = openapi.get("definitions", {})
                if table in definitions:
                    print("Properties:", list(definitions[table]["properties"].keys()))
                else:
                    print("Definition not found")
        except Exception as e:
            print(f"Error inspecting {table}: {e}")

if __name__ == "__main__":
    inspect_tables()
