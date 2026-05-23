import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
from config import Config
import modules.supabase_client as supa

def inspect():
    sid = "554a9213-7568-44c2-bd15-e9467bebc857"
    try:
        if supa.supabase_client:
            res_eda = supa.supabase_client.table("eda_reports").select("*").eq("dataset_id", sid).execute()
            print("EDA report:", res_eda.data[0] if res_eda.data else None)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    inspect()
