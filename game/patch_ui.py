from pathlib import Path

html_path = Path("arobazi_multistep_builder.html")
html = html_path.read_text(encoding="utf-8")

css = """
    .phone-form {
      width: min(300px, 92%);
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 6px;
    }
    .phone-input {
      width: 100%;
      padding: 12px 16px;
      border-radius: 14px;
      border: 1px solid rgba(255,210,0,0.25);
      background: rgba(255,255,255,0.08);
      color: #fff;
      font-family: inherit;
      font-size: 1rem;
      text-align: center;
      direction: ltr;
    }
    .phone-input:focus {
      outline: none;
      border-color: rgba(255,210,0,0.55);
      box-shadow: 0 0 0 3px rgba(255,210,0,0.12);
    }
    .login-error {
      min-height: 18px;
      font-size: 0.78rem;
      color: #ff7a7a;
    }
    .login-user-hint {
      font-size: 0.78rem;
      color: #8890aa;
      min-height: 16px;
    }
    .leaderboard {
      width: min(320px, 96%);
      margin-top: 8px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.10);
      border-radius: 14px;
      padding: 10px 12px;
      text-align: right;
    }
    .leaderboard-title {
      font-size: 0.82rem;
      font-weight: 800;
      color: #FFD200;
      margin-bottom: 8px;
      text-align: center;
    }
    .leaderboard-row {
      display: grid;
      grid-template-columns: 28px 1fr auto;
      gap: 8px;
      align-items: center;
      padding: 5px 0;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      font-size: 0.78rem;
      direction: ltr;
    }
    .leaderboard-row:last-child { border-bottom: none; }
    .leaderboard-rank { color: #8890aa; text-align: center; }
    .leaderboard-phone { color: #eef2ff; letter-spacing: 1px; }
    .leaderboard-score { color: #FFD200; font-weight: 800; }
    .leaderboard-empty {
      font-size: 0.76rem;
      color: #667;
      text-align: center;
      padding: 6px 0;
    }
"""

login_html = """
  <div id="loginScreen" class="overlay">
    <div class="bus-icon">📱</div>
    <h1>ورود</h1>
    <p class="subtitle">برای بازی و ثبت امتیاز، شماره موبایلت را وارد کن.</p>
    <div class="phone-form">
      <input id="phoneInput" class="phone-input" type="tel" inputmode="numeric" maxlength="11" placeholder="09123456789" autocomplete="tel"/>
      <button type="button" class="btn" id="loginBtn">ادامه</button>
      <p class="login-error" id="loginError"></p>
      <p class="login-user-hint" id="loginUserHint"></p>
    </div>
    <div class="leaderboard">
      <div class="leaderboard-title">🏆 لیدربورد</div>
      <div id="leaderboardList"></div>
    </div>
  </div>
"""

leaderboard_start = """
    <div class="leaderboard">
      <div class="leaderboard-title">🏆 لیدربورد</div>
      <div id="leaderboardListStart"></div>
    </div>
"""

# Fix: auth.js uses leaderboardList on login screen only - for start screen use same id or duplicate load
# I'll use one leaderboard on login and one on start - auth.js needs update for start screen too

# Actually I'll put leaderboard only on login screen and game over, and duplicate id leaderboardList on start - bad.
# Better: leaderboardList on login, startLeaderboard on start screen - update auth.js

if "</style>" in html and css.strip() not in html:
    html = html.replace("</style>", css + "\n  </style>", 1)

if 'id="loginScreen"' not in html:
    html = html.replace(
        '  <div id="startScreen" class="overlay">',
        login_html + '\n  <div id="startScreen" class="overlay hidden">',
        1,
    )
else:
    html = html.replace(
        '  <div id="startScreen" class="overlay">',
        '  <div id="startScreen" class="overlay hidden">',
        1,
    )

if 'id="startLeaderboard"' not in html:
    html = html.replace(
        '    <p class="hint">در آیفون: لمس صفحه برای پرش</p>',
        '    <div class="leaderboard"><div class="leaderboard-title">🏆 لیدربورد</div><div id="startLeaderboard"></div></div>\n    <p class="hint">در آیفون: لمس صفحه برای پرش</p>',
        1,
    )

if 'id="gameOverLeaderboard"' not in html:
    html = html.replace(
        '    <div class="best-wrap">بهترین: <span id="bestScore">0</span></div>',
        '    <div class="best-wrap">بهترین: <span id="bestScore">0</span></div>\n    <div class="leaderboard"><div class="leaderboard-title">🏆 لیدربورد</div><div id="gameOverLeaderboard"></div></div>',
        1,
    )

if "auth.js" not in html:
    html = html.replace(
        '<script src="/static/game.js"></script>',
        '<script src="/static/game.js"></script>\n<script src="/static/auth.js"></script>',
        1,
    )

html_path.write_text(html, encoding="utf-8")
print("html patched")
