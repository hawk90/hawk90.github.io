---
title: "Pattern 34: Change Value to Reference"
date: 2026-06-02T10:00:00
description: "여러 곳에 복사된 같은 값 — 단일 참조로."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 34
tags: [refactoring, reference, identity, fowler]
draft: true
---

> Outline — *Motivation* — 동일한 customer가 여러 order에 복사되어 *update sync 문제*. *Mechanics* — repository 도입·factory가 reference 반환·기존 value 사용처를 repository lookup으로. *Identity vs equality* 명확화. *Inverse* — Change Reference to Value.
