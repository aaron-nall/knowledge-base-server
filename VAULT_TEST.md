# Knowledge Base Vault Storage Investigation

You are conducting a systematic investigation to determine exactly how and where
the knowledge-base-server stores captured data — specifically whether captures
go back to the Obsidian vault as .md files, or stay database-only in SQLite.

## Prerequisites Check

Before testing, verify:
1. The KB server is running (`kb status`)
2. Note the current vault path from config or `kb status` output
3. Note the current document count in the database
4. Record the timestamp so you can filter for new files created during this test

## Test Plan

Run each test in sequence. After EACH step, check BOTH locations:
- The Obsidian vault directory (look for new .md files)
- The SQLite database (`kb search <test-keyword>` to confirm indexing)

Document exactly what you find after each step.

---

### Test 1: Direct vault write
Use `kb_write` to create a note:
- title: "VAULT_TEST_001_direct_write"  
- content: "This is a direct vault write test. Tag: vault_storage_test_alpha"
- Check: Does a .md file appear in the vault directory?
- Check: Is it searchable via `kb search vault_storage_test_alpha`?

### Test 2: Bug fix capture
Use `kb_capture_fix` to record a fake fix:
- title: "VAULT_TEST_002_capture_fix"
- symptom: "Vault storage test symptom. Tag: vault_storage_test_beta"
- cause: "Testing where captures are stored"
- resolution: "Investigating database vs vault write path"
- Check: Does a .md file appear in the vault directory?
- Check: Is it searchable via `kb search vault_storage_test_beta`?

### Test 3: Session capture
Use `kb_capture_session` to record a fake session:
- goal: "VAULT_TEST_003_session_capture"
- commands_worked: "kb status, kb search. Tag: vault_storage_test_gamma"
- lessons: "Testing vault write-back behavior"
- Check: Does a .md file appear in the vault directory?
- Check: Is it searchable via `kb search vault_storage_test_gamma`?

### Test 4: Raw ingest
Use `kb_ingest` with raw text:
- content: "VAULT_TEST_004 raw ingest test. Tag: vault_storage_test_delta"
- Check: Does a .md file appear in the vault directory?
- Check: Is it searchable via `kb search vault_storage_test_delta`?

### Test 5: Synthesis capture
Use `kb_synthesize` to run a synthesis pass on the test documents just created.
- Check: Does synthesis output produce any new .md files in the vault?
- Check: Where does the synthesis document live?

---

## Source Code Verification

After the behavioral tests, read the following source files to confirm the
mechanism at the code level (do not guess — read the actual implementation):

1. `src/tools/` — find the capture_fix and capture_session handlers
2. `src/ingestion/` or equivalent — find the ingest pipeline
3. Look specifically for any calls to write files to `OBSIDIAN_VAULT_PATH`
   vs. calls that only write to the SQLite database
4. Check whether `kb_write` uses a different code path than `kb_ingest`

---

## Report Format

Produce a markdown report with these sections:

### Executive Summary
One paragraph: where do captures actually go, and is the vault truly
bidirectional or is it read-only input?

### Test Results Table
| Test | DB Indexed? | Vault .md Created? | Notes |
|------|-------------|-------------------|-------|
| Test 1: kb_write | | | |
| Test 2: capture_fix | | | |
| Test 3: capture_session | | | |
| Test 4: kb_ingest | | | |
| Test 5: kb_synthesize | | | |

### Code-Level Finding
Quote the relevant lines from source that confirm the write path for each
capture type. Specifically: does the code write to `OBSIDIAN_VAULT_PATH`
or only to SQLite?

### Implication for Single-Source-of-Truth Workflow
Given the findings: if a user wants everything to be accessible in Obsidian
without the KB server running, what is the correct workflow? Be specific about
which tools write to vault vs. database-only, and whether any configuration
option changes this behavior.

### Cleanup
List the test document IDs created during this investigation so they can be
removed if desired.
