import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30


def test_retrieve_game_history_with_filters():
    # Step 1: Get current user or create demo user to obtain userId
    user_resp = requests.get(f"{BASE_URL}/api/user", timeout=TIMEOUT)
    assert user_resp.status_code == 200, f"Failed to get current user, status {user_resp.status_code}"
    user_data = user_resp.json()
    assert "id" in user_data, "User ID missing in response"
    user_id = user_data["id"]

    # Step 2: Retrieve game history filtered by each result type and validate response
    result_filters = ["all", "win", "lose", "push", "blackjack"]
    for result_filter in result_filters:
        params = {
            "userId": user_id,
            "page": 1,
            "limit": 20,
            "resultFilter": result_filter
        }
        resp = requests.get(f"{BASE_URL}/api/history", params=params, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Failed to get game history with filter '{result_filter}', status {resp.status_code}"
        data = resp.json()
        # Validate keys presence in response
        assert isinstance(data, dict), "Response is not a JSON object"
        assert "games" in data, "'games' key missing in response"
        assert "sessions" in data, "'sessions' key missing in response"
        assert "overallStats" in data, "'overallStats' key missing in response"
        assert "pagination" in data, "'pagination' key missing in response"

        # Validate that 'games' is a list
        assert isinstance(data["games"], list), "'games' is not a list"
        # Further filtering validation: if filter is not 'all', all games' result must match filter
        if result_filter != "all" and len(data["games"]) > 0:
            for game in data["games"]:
                # The exact key for result is not defined in PRD, commonly "result" or "outcome"
                # We'll test common keys and validate if any matches the filter ignoring case
                # Because schema is open-ended, we do a soft check if possible.
                result_value = None
                for key in ["result", "outcome", "gameResult"]:
                    if key in game:
                        result_value = str(game[key]).lower()
                        break
                if result_value is not None:
                    assert result_filter in result_value, f"Game result '{result_value}' does not match filter '{result_filter}'"

test_retrieve_game_history_with_filters()