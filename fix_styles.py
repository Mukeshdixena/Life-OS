import os
import re

css_path = 'c:/dev/other/Life-OS/client/src/styles.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# 1. Replace variables block
variables_block = """:root {
  --bg: #0f1115;
  --bg-2: #16191f;
  --surface: rgba(255,255,255,0.03);
  --surface-2: rgba(255,255,255,0.06);
  --surface-3: rgba(255,255,255,0.09);
  --glass: rgba(255,255,255,0.02);
  --glass-border: rgba(255,255,255,0.05);
  --ink: #f1f5f9;
  --ink-2: #94a3b8;
  --muted: #64748b;
  --line: rgba(255,255,255,0.08);

  --primary: #14b8a6;
  --primary-2: #2dd4bf;
  --primary-glow: rgba(20, 184, 166, 0.15);
  --accent: #f59e0b;

  --learning: #38bdf8;
  --health: #34d399;
  --work: #818cf8;
  --creativity: #f472b6;
  --social: #fb923c;
  --mindfulness: #a78bfa;
  --finance: #4ade80;

  --danger: #ef4444;
  --success: #10b981;
  --warn: #f59e0b;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 2rem;

  font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
  color: var(--ink);
  background: var(--bg);
  color-scheme: dark;
}

html[data-theme="light"] {
  --bg: #fafafa;
  --bg-2: #f4f4f5;
  --surface: rgba(0,0,0,0.02);
  --surface-2: rgba(0,0,0,0.04);
  --surface-3: rgba(0,0,0,0.07);
  --glass: rgba(255,255,255,0.8);
  --glass-border: rgba(0,0,0,0.05);
  --ink: #18181b;
  --ink-2: #52525b;
  --muted: #a1a1aa;
  --line: rgba(0,0,0,0.08);
  --primary: #0d9488;
  --primary-2: #0f766e;
  --primary-glow: rgba(13, 148, 136, 0.1);
  color-scheme: light;
}"""
css = re.sub(r':root\s*\{.*?\n\}\n\nhtml\[data-theme="light"\]\s*\{.*?\n\}', variables_block, css, flags=re.DOTALL)

# Also if it failed to match both because of spacing, just try to match :root and html separately
if '--text-xs' not in css:
    css = re.sub(r':root\s*\{.*?\}\n', variables_block + '\n', css, flags=re.DOTALL)
    css = re.sub(r'html\[data-theme="light"\]\s*\{.*?\}\n', '', css, flags=re.DOTALL) # remove old light mode

# 2. Remove background images
css = re.sub(r'background-image:\s*radial-gradient[^;]+;', 'background-image: none;', css)

# 3. Typography
typography_replacements = [
    (r'\.eyebrow\s*\{[^}]+\}', '.eyebrow {\n  font-family: \'Inter\', sans-serif;\n  font-size: var(--text-xs);\n  font-weight: 600;\n  letter-spacing: 0.05em;\n  color: var(--muted);\n  margin: 0 0 4px;\n}'),
    (r'h1\s*\{[^}]+\}', 'h1 {\n  font-family: \'Outfit\', sans-serif;\n  font-size: clamp(1.75rem, 4vw, var(--text-3xl));\n  font-weight: 600;\n  line-height: 1.2;\n  margin: 0;\n  color: var(--ink);\n}'),
    (r'h2\s*\{[^}]+\}', 'h2 {\n  font-family: \'Outfit\', sans-serif;\n  font-weight: 500;\n  font-size: var(--text-xl);\n  margin: 0 0 12px;\n  color: var(--ink);\n}'),
    (r'h3\s*\{[^}]+\}', 'h3 {\n  font-family: \'Inter\', sans-serif;\n  font-size: var(--text-lg);\n  margin: 0;\n  font-weight: 500;\n}'),
    (r'p\s*\{[^}]+\}', 'p {\n  line-height: 1.6;\n  margin: 0;\n  font-size: var(--text-base);\n  color: var(--ink-2);\n}')
]
for old, new in typography_replacements:
    css = re.sub(old, new, css)

# 4. Standardize border radius and shadows in cards
css = css.replace('border-radius: 12px;', 'border-radius: 8px;')
css = re.sub(r'\.card, \.panel,.*\{[^}]+\}', '.card, .panel, .stat, .progress-row, .day-cell, .input-surface, .context-panel {\n  background: var(--glass);\n  border: 1px solid var(--glass-border);\n  border-radius: 8px;\n  backdrop-filter: blur(12px);\n  box-shadow: 0 1px 3px rgba(0,0,0,0.05);\n}', css)

css = re.sub(r'\.stat\s*\{[^}]+\}', '.stat {\n  padding: 24px;\n}', css)
css = re.sub(r'\.stat span\s*\{[^}]+\}', '.stat span {\n  font-size: var(--text-xs);\n  font-weight: 500;\n  color: var(--muted);\n}', css)
css = re.sub(r'\.stat strong\s*\{[^}]+\}', '.stat strong {\n  display: block;\n  font-family: \'Inter\', sans-serif;\n  font-size: var(--text-2xl);\n  font-weight: 600;\n  margin-top: 4px;\n  color: var(--ink);\n}', css)
css = re.sub(r'\.panel\s*\{[^}]+\}', '.panel {\n  padding: 24px;\n}', css)
css = re.sub(r'\.card\s*\{[^}]+\}', '.card {\n  padding: 24px;\n  transition: border-color 0.2s;\n}', css)
css = re.sub(r'\.card:hover\s*\{[^}]+\}', '.card:hover {\n  border-color: var(--primary-glow);\n}', css)

# 5. Buttons
css = re.sub(r'\.primary\s*\{[^}]+\}', '.primary {\n  border: 0;\n  background: var(--primary);\n  color: white;\n  padding: 10px 18px;\n  border-radius: 6px;\n  font-weight: 500;\n  font-size: var(--text-sm);\n  transition: opacity 0.2s;\n}', css)
css = re.sub(r'\.primary:hover\s*\{[^}]+\}', '.primary:hover {\n  opacity: 0.9;\n}', css)

css = re.sub(r'\.btn-ghost\s*\{[^}]+\}', '.btn-ghost {\n  border: 1px solid var(--line);\n  background: transparent;\n  color: var(--ink-2);\n  padding: 10px 18px;\n  border-radius: 6px;\n  font-weight: 500;\n  font-size: var(--text-sm);\n  transition: all 0.15s;\n}', css)
css = re.sub(r'\.btn-ghost:hover\s*\{[^}]+\}', '.btn-ghost:hover {\n  background: var(--surface-2);\n  border-color: var(--line);\n  color: var(--ink);\n}', css)

# 6. Meter
css = re.sub(r'\.meter\s*\{[^}]+\}', '.meter {\n  height: 4px;\n  border-radius: 999px;\n  background: var(--surface-3);\n  overflow: hidden;\n}', css)

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)

print('Updated styles.css.')
