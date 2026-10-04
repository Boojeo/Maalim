# Router test set (draft)
`router.jsonl`: 30 seed questions with the expected action (answer | refer | abstain) and level (L1-L4). Labels are a DRAFT written without a Sharia reviewer; Mohammed must review and fix them before they are used as the official numbers. Grow this to 120 cases (in-scope, differing views, personal, missing reference, adversarial) during Phase 5 and 8.
Targets: refer/abstain recall on L3/L4 >= 95%, abstain on out-of-corpus >= 90%, run 3 times at temperature 0 and report variance.
