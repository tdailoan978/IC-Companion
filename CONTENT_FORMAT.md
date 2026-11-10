# Lesson file format

One Markdown file per lesson: `content/level-2/L11.md` … `L20.md`. The structure below is a strict contract;
the parser may rely on every detail. All teaching content in these files is original writing that follows
the lesson order, word lists and grammar-topic list of *Integrated Chinese* (4th ed.).

## File skeleton (exact headings, exact order)

```
---
id: L11
level: 2
lesson: 11
title_en: Weather
title_zh: 天气
book: Integrated Chinese 4th ed., Volume 2
book_pages: 1-32
---

# Lesson 11 · 天气 · Weather

## Objectives
- bullet list (3-5 items)

## Book reference
| Section | Page |
|---|---|
| Part 1 text | 2 |

## Vocabulary

### Part 1
| # | Chinese | Pinyin | POS | English |
|---|---|---|---|---|
| 1 | 天气 | tiānqì | n | weather |

### Part 2
(same table; numbering continues from Part 1)

## Grammar

### G1 · <topic title>
**Pattern:** `A + 比 + B + Adj`

Explanation paragraphs (Markdown prose; may contain inline code and ✗ marks).

| Chinese | Pinyin | English |
|---|---|---|
| 今天比昨天冷。 | Jīntiān bǐ zuótiān lěng. | Today is colder than yesterday. |

**Watch out:** optional single line.

## Dialogues

### Dialogue 1 · <English title>
*Setting: one English sentence.*

| Speaker | Chinese | Pinyin | English |
|---|---|---|---|
| 林月 | … | … | … |

### Dialogue 2 · <English title>
(same shape; a narrative uses the speaker 旁白, "narrator")

## Exercises

### E1 · Choose the right word {type=choice}
1. 今天___昨天冷。 [比 | 更 | 又] → 比

### E2 · Put the words in order {type=order}
1. 冷 / 比 / 昨天 / 今天 → 今天比昨天冷。

### E3 · Translate into Chinese {type=translate}
1. Tomorrow will be even hotter. → 明天会更热。

### E4 · Match the word {type=match}
1. 暖和 → warm

## Speaking prompts
| Chinese | Pinyin | English |
|---|---|---|
| 你喜欢什么天气？ | Nǐ xǐhuan shénme tiānqì? | What kind of weather do you like? |
```

## Parsing rules

- **Front matter:** simple `key: value` lines between `---` fences. `level` + `id` identify a lesson.
- **H2 sections** are exactly: Objectives, Book reference, Vocabulary, Grammar, Dialogues, Exercises,
  Speaking prompts, in that order.
- **Tables:** standard pipe tables with a header row and a separator row. Cells never contain `|` or line
  breaks. Trim whitespace in every cell.
- **Vocabulary:** two H3 blocks, `Part 1` and `Part 2`. Columns: running number, Chinese, pinyin,
  part of speech, English. Some entries are patterns or phrases (for example `不但…而且…`).
- **Grammar:** one H3 per point, heading `G<n> · <title>`. The first `**Pattern:**` line holds the pattern
  in backticks. Everything between the pattern line and the examples table is the explanation. The table
  has 3-4 example rows. An optional `**Watch out:**` line follows the table.
- **Dialogues:** exactly two H3 blocks, `Dialogue 1 · …` and `Dialogue 2 · …`. The `*Setting: …*` line is
  the scene description. 8-12 turns each.
- **Exercises:** four H3 blocks whose heading ends with `{type=choice|order|translate|match}`. Items are
  numbered lines with exactly one `→`; the answer is everything after it.
  - `choice`: the prompt has one `___` blank and one `[a | b | c]` option group (strip it from the prompt).
  - `order`: chunks separated by ` / `; the answer is the full sentence. Compare ignoring punctuation.
  - `translate`: English → model Chinese answer. Other answers can be correct, so self-mark in the app.
  - `match`: Chinese word → English meaning.
- **Speaking prompts:** one table of four open questions.

## POS tags
`n` noun, `v` verb, `adj` adjective, `adv` adverb, `vo` verb-object, `mw` measure word, `prep` preposition,
`conj` conjunction, `pr` pronoun, `part` particle, `num` numeral, `t` time word, `pn` proper noun,
`exp` set expression, `mv` modal verb, `vc` verb + complement, `intj` interjection. A cell may combine
tags with `/` (for example `n/v`).

## Pinyin conventions
Tone marks, syllables joined into words, written tone changes for 一 and 不, neutral tones unmarked,
first word and proper names capitalised.

## Recurring characters in the dialogues
林月 Lín Yuè (a university student), 马克 Mǎkè (her classmate, learning Chinese), 安娜 Ānnà (马克's friend),
陈乐 Chén Lè (林月's older cousin), plus role speakers such as 服务员, 师傅, 医生, 房东, 售货员.
