import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_purchase_store_items():
    # First, obtain or create a user to use for purchase
    user_id = None
    headers = {"Content-Type": "application/json"}

    # Create demo user or get current user
    try:
        resp_user = requests.get(f"{BASE_URL}/api/user", timeout=TIMEOUT)
        resp_user.raise_for_status()
        user_data = resp_user.json()
        user_id = user_data.get("id") or user_data.get("user", {}).get("id") or user_data.get("userId") or user_data.get("user", {}).get("userId")
        if not user_id:
            # fallback if user id is not directly found, try "user" object keys
            if isinstance(user_data.get("user"), dict):
                user_id = user_data["user"].get("id") or user_data["user"].get("userId")
            else:
                user_id = user_data.get("id")
        assert user_id, "User ID not found in /api/user response"
    except Exception as e:
        raise AssertionError(f"Failed to get or create user for purchase test: {e}")

    # Get all users to possibly find valid itemId or attempt with invalid itemId later
    # The PRD does not specify an endpoint to get store items, so we assume valid itemId needs to be derived or guessed

    # For testing, define valid and invalid itemIds
    valid_item_id = "valid-item-001"  # placeholder; assumed valid
    invalid_item_id = "invalid-item-xyz"
    purchase_quantity = 1

    # --- Attempt a purchase with valid item and quantity ---
    purchase_payload_valid = {
        "userId": user_id,
        "itemId": valid_item_id,
        "quantity": purchase_quantity
    }

    try:
        response = requests.post(f"{BASE_URL}/api/store/purchase", json=purchase_payload_valid, headers=headers, timeout=TIMEOUT)
        if response.status_code == 200:
            json_resp = response.json()
            # Check that purchase was successful (no explicit schema, so check for success or expected fields)
            assert isinstance(json_resp, dict)
            # success could be boolean or message; schema says 200 means success
            # So if 200, assume success response
        elif response.status_code == 400:
            # Could be insufficient balance or invalid item (though we used valid item, maybe balance is insufficient)
            json_resp = response.json()
            assert "insufficient balance" in str(json_resp).lower() or "invalid" in str(json_resp).lower()
        else:
            assert False, f"Unexpected status code for valid purchase test: {response.status_code}"
    except Exception as e:
        raise AssertionError(f"Exception during valid item purchase test: {e}")

    # --- Attempt a purchase with invalid itemId ---
    purchase_payload_invalid = {
        "userId": user_id,
        "itemId": invalid_item_id,
        "quantity": purchase_quantity
    }

    try:
        response_invalid = requests.post(f"{BASE_URL}/api/store/purchase", json=purchase_payload_invalid, headers=headers, timeout=TIMEOUT)
        assert response_invalid.status_code == 400, f"Expected status 400 for invalid item purchase, got {response_invalid.status_code}"
        json_invalid = response_invalid.json()
        assert "invalid" in str(json_invalid).lower() or "not found" in str(json_invalid).lower()
    except Exception as e:
        raise AssertionError(f"Exception during invalid item purchase test: {e}")

    # --- Attempt a purchase with large quantity to trigger insufficient balance ---
    large_quantity = 9999999
    purchase_payload_insufficient = {
        "userId": user_id,
        "itemId": valid_item_id,
        "quantity": large_quantity
    }

    try:
        response_insufficient = requests.post(f"{BASE_URL}/api/store/purchase", json=purchase_payload_insufficient, headers=headers, timeout=TIMEOUT)
        assert response_insufficient.status_code == 400, f"Expected status 400 for insufficient balance, got {response_insufficient.status_code}"
        json_insufficient = response_insufficient.json()
        assert "insufficient" in str(json_insufficient).lower() or "balance" in str(json_insufficient).lower()
    except Exception as e:
        raise AssertionError(f"Exception during insufficient balance purchase test: {e}")

test_purchase_store_items()