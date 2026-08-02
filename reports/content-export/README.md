# Portable content export

- Documents: 3387
- Format: UTF-8 JSON Lines (`content.jsonl`)
- Integrity: each record and manifest entry contains SHA-256 for its original Markdown source.
- Relationships: frontmatter retains topics, tags, series, and other source metadata.
- URL contract: `url` is derived from the stable content ID.
- Source policy: additive export only; it does not modify source content or frontmatter.
