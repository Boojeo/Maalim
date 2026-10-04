# UI brief

## Users and context
New Muslim in Saudi Arabia (non-Arabic speaker), phone, 15-minute sessions, may feel anxious about "doing it wrong". Second user: a mentor at a da'wah association using a light dashboard on a laptop.

## Mood
Calm, warm, encouraging. No pressure, no streak guilt, no gamified noise.

## Design tokens (starting point; change only in one place: tailwind.config + a tokens file)
- Background: warm off-white (#FAF7F2). Surface: white. Text: near-black (#1F2933).
- Primary: deep teal (#0F5E5A). Primary hover: darker teal.
- Accent (landmarks, mastery): soft gold (#C9A24B).
- Success: green (#2F855A). Error: muted red (#B83232), used sparingly and never as an alarm.
- Radius: 16px cards, 12px buttons. Generous spacing (8-pt grid).
- Fonts: IBM Plex Sans Arabic (Arabic + Latin). Body 17–18 px, Arabic line-height 1.8.

## Layout rules
- One column on mobile, large cards, bottom navigation: Map · Learn · Practise · Me.
- One primary button per screen. Tap targets >= 44 px.
- Language switch (ar / en) always reachable. Arabic is the default and RTL.

## Key screens
1. **Welcome / stage choice:** user picks their stage and language. Stage is self-declared and changeable at any time. Copy states that nothing is stored about them.
2. **Concept map:** a vertical path of 6 landmarks (locked / in progress / done), not a free-form graph.
3. **Unit:** video on top (captions on by default, "step X of Y"), short explanation with citation chips, then the check question.
4. **Practice:** order / choose / scenario items; wrong answer shows the fix and the source, never a harsh error.
5. **Ask a question:** free text → answer with citations, or a calm "this needs a person" with a handoff button that shows the summary before sending.
6. **Mentor dashboard:** referral inbox + anonymised aggregate progress. Plain tables, readable, no personal identifiers.
7. **/demo:** scripted 5-minute walkthrough for judges.

## Avoid
Heavy calligraphy backgrounds, copied religious logos, imagery of the Prophet ﷺ or the Companions, dense text walls, tiny text, harsh red/alarm styling, auto-playing sound.

## Selecting among options
If asked to propose alternatives, produce 3 static home + unit mockups (calm and warm / clean and modern / bold and playful) behind `/dev/ui-options` and wait for the choice recorded in STATUS.md. Default to this brief if no choice is recorded.
