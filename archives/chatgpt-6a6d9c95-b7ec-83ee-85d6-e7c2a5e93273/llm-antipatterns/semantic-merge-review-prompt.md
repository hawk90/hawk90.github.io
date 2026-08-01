# Semantic merge reviewer prompt

Review each pair in `semantic-merge-review.md` after reading both linked blocks. Return JSON only:

```json
[{"left":"AP-*","right":"AP-*","decision":"merge|related|keep","canonical":"AP-*|null","reason":"one sentence"}]
```

Never delete original IDs.
