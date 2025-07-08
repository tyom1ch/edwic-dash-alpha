import subprocess
import os
import re
# Якщо ви використовуєте google.generativeai, а не застарілий google.genai
# import google.generativeai as genai 
from google import genai # Залиште ваш варіант, якщо він працює

# =================================================================
# Налаштування API-клієнта. Переконайтеся, що ваш ключ API
# налаштований у середовищі (наприклад, GOOGLE_API_KEY).
# os.environ['GOOGLE_API_KEY'] = 'ВАШ_КЛЮЧ_API'
# genai.configure(api_key=os.environ['GOOGLE_API_KEY'])
# client = genai.GenerativeModel('gemini-1.5-flash') # Рекомендований підхід
# =================================================================

# --- ОНОВЛЕНА ЛОГІКА GIT ---

def get_sorted_tags():
    """
    Повертає список всіх тегів, відсортованих за датою створення
    (від найновішого до найстарішого).
    """
    try:
        tags_raw = subprocess.check_output(
            ["git", "tag", "--sort=-creatordate"],
            text=True, # Використовуємо text=True для автоматичного декодування
            stderr=subprocess.PIPE
        ).strip()
        return tags_raw.split('\n') if tags_raw else []
    except subprocess.CalledProcessError:
        return []

def get_diff_between_tags(old_tag, new_tag):
    """
    Отримує повний дифф (зміни коду) для всіх комітів між двома тегами.
    Використовує `git log -p`.
    """
    command = ["git", "log", "-p"] # -p додає самі зміни коду (patch)
    
    if old_tag:
        # Діапазон між старим і новим тегом
        command.append(f"{old_tag}..{new_tag}")
    else:
        # Якщо старого тега немає (перший реліз), беремо всі коміти до нового тега
        command.append(new_tag)
    
    try:
        # Використовуємо text=True для зручності
        return subprocess.check_output(command, text=True, stderr=subprocess.PIPE).strip()
    except subprocess.CalledProcessError as e:
        print(f"Error executing git log: {e.stderr}")
        return ""

# 1. Отримуємо всі теги, відсортовані за часом
all_tags = get_sorted_tags()

if not all_tags:
    print("Error: No tags found in the repository. Exiting.")
    exit(1)

# 2. Визначаємо поточний і попередній теги
current_tag = all_tags[0]
previous_tag = all_tags[1] if len(all_tags) > 1 else None # None краще, ніж порожній рядок

print(f"-> Detected current tag: {current_tag}")
print(f"-> Detected previous tag: {previous_tag or 'None (first release)'}")

# 3. Отримуємо детальний дифф, що включає зміни коду
diff_data = get_diff_between_tags(previous_tag, current_tag)

# 4. Перевірка: якщо даних немає, не турбуємо API
if not diff_data:
    print("-> No new commits or changes found between tags. README will not be updated.")
    exit(0)

print("\n--- Sending detailed diff data to the API for analysis ---")
# Обмежимо вивід для читабельності, якщо він занадто великий
print(diff_data[:1000] + "\n..." if len(diff_data) > 1000 else diff_data)
print("----------------------------------------------------------\n")

# --- КІНЕЦЬ ОНОВЛЕНОЇ ЛОГІКИ ---


# --- ОНОВЛЕНИЙ ТА ПОКРАЩЕНИЙ ПРОМПТ ---
prompt = f"""
Ти — експерт з аналізу Git-репозиторіїв. Твоя задача — створити чіткий та лаконічний changelog українською мовою для версії {current_tag}.

Ти отримаєш вивід команди `git log -p`. Цей вивід містить повну інформацію про коміти: повідомлення, автор, дата, і найголовніше — самі зміни в коді (diff).
Рядки, що починаються з `+`, — це доданий код.
Рядки, що починаються з `-`, — це видалений код.
Рядки без цих символів — це контекст.

**Інструкції:**
1.  **Аналізуй зміни в коді, а не тільки повідомлення коміту.** Повідомлення може бути неточним, а код — це правда.
2.  Назви категорій мають бути такими: `✨ Нові можливості`, `♻️ Зміни`, `🐛 Виправлення`, `🧹 Внутрішні зміни`.
3.  **Не вигадуй інформацію.** Якщо зміни стосуються лише оновлення залежностей, форматування коду чи рефакторингу, віднось їх до `🧹 Внутрішні зміни`.
4.  Сформуй короткий опис релізу одним-двома словами (наприклад, "Рефакторинг" або "Нові фічі").
5.  **Формат відповіді має бути чітким, без вступних слів, пояснень чи коментарів.** Повертай лише результат у форматі Markdown.

**Структура відповіді:**
<опис релізу одним-двома словами>
✨ **Нові можливості**
- <тут перелік нових фіч>
♻️ **Зміни**
- <тут перелік змін>
🐛 **Виправлення**
- <тут перелік багфіксів>
🧹 **Внутрішні зміни**
- <внутрішні зміни, видалення сміття, оновлення залежностей тощо>

**Ось дані для аналізу:**
```
{diff_data}
```
"""

# Взаємодія з Gemini API. Переконайтесь, що ваш client налаштований правильно.
# Для нових бібліотек google.generativeai використовуйте:
# response = client.generate_content(prompt)
# Для старої google.genai:
# Замініть `genai.Client().models.generate_content` на актуальний виклик для вашої бібліотеки
# Наприклад, так, як було у вас:
client = genai.Client()

response = client.models.generate_content(
    model="gemini-2.0-flash", # Рекомендую використовувати найновішу модель
    contents=prompt
)
# =========================================================================

# Оновлення README.md залишається майже без змін
try:
    with open("README.md", "r", encoding="utf-8") as f:
        old_content = f.read()

    new_changelog = response.text.strip()

    # Створюємо повний блок для вставки, включаючи заголовок версії
    full_new_content_to_insert = f"## {current_tag}\n\n{new_changelog}"

    # Патерн для пошуку блоку changelog
    pattern = r"(<!-- CHANGELOG START -->\n)(.*?)(\n<!-- CHANGELOG END -->)"

    # Заміна: вставляємо новий лог ПІСЛЯ маркера і перед старим контентом.
    # Таким чином, у вас буде історія всіх changelog'ів.
    # \1 - <!-- CHANGELOG START -->\n
    # \2 - старий контент
    # \3 - \n<!-- CHANGELOG END -->
    # replacement = f"\\1{full_new_content_to_insert}\n\n\\2\\3"

    # Якщо ви хочете повністю ЗАМІНЯТИ старий лог на новий, використовуйте цей replacement:
    replacement = f"\\1{full_new_content_to_insert}\\3"
    
    new_readme = re.sub(pattern, replacement, old_content, flags=re.DOTALL)

    if new_readme == old_content:
        print("Could not find '<!-- CHANGELOG START -->' and '<!-- CHANGELOG END -->' markers in README.md.")
        print("Please add them to your README.md file.")
        exit(1)

    with open("README.md", "w", encoding="utf-8") as f:
        f.write(new_readme)

    print(f"✅ README.md has been successfully updated with changelog for tag {current_tag}.")

except FileNotFoundError:
    print("Error: README.md not found in the current directory.")
    exit(1)
except Exception as e:
    print(f"An unexpected error occurred: {e}")
    # Можливо, проблема з відповіддю від API
    print("--- API Response Text ---")
    print(response.text)
    print("-------------------------")
    exit(1)