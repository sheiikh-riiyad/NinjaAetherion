This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

## Firebase accounts

The `/account` page supports Google sign-in, email/password registration, sign-in, password reset,
profile name updates, and sign-out. `/admin` allows administrators to view accounts.
Both account types are stored in Firestore at `users/{Firebase Auth UID}`:

```text
email: string
name: string
admin: boolean
createdAt: timestamp
```

Passwords are managed by Firebase Authentication and are never stored in Firestore.

Administrators see a live list of all registered accounts on `/account` and `/admin`.
Choose **Start chat** beside a client to open their conversation on the separate
`/messages` page. Clients open **Messages** from navigation or their account page.
The chat workspace includes a searchable conversation sidebar, message bubbles,
timestamps, and an Enter-to-send composer (Shift + Enter adds a new line). On mobile,
use the back arrow to switch conversations. Messages are stored at `users/{clientUid}/messages/{messageId}`
with `text`, `senderId`, and `createdAt`. Chats show the latest 100 messages in real
time; older messages remain stored. All site administrators share access to client
conversations. Clients cannot read other clients' messages, impersonate senders,
edit messages, or delete messages. Publish the updated `firestore.rules` to enable
chat access. This feature does not send email or push notifications.

Use **Reply** on a message to quote it, then send your response. Cancel with the
preview's close button or Escape. Replies retain an optional `reply` map containing
`messageId`, `text`, and `senderId`, so quotes remain visible beyond the latest
100-message window. Rules validate the quote against the original message in the
same conversation. Publish updated rules before sending replies.

Unread badges appear on the Messages navigation link, Open messages button,
admin user list, and conversation sidebar. Read positions persist separately for
each signed-in reader at `users/{clientUid}/chatReads/{readerUid}`. Opening a chat
in a focused, visible browser tab marks messages through the latest loaded message
as read. Your own messages do not increase your unread count. Publish the updated
Firestore rules for read positions before using this feature. Unread listeners
read messages newer than each reader's saved position; an unread backlog can incur
Firestore reads. Counts cover the complete unread backlog, even beyond the 100
messages displayed in the conversation.

### Chat activity

Green activity dots and last-active labels appear in the conversation header,
sidebar, and admin user list. Each signed-in tab writes its own `presence/{sessionId}`
record with UID, role, online status, and a server timestamp. Visible tabs send a
heartbeat every 30 seconds; missing heartbeats expire after 90 seconds. Multiple
tabs/devices are combined, and clients can see only administrator activity.
Publish the updated Firestore rules to enable presence. This is approximate
activity, not guaranteed connection detection: closed tabs and lost connections
can take approximately 90 seconds to expire (plus the 15-second display refresh).
Sessions remain stored to preserve last-active
history; heartbeats incur Firestore writes. Run `node --experimental-strip-types
--test tests/presence.test.mjs` to check expiry and multi-tab aggregation.

### Firestore connection troubleshooting

The login form renders immediately while Firebase restores the session. Browser Auth
uses localStorage, sessionStorage, then memory as fallbacks; the Google popup resolver
loads only when Google sign-in is requested. Session initialization has a 10-second
timeout with a retry option; profile loading has its own 15-second timeout.

For LAN testing at `http://192.168.10.224:3000`, add `192.168.10.224` (without scheme
or port) to Firebase Console → Authentication → Settings → Authorized domains for
Google sign-in. Reload the page fully after changing initialization settings.
`next.config.ts` also allows this IP in `allowedDevOrigins`, so Next.js development
connections and button hydration work over the LAN. If your LAN IP changes, update
both the Next.js setting and Firebase authorized domains. An `auth/unauthorized-domain`
error requires the Firebase console change; a local code change cannot authorize it.

The browser uses long polling for compatibility with networks that buffer streaming
responses. After changing `firebaseconfig.js`, fully reload the browser so Firebase
initializes with the new transport settings. Profile loading shows a retry option
after 15 seconds instead of waiting indefinitely; a delayed successful connection
can still recover automatically.

If Firestore remains unreachable, check the browser Network tab for failed requests
to `firestore.googleapis.com`, temporarily test without a VPN or blocking browser
extension, and confirm the default Firestore database exists in the Firebase console.
Permission errors require checking published rules; changing rules does not fix an
unreachable network connection.

1. The app uses the public Web app configuration for `ninjaaetherion` in
   `firebaseconfig.js`. Optional overrides are available by copying `.env.example`
   to `.env.local` and filling in all four values for a different project.
2. In Authentication, enable the Email/Password and Google providers. Add your production
   hostname and `localhost` to Authentication's authorized domains as needed.
3. Create the default Cloud Firestore database. Deploy `firestore.rules` before
   allowing registrations: `firebase deploy --only firestore:rules --project YOUR_PROJECT_ID`
   using an authenticated Firebase CLI, or paste the rules in the console and publish.
4. Restart the development server after setting environment variables.
5. Register your own account through `/account`. In the Firebase console, open
   Firestore → `users` → your Auth UID and change **only your document's** `admin`
   field to boolean `true`. Then visit `/admin`. All public registrations start
   with boolean `false`; browser clients cannot change roles or delete profiles.

Firestore rules enforce account privacy and administrator reads. The admin page's
client-side gate is for navigation; database authorization is enforced by the rules.
The public Firebase Web app configuration is committed; no service-account credentials
are required. Rules are not deployed automatically. Live authentication requires
enabled providers, authorized domains, and the published rules above. Google sign-in
creates a client profile on first use and preserves the role of existing profiles.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


### Chat attachments

The composer supports one file (up to 20 MB) per message, a dedicated photo/video picker, and pasting clipboard files into the textarea. Photos and videos preview before sending; captions and replies are optional. Files live in Firebase Storage; Firestore stores attachment metadata. Downloads use authenticated `getBlob`, with no public download token. Unsupported image/video formats remain downloadable.

Before using attachments:

1. Enable Firebase Storage for this project in the Firebase console.
2. Deploy both rule files: `firebase deploy --only firestore:rules,storage --project ninjaaetherion`. When prompted, grant Storage rules permission to access Firestore for the admin lookup.
3. Configure bucket CORS for authenticated browser downloads. Add your production origin to `storage.cors.json`, then run `gcloud storage buckets update gs://ninjaaetherion.firebasestorage.app --cors-file=storage.cors.json` with an authorized Google Cloud account. The supplied origins cover localhost and the current LAN URL.

Rules restrict uploads and downloads to the client and admins, and cap uploads at 20 MB. If uploading succeeds but saving the message fails, retrying uploads a new object; the earlier object can remain orphaned. These objects need periodic bucket cleanup if failed sends become frequent. Live uploads require the above Firebase configuration and are not verified by the local build.


### Connected People and client chats

`/people` is a public directory. Sign in as admin, open **Manage connected clients**, choose a registered client, and publish their public name, work title, description, and optional HTTP(S) URL. You can edit or remove listings there. No account emails or admin flags are copied into the public directory. Existing users are not published automatically.

Signed-in accounts can start a private conversation with a listed client. Both participants can continue their conversation from the Client conversations inbox, including after a listing is removed. Replies, attachments, and per-conversation unread counts use the shared messenger UI. Public visitors can view work without signing in; messaging requires an account. Client chats are separate from the existing owner/client messages. Only the two members can read each client chat or its attachments, including when another account is an administrator.

Data: `connectedPeople/{uid}` holds admin-managed public work details; `peerChats/{chatId}` holds immutable members and display names; messages and each participant's read cursor are stored in its `messages` and `chatReads` subcollections. The current display name of the initiator and published name of the recipient are captured when a chat starts. They do not automatically change in older inbox entries.

Publish the updated rules before using this feature: `firebase deploy --only firestore:rules,storage --project ninjaaetherion`. Existing Storage/CORS setup also applies to peer attachments. No additional composite index is required by the membership query. Production rule deployment and live multi-account testing require an authorized Firebase session.

### Orders, client levels, and reviews

Open `/orders` to create requests (client accounts) or manage all projects (admin accounts). Clients submit a service, title, description, optional budget/deadline, and reference link. The dashboard filters orders by stage and opens Overview, Progress, Files, and Messages tabs.

Admins post an update while keeping the current stage or advancing one step: Requested, Accepted, Building, Review, Delivered. Progress notes are appended as immutable history in the same batch as the order update. Preview/delivery URLs appear in Files; actual attachment sharing uses the existing private owner/client chat. These conversations are shared across the client's orders, so the UI asks users to include the order number.

Client levels derive from delivered orders: 0-1 New Client, 2-4 Returning Client, 5+ Trusted Partner. Clients cannot change order status. After delivery, the order owner can submit one review with separate work-quality and website-experience ratings (1-5). Reviews are private by default. Explicit consent publishes the reviewer's captured name, ratings, and text in the public reviews section. Reviews cannot currently be edited or deleted in the app. Public reviews show up to 20 entries.

Data is stored in `orders/{orderId}`, its `updates` subcollection, and `orderReviews/{orderId}`. Only the owner and admins can read an order. Anyone can read a review marked public; private reviews are limited to the owner and admins. No payment processing is included.

Deploy `firestore.rules` before using orders: `firebase deploy --only firestore:rules --project ninjaaetherion`. No additional composite index is required by the current queries. Verify create/update/review flows with separate client and admin accounts after deployment; live Firebase writes and rules execution are not covered by the local build.

Business-logic checks: `node --experimental-strip-types --test tests/orders.test.mjs`.

### Publish to Netlify

`netlify.toml` sets the build command to `npm run build`, publish directory to `.next-netlify`, and Node.js to 22. Its `NETLIFY_BUILD=true` environment setting selects this separate Next.js output folder so local development can continue using `.next`. The Next.js adapter is explicitly installed and configured in `netlify.toml` so its route handler is packaged even when framework auto-detection is unavailable. Keep the Next.js server rendering used by `/messages`; do not drag the raw project or build folder onto Netlify Drop.

For a CLI deploy, use `npx netlify-cli login`, then `npx netlify-cli deploy --prod` and select/create the intended site. For automatic Git deployments, import `sheiikh-riiyad/NinjaAetherion` in Netlify after pushing the current changes. Local `.netlify` files are ignored by Git.

Once the production URL is assigned:

- Add its hostname (without `https://`) under Firebase Authentication > Settings > Authorized domains so Google sign-in works.
- Add the full HTTPS origin to `storage.cors.json`, then apply the bucket CORS settings using the existing Storage instructions.
- Deploy the current Firestore and Storage rules for orders, connected people, messaging, and attachments.
- Verify Google/email sign-in, client/admin orders, messaging, and attachments on the public URL.

The public Firebase web configuration in `firebaseconfig.js` supplies the defaults. Set the optional `NEXT_PUBLIC_FIREBASE_*` values from `.env.example` in Netlify only to override those defaults. Netlify publishing does not deploy Firebase rules or change bucket CORS.

### Demo payment playground

Open `/demo-payment` to test without creating an order, or choose **Demo payment** in an order's detail tabs. This is an entirely local checkout simulation, not an integration with Visa's sandbox or any live gateway. It does not collect card details, call a payment provider, write to Firestore, or mark orders paid.

Enter a test amount in BDT or USD and choose success, decline, or cancellation. The last result is stored in browser localStorage, scoped by account and order, and can be cleared or downloaded as a plain-text receipt prominently marked DEMO. A browser that blocks localStorage can still run the demo and download a receipt. The displayed amount is independent of the order's budget. No merchant account, API keys, or Firebase rule changes are required.

Validation tests: `node --experimental-strip-types --test tests/demo-payment.test.mjs`.

### Demo order installments: 20% / 50% / 30%

Create Order now requires a numeric BDT or USD budget of 1.00-999,999.99 and displays the payment plan. A successful 20% deposit simulation unlocks order submission. The same order ID and budget-specific receipt key are carried into its Payments tab. New budgets are stored as canonical strings (for example `BDT 10000.00`) using the existing Firestore schema; no rule update is needed. Older grouped budgets such as `BDT 20,000` are supported. Orders without a supported numeric currency/budget show an explanatory message.

The next 50% unlocks when the admin advances the order to Review. The final 30% unlocks at Delivered after both earlier demo installments. Installment amounts and currency are fixed by the order budget. Rounding is applied in minor units and the final installment takes the remainder so the amounts always sum to the budget. Changing the budget/currency creates separate receipt keys. Clearing or failing an earlier simulation clears downstream demo results.

All payment results remain browser-only demo receipts. The create-order check and installment unlocks are UI testing behavior, not verified payment enforcement. No money is collected, no paid flag is stored in Firestore, and administrators cannot see another browser's demo results. A real gateway with server-verified payments is still required before collecting installments from clients. The public `/demo-payment` playground now lets you test the entire installment sequence with simulated project stages.

### Manual USDT transfers and screenshots

New orders use a real, manually verified crypto payment flow. Clients save an order, then see the 20% deposit in its Payments tab. They select TRC20, BEP20 (BNB Smart Chain), or Polygon, copy the receiving address, send USDT, and submit a transaction hash plus PNG/JPG/WebP screenshot up to 5 MB. Screenshot submissions are pending until the administrator verifies the actual transfer in Binance. Clients cannot mark their own transfers verified. The next 50% is due at Review after deposit verification; the final 30% is due at Delivered after review payment verification. Project acceptance requires a verified deposit and progression to Delivered requires a verified review installment. Posting notes without changing stages remains possible.

Set up before accepting transfers:

1. Sign into Firebase CLI, then publish both rules: `npx firebase-tools deploy --only firestore:rules,storage --project ninjaaetherion`. This environment has no Firebase CLI login, so the assistant cannot publish these rules automatically. Existing rules do not support the new payment documents/order fields.
2. Apply `storage.cors.json` to the bucket (the production Netlify origin is included): `gcloud storage buckets update gs://ninjaaetherion.firebasestorage.app --cors-file=storage.cors.json`. You can run this from an authorized Google Cloud Shell if gcloud is not installed locally. Storage must be enabled and cross-service rules permissions granted.
3. As admin, visit Orders > Manage crypto payment addresses. Save your USDT deposit addresses from Binance. Settings are in Firestore document `payment/binance`, including `address` (common address), `trc20Address`, `bep20Address`, `polygonAddress`, `coin: USDT`, `usdRate: 1`, `bdtRate`, and `updatedAt`. A common 0x address can serve BEP20 and Polygon only when Binance supports USDT deposits to it on both networks. TRC20 needs a TRON-format address (or a compatible TRON common address). Address checks validate format only; they do not prove ownership or supported tokens.
4. The agreed quote is 1 USD of project budget = 1 USDT. BDT payments are disabled when `bdtRate` is zero; enter your agreed BDT per USDT quote to enable them. No live market-price service is used. Verify screenshot upload/download and the client/admin review flow before requesting funds from clients.

Orders created before this change retain their existing records. An admin can enable crypto on an older order from its Payments tab after confirming its numeric budget. Demo receipts are never converted into verified transfers.

`orders/{orderId}/cryptoPayments/{0|1|2}` stores each submission, its wallet/rate snapshot, screenshot metadata, and status. Files are stored privately under `paymentProofs/{orderId}/{clientId}/{installmentId}/{uploadId}/screenshot`, using authenticated downloads. Rejected proof can be replaced without another transfer. An atomic `cryptoTransactions/{network}_{normalizedTxid}` record prevents the same transaction hash being verified for another installment. Hashes are normalized to lowercase without 0x. Verified proof is immutable. Orphan screenshot uploads from failed saves may require bucket cleanup.

This is not Binance Pay, an automated Binance API integration, or on-chain confirmation. Admins must check the transaction hash, token, network, recipient address, and net amount received before verification. Never treat a screenshot alone as proof of receipt. The receiving address is not a private key; never store wallet private keys or seed phrases here.

Validation: `node --experimental-strip-types --test tests/crypto-payment.test.mjs tests/installments.test.mjs`. Firestore permission checks are in `tests/crypto-rules.test.mjs`; with Java 21 available, run `npx firebase-tools emulators:exec --config firebase.emulator-test.json --only firestore --project demo-ninja-crypto "node --test tests/crypto-rules.test.mjs"`. That test only uses emulator tokens and never connects to the live project. Storage uploads and live wallet ownership are not tested by these checks.

Address-only wallet compatibility: an existing `payment/binance` document containing just `address` now defaults to the agreed `USDT` coin and `usdRate: 1`. Missing network overrides are treated as empty strings; common addresses are still restricted to compatible network formats. BDT remains disabled without an explicit quote. Explicitly invalid coin/rate settings are not silently replaced. Order creation now distinguishes missing wallet addresses, missing quotes, and disabled BDT payments instead of showing a generic configuration error for all cases (including an empty budget). Publish the updated Firestore rules to use the same legacy defaults when saving payment proof, or open the admin wallet editor and save the complete settings.
