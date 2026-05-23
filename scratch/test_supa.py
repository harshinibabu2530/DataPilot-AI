import sys
sys.path.append("backend")

from config import Config
import modules.supabase_client as supa

def test_storage():
    print("--- Testing Supabase Client Initialization ---")
    print("Supabase client exists:", supa.supabase_client is not None)
    
    print("\n--- Testing Storage Upload ---")
    dummy_bytes = b"dummy content"
    path = "test/dummy.txt"
    try:
        url = supa.upload_file_to_storage(dummy_bytes, path, "text/plain")
        print("Upload Result URL:", url)
    except Exception as e:
        print("Upload threw exception:", e)

def test_save_metadata():
    print("\n--- Testing Save Metadata ---")
    meta = {
        "filename": "dummy.txt",
        "file_type": "txt",
        "domain": "generic",
        "row_count": 10,
        "column_count": 2,
        "storage_path": "some_path"
    }
    try:
        res = supa.save_dataset_metadata(meta)
        print("Save Result:", res)
    except Exception as e:
        print("Save threw exception:", e)

if __name__ == "__main__":
    test_storage()
    test_save_metadata()
