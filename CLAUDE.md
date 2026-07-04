
## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec

## Deployment (web-admin)

Deploys to production are **manual** — there is no CI/CD pipeline. When the user asks to "deploy", "subir a producción", "publicar los cambios", etc. for `web-admin`, run:

```
cd web-admin && npm run build
cd .. && firebase deploy --only hosting
```

Notes:
- Firebase project: `barberflow-2026` (already set as default in `.firebaserc`, CLI already authenticated in this environment).
- Live URL: https://barberflow-2026.web.app
- Always use `--only hosting` for routine web-admin changes (landing page, admin panel UI, etc.) — this avoids accidentally redeploying Firestore rules, Storage rules, or Cloud Functions, which are separate concerns.
- Deploying/publishing is a side-effectful action — confirm with the user before running `firebase deploy`, even though the command itself is available and pre-configured.
- If the user later asks to automate this (deploy on push to `main`), set it up with GitHub Actions + the Firebase CLI.
