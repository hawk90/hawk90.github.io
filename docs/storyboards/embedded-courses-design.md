# Embedded Engineering Courses - 설계 문서

> 작성일: 2026-05-12
> 상태: 설계 완료, 구현 진행 중

---

## 1. 개요

### 1.1 프로젝트 목표

임베디드 엔지니어를 위한 체계적인 학습 경로 시스템 구축.
"임베디드 레시피" 스타일의 코스 맵 + 시리즈 구조.

### 1.2 설계 원칙

1. **기존 시스템 활용**: 새로운 courses 컬렉션 대신 기존 `series` 시스템 활용
2. **단순함 우선**: 복잡한 구조 대신 기존 블로그 포스트 구조 유지
3. **점진적 확장**: 필요시 메타데이터 추가 가능한 구조

---

## 2. 시리즈 구성

### 2.1 최종 시리즈 목록 (4개)

| # | 시리즈명 | 난이도 | Parts | 예상 글 수 |
|---|---------|--------|-------|-----------|
| 1 | Modern Embedded Recipes | ★★★★☆ Advanced | 6 | 36 |
| 2 | Practical RTOS Internals | ★★★★☆ Advanced | 3 | 15 |
| 3 | Embedded Performance Engineering | ★★★★★ Expert | 4 | 16 |
| 4 | Embedded C++ for Real Systems | ★★★★☆ Advanced | 3 | 12 |

### 2.2 상세 구성

#### Series 1: Modern Embedded Recipes

```
Part 1: Hardware Bring-up (6 articles)
├── 1.1 UART 안 찍힐 때 체크리스트
├── 1.2 DDR init 실패 디버깅
├── 1.3 PCIe BAR mapping
├── 1.4 Device Tree 실전
├── 1.5 Bootloader 체인 이해
└── 1.6 JTAG 안 붙을 때

Part 2: RTOS & Concurrency (6 articles)
├── 2.1 ISR-safe API 설계
├── 2.2 lock-free ring buffer
├── 2.3 priority inversion
├── 2.4 memory barrier
├── 2.5 wait-free signaling
└── 2.6 timer wheel 구현

Part 3: Performance (6 articles)
├── 3.1 cache line alignment
├── 3.2 DMA-friendly allocator
├── 3.3 zero-copy pipeline
├── 3.4 NUMA memory topology
├── 3.5 SIMD 활용법
└── 3.6 ARM NEON 최적화

Part 4: Linux Embedded (6 articles)
├── 4.1 kernel module 레시피
├── 4.2 mmap vs read/write
├── 4.3 epoll driver-userspace
├── 4.4 UIO/VFIO
├── 4.5 sysfs/debugfs
└── 4.6 IRQ affinity

Part 5: FPGA / Accelerator (6 articles)
├── 5.1 FPGA mailbox protocol
├── 5.2 CQ/SQ architecture
├── 5.3 DMA completion queue
├── 5.4 PCIe streaming
├── 5.5 HLS 함정들
└── 5.6 AXI backpressure

Part 6: Embedded AI (6 articles)
├── 6.1 edge inference pipeline
├── 6.2 TensorRT 통합
├── 6.3 quantization
├── 6.4 thermal throttling
├── 6.5 Jetson 최적화
└── 6.6 zero-copy camera path
```

#### Series 2: Practical RTOS Internals

```
Part 1: Scheduler (5 articles)
├── 1.1 scheduler 구조
├── 1.2 context switch 구현
├── 1.3 tickless 모드
├── 1.4 ISR entry/exit
└── 1.5 latency 분석

Part 2: Advanced Topics (5 articles)
├── 2.1 SMP RTOS
├── 2.2 real-time memory allocator
├── 2.3 IPC internals
├── 2.4 POSIX compatibility layer
└── 2.5 시스템 콜 구현

Part 3: Comparison (5 articles)
├── 3.1 FreeRTOS 분석
├── 3.2 Zephyr 분석
├── 3.3 VxWorks 참고
├── 3.4 RT-Thread 참고
└── 3.5 RTOS 선택 가이드
```

#### Series 3: Embedded Performance Engineering

```
Part 1: CPU & Memory (4 articles)
├── 1.1 cache miss 분석
├── 1.2 branch prediction
├── 1.3 pipeline stall
└── 1.4 memory ordering

Part 2: System Level (4 articles)
├── 2.1 bus contention
├── 2.2 DMA overlap
├── 2.3 interrupt storm
└── 2.4 false sharing

Part 3: Concurrency (4 articles)
├── 3.1 lock contention
├── 3.2 spinlock vs mutex
├── 3.3 reader-writer patterns
└── 3.4 wait-free algorithms

Part 4: Profiling (4 articles)
├── 4.1 perf 마스터하기
├── 4.2 ftrace 활용
├── 4.3 eBPF/bpftrace
└── 4.4 flamegraph 분석
```

#### Series 4: Embedded C++ for Real Systems

```
Part 1: Zero-Cost Abstractions (4 articles)
├── 1.1 RAII in embedded
├── 1.2 constexpr 완전정복
├── 1.3 templates 비용 분석
└── 1.4 static polymorphism

Part 2: Memory & Error Handling (4 articles)
├── 2.1 custom allocators
├── 2.2 no-exception 설계
├── 2.3 no-RTTI
└── 2.4 std::expected vs Result

Part 3: Advanced Patterns (4 articles)
├── 3.1 intrusive containers
├── 3.2 lock-free smart pointers
├── 3.3 ownership model
└── 3.4 ETL 활용
```

---

## 3. 디렉토리 구조

### 3.1 현재 구현된 구조

```
src/
├── content/
│   └── blog/
│       └── embedded/                    # ✅ 생성 완료
│           ├── modern-recipes/
│           │   └── 00-preface.md
│           ├── rtos-internals/
│           │   └── 00-preface.md
│           ├── performance-engineering/
│           │   └── 00-preface.md
│           └── embedded-cpp/
│               └── 00-preface.md
│
├── pages/
│   └── courses/
│       └── index.astro                  # ✅ 구현 완료
│
├── components/
│   └── courses/
│       ├── DifficultyBadge.astro        # ✅ 구현 완료
│       └── CourseCard.astro             # ✅ 구현 완료 (미사용)
│
└── consts/
    └── config.ts                        # ✅ NAV_CONFIG 수정 완료
```

### 3.2 블로그 포스트 Frontmatter

```yaml
---
title: "UART 안 찍힐 때 체크리스트"
date: 2026-05-12
description: "임베디드 시스템에서 UART 출력이 안 될 때 점검해야 할 항목들"

# Series 관련 (기존 시스템 활용)
series: "Modern Embedded Recipes"
seriesOrder: 1

# 분류
tags: [embedded, uart, debugging, hardware, troubleshooting]
type: tech

# 메타
draft: false
featured: false
---
```

---

## 4. UI 스토리보드

### 4.1 코스 맵 페이지 (`/courses`)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Courses                                                       │
│   ─────────────────────                                         │
│   체계적인 학습 경로                                              │
│   시리즈별로 정리된 기술 문서와 튜토리얼                           │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   💻 Programming (4 series)                                     │
│   ┌─────────────────────┐  ┌─────────────────────┐             │
│   │ [36]                │  │ [15]                │             │
│   │ Modern Embedded     │  │ Practical RTOS      │             │
│   │ Recipes             │  │ Internals           │             │
│   │                     │  │                     │             │
│   │ 36 articles    →    │  │ 15 articles    →    │             │
│   └─────────────────────┘  └─────────────────────┘             │
│                                                                 │
│   ┌─────────────────────┐  ┌─────────────────────┐             │
│   │ [16]                │  │ [12]                │             │
│   │ Embedded Performance│  │ Embedded C++        │             │
│   │ Engineering         │  │ for Real Systems    │             │
│   │                     │  │                     │             │
│   │ 16 articles    →    │  │ 12 articles    →    │             │
│   └─────────────────────┘  └─────────────────────┘             │
│                                                                 │
│   📐 Mathematics (1 series)                                     │
│   ┌─────────────────────┐                                       │
│   │ [6]                 │                                       │
│   │ How to Solve It     │                                       │
│   │                     │                                       │
│   │ 6 articles     →    │                                       │
│   └─────────────────────┘                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 시리즈 상세 페이지 (`/series/modern-embedded-recipes`)

기존 시리즈 페이지 활용:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Modern Embedded Recipes                                       │
│   ═══════════════════════                                       │
│   36 articles                                                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   1. UART 안 찍힐 때 체크리스트                                   │
│      2026-05-12                                                 │
│                                                                 │
│   2. DDR init 실패 디버깅                                        │
│      2026-05-13                                                 │
│                                                                 │
│   3. PCIe BAR mapping                                           │
│      2026-05-14                                                 │
│                                                                 │
│   ...                                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 개별 포스트 페이지

기존 블로그 포스트 레이아웃 활용 + SeriesNav 컴포넌트:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Modern Embedded Recipes · 1/36                                │
│   ═══════════════════════════════                               │
│                                                                 │
│   UART 안 찍힐 때 체크리스트                                      │
│   ─────────────────────────────                                 │
│   2026-05-12 · 10 min read                                     │
│                                                                 │
├────────────────────────────────────────────┬────────────────────┤
│                                            │                    │
│   ## 들어가며                               │  📚 Series        │
│                                            │  ──────────────    │
│   UART가 안 찍히면 엔지니어는               │                    │
│   멘탈이 흔들립니다...                       │  Part 1: Hardware  │
│                                            │  ✓ 1 UART 체크     │
│   ## 1. 물리 연결 확인                       │  □ 2 DDR init      │
│                                            │  □ 3 PCIe BAR      │
│   가장 먼저 확인할 것은...                   │  □ 4 Device Tree   │
│                                            │  □ 5 Bootloader    │
│   ...                                      │  □ 6 JTAG          │
│                                            │                    │
├────────────────────────────────────────────┴────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  ← Previous                              Next →         │   │
│   │  (Series Home)                 DDR init 실패 디버깅     │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. 컴포넌트

### 5.1 구현 완료

| 컴포넌트 | 경로 | 상태 |
|---------|------|------|
| DifficultyBadge | `src/components/courses/DifficultyBadge.astro` | ✅ 완료 |
| CourseCard | `src/components/courses/CourseCard.astro` | ✅ 완료 (미사용) |
| Courses Index | `src/pages/courses/index.astro` | ✅ 완료 |

### 5.2 기존 컴포넌트 활용

| 컴포넌트 | 용도 |
|---------|------|
| SeriesNav | 시리즈 내 네비게이션 |
| BlogPostLayout | 포스트 레이아웃 |
| TagList | 태그 표시 |

---

## 6. 데이터 흐름

```
                    ┌─────────────────┐
                    │  content/blog/  │
                    │    *.md files   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ getPublishedPosts│
                    │   (lib/posts)   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  getAllSeries   │
                    │   (lib/posts)   │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           ▼                 ▼                 ▼
    ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
    │  /courses   │   │   /series   │   │   /blog     │
    │    index    │   │   [slug]    │   │   [slug]    │
    └─────────────┘   └─────────────┘   └─────────────┘
```

---

## 7. 구현 상태

### 7.1 완료 항목

- [x] NAV_CONFIG에 Courses 추가
- [x] `/courses` 페이지 구현 (기존 series 활용)
- [x] DifficultyBadge 컴포넌트
- [x] CourseCard 컴포넌트
- [x] `embedded` 카테고리 폴더 생성
- [x] 4개 시리즈 서문(`00-preface.md`) 작성
- [x] 서문 보강: 읽는 법, 범위, 목표, 실전 기준 추가

### 7.2 진행 예정

- [ ] 첫 번째 본편 콘텐츠 작성 (각 시리즈 `part1-01-*`)
- [ ] 시리즈별 Part 1 본문 초안 작성
- [ ] 실제 본문 생성 후 series navigation 동작 확인
- [ ] SeriesNav 스타일 개선 (Part 구분 표시)

### 7.3 선택적 개선사항

- [ ] 코스별 색상 테마
- [ ] 진행률 표시 (localStorage 기반)
- [ ] Part별 그룹화 표시
- [ ] 검색/필터 기능

---

## 8. 기술 결정 사항

### 8.1 결정: 기존 Series 시스템 활용

**이유**:
1. 이미 `series`, `seriesOrder` frontmatter 지원
2. `/series/[slug]` 페이지 존재
3. SeriesNav 컴포넌트 존재
4. 새 컬렉션 추가 시 복잡도 증가

**Trade-off**:
- Part별 그룹화 메타데이터 없음 → frontmatter 확장 가능
- 난이도/예상 시간 메타데이터 없음 → 필요시 추가 가능

### 8.2 결정: 카테고리 자동 추출

```typescript
// src/pages/courses/index.astro
const category = posts[0]?.id.split('/')[0] || 'programming';
```

**이유**:
- 폴더 구조에서 자동 추출
- 별도 메타데이터 관리 불필요
- 일관성 유지 용이

### 8.3 현재 콘텐츠 상태에 대한 메모

현재 `embedded` 카테고리는 **시리즈 서문만 작성된 상태**입니다.  
즉, 코스/시리즈 구조와 방향성은 자리잡았지만 실제 Part 본문은 아직 시작 전입니다.

따라서 다음 작업의 우선순위는:

1. 각 시리즈의 `part1-01-*` 본문 작성
2. 서문에서 약속한 시리즈 구성과 실제 글 목록을 일치시키기
3. 빈 링크 상태가 오래 유지되지 않도록 최소 1개 본문씩 먼저 채우기

---

## 9. 향후 확장 가능성

### 9.1 메타데이터 확장 (필요시)

```yaml
---
# 현재
series: "Modern Embedded Recipes"
seriesOrder: 1

# 향후 추가 가능
seriesPart: 1                    # Part 번호
seriesPartTitle: "Hardware Bring-up"  # Part 제목
difficulty: "advanced"           # 난이도
estimatedMinutes: 15             # 예상 소요 시간
prerequisites: ["linux-basics"]  # 선수 지식
---
```

### 9.2 코스 메타데이터 파일 (선택적)

```yaml
# src/content/courses/modern-embedded-recipes.yaml (선택적)
id: modern-embedded-recipes
title: Modern Embedded Recipes
subtitle: 실무에서 바로 쓰는 패턴/트러블슈팅
difficulty: advanced
estimatedHours: 40
parts:
  - id: hardware-bringup
    title: Hardware Bring-up
  - id: rtos-concurrency
    title: RTOS & Concurrency
```

---

## 10. 관련 문서

- [레퍼런스 전수조사](./embedded-courses-references.md)
- [콘텐츠 스타일 가이드](./content-style-guide.md) (작성 예정)
- [기술 용어집](./glossary.md) (작성 예정)
