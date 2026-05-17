---
title: "Pattern 18: Hide Delegate"
date: 2026-06-01T18:00:00
description: "Law of Demeter — 중개자 노출 막기."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 18
tags: [refactoring, law-of-demeter, hide-delegate, fowler]
draft: true
---

> Outline — *Motivation* — `manager.getDepartment().getManager()` 같은 chain → Law of Demeter 위반·dependency 노출. *Mechanics* — server class에 delegate method 추가·client는 server 통해서만 호출·필요시 delegate getter 제거. *Inverse* — Remove Middle Man.
