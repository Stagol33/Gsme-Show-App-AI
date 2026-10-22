# Game Show App (AI Assisted Rebuild) - Front End Web Development Project 10

## Created By

- Name: Stagol33
- Date Completed: October 22, 2026

**Grade goal: Exceeds Expectations.**

---

## Tools Used

_List all the AI tools you utilized to complete the project._

- Claude Code (Anthropic's CLI coding assistant, Claude Opus 5.5 model)
- Playwright (driven by Claude Code) for automated browser QA testing
- Chrome DevTools for checking the console and local storage

---

## What Worked

_Describe what parts of the project went smoothly or turned out well. This could include specific features, code organization, approaches to prompts or workflow habits._

- Giving the assistant the full project instructions and rubric up front meant every requirement, including all four Exceeds items, was built in one pass.
- Saving the start screen's markup when the page loads made the "Home" button easy: it puts back exactly the original HTML.
- Listening for events on the overlay instead of on each form/button kept the start form, Play Again and Home buttons working after the overlay's contents were swapped.
- Automated browser testing covered winning, losing, the physical keyboard, the streaks in local storage, saving the theme, and the hard-mode timer running out.

---

## What Didn't Work

_Explain what parts of the project were challenging or didn't go as planned. Did you hit bugs, confusion, or dead ends?_

- The starter CSS used a `visually-hidden` class it never defined, so the "Game Setup" legend showed on screen until that class was added.
- Datamuse definitions sometimes contain the answer itself, which gave the word away, so the hint now hides any copy of the word. Some definitions are still unhelpful (for example a place name).
- The `#timer` section had no `<p>` child for the countdown, so one had to be added to the HTML.
- `answers.json` can't be loaded when `index.html` is opened straight from the file system, so the backup word list only works when the page is served over HTTP.

---

## Pros / Cons of Using an AI Coding Assistant

### Pros

_What were the benefits of using an AI assistant during this project?_

- Fast: the whole game was scaffolded, built and tested in one session.
- It spotted edge cases I might have missed, like repeated key presses, presses after the game ended, and the API returning bad words.
- It could test in a real browser and check the results instead of only writing code.

### Cons

_What were the downsides, limitations, or challenges when relying on AI during this project?_

- You still have to read and understand the code yourself so you can explain it and maintain it.
- It will make choices (wording, animations, fallbacks) you might not have made, so its output needs reviewing.
- Getting results that match the rubric depends on giving it complete, precise instructions.
