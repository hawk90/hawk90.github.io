---
title: "2-04: Speculative Execution — OoO·Reorder Buffer·Register Renaming"
date: 2026-05-08T11:00:00
description: "Out-of-order execution. ROB·issue queue·rename. Spectre 측면. Cortex-A 사례."
series: "Embedded Performance Engineering"
seriesOrder: 12
tags: [cpu, speculative, ooo, reorder-buffer, renaming]
draft: true
---

## 한 줄 요약

> **"Speculation = 미래 예측 실행"** — 결과 맞으면 *commit*, 틀리면 *rollback*.

## In-Order vs Out-of-Order

```c
ldr r0, [r1]    ; load — cache miss 가능 (100+ cycle)
add r2, r3, r4  ; r0 무관 — 독립
sub r5, r6, r7  ; 독립
mul r8, r0, r9  ; r0 의존 — load 완료까지 대기
```

### In-Order (Cortex-M, Cortex-A53)

```text
ldr r0, [r1]    ████████████████ (cache miss 동안 모두 stall)
add r2, ...     stall
sub r5, ...     stall
mul r8, ...     실행
```

### Out-of-Order (Cortex-A72, Apple M1)

```text
ldr r0, [r1]    ████████████████
add r2, ...     ██ (먼저 실행 — r0 무관)
sub r5, ...     ██
mul r8, ...     stall → ldr 완료 후 실행
```

**Load latency hiding** — 메모리 대기 동안 *다른 명령 실행*. IPC 향상.

## OoO 핵심 구성요소

```text
            ┌──────────────────────────────────┐
Fetch  →  │  Decode + Rename                  │
            └────────────┬────────────────────┘
                         ↓
                ┌────────────────┐
                │  Issue Queue   │  (reservation station)
                └────┬────┬─────┘
                     ↓    ↓
                   [ALU0][ALU1][LSU][FPU]   ← 병렬 실행
                     │    │    │    │
                     ↓    ↓    ↓    ↓
                ┌────────────────┐
                │ Reorder Buffer │  (in-order commit)
                └────┬───────────┘
                     ↓
                Architectural Register
```

## Register Renaming

ISA 레벨 `r0`은 16개. 그러나 OoO에선 *physical register* (Cortex-A72 = 90개)에 mapping.

```text
ISA:  add r0, r1, r2   →   physical: p10 = p1 + p2 (rename r0→p10)
      sub r3, r0, r4   →   physical: p11 = p10 + p4 (r0=p10 lookup, rename r3→p11)
      add r0, r5, r6   →   physical: p12 = p5 + p6 (rename r0→p12 — WAW 해소)
```

WAR·WAW 의존성 제거 — *진짜 RAW만* 남음.

## Reorder Buffer (ROB)

```text
ROB entry (in fetch order):
  [add ✓ r0=12] [sub ✓ r3=10] [ldr ⏳ r1=?] [add ⏳] [mul ⏳]
                                 ↑ load miss — 대기
                                 
이미 실행 완료된 sub, add는 *ROB에 대기*. ldr 완료 후 *순서대로 commit*.
```

ROB 크기 = OoO window. Cortex-A72 = 128 entry. Apple M1 = 630+ entry (괴물).

## Speculative Load — Load Hoisting

```c
if (ptr != NULL) {
    x = ptr->field;   // ← branch 확정 전에 미리 load
}
```

Modern CPU는 *branch resolve 전*에 미리 load 실행. Branch 맞으면 결과 사용, 틀리면 *결과 폐기* (그러나 *cache 상태는 남음*).

이게 **Spectre v1**의 토대.

## Wrong-Path Execution

```c
beq r0, r1, taken    ; branch
not_taken_path:      ; 미리 fetch + speculative execute
  add ...
  sub ...
  ldr [r2]           ; speculative load — cache 영향
taken:
  ...
```

분기 잘못 예측 시 — *not-taken path*의 명령 모두 *rollback*. 그러나 *cache는 update됨*.

Spectre exploit — 비밀 데이터를 *speculative path*에서 cache로 끌어옴 → cache timing 측정으로 leak.

## Memory Disambiguation

```c
str r0, [r1]    ; store
ldr r2, [r3]    ; load — r1 == r3?
```

OoO에서 *load를 store 앞으로 보낼 수 있나?* — *주소 같지 않으면 OK*. 주소 같으면 *forwarding* 또는 stall.

```text
Store Queue:
  [addr=0x1000, data=42, ✓]
  [addr=0x1004, data=99, ✓]

Load:
  addr=0x1000 → Store Queue match → forward 42 (memory 안 가도 됨)
  addr=0x2000 → no match → memory access
```

Cortex-A72 = *Memory Order Buffer* (MOB)로 store/load 순서 관리.

## Speculative Execution의 측정

```bash
perf stat -e instructions,cycles,br_pred_retired,br_misp_retired ./prog

# IPC = instructions / cycles
# Cortex-A72 ideal: 2-3
# 실제 일반 코드: 1.5-2
```

낮은 IPC + 낮은 mispredict rate → *memory bound* 또는 *data dependency*.

## ARM Cortex-A72 OoO Spec

| 항목 | 값 |
|---|---|
| Fetch width | 3 |
| Decode/Rename | 3-wide |
| Issue queue | 32-entry |
| ROB | 128-entry |
| Physical registers | 90 (int) + 128 (fp) |
| Execution units | 2 ALU + 1 LSU + 1 FPU + 1 NEON |
| ALU latency | 1 cycle |
| Load latency | 4 cycle (L1 hit) |

## OoO 단점

| 단점 | 영향 |
|---|---|
| **전력** | Rename·ROB·issue queue = die area 2-3배 |
| **검증 비용** | 의존성·forwarding 경우의 수 폭증 |
| **Spectre·Meltdown** | speculation 부작용 |
| **WCET 예측 곤란** | 분석 어려움 → 안전성 critical 시스템 회피 |

LV·항공기 *flight control*은 OoO 회피하고 *in-order Cortex-R5*나 *Cortex-A53 in-order* 사용.

## In-Order의 부활 — Embedded·자동차

| CPU | OoO? | 용도 |
|---|---|---|
| Cortex-R5 | In-order | 자동차 brake·airbag |
| Cortex-A53 | In-order | 라즈베리 파이 3, 저전력 SoC |
| Cortex-R52 | In-order | 자동차 ASIL D ECU |
| Cortex-A72 | OoO | Linux server, 라즈베리 파이 4 |
| Cortex-A78 | OoO | 모바일 flagship |

**Determinism이 중요한 곳은 in-order.**

## RISC-V — OoO 옵션

| Core | OoO? |
|---|---|
| **SiFive E31** (마이크로컨트롤러) | In-order |
| **SiFive U54** (Linux) | In-order |
| **SiFive U74** (개선) | In-order, dual-issue |
| **SiFive U84·P870** | OoO |
| **Berkeley BOOM** | OoO (open source) |

오픈소스 BOOM = academic OoO RISC-V — 학습용으로 좋음.

## 자주 하는 실수

> ⚠️ OoO = 항상 빠름

저전력 임베디드는 *in-order가 더 빠를 수* (전력당 성능). 특히 *짧은 코드·예측 가능한 path*에선 OoO overhead가 더 큼.

> ⚠️ Spectre 무시

Linux server·multi-tenant 환경에선 *Spectre mitigation* 필수 — `RETBLEED`·`SBB` 패치. 임베디드 fully trusted 환경은 *비활성화 가능*.

> ⚠️ Speculation barrier 남발

```c
__asm__("dsb sy; isb");   // 매 라인 → OoO 효과 무력화
```

*특정 보안 critical 지점*에만. 일반 코드는 컴파일러가 알아서.

> ⚠️ WCET = average

OoO CPU에선 *worst case* >> *average*. 자동차·항공 인증엔 *별도 WCET 분석 도구* (aiT, Bound-T).

## 정리

- OoO = **issue 순서 ≠ 완료 순서**. ROB가 in-order commit.
- **Register renaming**으로 WAR·WAW 의존성 제거.
- Speculation = branch·load 예측 실행 → Spectre 위험.
- *In-order vs OoO* trade-off — 결정성·전력 vs 성능.
- 안전 critical (브레이크·비행 제어)은 in-order 선호.

다음 편은 **Cache 기초**.

## 관련 항목

- [2-03: Branch Prediction](/blog/embedded/performance-engineering/part2-03-branch-prediction)
- [2-05: Cache 기초](/blog/embedded/performance-engineering/part2-05-cache-basics)
