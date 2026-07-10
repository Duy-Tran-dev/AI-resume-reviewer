# Build Plan

The features that make up this project, high level and in rough build order, one
line each. Detail for each one lives in its `/feature` spec, not here.

Keep it as a checklist. Run `/feature` with no number to spec the **next
unchecked** item, or `/feature 3` / `/feature "login"` to pick a specific one.
Completed features get checked off here, so the build plan doubles as the
progress tracker.

- [x] 1. **Resume upload** - user uploads a PDF resume on the home page; the server extracts and validates the text and stores it
- [ ] 2. **AI resume analysis** - send the resume text to Groq/Llama and get back ATS compatibility, structure/formatting/grammar checks, and an overall score
- [ ] 3. **Feedback report** - Review Results page shows the score, strengths, weaknesses, missing sections, and prioritized improvements, each with a why-it-matters explanation
- [ ] 4. **Resume regeneration & download** - AI generates an improved resume (rewriting only, never fabricating) and the Improved Resume page lets the user download it
- [ ] 5. **Deploy to Vercel** - error handling and UI polish pass, then deploy the MVP
