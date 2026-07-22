import hashlib
import hmac
import os
import time
from urllib.parse import urlparse

import freeclimb
from dotenv import load_dotenv
from flask import Flask, jsonify, request

load_dotenv()

STOP_WORDS = {"STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"}
SIGNATURE_TOLERANCE_SECONDS = 300


def verify_request_signature(raw_body, header, signing_secret, now=None):
    if not isinstance(raw_body, str) or not isinstance(header, str) or not signing_secret:
        return False
    timestamps = []
    signatures = []
    for item in header.split(","):
        key, separator, value = item.partition("=")
        if not separator:
            continue
        key = key.strip()
        value = value.strip()
        if key == "t":
            timestamps.append(value)
        elif key == "v1":
            signatures.append(value)
    if len(timestamps) != 1 or not signatures or not timestamps[0].isdigit():
        return False
    timestamp = int(timestamps[0])
    current_time = int(time.time()) if now is None else now
    if abs(current_time - timestamp) > SIGNATURE_TOLERANCE_SECONDS:
        return False
    expected = hmac.new(
        signing_secret.encode(),
        f"{timestamps[0]}.{raw_body}".encode(),
        hashlib.sha256,
    ).digest()
    verified = False
    for signature in signatures:
        if len(signature) != 64:
            continue
        try:
            candidate = bytes.fromhex(signature)
        except ValueError:
            continue
        matches = hmac.compare_digest(expected, candidate)
        verified = matches or verified
    return verified


def load_settings(overrides=None):
    settings = {
        "PORT": int(os.environ.get("PORT", "3000")),
        "BASE_URL": os.environ.get("BASE_URL"),
        "FREECLIMB_ACCOUNT_ID": os.environ.get("FREECLIMB_ACCOUNT_ID"),
        "FREECLIMB_API_KEY": os.environ.get("FREECLIMB_API_KEY"),
        "FREECLIMB_SIGNING_SECRET": os.environ.get("FREECLIMB_SIGNING_SECRET"),
        "FREECLIMB_NUMBER": os.environ.get("FREECLIMB_NUMBER"),
    }
    settings.update(overrides or {})
    required = (
        "BASE_URL",
        "FREECLIMB_ACCOUNT_ID",
        "FREECLIMB_API_KEY",
        "FREECLIMB_SIGNING_SECRET",
        "FREECLIMB_NUMBER",
    )
    for key in required:
        if not settings.get(key):
            raise ValueError(f"{key} is required")
    parsed = urlparse(settings["BASE_URL"])
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError("BASE_URL must be an absolute HTTPS URL")
    settings["BASE_URL"] = settings["BASE_URL"].rstrip("/")
    return settings


def create_app(overrides=None):
    settings = load_settings(overrides)
    app = Flask(__name__)
    configuration = freeclimb.Configuration(
        username=settings["FREECLIMB_ACCOUNT_ID"],
        password=settings["FREECLIMB_API_KEY"],
    )
    api_client = freeclimb.ApiClient(configuration)
    app.extensions["freeclimb_api"] = freeclimb.DefaultApi(api_client)

    def field(name):
        if request.form and name in request.form:
            return request.form.get(name)
        payload = request.get_json(silent=True) or {}
        return payload.get(name)

    def percl(commands):
        body = freeclimb.PerclScript(commands=commands).to_json()
        return app.response_class(body, mimetype="application/json")

    @app.before_request
    def verify_signature():
        if request.endpoint not in {"voice", "menu", "sms"}:
            return None
        if verify_request_signature(
            request.get_data(cache=True, as_text=True),
            request.headers.get("FreeClimb-Signature"),
            settings["FREECLIMB_SIGNING_SECRET"],
        ):
            return None
        return jsonify({"error": "Invalid signature"}), 401

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.post("/voice")
    def voice():
        get_digits = freeclimb.GetDigits(
            actionUrl=f"{settings['BASE_URL']}/menu",
            prompts=[freeclimb.Say(text="Thanks for calling. Press 1 for sales or 2 for support.")],
            maxDigits=1,
            minDigits=1,
        )
        return percl([get_digits])

    @app.post("/menu")
    def menu():
        digits = field("digits")
        if digits == "1":
            text = "Sales will contact you shortly. Goodbye."
        elif digits == "2":
            text = "Support will contact you shortly. Goodbye."
        else:
            text = "That selection was not recognized. Goodbye."
        return percl([freeclimb.Say(text=text)])

    @app.post("/sms-inbound")
    def sms():
        inbound_text = (field("text") or "").strip().upper()
        reply = "Thanks for your message. Reply HELP for help or STOP to unsubscribe."
        if inbound_text in STOP_WORDS:
            reply = "You are unsubscribed and will receive no more messages. Reply HELP for help."
        elif inbound_text in {"HELP", "INFO"}:
            reply = "FreeClimb demo: webhook replies. Reply STOP to unsubscribe."
        command = freeclimb.Sms(
            to=field("from"),
            var_from=settings["FREECLIMB_NUMBER"],
            text=reply,
        )
        return percl([command])

    return app


if __name__ == "__main__":
    settings = load_settings()
    create_app(settings).run(host="0.0.0.0", port=settings["PORT"])
