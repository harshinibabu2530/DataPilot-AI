import sys
sys.path.append("backend")

import modules.supabase_client as supa

def test():
    dataset_id = "554a9213-7568-44c2-bd15-e9467bebc857"
    if not supa.supabase_client:
        print("Not initialized")
        return
    try:
        res = supa.get_dataset_metadata(dataset_id)
        print("Result:", res)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    test()
