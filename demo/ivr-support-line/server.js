const express = require("express");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const PORT = process.env.PORT || 3000;

function baseUrl(req) {
  const configured = process.env.PUBLIC_BASE_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${proto}://${host}`;
}

function url(req, path) {
  return `${baseUrl(req)}${path}`;
}

app.post("/voice", (req, res) => {
  res.json([
    {
      GetDigits: {
        actionUrl: url(req, "/menu"),
        prompts: [
          {
            Say: {
              text: "Thanks for calling Acme. Press 1 for sales, press 2 for support, or press 3 for billing.",
            },
          },
        ],
        maxDigits: 1,
        minDigits: 1,
        initialTimeoutMs: 8000,
        flushBuffer: true,
      },
    },
  ]);
});

app.post("/menu", (req, res) => {
  const digits = (req.body && req.body.digits) || "";

  switch (digits) {
    case "1":
      return res.json([{ Redirect: { actionUrl: url(req, "/sales") } }]);
    case "2":
      return res.json([{ Redirect: { actionUrl: url(req, "/support") } }]);
    case "3":
      return res.json([{ Redirect: { actionUrl: url(req, "/billing") } }]);
    default:
      return res.json([{ Redirect: { actionUrl: url(req, "/voicemail") } }]);
  }
});

app.post("/sales", (req, res) => {
  res.json([
    {
      Say: {
        text: "You have reached sales. A team member will follow up with you shortly. Goodbye.",
      },
    },
    { Hangup: {} },
  ]);
});

app.post("/support", (req, res) => {
  res.json([
    {
      Say: {
        text: "You have reached support. A team member will follow up with you shortly. Goodbye.",
      },
    },
    { Hangup: {} },
  ]);
});

app.post("/billing", (req, res) => {
  res.json([
    {
      Say: {
        text: "You have reached billing. A team member will follow up with you shortly. Goodbye.",
      },
    },
    { Hangup: {} },
  ]);
});

app.post("/voicemail", (req, res) => {
  res.json([
    {
      Say: {
        text: "Please leave a message after the beep. Press the pound key when you are finished.",
      },
    },
    {
      RecordUtterance: {
        actionUrl: url(req, "/voicemail-saved"),
        silenceTimeoutMs: 5000,
        maxLengthSec: 120,
        finishOnKey: "#",
        playBeep: true,
      },
    },
  ]);
});

app.post("/voicemail-saved", (req, res) => {
  res.json([
    {
      Say: {
        text: "Thank you. Your message has been saved. Goodbye.",
      },
    },
    { Hangup: {} },
  ]);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "ivr-support-line" });
});

app.listen(PORT, () => {
  console.log(`IVR support line listening on port ${PORT}`);
});
