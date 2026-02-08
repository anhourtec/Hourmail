# HourMail

**A modern, web-based IMAP email client for organizations** — built by [Anhourtec](https://anhourtec.com)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Nuxt](https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxt)](https://nuxt.com)
[![Open Source](https://img.shields.io/badge/Open%20Source-Free-brightgreen)](#)

---

## What is HourMail?

HourMail is a **free, open-source, web-based email client** that connects to any IMAP/SMTP email server. It provides a modern Gmail/Outlook-style interface for organizations stuck with outdated email clients like Roundcube, SquirrelMail, or clunky mobile interfaces.

**One-time setup, zero friction for users:**

1. An admin registers their organization with IMAP/SMTP settings (e.g., `imap.gmail.com:993`)
2. Any user from that domain (e.g., `nsingh@anhourtec.com`) can instantly log in using their existing email credentials
3. That's it — no additional registration, no configuration per user

## Features

- **Modern UI** — Clean, responsive Gmail/Outlook-inspired design with dark mode
- **IMAP/SMTP** — Works with any standard email server (Gmail, Dovecot, Postfix, Exchange, etc.)
- **Organization-first** — One admin setup, unlimited users per domain
- **Fast** — Redis-cached sessions, server-side rendering with Nuxt
- **Mobile-friendly** — Fully responsive, works great on phones and tablets
- **Self-hosted** — Run on your own server with Docker
- **Open source** — MIT licensed, contributions welcome

## Tech Stack

| Layer        | Technology                        |
| ------------ | --------------------------------- |
| Frontend     | Nuxt 4, Nuxt UI, Tailwind CSS 4  |
| Backend      | Nitro (Nuxt server engine)        |
| Database     | PostgreSQL + Prisma ORM           |
| Cache        | Redis (sessions + mailbox cache)  |
| Email        | ImapFlow (IMAP) + Nodemailer (SMTP) |
| Deployment   | Docker + Docker Compose           |

## Deployment

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)
- A server or VPS (Ubuntu, Debian, etc.)

### Option 1: One-Command Deploy (Recommended)

```bash
git clone https://github.com/anhourtec/hourmail.git
cd hourmail
chmod +x build.sh
./build.sh
```

On the first run, `build.sh` will:
- Create a `.env` file from `.env.example`
- Generate a random session secret automatically
- Exit so you can review the `.env` file

After reviewing `.env`, run `./build.sh` again to build and start all containers.

### Option 2: Docker Compose

```bash
git clone https://github.com/anhourtec/hourmail.git
cd hourmail
cp .env.example .env
```

Edit `.env` with your settings, then:

```bash
docker compose up -d
```

This starts PostgreSQL (port `5487`), Redis (port `6391`), and the app (port `3847`).

### Environment Variables

The `.env.example` file contains all required configuration:

```env
# Database (PostgreSQL)
POSTGRES_USER=hourmail
POSTGRES_PASSWORD=hourmail_secret
POSTGRES_DB=hourmail
DATABASE_URL=postgresql://hourmail:hourmail_secret@<SERVER_IP>:5487/hourmail

# Redis
REDIS_PASSWORD=redis_secret
REDIS_URL=redis://default:redis_secret@<SERVER_IP>:6391

# App
NUXT_PORT=3847
NUXT_SESSION_SECRET=change-me-to-a-random-64-char-string
```

Replace `<SERVER_IP>` with your server's IP address (or `localhost` for local development).

### After Deployment

Visit `http://your-server:3847` and register your first organization.

## Local Development

```bash
npm install
npm run dev
```

That's it — `npm run dev` automatically runs `prisma generate` and `prisma db push` before starting the server.

The dev server runs on [http://localhost:3847](http://localhost:3847).

## Port Reference

All ports are intentionally non-standard to avoid conflicts on shared machines:

| Service    | Port   | Standard Port |
| ---------- | ------ | ------------- |
| App        | `3847` | 3000          |
| PostgreSQL | `5487` | 5432          |
| Redis      | `6391` | 6379          |

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Browser                     │
│         (Nuxt UI + Tailwind CSS)             │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│              Nuxt Server (Nitro)             │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ Auth API │ │ Mail API │ │ Org Admin API│ │
│  └────┬─────┘ └────┬─────┘ └──────┬───────┘ │
│       │             │              │          │
│  ┌────▼─────────────▼──────────────▼───────┐ │
│  │           Service Layer                  │ │
│  │  ImapFlow  │  Nodemailer  │  Prisma     │ │
│  └────┬───────────┬──────────────┬─────────┘ │
└───────┼───────────┼──────────────┼───────────┘
        │           │              │
   ┌────▼───┐  ┌───▼────┐   ┌────▼──────┐
   │  IMAP  │  │  SMTP  │   │ PostgreSQL│
   │ Server │  │ Server │   │  + Redis  │
   └────────┘  └────────┘   └───────────┘
```

## How It Works

### Organization Registration
An admin visits `/register` and enters:
- Organization name (e.g., "Anhourtec")
- Email domain (e.g., `anhourtec.com`)
- IMAP host & port (e.g., `imap.gmail.com:993`)
- SMTP host & port (e.g., `smtp.gmail.com:465`)
- TLS/SSL preferences

### User Login
Any user from a registered domain visits `/login` and enters:
- Email address (e.g., `nsingh@anhourtec.com`)
- Password (their existing email password)

HourMail extracts the domain, looks up the IMAP settings, authenticates directly against the mail server, and creates a session. **No passwords are ever stored.**

## Project Structure

```
hourmail/
├── app/
│   ├── assets/css/        # Tailwind CSS
│   ├── components/        # Vue components
│   ├── composables/       # Shared composables
│   ├── layouts/           # Page layouts
│   ├── middleware/         # Route guards
│   ├── pages/             # File-based routing
│   └── app.vue            # Root component
├── server/
│   ├── api/               # API routes
│   ├── middleware/         # Server middleware
│   └── utils/             # Server utilities (IMAP, SMTP, Redis)
├── prisma/
│   └── schema.prisma      # Database schema
├── docker-compose.yml
├── Dockerfile
├── build.sh               # One-command deploy script
└── .env.example
```

## Useful Commands

### Delete a registered organization

```bash
npx prisma db execute --schema prisma/schema.prisma --stdin <<< "DELETE FROM organizations WHERE domain = 'example.com';"
```

## Contributing

Contributions are welcome and appreciated! This is an open-source project, and collaborators are encouraged to get involved.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Contributors

<a href="https://github.com/anhourtec/hourmail/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=anhourtec/hourmail" />
</a>

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=anhourtec/Hourmail&type=date&legend=top-left)](https://www.star-history.com/#anhourtec/Hourmail&type=date&legend=top-left)

## Disclaimer (Self-Hosted)

If you self-host HourMail, you are solely responsible for securing your own infrastructure, data, and credentials. HourMail is provided "as is" without warranty. Anhourtec is not responsible for any data loss, security breaches, or issues arising from self-hosted deployments. See the [LICENSE](LICENSE) for full terms.

## License

[MIT](LICENSE) — free to use, modify, and distribute.

Built with care by [Anhourtec](https://anhourtec.com).
