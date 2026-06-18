import os

import freeclimb
from dotenv import load_dotenv
from flask import Flask, jsonify, request

load_dotenv()

PORT = int(os.environ.get("PORT", "3000"))
BASE_URL = os.environ.get("BASE_URL", f"http://localhost:{PORT}")
FREECLIMB_NUMBER = os.environ.get("FREECLIMB_NUMBER")

configuration = freeclimb.Configuration(
    username=os.environ.get("FREECLIMB_ACCOUNT_ID"),
    password=os.environ.get("FREECLIMB_API_KEY"),
)

STOP_WORDS = {"STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"}

app = Flask(__name__)


def url(path):
    return f"{BASE_URL}{path}"


def field(name):
    if request.form and name in request.form:
        return request.form.get(name)
    payload = request.get_json(silent=True) or {}
    return payload.get(name)


def percl(commands):
    body = freeclimb.PerclScript(commands=commands).to_json()
    return app.response_class(body, mimetype="application/json")


def send_sms(to, text):
    with freeclimb.ApiClient(configuration) as client:
        api = freeclimb.DefaultApi(client)
        api.send_an_sms_message(freeclimb.MessageRequest(_from=FREECLIMB_NUMBER, to=to, text=text))


@app.post("/voice")
def voice():
    get_digits = freeclimb.GetDigits(
        action_url=url("/menu"),
        prompts=[freeclimb.Say(text="Thanks for calling. Press 1 for sales, or 2 for support.")],
        max_digits=1,
        min_digits=1,
        flush_buffer=True,
        initial_timeout_ms=8000,
    )
    return percl([get_digits])


@app.post("/menu")
def menu():
    digits = field("digits")
    if digits == "1":
        return percl([freeclimb.Redirect(action_url=url("/sales"))])
    if digits == "2":
        return percl([freeclimb.Redirect(action_url=url("/support"))])
    return percl([freeclimb.Redirect(action_url=url("/voicemail"))])


@app.post("/sales")
def sales():
    return percl([freeclimb.Say(text="Our sales team will follow up shortly. Goodbye."), freeclimb.Hangup()])


@app.post("/support")
def support():
    return percl([freeclimb.Say(text="Our support team will follow up shortly. Goodbye."), freeclimb.Hangup()])


@app.post("/voicemail")
def voicemail():
    return percl(
        [
            freeclimb.Say(text="Please leave a message after the beep. Press pound when finished."),
            freeclimb.RecordUtterance(
                action_url=url("/voicemail-saved"),
                silence_timeout_ms=5000,
                max_length_sec=120,
                finish_on_key="#",
                play_beep=True,
            ),
        ]
    )


@app.post("/voicemail-saved")
def voicemail_saved():
    return percl([freeclimb.Say(text="Thanks. Your message has been recorded. Goodbye."), freeclimb.Hangup()])


@app.post("/sms-inbound")
def sms_inbound():
    from_number = field("from")
    text = (field("text") or "").strip().upper()
    reply = "Thanks for your message. Reply HELP for options or STOP to unsubscribe."
    if text in STOP_WORDS:
        reply = "You are unsubscribed and will receive no more messages. Reply HELP for help."
    elif text in ("HELP", "INFO"):
        reply = "This is the demo line. Reply STOP to unsubscribe. Message and data rates may apply."
    if from_number:
        send_sms(from_number, reply)
    return jsonify({"success": True})


@app.post("/send-sms")
def send_sms_route():
    to = field("to")
    text = field("text")
    if not to or not text:
        return jsonify({"ok": False, "error": "to and text are required"}), 400
    send_sms(to, text)
    return jsonify({"ok": True})


@app.post("/status")
def status():
    return ("", 200)


@app.get("/health")
def health():
    return {"status": "ok", "baseUrl": BASE_URL}


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT)
