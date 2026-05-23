import sys
sys.path.append("backend")

import modules.supabase_client as supa

def test():
    if not supa.supabase_client:
        print("Not initialized")
        return
    try:
        print("Trying to create bucket with both id and name as strings...")
        # Since options expects a specific object type in python storage-py (or dict in older versions), let's check what type it is.
        # Often it can take a dict or CreateOrUpdateBucketOptions. Let's try passing dict or without options first, then with it.
        res = supa.supabase_client.storage.create_bucket("datasets", name="datasets", options={"public": True})
        print("Success!", res)
    except Exception as e:
        print("Failed:", e)

if __name__ == "__main__":
    test()
