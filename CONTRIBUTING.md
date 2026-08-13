# Contributing

Contributions are welcome, especially sanitized fixtures for real release formats.

1. Open an issue before adding a rule that fails releases by default.
2. Include a fixture or unit test for every parser change.
3. Keep network reads bounded and never execute untrusted release assets.
4. Run `npm run check`, `npm test`, and `npm run build`.

Rules should report evidence and avoid implying that release hygiene proves application security.
