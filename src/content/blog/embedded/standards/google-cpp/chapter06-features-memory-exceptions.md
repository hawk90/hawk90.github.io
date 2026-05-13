---
title: "Ch 6: Other Features I — Memory / Exceptions"
date: 2025-05-13T06:00:00
description: "Ownership / Smart Pointers / Rvalue / Friends / Exceptions / noexcept / RTTI / Casting / Streams."
tags: [Google, C++, Style-Guide, Smart-Pointer, Exception, RTTI, Casting]
series: "Google C++ Style"
seriesOrder: 6
draft: true
---

## 작성 예정

- Ownership and Smart Pointers — `unique_ptr` 우선, `shared_ptr` 신중
- Rvalue References — move semantics에 한정
- Friends — 같은 파일 안에서만
- Exceptions — **사용 금지** (기존 코드 호환)
- noexcept — 의미 있을 때 사용
- Run-Time Type Information — **제한** (테스트 외)
- Casting — C 스타일 금지, `static_cast` / `reinterpret_cast` 등 명시
- Streams — 사용자 IO 외 회피, `absl::StrFormat` 등 선호
