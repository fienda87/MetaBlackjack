import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_wallet_authentication_get_request():
    url = f"{BASE_URL}/api/auth/wallet"
    headers = {
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
        # Assert status code
        assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
        # Assert response content is JSON and is a list or dict (mock wallets)
        json_data = response.json()
        assert isinstance(json_data, (list, dict)), "Response JSON is not a list or dict"
        # Since no exact schema is provided, just ensure there's content
        assert len(json_data) > 0, "Response JSON is empty"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_wallet_authentication_get_request()