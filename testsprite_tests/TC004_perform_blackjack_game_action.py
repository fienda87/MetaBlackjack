import requests
import uuid

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_perform_blackjack_game_action():
    session = requests.Session()
    # Step 1: Get current user or create demo user
    try:
        user_resp = session.get(f"{BASE_URL}/api/user", timeout=TIMEOUT)
        user_resp.raise_for_status()
        user_data = user_resp.json()
        assert 'user' in user_data and 'id' in user_data['user'], "User data must contain user.id"
        user_id = user_data['user']['id']

        # Step 2: Start a new game with a bet and moveType "deal"
        bet_amount = 10  # Assuming 10 is a valid bet amount within user's balance
        play_payload = {
            "userId": user_id,
            "betAmount": bet_amount,
            "moveType": "deal"
        }
        play_resp = session.post(f"{BASE_URL}/api/game/play", json=play_payload, timeout=TIMEOUT)
        play_resp.raise_for_status()
        play_data = play_resp.json()
        assert play_data.get("success") is True, "Game start must be successful"
        assert "game" in play_data and "id" in play_data["game"], "Game info with id must be returned"
        game_id = play_data["game"]["id"]
        initial_balance = play_data.get("userBalance")
        assert isinstance(initial_balance, (int, float)), "User balance must be a number"

        # Step 3: Define all valid actions to test in sequence except 'deal'
        actions = ["hit", "stand", "double_down", "split", "surrender", "insurance"]

        for action in actions:
            action_payload = {
                "gameId": game_id,
                "action": action,
                "userId": user_id
            }
            action_resp = session.post(f"{BASE_URL}/api/game/action", json=action_payload, timeout=TIMEOUT)
            # Accept either 200 or 400 for invalid state, 401 unauthorized or 429 rate limit and handle accordingly
            if action_resp.status_code == 200:
                action_data = action_resp.json()
                assert action_data.get("success") is True, f"Action '{action}' must succeed"
                assert "game" in action_data, "Response must contain updated game state"
                assert "userBalance" in action_data, "Response must contain updated user balance"
                assert isinstance(action_data["userBalance"], (int, float)), "User balance must be numeric"
            elif action_resp.status_code == 400:
                # This can happen if the action is invalid for the current game state
                err_data = action_resp.json()
                assert "success" not in err_data or err_data.get("success") is False, f"Action '{action}' expected failure for invalid state"
            elif action_resp.status_code == 401:
                raise AssertionError("Unauthorized access for game action")
            elif action_resp.status_code == 429:
                raise AssertionError("Rate limit exceeded for game action")
            else:
                raise AssertionError(f"Unexpected status code {action_resp.status_code} for action {action}")

    finally:
        # Cleanup: delete the game if API supports it (no delete found in PRD, so skip)
        # Optionally reset user balance or other cleanup could be done here if APIs existed.
        pass

test_perform_blackjack_game_action()