# Enable Banking proxy (test setup)

A zero-dependency Node process that signs requests to Enable Banking so the
browser never sees the private key. Needed because Enable Banking sends no CORS
headers. It stores nothing.

## Run it on your server

```bash
EB_APP_ID=<application id> \
EB_KEY_FILE=/path/to/private.pem \
PROXY_TOKEN=<long random string> \
ALLOWED_ORIGIN=http://localhost:3000 \
node server.mjs
```

Put it behind HTTPS (Caddy or nginx) when it is not on localhost.

## Build the app against it

```bash
NEXT_PUBLIC_BANK_PROXY_URL=https://bank.example.com npm run dev
```

The variable adds that origin to the page's `connect-src` and shows "Hae
pankista" in the ledger header. Without it nothing changes.

## Register the redirect URL

In the Enable Banking control panel, add the ledger page as a redirect URL
(for dev: `http://localhost:3000/app/ledger/`). The app sends the browser back
to the page it started from, so that must match exactly.

## First use

1. Click "Hae pankista", paste `PROXY_TOKEN`, load banks, pick the bank, connect.
2. After the bank login the dialog reopens with the linked accounts.
3. "Hae tapahtumat" opens the usual statement review with the fetched rows.

The token and the linked accounts are kept in this browser's localStorage, not
in the bookkeeping file. Consent lasts at most about 90 days here; connect again
when the bank refuses.
