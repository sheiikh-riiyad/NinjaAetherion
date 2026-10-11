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
