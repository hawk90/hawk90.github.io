---
title: "Ch 4: Classes"
date: 2025-05-13T04:00:00
description: "Constructors / Implicit Conversion / Copyable-Movable / Struct vs Class / Inheritance / Operator Overloading / Access / Declaration Order."
tags: [Google, C++, Style-Guide, Class, Inheritance]
series: "Google C++ Style"
seriesOrder: 4
draft: true
---

## 작성 예정

- Doing Work in Constructors — virtual 호출 금지, 실패 가능 작업 금지
- Implicit Conversions — `explicit` 단일 인자 생성자
- Copyable and Movable Types — 명시적 선택
- Structs vs. Classes — 데이터만 → struct, 동작 있음 → class
- Structs vs. Pairs and Tuples — 명명된 멤버 선호
- Inheritance — public 상속만, override 표기, 다중 상속 인터페이스만
- Operator Overloading — 신중히 (의미 보존)
- Access Control — 모두 private, 접근자 제공
- Declaration Order — public → protected → private, 그 안에서 타입 → 데이터 → 메서드
