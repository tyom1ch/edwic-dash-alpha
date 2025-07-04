from google import genai
import subprocess
import os
import re

client = genai.Client()

# Отримати назву останнього і поточного тегу
def get_last_tag():
    try:
        return subprocess.check_output(["git", "describe", "--tags", "--abbrev=0", "HEAD^"]).decode().strip()
    except:
        return ""

def get_current_tag():
    return subprocess.check_output(["git", "describe", "--tags", "--abbrev=0"]).decode().strip()

def get_commits_between(old_tag, new_tag):
    if old_tag:
        return subprocess.check_output(["git", "log", f"{old_tag}..{new_tag}", "--pretty=format:- %s"]).decode()
    else:
        return subprocess.check_output(["git", "log", new_tag, "--pretty=format:- %s"]).decode()

old_tag = get_last_tag()
new_tag = get_current_tag()
commits = get_commits_between(old_tag, new_tag)

prompt = f"""
Згенеруй changelog у форматі нижче, для тега {new_tag}.
Використовуй українську мову. Якщо тег не має змін, просто вкажи, що немає змін.
Не говори щось типу "Ось список змін", просто дай список змін у форматі, який я вказав нижче.
Структура така:

v.v.v - Declarative Widgets & Major Refinements
✨ Нові можливості (Added)
<тут перелік нових фіч>
♻️ Зміни (Changed)
<тут перелік змін>
🐛 Виправлення (Fixed)
<тут перелік багфіксів>
🧹 Внутрішні зміни (Housekeeping)
<внутрішні зміни, видалення сміття тощо>

Ось список комітів для аналізу:
{commits}
"""

response = client.models.generate_content(
    model="gemini-2.5-flash", contents=prompt
)

# Оновлюємо README.md
with open("README.md", "r") as f:
    old_content = f.read()

new_changelog = response.text.strip()

# Вставка в секцію "## Зміни"
pattern = r"(<!-- CHANGELOG START -->)(.*?)(<!-- CHANGELOG END -->)"
replacement = f"\\1\n\n{new_changelog}\n\n\\3"

new_readme = re.sub(pattern, replacement, old_content, flags=re.DOTALL)

with open("README.md", "w") as f:
    f.write(new_readme)
