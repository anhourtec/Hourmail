# HourInbox — Project Plan

## Vision

A modern, web-based IMAP email client that gives organizations a Gmail/Outlook-quality experience on top of any IMAP/SMTP email server. Self-hosted, open-source, free to use.

---

## Problem Statement

Many organizations use third-party email servers (Purelymail, Dovecot, Postfix, etc.) with outdated web clients like Roundcube or SquirrelMail. These interfaces are:

- Visually dated and difficult to use
- Not mobile-friendly
- Lacking modern features (search, threading, keyboard shortcuts)
- Poor user experience compared to Gmail/Outlook

HourInbox solves this by providing a modern web frontend that connects to any standard IMAP/SMTP server.

---

## Architecture

### Core Flow

```
Admin registers org → saves IMAP/SMTP config to PostgreSQL
                                    ↓
User logs in with email/password → domain lookup → IMAP auth → session in Redis
                                    ↓
User reads/sends email → ImapFlow (read) / Nodemailer (send) → mail server
```

### Key Design Decisions

1. **No password storage** — User passwords are only used to authenticate against IMAP. Sessions are maintained via encrypted tokens in Redis.

2. **Organization-first model** — One admin configures IMAP/SMTP settings per domain. All users on that domain can log in immediately.

3. **Server-side IMAP** — IMAP connections are managed server-side (Nitro API routes), not in the browser. This avoids CORS issues and keeps credentials secure.

4. **Redis for sessions + cache** — User sessions and recently-fetched mailbox listings are cached in Redis for speed.

5. **Non-standard ports** — All Docker services use non-standard ports (app: 3847, PostgreSQL: 5487, Redis: 6391) to avoid conflicts on shared/existing servers.

---

## Data Model

### Organization
```
id                  UUID (primary key)
name                String ("Anhourtec")
domain              String (unique, "anhourtec.com")
imapHost            String ("imap.purelymail.com")
imapPort            Int (993)
smtpHost            String ("smtp.purelymail.com")
smtpPort            Int (465)
tlsMode             String ("tls" | "starttls" | "none")
rejectUnauthorized  Boolean (true)
createdAt           DateTime
updatedAt           DateTime
```

### Session (Redis)
```
key:    session:{token}
value:  JSON { email, orgId, imapHost, imapPort, smtpHost, smtpPort, tlsMode, rejectUnauthorized }
ttl:    24 hours
```

No user table is needed — authentication is delegated entirely to the IMAP server.

---

## API Routes

### Authentication
| Method | Path               | Description                           |
| ------ | ------------------ | ------------------------------------- |
| POST   | /api/auth/login    | Authenticate via IMAP, create session |
| POST   | /api/auth/logout   | Destroy session                       |
| GET    | /api/auth/me       | Get current user from session         |

### Organization Management
| Method | Path               | Description                           |
| ------ | ------------------ | ------------------------------------- |
| POST   | /api/org/register  | Register new organization             |
| GET    | /api/org/:domain   | Get org info (public, no secrets)     |

### Mail Operations
| Method | Path                       | Description                    |
| ------ | -------------------------- | ------------------------------ |
| GET    | /api/mail/folders          | List mailbox folders           |
| GET    | /api/mail/messages         | List messages in a folder      |
| GET    | /api/mail/messages/:id     | Get full message content       |
| POST   | /api/mail/send             | Send email via SMTP            |
| PUT    | /api/mail/messages/:id     | Update flags (read, starred)   |
| DELETE | /api/mail/messages/:id     | Delete / move to trash         |

---

## Pages

| Route                | Description                              |
| -------------------- | ---------------------------------------- |
| `/`                  | Landing page / redirect to inbox         |
| `/login`             | User login (email + password)            |
| `/register`          | Organization registration (admin only)   |
| `/inbox`             | Main inbox view                          |
| `/inbox/:id`         | Read email                               |
| `/compose`           | Compose new email                        |
| `/folders/:name`     | View emails in any folder                |
| `/settings`          | Organization settings                    |

---

## Technology Choices

| Technology    | Purpose                              | Why                                              |
| ------------- | ------------------------------------ | ------------------------------------------------ |
| Nuxt 4        | Full-stack framework                 | SSR, file-based routing, Nitro server engine      |
| Nuxt UI       | Component library                    | Beautiful defaults, dark mode, accessibility       |
| Tailwind CSS 4| Styling                              | Utility-first, fast development                    |
| Prisma        | Database ORM                         | Type-safe, migrations, great DX                    |
| PostgreSQL    | Primary database                     | Reliable, feature-rich, widely supported           |
| Redis         | Session store + cache                | Fast, TTL support, pub/sub potential               |
| ImapFlow      | IMAP client                          | Modern, promise-based, well-maintained             |
| Nodemailer    | SMTP client                          | Industry standard for Node.js email sending        |
| Docker        | Deployment                           | Reproducible, easy self-hosting                    |

---

## Security Considerations

1. **Passwords are never stored** — only used transiently for IMAP authentication
2. **Sessions are encrypted** — stored in Redis with secure, httpOnly cookies
3. **TLS enforced** — IMAP/SMTP connections use TLS/SSL by default
4. **Rate limiting** — Login attempts are rate-limited to prevent brute force
5. **Input validation** — All API inputs are validated server-side
6. **CSRF protection** — Nuxt's built-in CSRF handling

---

## Roadmap

### Phase 1 — MVP (Current)
- [x] Project setup (Nuxt 4, Tailwind, Nuxt UI)
- [ ] Organization registration
- [ ] User login via IMAP
- [ ] Inbox listing (read emails)
- [ ] Email viewer
- [ ] Compose & send emails
- [ ] Basic folder navigation

### Phase 2 — Enhanced Experience
- [ ] Email search
- [ ] Conversation threading
- [ ] Keyboard shortcuts
- [ ] Drag-and-drop attachments
- [ ] Email signatures
- [ ] Multiple account support

### Phase 3 — Advanced Features
- [ ] Push notifications (IMAP IDLE)
- [ ] Contact auto-complete
- [ ] Calendar integration
- [ ] Email templates
- [ ] Admin dashboard (multi-org)
- [ ] Mobile PWA

---

## Contributing

This is an open-source project. Contributions, bug reports, and feature requests are all welcome. See the main [README](../README.md) for contribution guidelines.
