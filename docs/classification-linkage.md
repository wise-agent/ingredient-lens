# Ingredient classification linkage — 2026-10-19

Approved scope: connect verified encyclopedia reference uses to the existing ingredient/category filters; add reviewed food-type categories; separate warning-only names. Preserve original source data, V4 detail/card behavior and owner-private access.

## Previous V6 classification result

- 2,015 indexed labels: 1,995 ingredient/warning names and 20 function labels.
- 157 label identities link exactly to 154 encyclopedia entries. Of these, 138 were previously pending and map to 135 entries.
- All dictionary purposes are kept: 207 distinct label-purpose links, with 45 multi-purpose labels (44 among the 138 newly linked names).
- 874 exact food-name mappings across 13 ordinary-food subcategories. These are food-type classifications, not a legal or additive-free determination.
- 26 names occur only in allergen declarations/precautions, never in source `contains` relations. Twenty-five receive warning-scoped food-category references; their relationships stay unchanged and they are not counted as recipe members.
- 823 recipe labels remain pending. Ambiguous compounds, merged names, quantity-bearing labels and doubtful aliases are not silently reinterpreted.
- 35 categories and 3,117 ingredient-category relationships after migration.

Original pending reconciliation: 1,861 = 138 encyclopedia + 874 food type + 26 warning-only + 823 still pending.

## Evidence and semantics

`data/ordinary-mappings.json` is an explicit, reviewed allowlist, including source examples and unresolved cases. `scripts/prepare-classification.py` produces `data/classification.json` reproducibly from the unchanged seed and encyclopedia. The overlay retains `sourceCategoryIds`, original classification evidence, the new evidence scope, source URLs, dictionary status notes and a content version.

No fuzzy name matching is used for identity. Broad dictionary display names are not verified aliases. Group entries remain groups. Dictionary reference purposes do not prove a manufacturer's actual purpose, permission, legal compliance, dosage or safety. Food-type and reference-purpose dimensions may overlap. Unmatched does not mean non-additive.

Positive filtering remains `contains` or explicit `declared_contains`; negative filtering also considers `precaution` and excludes unparsed records. Warning-only category links improve conservative exclusions without inventing recipe presence. Original raw labels and all product ingredient/warning relationships remain stored unchanged. Current pending counts are derived at read time.

## Migration and verification

The private `/api/classification` endpoint only applies source-controlled batches bound to the original dataset version. No arbitrary data or SQL is accepted. Batch zero checks every ingredient ID/name. Fixed batches are transactional and replayable; completion checks exact persisted ingredients, category definitions and relationships before updating metadata. During a partial migration, catalog/product APIs return retryable 503 responses; start/end version checks prevent a mixed transition response.

Known pre-change contradictions were reproduced through real SQL: include 脂肪酸甘油酯 + exclude 乳化劑 returned 51; 亞硝酸鈉 + exclude 保色劑 returned 12; DL-胺基丙酸 + exclude 調味劑 returned 2. Regression tests require all three to become zero. Additional checks cover aliases, multiple purposes, ordinary food, warning-only/precaution handling, pending counts, migration replay and unchanged source table hashes.

Browser limitation: automated content, SSR, SQL, Worker/API and deployed-asset checks do not constitute actual pointer, keyboard, phone-touch or visual verification. No previously denied login path is retried.

## V7 researched extension — 2026-10-19

All 823 previously pending labels were accounted for using explicit source-bound decisions. Research reused authoritative evidence for coherent families and targeted manufacturer/official checks; it does not claim 823 separate online product verifications.

- 521 newly classified; 302 remain pending with a reason and source.
- 208 evidence records from 191 distinct source URLs.
- 215 exact encyclopedia-linked labels, including 58 new identity links.
- 1265 food/source-material labels, including 391 new classifications.
- 38 researched group-reference labels are explicitly separate from exact identities.
- 41 categories and 3637 ingredient-category links.

The six new categories distinguish botanicals, microbial/yeast materials, fungal materials, collagen/gelatin materials, bee products, and ethanol materials. Ethanol materials are not beverage alcohol. The starch category explicitly permits source-verified starch derivatives. Material grouping is not permission to eat/use an ingredient or evidence of safety.

`data/research-mappings.json` contains every exact label decision and evidence source. The generator binds it to the original dataset version, preserves raw IDs/names/aliases, and rejects overriding an existing exact identity. Explicit reviewed identity IDs drive the same native encyclopedia link and detail explanation. Broader group links never become exact aliases. All 823 detail explanations expose provenance or the remaining uncertainty. The original dictionary and raw product/evidence tables remain unchanged.

Unresolved reason counts: {"ambiguous_identity": 147, "compound_or_merged": 50, "insufficient_evidence": 60, "source_fragment": 45}.

Validation includes unit/content/SSR regression tests, deterministic generation, typecheck, production build, fixed-batch migration with retryable 503 guard and replay, full stored-data equality, real SQL ingredient/category contradictions, original filter counts, and deployed route/API/asset checks. These are not actual browser or phone-touch verification.
