import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
from config import Config
import modules.supabase_client as supa

def check():
    sid = "554a9213-7568-44c2-bd15-e9467bebc857"
    filename = "sleep_disruption.csv"
    path = f"{sid}/{filename}"
    print(f"Checking bucket for key: {path}")
    try:
        raw_bytes = supa.download_file_from_storage(path)
        if raw_bytes:
            print("FOUND! Raw bytes length:", len(raw_bytes))
        else:
            print("NOT FOUND! download returned None")
    except Exception as e:
        print("Error checking storage:", e)

if __name__ == "__main__":
    check()
