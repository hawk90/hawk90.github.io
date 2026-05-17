---
title: "Pattern 10: Combine Functions into Transform"
date: 2026-06-01T10:00:00
description: "Derived value를 생성·복사하는 transform function 패턴."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 10
tags: [refactoring, transform-function, derived-data, fowler]
draft: true
---

> Outline — *Motivation* — 같은 derived 계산이 여기저기서·일관성 잃기 쉬움. *Mechanics* — input copy + derived field 추가하는 transform 함수·기존 derived 코드를 transform 호출로. *vs Combine into Class* — 함수형 스타일·immutable 선호 시. *Use case* — 데이터 파이프라인·view 구성.
