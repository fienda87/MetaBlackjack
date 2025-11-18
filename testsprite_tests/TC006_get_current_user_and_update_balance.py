import requests

BASE_URL = "http://localhost:3000"
HEADERS = {"Content-Type": "application/json"}
TIMEOUT = 30

def test_get_current_user_and_update_balance():
    # Step 1: GET /api/user - retrieve current user or create demo user
    try:
        response_get = requests.get(f"{BASE_URL}/api/user", headers=HEADERS, timeout=TIMEOUT)
        response_get.raise_for_status()
    except requests.RequestException as e:
        assert False, f"GET /api/user request failed: {e}"
    data_get = response_get.json()
    assert isinstance(data_get, dict), "GET /api/user response should be a JSON object"
    # We expect at least some user properties - id or similar key, 
    # but since schema not fully detailed, minimal check for presence of keys
    assert data_get, "GET /api/user returned empty response"
    user_id = data_get.get("id")
    # If no id available, fail test as we must have a user identifier to update balance
    assert user_id, "User ID not found in GET /api/user response"

    # Step 2: POST /api/user - update user balance
    # We attempt to update balance by increasing by 100 units (just an example)
    new_balance = data_get.get("balance", 0) + 100
    payload_post = {"balance": new_balance}
    try:
        response_post = requests.post(f"{BASE_URL}/api/user", json=payload_post, headers=HEADERS, timeout=TIMEOUT)
        response_post.raise_for_status()
    except requests.RequestException as e:
        assert False, f"POST /api/user update balance request failed: {e}"

    # The response to POST might or might not have content, validate status code only
    # Safety check: If response has JSON, check success or balance reflected
    try:
        data_post = response_post.json()
        # If response contains 'balance', verify it's updated (optional)
        if "balance" in data_post:
            assert isinstance(data_post["balance"], (int, float)), "Balance in response should be a number"
            assert data_post["balance"] == new_balance, "Balance not updated correctly in response"
    except ValueError:
        # response body not json, we skip value assertions
        pass

test_get_current_user_and_update_balance()