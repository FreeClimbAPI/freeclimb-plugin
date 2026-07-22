import hashlib
import hmac
import json
import socket
import time
from pathlib import Path
from urllib.parse import urlparse

import pytest

from app import create_app, load_settings

FIXTURES = json.loads((Path(__file__).parent.parent / "contract-fixtures.json").read_text())
SIGNING_SECRET = "test-signing-secret"
CONFIG = {
    "BASE_URL": FIXTURES["baseUrl"],
    "FREECLIMB_ACCOUNT_ID": "test-account",
    "FREECLIMB_API_KEY": "test-api-key",
    "FREECLIMB_SIGNING_SECRET": SIGNING_SECRET,
    "FREECLIMB_NUMBER": FIXTURES["sms"]["request"]["to"],
}


@pytest.fixture(autouse=True)
def block_network(monkeypatch):
    def reject_connection(*args, **kwargs):
        raise AssertionError("Tests must not make network connections")

    monkeypatch.setattr(socket.socket, "connect", reject_connection)


@pytest.fixture
def client():
    return create_app(CONFIG).test_client()


def encode(payload):
    return json.dumps(payload, separators=(",", ":"))


def signature(body, timestamp=None):
    timestamp = int(time.time()) if timestamp is None else timestamp
    digest = hmac.new(
        SIGNING_SECRET.encode(),
        f"{timestamp}.{body}".encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"t={timestamp},v1={'0' * 64},v1={digest}"


def signed_request(client, contract):
    payload = contract["request"]
    body = encode(payload)
    return client.open(
        contract["path"],
        method=contract["method"],
        data=body,
        content_type="application/json",
        headers={"FreeClimb-Signature": signature(body)},
    )


def test_health_route_does_not_require_signature(client):
    response = client.open(
        FIXTURES["health"]["path"],
        method=FIXTURES["health"]["method"],
    )
    assert response.status_code == 200
    assert response.get_json() == {"status": FIXTURES["health"]["status"]}


def test_voice_route_returns_sdk_percl_with_https_action_url(client):
    response = signed_request(client, FIXTURES["voice"])
    assert response.status_code == 200
    command = response.get_json()[0][FIXTURES["voice"]["requiredCommand"]]
    assert command["actionUrl"] == FIXTURES["voice"]["actionUrl"]
    assert command["maxDigits"] == FIXTURES["voice"]["maxDigits"]


def test_menu_route_returns_sdk_percl(client):
    contract = {
        "method": FIXTURES["voice"]["method"],
        "path": urlparse(FIXTURES["voice"]["actionUrl"]).path,
        "request": {"digits": "1"},
    }
    response = signed_request(client, contract)
    assert response.status_code == 200
    assert response.get_json()[0]["Say"]["text"] == "Sales will contact you shortly. Goodbye."


def test_sms_route_returns_sdk_percl_without_network(client):
    response = signed_request(client, FIXTURES["sms"])
    assert response.status_code == 200
    command = response.get_json()[0][FIXTURES["sms"]["requiredCommand"]]
    assert command["to"] == FIXTURES["sms"]["request"]["from"]
    assert command["from"] == FIXTURES["sms"]["request"]["to"]
    assert command["text"] == FIXTURES["sms"]["replyText"]


def test_webhook_routes_reject_invalid_signatures(client):
    body = encode(FIXTURES["voice"]["request"])
    timestamp = int(time.time())
    response = client.open(
        FIXTURES["voice"]["path"],
        method=FIXTURES["voice"]["method"],
        data=body,
        content_type="application/json",
        headers={"FreeClimb-Signature": f"t={timestamp},v1={'0' * 64}"},
    )
    assert response.status_code == 401


def test_webhook_routes_reject_future_timestamps_beyond_tolerance(client):
    body = encode(FIXTURES["voice"]["request"])
    timestamp = int(time.time()) + 301
    response = client.open(
        FIXTURES["voice"]["path"],
        method=FIXTURES["voice"]["method"],
        data=body,
        content_type="application/json",
        headers={"FreeClimb-Signature": signature(body, timestamp)},
    )
    assert response.status_code == 401


def test_configuration_rejects_non_https_base_url():
    insecure_url = FIXTURES["baseUrl"].replace("https://", "http://")
    with pytest.raises(ValueError, match="absolute HTTPS"):
        load_settings({**CONFIG, "BASE_URL": insecure_url})
