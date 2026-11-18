# YCCE CT App

A full campus platform for the Computer Technology department at YCCE, Nagpur. One API serves a **web portal** for admins and faculty and a **mobile app** for students and faculty. It covers attendance, fees, results, placements, announcements, fests and an AI study assistant.

> **Status:** a personal project I designed and built end to end. It isn't officially adopted by the college. The web portal is live as a demo at [ycce-app-web.vercel.app](https://ycce-app-web.vercel.app), and the mobile app runs through Expo.

| Part | Repository | Stack |
|---|---|---|
| Web portal (this repo) | [ycce-app-web](https://github.com/23071183-sys/ycce-app-web) | Next.js 16, React 19, Tailwind CSS 4, Framer Motion |
| Mobile app | [ycce-app](https://github.com/23071183-sys/ycce-app) | Expo SDK 58, React Native 0.88, React Navigation |
| API | [ycce-app-backend](https://github.com/23071183-sys/ycce-app-backend) | Node.js, Express 5, PostgreSQL |

## Screens

<p align="center">
  <img src="docs/screenshots/phone-01.webp" alt="Student home: next lecture, streak and attendance" width="165" />
  <img src="docs/screenshots/phone-02.webp" alt="Attendance per subject" width="165" />
  <img src="docs/screenshots/phone-04.webp" alt="Results with SGPA, CGPA and grade sheet" width="165" />
  <img src="docs/screenshots/phone-03.webp" alt="Subjects with professors" width="165" />
</p>

![Admin overview](docs/screenshots/web-01.webp)

| Results and SGPA | Placement drives |
|---|---|
| ![Results](docs/screenshots/web-02.webp) | ![Placements](docs/screenshots/web-03.webp) |
| **Announcements** | **Fest events and check-in** |
| ![Announcements](docs/screenshots/web-04.webp) | ![Events](docs/screenshots/web-05.webp) |

Screenshots use sample data only.

## What it does

**Students (mobile)**
- Home with the next lecture, an attendance streak and the subjects that need attention
- QR attendance: scan the code on the professor's screen to mark yourself present
- Attendance per subject, results with SGPA and CGPA, and the full grade sheet
- Fees with Razorpay payments and PDF receipts
- Timetable, assignments, placements, announcements and messages
- Compufest and Yash Fest registrations with tickets
- Study tools: quizzes, flashcards with spaced review, and a study plan
- An AI assistant that answers college questions

**Faculty (web and mobile)**
- Start a QR attendance session, or mark attendance by hand or in bulk
- Enter MSE, TA and ESE marks per subject, and see monthly and per-subject reports
- Post announcements to a year, a batch or a subject; set and grade assignments

**Admins (web)**
- Approve student sign-ups and manage users and faculty
- Fee structures, invoices, offline payments, waivers and collection status
- SGPA records, placement drives with eligibility and outcomes, fest events and door check-in

Roles are `super_admin`, `admin`, `professor`, `fest_admin` and `student`, and the API checks the role on every route.

## How it works

```
   Mobile app (Expo)          Web portal (Next.js)
            \                        /
             \                      /
            Express API  (JWT + roles)
     /        |          |          |         \
 PostgreSQL  Razorpay   Expo push   Cloudinary  Claude
             payments   + Firebase  uploads     AI assistant
```

Details worth knowing:

- **QR attendance that can't be shared.** The professor's screen shows a code that changes every 10 seconds (an HMAC of the session secret and the time window), so a photo sent to a friend outside the room stops working within about 20 seconds. Scans can also be checked against the classroom's location. Closing a session marks everyone else absent without overwriting anything already marked.
- **Payments that reconcile.** Razorpay signs the raw request body, so the webhook is mounted before `express.json()` and verifies the signature. A job every 15 minutes settles any payment the webhook missed, and receipts are generated as PDFs with PDFKit.
- **Scheduled jobs.** `node-cron` sends lecture-start reminders every minute, assignment-deadline reminders 24 hours ahead, and runs late fees and fee reminders at 09:00 IST.
- **A host that sleeps.** The API runs on Render's free plan, which sleeps when idle. The mobile app waits up to 40 seconds and retries 502, 503 and 504 responses while the server wakes, and a GitHub Actions job pings it every 10 minutes to keep it warm.
- **Schema on boot.** `scripts/migrate.js` creates the base tables, and the server adds newer tables and columns when it starts, so deploys don't need a separate migration step.

## Run it locally

You need Node.js 22 or later and a PostgreSQL database.

**1. API** ([ycce-app-backend](https://github.com/23071183-sys/ycce-app-backend))

```bash
git clone https://github.com/23071183-sys/ycce-app-backend.git
cd ycce-app-backend
npm install
```

Create a `.env` file:

```bash
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ycce
JWT_SECRET=any-long-random-string
# With placeholder Cloudinary values, uploads are saved to ./uploads instead
CLOUDINARY_CLOUD_NAME=local
CLOUDINARY_API_KEY=local
CLOUDINARY_API_SECRET=local
# Optional: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, ANTHROPIC_API_KEY, FIREBASE_*, RESEND_API_KEY
```

Create the tables, add sample data and start the server:

```bash
npm run migrate
npm run seed
npm start
```

The seed creates sample accounts for local use, all with the password `test1234`: `admin@ycce.edu`, `anjali@ycce.edu` (professor), `aditya@ycce.edu` (student) and `fest@ycce.edu` (fest admin). New accounts start as pending until an admin approves them.

**2. Web portal** (this repo)

```bash
npm install
echo NEXT_PUBLIC_API_URL=http://localhost:3000/api > .env.local
npm run dev -- -p 3001
```

Open http://localhost:3001 and sign in as the sample admin.

**3. Mobile app** ([ycce-app](https://github.com/23071183-sys/ycce-app))

```bash
git clone https://github.com/23071183-sys/ycce-app.git
cd ycce-app
npm install
npx expo start
```

Scan the QR code with Expo Go. The repo's `.env` points the app at the live API; to use your local one instead, set `EXPO_PUBLIC_API_URL=http://<your-computer's-IP>:3000/api`.

## Deployment

- **Web portal:** Vercel, with `NEXT_PUBLIC_API_URL` pointing at the API.
- **API:** Render (see `render.yaml`) with PostgreSQL.
- **Mobile app:** Expo EAS Update on the `preview` channel, so changes reach phones without a store release.

## Author

Built by [Aayush Santoshwar](https://aayush-santoshwar.vercel.app) as a solo project: the API, the web portal and the mobile app.
