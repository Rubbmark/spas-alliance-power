# SPAS Alliance Power
A GitHub Pages frontend for the SPAS alliance on server 1220. Members register an in-game name, profession, alliance rank and optional duty, then record weekly total hero power. The shared register and histories are available only after registration. No email address or game-account login is collected.

## Run locally
With Node.js 24 or later, set JOIN_CODE to your chosen local code and run `node dev.mjs`. Open http://localhost:8787. Data persists in local.sqlite. Use a test code for local testing.

## Publish
1. Create a GitHub repository with these files at its root on the main branch. In Settings → Pages select GitHub Actions.
2. In the api directory, authenticate Wrangler with `npx wrangler login`. Run `npx wrangler d1 create spas-power`. Copy its database ID into wrangler.jsonc and set SITE_ORIGIN to the exact origin of the Pages site, e.g. https://my-alliance.github.io (no repository path or trailing slash).
3. From api, run `npx wrangler d1 execute spas-power --remote --file=schema.sql`, then `npx wrangler deploy`. Set the alliance code with `npx wrangler secret put JOIN_CODE`. Choose a long random code and share it in alliance chat. The secret is kept on the server. To rotate it, repeat the secret command. Existing members keep their access.
4. Set the GitHub repository Actions variable TRACKER_API_URL to the deployed Worker HTTPS origin. Run the Publish alliance tracker workflow from the Actions tab. Share the resulting Pages URL and the join code with members.

## Member instructions
Choose Join alliance on the first visit. Save the generated personal access key privately. Member sign-in accepts that key on another device and it authorizes updates to that member's records. Signing out clears it from that browser. Anyone with a copy of the personal key can act as its owner. Anyone with the join code can register and view the roster. Protect both codes. No email recovery is available.

Use Log weekly THP and enter the full power value. Any day of a UTC Monday–Sunday week maps to that Monday. Logging the same week again updates it. Select a member from the register or history dropdown to view their trend and exact weekly values. Only the signed-in member's entries and profile can be edited. The public landing page shows a clearly labelled example.
