import random
import json
import urllib.request
import os

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL   = "llama3-8b-8192"
GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions"


def _groq_chat(prompt: str, max_tokens: int = 700) -> str:
    payload = json.dumps({
        "model": GROQ_MODEL,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.4,
    }).encode("utf-8")

    req = urllib.request.Request(
        GROQ_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {GROQ_API_KEY}",
        },
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    return data["choices"][0]["message"]["content"].strip()


JOB_DATABASE = [
    {
        "id": "job_001", "title": "Junior Web Developer", "company": "Codify Sdn Bhd",
        "location": "Fully Remote", "salary_rm": 3200, "base_pwd_score": 94, "type": "Full-time",
        "tags": ["remote", "keyboard-friendly", "async"],
        "perks": ["Fully remote", "Async-first (Notion + Slack)", "Flexible hours (core 10am-2pm)", "Screen reader & keyboard-nav compatible", "No video meetings required"],
        "description": "Build and maintain client web applications using HTML, CSS, and JavaScript. Remote-first agency that actively hires PWD candidates and provides all assistive technology.",
        "requirements": ["HTML/CSS/JS basics", "Git fundamentals", "Willingness to learn"],
        "disability_statement": "We actively encourage applications from persons with disabilities. All equipment and software accommodations provided.",
    },
    {
        "id": "job_002", "title": "Data Entry & Quality Analyst", "company": "Prisma Analytics",
        "location": "Kuala Lumpur (Hybrid 3x/week)", "salary_rm": 2800, "base_pwd_score": 88, "type": "Full-time",
        "tags": ["hybrid", "wheelchair-accessible", "structured", "quiet"],
        "perks": ["Wheelchair accessible office (ramp access)", "Ergonomic workstation provided", "Flexible start times (8am-10am)", "Structured routines - neurodivergent-friendly", "Quiet focus pods available"],
        "description": "Review and validate datasets for accuracy. Ideal for detail-oriented candidates who thrive in structured, predictable environments with minimal interruptions.",
        "requirements": ["Attention to detail", "Basic Excel or Google Sheets", "Good written communication"],
        "disability_statement": "Registered OKU-friendly employer. Transport allowance provided for candidates with mobility needs.",
    },
    {
        "id": "job_003", "title": "Customer Support Specialist (Chat Only)", "company": "HelpDesk Heroes",
        "location": "Fully Remote", "salary_rm": 2600, "base_pwd_score": 91, "type": "Full-time / Part-time",
        "tags": ["remote", "text-only", "deaf-friendly", "async"],
        "perks": ["100% text-based - zero phone calls ever", "Work-from-home with internet allowance (RM80/month)", "Shift flexibility", "Neurodivergent-inclusive onboarding", "Written communication culture"],
        "description": "Handle customer enquiries via live chat and email. Perfect for candidates with strong written communication who prefer non-verbal interaction.",
        "requirements": ["Strong written English or BM", "Patience and empathy", "Basic computer literacy"],
        "disability_statement": "No voice calls required. Deaf, hard-of-hearing, and speech-impaired applicants welcome.",
    },
    {
        "id": "job_004", "title": "Graphic Designer (Part-Time)", "company": "Kreativ Studio KL",
        "location": "Petaling Jaya (Flexible)", "salary_rm": 2200, "base_pwd_score": 82, "type": "Part-time",
        "tags": ["flexible", "output-based", "neurodivergent-friendly"],
        "perks": ["Output-based - no fixed hours", "Work from home or studio", "Neurodivergent ERG", "Async feedback cycles", "Assistive tech budget (RM500/year)"],
        "description": "Create social media graphics, branding assets, and marketing collateral. Values creative output over office presence.",
        "requirements": ["Canva or Adobe basics", "Eye for design", "Ability to meet deadlines"],
        "disability_statement": "Candidates assessed on portfolio quality, not interview performance. Alternative assessment formats available.",
    },
    {
        "id": "job_005", "title": "Accounts & Bookkeeping Assistant", "company": "Urus Buku Sdn Bhd",
        "location": "Shah Alam (Hybrid)", "salary_rm": 3000, "base_pwd_score": 79, "type": "Full-time",
        "tags": ["hybrid", "quiet", "structured", "wheelchair-accessible"],
        "perks": ["Structured, predictable workflow", "Quiet individual workstations", "Accessible building with lift", "No client-facing duties", "Fixed hours (9am-5pm)"],
        "description": "Manage accounts payable/receivable, bank reconciliations, and monthly reporting. Great for structured, numbers-focused thinkers.",
        "requirements": ["SPM or Diploma in Accounting", "Basic spreadsheet skills", "Numerical accuracy"],
        "disability_statement": "OKU card holders receive priority shortlisting. Dedicated HR contact for accommodation requests.",
    },
    {
        "id": "job_006", "title": "Content Writer (Freelance Remote)", "company": "Wordsmiths Malaysia",
        "location": "Fully Remote", "salary_rm": 2400, "base_pwd_score": 93, "type": "Freelance",
        "tags": ["remote", "flexible", "async", "dyslexia-friendly"],
        "perks": ["Fully flexible hours", "Written briefs - no meetings needed", "Pay-per-article", "Supportive Slack community", "Dyslexia-friendly style guide provided"],
        "description": "Write blog articles, product descriptions, and social content for Malaysian brands. Consistent work volume for reliable writers.",
        "requirements": ["Strong written English or BM", "Research skills", "Ability to meet deadlines"],
        "disability_statement": "Writers with any disability welcome. Deadline extensions available with advance notice.",
    },
    {
        "id": "job_007", "title": "IT Support Technician", "company": "Nexus IT Services",
        "location": "Kuala Lumpur (On-site)", "salary_rm": 3500, "base_pwd_score": 75, "type": "Full-time",
        "tags": ["on-site", "wheelchair-accessible", "structured"],
        "perks": ["Wheelchair accessible premises", "Structured ticketing workflow", "Small team of 4", "Clear escalation paths", "Training and certification support"],
        "description": "First-line IT support - hardware troubleshooting, software installation, and user account management via helpdesk tickets.",
        "requirements": ["Basic IT knowledge", "CompTIA A+ preferred", "Problem-solving mindset"],
        "disability_statement": "Physical demands are minimal. Reasonable adjustments made for all applicants without question.",
    },
    {
        "id": "job_008", "title": "Social Media Coordinator", "company": "BrandWave Agency",
        "location": "Remote / Cyberjaya", "salary_rm": 2900, "base_pwd_score": 87, "type": "Full-time",
        "tags": ["remote", "async", "flexible", "mental-health-days"],
        "perks": ["Remote-first team", "Async stand-ups - no mandatory video", "Flexible hours around deadlines", "Mental health days (4/year, no questions)", "Noise-cancelling headset provided"],
        "description": "Plan and schedule content across Instagram, TikTok, and LinkedIn for Malaysian brands. Requires creativity and social media literacy.",
        "requirements": ["Familiarity with major social platforms", "Basic Canva", "Good written communication"],
        "disability_statement": "Team members with ADHD, anxiety, and chronic illness are part of our team. We actively accommodate diverse needs.",
    },
    {
        "id": "job_009", "title": "Research Assistant (Work From Home)", "company": "Insight Lab Malaysia",
        "location": "Fully Remote", "salary_rm": 2500, "base_pwd_score": 90, "type": "Contract (6 months, renewable)",
        "tags": ["remote", "text-only", "async", "screen-reader-friendly"],
        "perks": ["100% remote, fully flexible", "Written-only communication", "Self-paced deliverables", "Text-based weekly check-in", "OKU-inclusive hiring"],
        "description": "Conduct literature reviews, compile data, and summarise research reports for academic and corporate clients. Excellent for analytical thinkers who work independently.",
        "requirements": ["University degree or equivalent", "Strong reading comprehension", "Detail-oriented mindset"],
        "disability_statement": "Strongly encourage OKU applicants. Screen reader, voice typing, and extended deadline support available.",
    },
    {
        "id": "job_010", "title": "E-Commerce Product Lister", "company": "Shoplink MY",
        "location": "Fully Remote", "salary_rm": 2100, "base_pwd_score": 89, "type": "Part-time / Full-time",
        "tags": ["remote", "output-based", "no-calls"],
        "perks": ["Work at your own pace - output-based", "No meetings, no calls, no video", "Repetitive focused tasks", "Performance bonuses", "Self-paced remote onboarding"],
        "description": "Upload and optimise product listings on Shopee, Lazada, and TikTok Shop - writing descriptions, tagging categories, and editing images using templates.",
        "requirements": ["Basic computer skills", "Attention to detail", "Comfortable following templates"],
        "disability_statement": "This role was specifically designed to be fully accessible for PWD candidates. Zero physical requirements.",
    },
]


class AbilityProfiler:
    STRENGTH_POOLS = {
        "voice": ["Clear verbal articulation", "Auditory processing strength", "Narrative structuring ability", "Active listening indicators", "Verbal reasoning aptitude"],
        "text": ["Written communication clarity", "Structured thinking", "Detail orientation", "Analytical depth", "Reflective self-awareness"],
    }

    def generate(self, input_type: str, content: str) -> dict:
        content = content.strip()
        word_count = len(content.split())
        unique_words = len(set(content.lower().split()))
        unique_ratio = unique_words / max(word_count, 1)

        # reject very short or repetitive input (lowered threshold)
        if word_count < 8 or unique_ratio < 0.4:
            return {
                "mobility": "Insufficient input",
                "sensory": "Insufficient input",
                "communication": "Insufficient input",
                "strengths": ["More meaningful input needed"],
                "confidence": 0,
                "error": "insufficient_input",
                "message": "Please write a bit more about yourself - at least a couple of sentences.",
            }

        try:
            return self._analyse_with_ai(content, input_type)
        except Exception as e:
            print(f"AbilityProfiler AI failed: {e}")
            return self._fallback(input_type, word_count)

    def _analyse_with_ai(self, content: str, input_type: str) -> dict:
        mode = "spoken transcript" if input_type == "voice" else "written self-description"
        prompt = f"""You are a warm, honest inclusive career counsellor. Analyse this {mode} and produce a full ability profile - both strengths AND areas to be aware of.

Input: "{content}"

STRICT RULES:
- Only report strengths actually evidenced in the text. Do NOT invent positives.
- Identify real challenges too: spelling inconsistencies, sentence structure issues, repetitive phrasing, poor focus, low vocabulary variety, unclear logic - name them kindly but honestly.
- For dyslexia indicators (letter reversals, phonetic spelling, inconsistent capitalisation, run-on sentences, difficulty ordering thoughts): estimate severity as "mild", "moderate", or "significant" and name it gently.
- For ADHD indicators (topic jumping, unfinished thoughts, very short bursts of ideas, impulsive phrasing): note them under challenges.
- Confidence reflects actual input richness: gibberish or filler = 0-25, vague = 26-55, moderate detail = 56-74, specific and rich = 75-93.
- challenges[] must be honest but professionally worded.
- If no challenges are detectable, return an empty challenges array.

Respond ONLY with valid JSON (no markdown, no backticks, no extra keys):
{{
  "strengths": ["specific strength from text", "another specific strength"],
  "challenges": ["gently worded area of difficulty or 'none detected'"],
  "dyslexia_note": "null or a kind one-sentence note",
  "mobility": "one sentence about physical or ergonomic work preferences inferred from text",
  "sensory": "one sentence about sensory processing inferred from text",
  "communication": "one sentence about communication style inferred from text",
  "confidence": <integer 0-93>
}}"""

        raw = _groq_chat(prompt, max_tokens=500)
        raw = raw.replace("```json", "").replace("```", "").strip()
        profile = json.loads(raw)

        for key in ["strengths", "challenges", "mobility", "sensory", "communication", "confidence"]:
            if key not in profile:
                raise ValueError(f"Missing key: {key}")

        profile["confidence"] = max(0, min(93, int(profile["confidence"])))

        if profile.get("dyslexia_note") in (None, "null", ""):
            profile["dyslexia_note"] = None

        return profile

    def _fallback(self, input_type: str, word_count: int) -> dict:
        pool = self.STRENGTH_POOLS.get(input_type, self.STRENGTH_POOLS["text"])
        selected = random.sample(pool, min(3, len(pool)))

        if word_count < 30:
            confidence = 55
        elif word_count < 60:
            confidence = 65
        else:
            confidence = 72

        if input_type == "text":
            mobility = "Keyboard-primary navigation preferred"
            sensory = "Text-based processing preference"
            communication = "Written communication preference"
        else:
            mobility = "Voice navigation preferred"
            sensory = "Auditory processing preference"
            communication = "Verbal communication preferred"

        return {
            "mobility": mobility,
            "sensory": sensory,
            "communication": communication,
            "strengths": selected,
            "confidence": confidence,
        }


class JobMatcher:
    def find_matches(self, user_profile: dict) -> list:
        results = []
        for job in JOB_DATABASE:
            job_copy = job.copy()
            job_copy["match_score"] = self._compute_score(job, user_profile)
            results.append(job_copy)
        results.sort(key=lambda j: j["match_score"], reverse=True)
        return results

    def _compute_score(self, job: dict, profile: dict) -> int:
        base = job.get("base_pwd_score", 70)
        perk_text = " ".join(job.get("perks", [])).lower()
        workplace = profile.get("workplaceEnv", "").lower()
        comm = profile.get("communicationStyle", "").lower()
        skills = profile.get("skills", "").lower()
        ability = profile.get("abilityProfile") or {}
        ai_strengths = " ".join(ability.get("strengths", [])).lower()

        boost = 0

        if "remote" in workplace and "remote" in perk_text:
            boost += 5

        if "quiet" in workplace and "quiet" in perk_text:
            boost += 3

        if "async" in comm and "async" in perk_text:
            boost += 3

        if "hybrid" in workplace and "hybrid" in perk_text:
            boost += 2

        job_text = (job.get("description", "") + " " + job.get("title", "")).lower()
        for kw in ["data", "design", "writing", "content", "support", "it", "research", "account"]:
            if (kw in skills or kw in ai_strengths) and kw in job_text:
                boost += 2
                break

        prefs = profile.get("accessibilityPrefs", [])
        tags = job.get("tags", [])

        if "screen-reader" in prefs and "screen-reader-friendly" in tags:
            boost += 3

        if "keyboard-nav" in prefs and "keyboard-friendly" in tags:
            boost += 2

        return min(base + boost + random.randint(-2, 3), 100)