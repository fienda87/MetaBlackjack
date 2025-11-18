import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_wallet_authentication_post_request():
    url = f"{BASE_URL}/api/auth/wallet"
    headers = {
        "Content-Type": "application/json"
    }
    # Using mock wallet data for testing
    payload = {
        "walletAddress": "0xMockWalletAddress1234567890",
        "signature": "mockSignatureForTestingPurposes"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        assert False, f"Request failed: {e}"

    data = response.json()

    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
    assert isinstance(data, dict), "Response is not a JSON object"
    assert "success" in data and isinstance(data["success"], bool), "'success' key missing or not bool"
    assert data["success"] is True, "Authentication was not successful"
    assert "user" in data and isinstance(data["user"], dict), "'user' key missing or not dict"
    assert "stats" in data and isinstance(data["stats"], dict), "'stats' key missing or not dict"


test_wallet_authentication_post_request()