---
title: "Part 2-2: fork / exec / exit"
date: 2025-07-15T06:00:00
description: "프로세스 라이프사이클 — fork (COW), exec (이미지 교체), exit (좀비)."
tags: [Linux, Kernel, fork, exec]
series: "리눅스 커널의 구조와 원리"
seriesOrder: 6
draft: true
---

## 작성 중

### 예정 내용
- sys_fork / sys_vfork / sys_clone — 통합 do_fork
- copy-on-write (COW) 페이지
- execve — binfmt_elf / 스크립트 / wrapper
- 프로세스 종료 — do_exit
- 좀비 / 부모의 wait()
- reaper / subreaper
