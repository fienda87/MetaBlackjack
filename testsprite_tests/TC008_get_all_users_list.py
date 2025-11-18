import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_get_all_users_list():
    url = f"{BASE_URL}/api/users"
    headers = {
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
        
        json_response = response.json()
        assert isinstance(json_response, list) or isinstance(json_response, dict), "Response JSON should be a list or dict"
        
        # If response is a list, check that each item represents a user object (dict).
        # If response is a dict, it might be an object containing users list or similar.
        if isinstance(json_response, list):
            for user in json_response:
                assert isinstance(user, dict), "Each user should be a dictionary"
                assert "id" in user or "userId" in user, "User object should contain 'id' or 'userId'"
        else:
            # If response is an object, check it has keys like 'users' or similar
            # Basic check for presence of users key if exists
            if "users" in json_response:
                users = json_response["users"]
                assert isinstance(users, list), "'users' key should map to a list"
                for user in users:
                    assert isinstance(user, dict), "Each user should be a dictionary"
                    assert "id" in user or "userId" in user, "User object should contain 'id' or 'userId'"
        
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_get_all_users_list()