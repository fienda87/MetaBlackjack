import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30
HEADERS = {"Content-Type": "application/json"}


def test_get_user_by_id_and_admin_balance_adjustment():
    user_id = None
    created_user_id = None

    try:
        # Step 1: Get current user or create demo user from GET /api/user
        response = requests.get(f"{BASE_URL}/api/user", headers=HEADERS, timeout=TIMEOUT)
        assert response.status_code == 200, f"GET /api/user failed: {response.text}"
        user_data = response.json()
        user_id = user_data.get("id") or user_data.get("user", {}).get("id")
        if not user_id:
            # If no user id returned directly, try to create a demo user by POST /api/user without body
            post_resp = requests.post(f"{BASE_URL}/api/user", headers=HEADERS, timeout=TIMEOUT)
            assert post_resp.status_code == 200, f"POST /api/user to create user failed: {post_resp.text}"
            created_user = post_resp.json()
            user_id = created_user.get("id")
            created_user_id = user_id
        assert user_id is not None, "User ID could not be determined"

        # Step 2: GET /api/user/{id} to retrieve user details with transaction history
        get_user_resp = requests.get(f"{BASE_URL}/api/user/{user_id}", headers=HEADERS, timeout=TIMEOUT)
        assert get_user_resp.status_code == 200, f"GET /api/user/{user_id} failed: {get_user_resp.text}"
        user_details = get_user_resp.json()
        # Assuming user details contain keys like 'transactions' or similar
        assert isinstance(user_details, dict), "User details response is not a JSON object"
        # There should be user info and transaction history keys, check at least one key presence
        assert ("transactions" in user_details or "transactionHistory" in user_details or "balance" in user_details), \
            "User details missing transaction/balance information"

        # Step 3: POST /api/user/{id} to perform admin balance adjustment
        adjust_payload = {
            "amount": 10.0,
            "type": "ADMIN_BONUS"
        }
        post_adjust_resp = requests.post(f"{BASE_URL}/api/user/{user_id}", json=adjust_payload, headers=HEADERS, timeout=TIMEOUT)
        assert post_adjust_resp.status_code == 200, f"POST /api/user/{user_id} balance adjustment failed: {post_adjust_resp.text}"
        adjust_result = post_adjust_resp.json()
        # Check that adjustment succeeded by presence of expected keys
        assert "success" in adjust_result, "Balance adjustment response missing 'success'"
        assert adjust_result.get("success") is True, "Balance adjustment was not successful"

        # Optionally re-get user to verify balance increased or some indication changed
        verify_again_resp = requests.get(f"{BASE_URL}/api/user/{user_id}", headers=HEADERS, timeout=TIMEOUT)
        assert verify_again_resp.status_code == 200, f"GET /api/user/{user_id} failed after adjustment: {verify_again_resp.text}"
        verify_data = verify_again_resp.json()
        # If balance present, optionally check new balance > 0 or change happened (dependent on prior balance)
        assert "balance" in verify_data or "transactions" in verify_data, \
            "Post-adjustment user data missing balance or transactions for verification"

    finally:
        # Cleanup: if a demo user was created during testing, try to delete it if DELETE is supported
        if created_user_id:
            try:
                del_resp = requests.delete(f"{BASE_URL}/api/user/{created_user_id}", headers=HEADERS, timeout=TIMEOUT)
                # No assertion here as delete might not be supported or implemented
            except Exception:
                pass


test_get_user_by_id_and_admin_balance_adjustment()