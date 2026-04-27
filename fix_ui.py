import os, re

vue_files = []
for root, dirs, files in os.walk('c:/dev/other/Life-OS/client/src/views'):
    for file in files:
        if file.endswith('.vue'):
            vue_files.append(os.path.join(root, file))

app_vue = 'c:/dev/other/Life-OS/client/src/App.vue'
if os.path.exists(app_vue):
    vue_files.append(app_vue)

replacements = {
    r'Omni-Action Console': 'Activity Log',
    r'> Declare your current action, record a thought, or confess a deviation...': 'What are you working on right now?',
    r'Execute Action': 'Save',
    r'System standing by\. Awaiting commands\.': 'Ready when you are.',
    r'Confess a Vice': 'Log a Distraction',
    r'Did a bad habit\? Log it and take the HP hit\.': 'Did you get off track? Log it to stay accountable.',
    r'CONFESS \(-HP\)': 'Log Distraction',
    r'Quick Actions': 'Quick Logs',
    r"If you aren't following the plan, own it\.": 'Quickly log off-plan activities.',
    r'Active Quests \(Tasks\)': 'Current Tasks',
    r'Reward: \+50 XP': '+50 XP',
    r'ACTIVE MISSION DETECTED': 'CURRENT ACTIVITY',
    r'Are you focused on this mission right now\?': 'Are you currently working on this?',
    r'YES, ON IT & DONE ✓': 'Complete Activity',
    r'NO, I AM DEVIATING': 'Log Something Else',
    r'NO ACTIVE MISSION': 'UNSCHEDULED TIME',
    r'Free Roam Mode': 'Free Time',
    r'You have no scheduled blocks at this time\.': "You don't have anything scheduled right now.",
    r"Magic plan: 'Fill the rest of my day with work and a walk'\.\.\.": "E.g., 'Plan my afternoon with deep work'...",
    r'Your scheduled focus session is starting now': 'Your next scheduled activity is starting.',
    r'Start Session →': "Let's Go →",
    r'AFTER ACTION REPORT REQUIRED': 'ACTIVITY REVIEW',
    r'You had a scheduled mission in the past that was not confirmed\.': 'Please confirm if you completed your previous activity.',
    r'Did you actually do this as planned\?': 'Did you complete this as planned?',
    r'YES, I COMPLETED IT ✓': 'Yes, Completed',
    r'NO, I WAS DISTRACTED ✕': 'No, Got Distracted',
    r'REWRITE REALITY ✎': 'Edit Activity',
    r'Overwrite plan with what actually happened:': 'Update with what you actually did?',
    r'Actual activity \(e\.g\. Slept in, Talked with friend\)': 'What did you actually do?',
    r'OVERWRITE HISTORY': 'Save Changes',
    r'text-transform:\s*uppercase;?': ''
}

for file in vue_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements.items():
        content = re.sub(old, new, content)
        
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print('Updated Vue files.')
