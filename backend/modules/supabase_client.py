"""
supabase_client.py
Initializes and exposes the Supabase client for DB and Storage operations.
Falls back gracefully if Supabase is not configured.
"""

from config import Config

supabase_client = None
supabase_storage = None

def init_supabase():
    global supabase_client
    if not Config.has_supabase():
        print("[Supabase] Not configured — running in local-only mode.")
        return None
    try:
        from supabase import create_client, Client
        supabase_client = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_ROLE_KEY)
        print(f"[Supabase] Connected to {Config.SUPABASE_URL}")
        # Programmatically ensure "datasets" storage bucket exists
        try:
            supabase_client.storage.create_bucket("datasets", name="datasets", options={"public": True})
            print("[Supabase] Storage bucket 'datasets' ensured successfully.")
        except Exception:
            pass # Already exists or couldn't create (non-fatal)
        return supabase_client
    except Exception as e:
        print(f"[Supabase] Connection failed: {e}")
        return None


def update_dataset_upload_path(dataset_id: str, upload_path: str) -> bool:
    """Update the upload_path for an existing dataset record in Supabase."""
    if not supabase_client:
        return False
    try:
        result = supabase_client.table("datasets").update({"upload_path": upload_path}).eq("id", dataset_id).execute()
        return bool(result.data)
    except Exception as e:
        print(f"[Supabase] update_dataset_upload_path error: {e}")
        return False


def save_analytics_session(session: dict) -> dict | None:
    """Save EDA / cleaning results to analytics_sessions table."""
    if not supabase_client:
        return None
    try:
        result = supabase_client.table("analytics_sessions").insert(session).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[Supabase] save_analytics_session error: {e}")
        return None


def save_chat_history(history: dict) -> dict | None:
    """Append chat messages to chat_history table."""
    if not supabase_client:
        return None
    try:
        result = supabase_client.table("chat_history").insert(history).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[Supabase] save_chat_history error: {e}")
        return None


def upload_file_to_storage(file_bytes: bytes, path: str, content_type: str = "application/octet-stream") -> str | None:
    """Upload a file to Supabase Storage and return its public URL."""
    if not supabase_client:
        return None
    try:
        supabase_client.storage.from_("datasets").upload(
            path, file_bytes, {"content-type": content_type, "upsert": "true"}
        )
        public_url = supabase_client.storage.from_("datasets").get_public_url(path)
        return public_url
    except Exception as e:
        print(f"[Supabase] upload_file_to_storage error: {e}")
        return None


def get_dataset_metadata(dataset_id: str) -> dict | None:
    """Fetch dataset metadata by ID."""
    if not supabase_client:
        return None
    try:
        result = supabase_client.table("datasets").select("*").eq("id", dataset_id).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[Supabase] get_dataset_metadata error: {e}")
        return None


def download_file_from_storage(path: str) -> bytes | None:
    """Download a file's raw bytes from Supabase storage by path."""
    if not supabase_client:
        return None
    try:
        response = supabase_client.storage.from_("datasets").download(path)
        return response
    except Exception as e:
        print(f"[Supabase] download_file_from_storage error: {e}")
        return None


# Initialize on import
init_supabase()
