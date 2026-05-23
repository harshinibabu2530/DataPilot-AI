import requests
import io
import base64
import json

def get_fake_jwt():
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": "b388a5bf-d9ad-4cf3-b1d1-0e679860babb",
        "email": "dev@localhost",
        "role": "authenticated",
        "exp": 9999999999
    }
    h_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    p_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    return f"{h_b64}.{p_b64}.abc"

def test_authenticated_upload(token):
    print("Using Token:", token)
    print("\n--- Testing Authenticated Node Upload (5000) ---")
    url = "http://localhost:5000/api/upload"
    csv_data = "Age,Sleep_Duration,Anxiety\n25,7.5,3\n30,6.0,5\n35,8.0,2\n"
    files = {"file": ("sleep_disruption.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    headers = {
        "Authorization": f"Bearer {token}"
    }
    try:
        res = requests.post(url, files=files, headers=headers)
        print("Status Code:", res.status_code)
        print("Response:", res.text)
    except Exception as e:
        print("Network/Request Error:", e)

if __name__ == "__main__":
    token = get_fake_jwt()
    test_authenticated_upload(token)
