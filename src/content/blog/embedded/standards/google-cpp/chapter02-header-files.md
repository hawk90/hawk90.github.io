---
title: "Ch 2: Header Files"
date: 2025-05-13T02:00:00
description: "Self-contained / #define guard / IWYU / Forward declaration / Inline / Include 순서."
tags: [Google, C++, Style-Guide, Header, Include]
series: "Google C++ Style"
seriesOrder: 2
draft: true
---

## 작성 예정

- Self-contained Headers — 헤더 단독 컴파일 가능해야
- #define Guard — `PROJECT_PATH_FILE_H_` 형식
- Include What You Use — 사용하는 모든 것 직접 include
- Forward Declarations — 신중히 (혼란 가능)
- Inline Functions — 10줄 이하 권장
- Names and Order of Includes — 자기 헤더 / C / C++ / Lib / 프로젝트
