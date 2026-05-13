---
title: "Ch 3: Scoping"
date: 2025-05-13T03:00:00
description: "Namespaces / Internal Linkage / Nonmember-Static / Local Variables / Static-Global / thread_local."
tags: [Google, C++, Style-Guide, Scoping, Namespace]
series: "Google C++ Style"
seriesOrder: 3
draft: true
---

## 작성 예정

- Namespaces — using-directive 금지, named / unnamed
- Internal Linkage — `.cc` 파일에서 anonymous namespace 또는 static
- Nonmember, Static Member, and Global Functions — namespace 선호
- Local Variables — 가능한 좁게, 선언 시 초기화
- Static and Global Variables — trivially destructible만
- thread_local Variables — `ABSL_CONST_INIT` 권장
