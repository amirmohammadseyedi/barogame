"""Arobazi backend — auth, sessions, leaderboard."""

from __future__ import annotations

import os

from flask import Flask, jsonify, request, send_from_directory

from migrate import run_migrations
from user_session import UserSession

app = Flask(__name__, static_folder="static", static_url_path="/static")
user_sessions = UserSession()


@app.before_request
def run_db_migrations_once():
    if not getattr(app, "_migrated", False):
        run_migrations()
        app._migrated = True


@app.after_request
def no_cache(response):
    response.headers["Cache-Control"] = "no-store"
    return response


def _token_from_request() -> str | None:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:].strip()
    return request.headers.get("X-Session-Token", "").strip() or None


@app.get("/")
def index():
    return send_from_directory(".", "arobazi_multistep_builder.html")


@app.post("/api/auth/login")
def login():
    payload = request.get_json(silent=True) or {}
    phone = payload.get("phone", "")
    try:
        result = user_sessions.login(phone)
        return jsonify(result)
    except ValueError:
        return jsonify({"error": "شماره موبایل معتبر نیست (مثال: 09123456789)"}), 400


@app.get("/api/auth/me")
def me():
    user = user_sessions.get_user_by_token(_token_from_request())
    if not user:
        return jsonify({"error": "session expired"}), 401
    return jsonify({"ok": True, **user})


@app.post("/api/auth/logout")
def logout():
    user_sessions.logout(_token_from_request() or "")
    return jsonify({"ok": True})


@app.post("/api/scores")
def save_score():
    token = _token_from_request()
    payload = request.get_json(silent=True) or {}
    result = user_sessions.save_score(
        token or "",
        payload.get("score", 0),
        payload.get("level", 1),
    )
    if not result:
        return jsonify({"error": "session expired"}), 401
    return jsonify(result)


@app.get("/api/leaderboard")
def leaderboard():
    limit = request.args.get("limit", 10, type=int)
    return jsonify({"items": user_sessions.get_leaderboard(limit)})


if __name__ == "__main__":
    run_migrations()
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug, use_reloader=debug)
