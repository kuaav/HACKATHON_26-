from flask import Flask, render_template, request, jsonify, session, send_from_directory
from flask_cors import CORS
from ai_engine import AbilityProfiler, JobMatcher
import hashlib
import os

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "abilitybridge-dev-secret-2024")
CORS(app, supports_credentials=True)

profiler = AbilityProfiler()
matcher = JobMatcher()

# in-memory user store (swap for a db in production)
USER_STORE = {}


@app.route("/")
def index():
    return render_template("index.html")


# serve logo.png from the templates folder
@app.route("/logo.png")
def serve_logo():
    return send_from_directory("templates", "logo.png")


@app.route("/api/signup", methods=["POST"])
def api_signup():
    data = request.get_json(force=True)
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    if not name or not email or not password:
        return jsonify({"error": "All fields are required."}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400
    if email in USER_STORE:
        return jsonify({"error": "An account with this email already exists."}), 409

    USER_STORE[email] = {
        "name": name,
        "email": email,
        "password_hash": hashlib.sha256(password.encode()).hexdigest(),
        "profile": {},
        "assessment_results": {},
    }
    session["user_email"] = email
    return jsonify({"success": True, "name": name}), 201


@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json(force=True)
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    if not email or not password:
        return jsonify({"error": "Please fill in all fields."}), 400

    user = USER_STORE.get(email)
    if not user:
        return jsonify({"error": "No account found with that email."}), 401
    if user["password_hash"] != hashlib.sha256(password.encode()).hexdigest():
        return jsonify({"error": "Incorrect password."}), 401

    session["user_email"] = email
    return jsonify({"success": True, "name": user["name"]}), 200


@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"success": True}), 200


@app.route("/api/generate-profile", methods=["POST"])
def api_generate_profile():
    try:
        data = request.get_json(force=True)
        input_type = data.get("type", "text")
        content = data.get("content", "").strip()
        duration_seconds = data.get("duration_seconds", 0)

        if input_type == "voice" and duration_seconds < 5:
            return jsonify({
                "error": "insufficient_input",
                "message": "Please speak for at least 5 seconds.",
                "confidence": 0,
                "strengths": [],
            }), 400

        profile = profiler.generate(input_type, content)

        if profile.get("error") == "insufficient_input":
            return jsonify(profile), 400

        email = session.get("user_email")
        if email and email in USER_STORE:
            USER_STORE[email]["profile"]["ability"] = profile

        return jsonify(profile), 200

    except Exception as e:
        print(f"generate_profile error: {e}")
        return jsonify({"error": "Profile generation failed.", "confidence": 0, "strengths": []}), 500


@app.route("/api/match-jobs", methods=["POST"])
def api_match_jobs():
    try:
        data = request.get_json(force=True)
        jobs = matcher.find_matches(data.get("profile", {}))
        return jsonify({"jobs": jobs}), 200
    except Exception as e:
        print(f"match_jobs error: {e}")
        return jsonify({"jobs": [], "error": "Matching failed."}), 500


@app.route("/api/generate-application", methods=["POST"])
def api_generate_application():
    data = request.get_json(force=True)
    name = data.get("name", "Applicant").strip()
    job_title = data.get("job_title", "the position").strip()
    company = data.get("company", "the company").strip()
    cover_note = data.get("cover_note", "").strip()
    ability_profile = data.get("ability_profile", None)

    email = session.get("user_email")
    if email and email in USER_STORE:
        stored = USER_STORE[email].get("profile", {})
        if not ability_profile:
            ability_profile = stored.get("ability")

    strengths_text = ""
    if ability_profile:
        strengths = ability_profile.get("strengths", [])
        if strengths:
            strengths_text = f"\nApplicant's key strengths: {', '.join(strengths)}"

    from ai_engine import _groq_chat
    prompt = f"""Write a professional job application cover letter for a PWD applicant.

Applicant: {name}
Position: {job_title}
Company: {company}
Extra notes: {cover_note if cover_note else 'None'}{strengths_text}

Write 3 focused paragraphs:
1. Enthusiasm for the role and why they are a good fit
2. Specific strengths and what they bring to the team
3. Gracious close, mention openness to an accessible interview format

No accommodation requests - this is purely an application letter. Sign off as {name}. No preamble outside the letter."""

    try:
        letter = _groq_chat(prompt, max_tokens=600)
    except Exception as e:
        print(f"letter generation error: {e}")
        extra = f"\n\n{cover_note}" if cover_note else ""
        strengths_display = f" My key strengths include {strengths_text.strip()}." if strengths_text else ""
        letter = (
            f"Dear Hiring Team at {company},\n\n"
            f"I am writing to express my strong interest in the {job_title} position."
            f"{strengths_display}"
            f"{extra}\n\n"
            f"I would welcome the opportunity to discuss my application further and am happy to "
            f"participate in an interview format that works best for your team.\n\n"
            f"Thank you sincerely for your consideration.\n\nWarm regards,\n{name}"
        )

    return jsonify({"letter": letter}), 200


@app.route("/api/save-assessment", methods=["POST"])
def api_save_assessment():
    try:
        data = request.get_json(force=True)
        email = session.get("user_email")
        if email and email in USER_STORE:
            USER_STORE[email]["assessment_results"][data.get("type", "unknown")] = data
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "AbilityBridge API", "users": len(USER_STORE)}), 200


if __name__ == "__main__":
    print("AbilityBridge -- http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
