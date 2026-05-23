import sys
sys.path.append("backend")

import inspect
import modules.supabase_client as supa

if supa.supabase_client:
    print(inspect.signature(supa.supabase_client.storage.create_bucket))
    # Let's also print help
    print(supa.supabase_client.storage.create_bucket.__doc__)
