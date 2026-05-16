# AbilityBridge

AbilityBridge is an inclusive career platform prototype built with Flask. It helps users create an ability-first profile, scan text or voice input for ability strengths, match with accessible job listings, take adaptive assessments, and generate strong application letters.

## Key Features

- User registration, login, and session management
- Ability profiling from text or voice input
- AI-assisted ability analysis using a Groq-backed engine
- Inclusive job matching with PWD-friendly scoring and accessibility data
- Adaptive assessment modules for reasoning, patterns, memory, and typing
- Cover letter generation for job applications, personalised from profile data
- Accessibility settings and preferences built into the client UI
- API-based architecture with endpoints for profile generation, job matching, and application drafts

## Project Structure

- `app.py` - Flask application and REST API endpoints
- `ai_engine.py` - Ability profiling and job matching logic, including Groq chat integration
- `templates/index.html` - Front-end UI shell and page structure
- `static/css/style.css` - Application styling
- `static/js/script.js` - Front-end client logic, navigation, authentication, scanning, job browsing, and assessments
- `requirements.txt` - Python dependencies

## Setup

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. (Optional) Set a custom secret key for session security:

```bash
export SECRET_KEY="your-secret-key"
```

3. Run the application:

```bash
python app.py
```

4. Open the app in your browser at:

```bash
http://127.0.0.1:5000
```

## Usage

- Sign up or log in to access the full experience
- Create your profile and select accessibility preferences during onboarding
- Use the AI ability scan to analyse text or voice descriptions of your skills
- Browse job listings filtered by inclusive and accessible work features
- Open a job and generate a personalised cover letter from your profile
- Take adaptive assessments to build a stronger candidate profile

## API Endpoints

- `GET /` - Serve the main interface
- `POST /api/signup` - Create an account
- `POST /api/login` - Log in
- `POST /api/logout` - Log out
- `POST /api/generate-profile` - Generate an ability profile from text or voice input
- `POST /api/match-jobs` - Match jobs against the profile
- `POST /api/generate-application` - Generate a job application cover letter
- `POST /api/save-assessment` - Save assessment results
- `GET /api/health` - Health check endpoint

## Notes

- `ai_engine.py` includes a Groq API integration for AI text analysis. In production, move the API key to an environment variable and secure it appropriately.
- Voice scanning uses browser SpeechRecognition and works best in supported browsers like Chrome or Edge.
- The current implementation uses an in-memory user store. For production, replace `USER_STORE` with a database.

## License

This project is a hackathon prototype and may be adapted for continued development.

