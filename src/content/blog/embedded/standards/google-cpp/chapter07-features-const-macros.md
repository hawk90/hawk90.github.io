---
title: "Ch 7: Other Features II — const / Numbers / Macros"
date: 2025-05-13T07:00:00
description: "Preincrement / const / constexpr / Integer / 64-bit / Preprocessor Macros / nullptr / sizeof."
tags: [Google, C++, Style-Guide, const, constexpr, Macro, nullptr]
series: "Google C++ Style"
seriesOrder: 7
draft: true
---

## 작성 예정

- Preincrement and Predecrement — `++i` / `--i` 선호 (필요한 경우만 후위)
- Use of const — 적극, 메서드 / 매개변수 / 리턴 / 변수
- Use of constexpr / constinit / consteval — 컴파일 시 상수
- Integer Types — `int`는 안전 범위 / `int64_t` 등 명시 폭
- 64-bit Portability — 포맷 지정자, 정렬, 직렬화 주의
- Preprocessor Macros — **회피**, inline / `constexpr` / 템플릿 우선
- 0 and nullptr / NULL — 포인터는 `nullptr`, 정수 0
- sizeof — 변수에 `sizeof(var)` 선호 (타입에 대해서는 명시)
