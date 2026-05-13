---
title: "Part 2-5: 시그널 처리"
date: 2025-07-16T05:00:00
description: "시그널 — 비동기 알림. signal_pending / handler / sigreturn."
tags: [Linux, Kernel, Signal]
series: "리눅스 커널의 구조와 원리"
seriesOrder: 9
---

## 작성 중

### 예정 내용
- 시그널 카탈로그 — SIGINT / TERM / KILL / 등
- 시그널 전달 — kill_pid / send_signal
- 시그널 큐 — pending / blocked
- 핸들러 호출 — sigreturn 트램폴린
- 시그널 핸들러 안전성 (async-signal-safe)
- realtime 시그널 (SIGRTMIN+)
