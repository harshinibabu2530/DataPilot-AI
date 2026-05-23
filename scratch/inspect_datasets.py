import sys
sys.path.append("backend")

from config import Config
import modules.supabase_client as supa

def inspect_datasets():
    print("--- Inspecting 'datasets' columns ---")
    if not supa.supabase_client:
        print("Supabase client not initialized")
        return
    try:
        res = supa.supabase_client.table("datasets").select("*").limit(1).execute()
        print("Dataset row data:", res.data)
        if res.data:
            print("Columns:", list(res.data[0].keys()))
        else:
            print("No rows in 'datasets' table. Trying to fetch schema information...")
            # Fetch OpenAPI schema from PostgREST
            import requests
            url = f"{Config.SUPABASE_URL}/rest/v1/"
            headers = {"apikey": Config.SUPABASE_SERVICE_ROLE_KEY}
            openapi = requests.get(url, headers=headers).json()
            definitions = openapi.get("definitions", {})
            if "datasets" in definitions:
                print("Datasets properties in schema:", list(definitions["datasets"]["properties"].keys()))
            else:
                print("Datasets definition not found in schema")
    except Exception as e:
        print("Error during inspection:", e)

if __name__ == "__main__":
    inspect_datasets()
