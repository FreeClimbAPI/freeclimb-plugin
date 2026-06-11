# FreeClimb IVR Support Line Demo

Local webhook app for the FreeClimb AI demo.

## Run

```bash
npm start
```

The server listens on port `3000` by default.

```bash
PORT=3001 npm start
```

## Routes

- `GET /health` returns a JSON health check.
- `POST /voice` greets the caller and asks for one digit.
- `POST /menu` routes `1` to sales, `2` to support, and anything else to voicemail.
- `POST /sales` plays a sales message and hangs up.
- `POST /support` plays a support message and hangs up.
- `POST /voicemail` records a message.
- `POST /voicemail-saved` thanks the caller and hangs up.

## Connect To FreeClimb

From another terminal:

```bash
node /Users/jbohne/Projects/Freeclimb/freeclimb-cli/bin/run dev --port 3000
```

If `freeclimb` is installed globally, this also works:

```bash
freeclimb dev --port 3000
```

The CLI creates a public tunnel and configures a FreeClimb Application so inbound calls reach this local app.
