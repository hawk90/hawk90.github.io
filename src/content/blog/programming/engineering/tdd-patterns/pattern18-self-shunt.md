---
title: "Pattern 18: Self Shunt"
date: 2026-07-01T18:00:00
description: "Test class 자신을 collaborator로 — minimal mock."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 18
tags: [tdd, beck, self-shunt, mock-light]
draft: true
---

> Outline — *Test class가 *직접 collaborator interface 구현*해 SUT에 주입*. *Mock framework 없이도 간단한 stub*. *Test class에 callback flag·log 보관*. *Lightweight·dependency 적음·xUnit으로 충분*. *Inheritance 또는 inner class 사용*. ch27 §3.
