# הנחיות הפיתוח של הפרויקט

עותק מקומי של guidelines.md מתאריך 18.09.2026, ללא שינוי הכללים. המקור החיצוני: [guidelines.md](C:/Users/123/Documents/ChatGPT/guidelines.md).
[אינדקס](../PLAN_INDEX.md) · [כללי המאגר](../AGENTS.md).

# Frontend notes:

- Use mantine components and their attributes as much as possible instead of custom CSS
- When you have to use custom CSS, use a proper design system with CSS variables that are re-used
- You should never define new CSS variables that are just renaming existing root CSS variables; simply use the root ones directly
- Use mobx as a state management. Avoid prop drilling, and even passing props altogether if you can just use the store
- Re-use existing components, staying as DRY as possible
- Use your own browser tool to ensure things actually work after big changes. Do _not_ do this for every little thing

# Backend notes:

- Use a routes/controller/service setup
- Each service should have its own directory, and within that directory you can feel free to break it down to sub directories
- Use express for the server

# General notes

- Keep things _simple_
- Avoid unnecessary abstractions
- Use consts: no magic numbers or strings allowed
- The main function in any file (i.e the one that runs the important logic, not just helpers) should be top-most in the file
- Helpers/utils should be live in helper/util files, and should be re-used when possible
- All files should be 320 lines or fewer, unless there is a very good reason otherwise (for example, a unified store - but even then, worth considering how to split it up)
- Splitting files/services into directories is a helpful way to keep files from getting too large, and organizing the repo
- When reviewing code, always ask yourself: "can this be done more simply? Have I overcomplicated this?" and if so simplify it
- Generally speaking, when a function is too long, or too nested: it should be split apart
- By and large, I should be able to read the code and follow 'core logic' in the main functions, with helpers doing the 'heavy lifting'
- Separate concerns religiously; each file should have a clear purpose, not a jumble of different responsibilities
- That said, files with one line or one function are ridiculous; avoid these
- Take it easy with typescript Types. While they are important, avoid unnecessary abstractions and weird types. Keep it simple
- Always ensure there are no lint/typescript errors before claiming something is 'done'
