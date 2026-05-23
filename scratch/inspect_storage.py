import sys
sys.path.append("backend")

from config import Config
import modules.supabase_client as supa

def inspect_storage():
    if not supa.supabase_client:
        print("Supabase client not initialized")
        return
    try:
        buckets = supa.supabase_client.storage.list_buckets()
        print("Existing buckets:", buckets)
    except Exception as e:
        print("Error listing buckets:", e)
        
    try:
        print("Creating 'datasets' bucket...")
        res = supa.supabase_client.storage.create_bucket("datasets", {"public": True})
        print("Create bucket result:", res)
    except Exception as e:
        print("Error creating 'datasets' bucket:", e)

if __name__ == "__main__":
    inspect_storage()
