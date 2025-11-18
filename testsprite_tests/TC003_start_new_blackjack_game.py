import requests
import traceback

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_start_new_blackjack_game():
    try:
        # Step 1: Get or create a current user (to get a valid userId and balance)
        user_resp = requests.get(f"{BASE_URL}/api/user", timeout=TIMEOUT)
        user_resp.raise_for_status()
        user_data = user_resp.json()
        assert "id" in user_data or "user" in user_data, "User data missing user id"
        user_id = user_data.get("id") or user_data.get("user", {}).get("id")
        assert isinstance(user_id, str) and user_id, "Invalid user ID received"

        # Step 2: Check the user balance, if missing try to set some balance (optional)
        user_balance = None
        if "balance" in user_data:
            user_balance = user_data["balance"]
        elif "user" in user_data and "balance" in user_data["user"]:
            user_balance = user_data["user"]["balance"]

        # If balance is None or insufficient (< some minimal bet), update balance
        minimal_bet = 10
        if user_balance is None or user_balance < minimal_bet:
            patch_resp = requests.post(
                f"{BASE_URL}/api/user",
                json={"balance": minimal_bet * 5},
                timeout=TIMEOUT
            )
            patch_resp.raise_for_status()
            # Refresh user balance after update
            refresh_resp = requests.get(f"{BASE_URL}/api/user", timeout=TIMEOUT)
            refresh_resp.raise_for_status()
            refreshed_data = refresh_resp.json()
            user_balance = refreshed_data.get("balance") or refreshed_data.get("user", {}).get("balance")
        assert user_balance is not None and user_balance >= minimal_bet, "User balance insufficient for bet"

        # Step 3: Start a new blackjack game with moveType "deal", valid userId, and valid betAmount
        bet_amount = minimal_bet
        play_payload = {
            "userId": user_id,
            "betAmount": bet_amount,
            "moveType": "deal"
        }
        play_resp = requests.post(f"{BASE_URL}/api/game/play", json=play_payload, timeout=TIMEOUT)
        assert play_resp.status_code == 200, f"Unexpected status code: {play_resp.status_code}, body: {play_resp.text}"
        play_data = play_resp.json()

        # Assertions on the response content
        assert isinstance(play_data, dict), "Response is not a JSON object"
        assert play_data.get("success") is True, "Success flag not true"
        game = play_data.get("game")
        assert isinstance(game, dict), "Game data missing or not an object"
        assert "id" in game and isinstance(game["id"], str) and game["id"], "Game ID invalid"
        assert game.get("state") == "PLAYING", f"Game state expected 'PLAYING' but got {game.get('state')}"
        assert isinstance(game.get("playerHand"), dict), "Player hand missing or invalid"
        assert isinstance(game.get("dealerHand"), dict), "Dealer hand missing or invalid"
        user_balance_after = play_data.get("userBalance")
        assert isinstance(user_balance_after, (int, float)), "User balance missing or invalid after game start"
        assert user_balance_after <= user_balance, "User balance did not decrease or stayed same after bet"

    except Exception:
        traceback.print_exc()
        assert False, "Test failed due to unexpected exception"

test_start_new_blackjack_game()