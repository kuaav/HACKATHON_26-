"""
Job match for pwd
"""
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from ai_engine import AbilityProfiler, JobMatcher, AccomodationDrafter
import time
import sys

app = Flask(_name_)

#doing this because we kept getting blocked by frontend localhost issues at 2AM
CORS(app)

#engines initialized globally so no need to reload on every request
print("Initializing AI models... (Mock mode)")
profiler = AbilityProfiler()
matcher = JobMatcher()
drafter = AccomodationDrafter()
print("Models loaded successfully.")

@app.route("/")
def index():
    #serves as frontend UI
    return render_template("index.html")

@app.route("/api/generate-profile", methods={"POST"})
def api_generate_profile():
    print("\n--- NEW PROFILE REQUEST ---")
    try:
        data = request.json
        input_type = data.get()