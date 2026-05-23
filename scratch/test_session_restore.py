import sys
sys.path.append("backend")

import app
import modules.supabase_client as supa

def test_restore():
    dataset_id = "b008511b-36af-4c53-acb7-af989bb390fb"
    print(f"\n--- Simulating Python Backend Restart for {dataset_id} ---")
    
    # Clear memory SESSIONS to simulate a restart/server spin-up
    app.SESSIONS.clear()
    print("In-memory sessions cleared:", len(app.SESSIONS) == 0)
    
    # Try to load session (triggers auto-restoration)
    session, err = app._require_session(dataset_id)
    if err:
        print("Restoration failed with error:", err)
    else:
        print("Restoration succeeded!")
        print("DataFrame restored shape:", session["df"].shape)
        print("Restored Columns:", list(session["df"].columns))
        print("Restored Filename:", session["filename"])

if __name__ == "__main__":
    test_restore()
