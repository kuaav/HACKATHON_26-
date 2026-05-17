
# AbilityBridge

**An inclusive career platform built for Persons with Disabilities (PWD / OKU) in Malaysia.**

**Live Demo:** [https://abilitybridge.onrender.com](https://abilitybridge.onrender.com)

---

## What Is It?

Most job platforms ask everyone to apply the same way. AbilityBridge flips that - it builds a profile around *how you work*, then matches you to jobs that are genuinely ready to support you.

No more guessing if a company is accessible. No more explaining your needs from scratch every time you apply.

---

## Features

- **AI Ability Scan** - Type or speak about yourself. The AI finds your real strengths (and is honest about challenges too). Works via text or voice.
- **PWD Job Matching** - Every listing has a PWD Match Score (0–100) based on accessibility perks, remote options, sensory environment, and more.
- **Adaptive Assessments** - Pattern recognition, logical reasoning, memory, and typing - all with optional timed mode and reduced sensory UI.
- **AI Cover Letter Generator** - One click generates a personalised cover letter using your ability profile.
- **Accessibility Settings** - High contrast, dyslexia-friendly font, font size control, reduced motion - all live, no page reload.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3 + Flask |
| AI | Groq API (llama3-8b-8192) |
| Frontend | Vanilla JavaScript (no framework) |
| Styling | CSS custom properties |
| Hosting | Render |

---

## Project Structure

```
abilitybridge/
├── app.py              # Flask backend - all API routes
├── ai_engine.py        # AI logic: AbilityProfiler + JobMatcher
├── templates/
│   └── index.html      # Single-page HTML shell
└── static/
    ├── css/style.css
    ├── js/script.js
    └── images/logo.png
```

---

## Getting Started

### Prerequisites

- Python 3.8+
- A free [Groq API key](https://console.groq.com)

### Run Locally

```bash
# 1. Clone the repo
git clone https://github.com/your-username/abilitybridge.git
cd abilitybridge

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set environment variables
export GROQ_API_KEY=your_groq_api_key_here
export SECRET_KEY=any_random_secret_string

# 4. Start the server
python app.py
```

Then open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser.

> **No database setup needed.** The app uses in-memory storage for demo purposes just for hackathon.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/signup` | Create a new account |
| POST | `/api/login` | Sign in |
| POST | `/api/logout` | Sign out |
| POST | `/api/generate-profile` | Run AI ability scan |
| POST | `/api/match-jobs` | Score and rank jobs for a profile |
| POST | `/api/generate-application` | Generate a cover letter |
| POST | `/api/save-assessment` | Save assessment results |
| GET | `/api/health` | Health check |

---

## How the AI Works

**AbilityProfiler** sends the user's text or voice transcript to the Groq API with a carefully designed prompt. It:
- Only extracts strengths that are actually visible in the input
- Honestly notes challenges (not just flattery)
- Returns a confidence score (0–93) based on how much detail was given
- Falls back to a rule-based profiler if the API is unavailable

**JobMatcher** scores every job against the user's profile - boosting matches for remote preferences, communication style, skill keywords, and accessibility tag overlap.

---

## Accessibility

AbilityBridge is itself built accessibly:

- Full keyboard navigation (`Alt+H` for Home, `Alt+J` for Jobs, `Escape` to close modals)
- ARIA labels and roles throughout
- `aria-live` regions for dynamic content
- High contrast mode, dyslexia font, reduced motion - all toggleable live
- No auto-playing media or strobing animations
- Screen reader compatible

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | Your Groq API key |
| `SECRET_KEY` | Yes | Flask session secret (any random string) |

---

## Known Limitations (Demo Version)

- User data is stored in memory - it resets when the server restarts
- Passwords use SHA-256 hashing (use bcrypt for production)
- Job listings are hardcoded (10 Malaysian roles)

---

## Roadmap for Future Enhancements

- [ ] PostgreSQL database integration
- [ ] Employer-facing dashboard to post verified accessible roles
- [ ] OKU card verification flow
- [ ] Bahasa Malaysia language support
- [ ] Mobile app (PWA)

---

## Built With ❤️ For

> Over 600,000 registered OKU individuals in Malaysia - the majority unemployed not because they lack skills, but because hiring systems weren't built for them.

---

## Notes

- `ai_engine.py` includes a Groq API integration for AI text analysis. In production, move the API key to an environment variable and secure it appropriately.
- Voice scanning uses browser SpeechRecognition and works best in supported browsers like Chrome or Edge.
- The current implementation uses an in-memory user store. For production, replace `USER_STORE` with a database.
