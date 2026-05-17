---
title: "Pattern 8: Introduce Parameter Object"
date: 2026-06-01T08:00:00
description: "여러 인자가 함께 다니면 객체로 묶기."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 8
tags: [refactoring, parameter-object, data-clump, fowler]
draft: true
---

> Outline — *Motivation* — *data clump* 신호·매개변수 그룹이 여러 함수에 같이. *Mechanics* — 데이터 클래스 만들기·각 호출에서 객체로 교체·관련 동작도 객체로 이동 (Move Function). *결과* — naming·domain 모델 발견. *언제* — 3+ parameter 가 묶여 다니면.
