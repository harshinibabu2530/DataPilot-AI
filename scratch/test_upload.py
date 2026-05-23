import requests
import io

def test_python_upload():
    print("--- Testing Python Upload (5001) ---")
    url = "http://localhost:5001/api/upload"
    csv_data = "Age,Sleep_Duration,Anxiety\n25,7.5,3\n30,6.0,5\n35,8.0,2\n"
    files = {"file": ("sleep_disruption.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    try:
        res = requests.post(url, files=files)
        print("Status Code:", res.status_code)
        print("Response JSON:", res.json())
    except Exception as e:
        print("Error:", e)

def test_node_upload():
    print("\n--- Testing Node Upload (5000) ---")
    url = "http://localhost:5000/api/upload"
    csv_data = "Age,Sleep_Duration,Anxiety\n25,7.5,3\n30,6.0,5\n35,8.0,2\n"
    files = {"file": ("sleep_disruption.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    try:
        res = requests.post(url, files=files)
        print("Status Code:", res.status_code)
        print("Response JSON:", res.json())
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    test_python_upload()
    test_node_upload()
