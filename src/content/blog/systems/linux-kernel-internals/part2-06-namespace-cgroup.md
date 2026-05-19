---
title: "Part 2-6: namespace / cgroup"
date: 2026-05-12T10:00:00
description: "namespace — 리소스 격리. cgroup — 리소스 제한. 컨테이너의 토대."
tags: [Linux, Kernel, namespace, cgroup, Container]
series: "리눅스 커널의 구조와 원리"
seriesOrder: 10
draft: true
---

## 작성 중

### 예정 내용
- namespace 종류 — pid / net / mount / uts / ipc / user / cgroup
- 격리 메커니즘 — task_struct->nsproxy
- cgroup v1 vs v2
- 컨트롤러 — cpu / memory / io / pids
- 컨테이너 (Docker / podman) 구성 토대
