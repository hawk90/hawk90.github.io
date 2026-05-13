---
title: "Ch 9: Naming"
date: 2025-05-13T09:00:00
description: "File / Type / Variable / Constant / Function / Namespace / Enum / Macro / Aliases — 모든 식별자의 명명 규칙."
tags: [Google, C++, Style-Guide, Naming]
series: "Google C++ Style"
seriesOrder: 9
draft: true
---

## 작성 예정

- General Naming Rules — 가독성 / 풀어쓰기 / 축약 회피
- File Names — `snake_case.cc` / `snake_case.h`
- Type Names — `PascalCase`
- Variable Names — `snake_case` (멤버는 `name_` 또는 struct는 그냥 `name`)
- Constant Names — `kCamelCase` (`kDaysInWeek`)
- Function Names — `PascalCase` (`DoWork`, `GetCount`)
- Namespace Names — `snake_case`
- Enumerator Names — `kCamelCase` (enum class 권장)
- Macro Names — `UPPER_SNAKE_CASE` (가급적 회피)
- Exceptions to Naming Rules — bigtable, ndarray 등 외부 호환
