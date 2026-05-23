import sys
sys.path.append("backend")

import modules.supabase_client as supa

def verify():
    dataset_id = "b008511b-36af-4c53-acb7-af989bb390fb"
    print(f"--- Verifying row {dataset_id} ---")
    if not supa.supabase_client:
        print("Not connected to Supabase")
        return
    try:
        row = supa.get_dataset_metadata(dataset_id)
        print("Dataset Metadata:", row)
    except Exception as e:
        print("Error fetching row:", e)

if __name__ == "__main__":
    verify()
