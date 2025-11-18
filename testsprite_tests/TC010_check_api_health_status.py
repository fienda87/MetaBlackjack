import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_api_health_status():
    url = f"{BASE_URL}/api/health"
    try:
        response = requests.get(url, timeout=TIMEOUT)
        response.raise_for_status()
        data = response.json()

        assert isinstance(data, dict), "Response is not a JSON object"
        assert "status" in data, "'status' key missing in response"
        assert data["status"] == "ok", f"Expected status 'ok', got '{data['status']}'"
        assert "timestamp" in data, "'timestamp' key missing in response"
        assert isinstance(data["timestamp"], str), "'timestamp' is not a string"
        assert data["timestamp"], "'timestamp' is empty"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"
    except ValueError:
        assert False, "Response content is not valid JSON"

test_api_health_status()