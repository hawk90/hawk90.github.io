---
title: "5-10: Continuous Profiling — Parca·Pixie·Cilium eBPF"
date: 2026-05-08T29:00:00
description: "Continuous profiling 시대. Parca·Pixie·Cilium. 24/7 production profile. Frame pointer·sFrame."
series: "Embedded Performance Engineering"
seriesOrder: 52
tags: [profiling, ebpf, parca, pixie, cilium, continuous-profiling]
draft: true
---

## 한 줄 요약

> **"Continuous profiling = 항상 켜져 있는 perf record"** — production 24/7 hot path.

## 등장 배경

```text
2010년대: perf record 1회 — 문제 발생 후 측정
2020년대: continuous — *항상 sampling* + storage
  - eBPF로 < 1% overhead
  - 1년치 history 가능
  - "어제 새벽 3시 왜 spike?" 답
```

Google Wide Profiling (2010) — *내부 모든 server*에 항상 profiler. *Datacenter 대규모 최적화*.

## Parca — Polar Signals

```bash
# Server-side
docker run -p 7070:7070 parca/parca

# Agent — eBPF sampling
docker run --privileged parca/parca-agent
```

기능:
- eBPF-based sampling (`profile.bpf.c`)
- < 1% CPU overhead
- pprof 호환 format
- Web UI flame graph
- 1년+ data retention

오픈소스. Polar Signals 회사.

## Pixie — Newrelic

```text
Pixie:
  - Kubernetes-native
  - Auto-instrumentation (no code change)
  - eBPF로 HTTP·gRPC·MySQL 자동 trace
  - PXL query language
  
"왜 latency spike?" → 자동 답
```

Newrelic이 인수. Open source.

## Cilium Tetragon — Security + Profiling

```text
Cilium Tetragon:
  - eBPF-based runtime observability
  - Process·syscall·network event
  - Container/k8s 통합
  - Security policy enforcement도
```

profiling보다 *observability + security* 중심.

## Frame Pointer 부활

```bash
# Fedora 38+, Ubuntu 24.04+ — 기본 frame pointer 포함
gcc -O2 -fno-omit-frame-pointer source.c
```

이전 — `-fomit-frame-pointer`로 register 1개 절약. Modern — frame pointer로 *profiling 활성화*.

성능 영향 — Linux x86_64에서 *< 2%*. Profiling 가치가 압도.

## sFrame — 차세대 Stack Unwind

```text
DWARF unwind info — debug 영역, 거대
  → production binary에 stripped
sFrame:
  - 컴팩트 stack unwind format
  - Production-friendly
  - Linux 6.4+ kernel 지원
```

GCC·LLVM에서 *sFrame 생성* — frame pointer 없이도 *profiling 가능*.

## eBPF Sampling 메커니즘

```c
SEC("perf_event")
int sample_stack(struct bpf_perf_event_data *ctx) {
    u64 stack[MAX_STACK_DEPTH];
    int depth = bpf_get_stackid(ctx, &stack_map,
                                  BPF_F_USER_STACK | BPF_F_KERNEL_STACK);
    /* Per-stack count++ */
    bpf_map_update_elem(&count_map, &depth, &one, BPF_ANY);
    return 0;
}
```

매 sample — BPF map에 *stack hash + count*. User-space에서 *주기적 수집*.

## Pyroscope / Grafana

```bash
# Pyroscope server
docker run -p 4040:4040 pyroscope/pyroscope server

# Agent
PYROSCOPE_SERVER=http://pyroscope:4040 \
PYROSCOPE_APPLICATION_NAME=myapp \
./pyroscope-agent ./my-app
```

Grafana 통합 — *시간별 flame graph*. Grafana Cloud Profiles.

## Datadog Continuous Profiler

상용:
- Java·Python·Go·Ruby·Node 자동 profile
- 1주일 retention 기본
- Anomaly detection
- 분당 GB 데이터 처리

## Pyroscope eBPF Auto-Discovery

```bash
docker run --privileged pyroscope/pyroscope:latest ebpf
```

Kubernetes pod·container 자동 발견 — *zero-config*. Pod label 기반 metadata.

## 임베디드 — Embedded Linux Box

```text
Edge gateway·router·industrial Linux:
  - Long-running (수개월)
  - Memory leak·perf degradation 가능
  - Field에서 debug 어려움
  
Solution — Parca/Pyroscope local agent
  - 1% overhead
  - 1 GB storage / month
  - 원격 hot path 확인
```

자동차 인포테인먼트·산업 IoT 게이트웨이 — *continuous profiling 적용*.

## Continuous Profiling 메트릭

| Metric | 값 |
|---|---|
| CPU overhead | 0.5-2% |
| Memory (agent) | ~50 MB |
| Storage | 1-10 GB / day |
| Sample rate | 19-99 Hz |
| Stack depth | 50+ frames |

## Frame Pointer 없을 때 — perf SPE (ARM)

```text
ARM Statistical Profiling Extension (SPE):
  - Hardware-based sampling
  - Cortex-A65/A77+ 일부
  - 매 N cycle마다 *sample packet* (PC + load addr)
  - 매우 적은 overhead
```

```bash
perf record -e arm_spe// ./prog
```

Server·고급 모바일 Cortex-A — SPE가 *frame pointer 없이도 profiling 활성화*.

## DWARF based eBPF Unwinder

```text
일부 eBPF profiler (Parca):
  - DWARF unwind info를 BPF map에 load
  - kernel BPF가 *DWARF rules*로 unwind
  - Frame pointer 없는 binary도 OK
```

CIlium hubble·Parca 채택. 코드 변경 없이 *기존 production binary*에서 profile.

## Production 운영 예 — Spotify

```text
Spotify 1000+ Kubernetes services:
  - Pyroscope agent 모든 pod에 sidecar
  - 24/7 sampling
  - Slack alert — "service X CPU 50% 위 30 min"
  - 자동 flame graph 캡쳐
```

Issue 발생 시 *이전 사진* 확인 가능 — RCA 시간 단축.

## VTune·perf vs Continuous

```text
Traditional perf record:
  - Run once
  - 시점 hot path
  - 짧은 window

Continuous:
  - Always on
  - History
  - Trend·anomaly detect
  - Comparison (어제 vs 오늘)
```

서로 *보완 관계* — continuous로 trend, ad-hoc perf로 deep dive.

## OpenTelemetry Profiles

```text
OTel 표준에 *profile signal 추가* (2024)
  - Trace + Metrics + Logs + *Profiles*
  - 통합 observability
  - Vendor 독립
```

Datadog·Grafana·Newrelic — OTel format 채택.

## 자주 하는 실수

> ⚠️ Frame pointer 없는 binary

```bash
# Continuous profiler가 stack 못 얻음
gcc -O2 -fomit-frame-pointer ./prog
parca-agent --pid=1234   /* → empty stacks */
```

→ `-fno-omit-frame-pointer` 컴파일.

> ⚠️ Storage 폭주

```bash
# 1000 pod × 1 GB/day = 1 TB/day
```

→ retention 정책·sampling rate 조정.

> ⚠️ Privacy 노출

```text
Stack trace에 *함수 이름·인자*?
  Production에서 *sensitive data 노출 가능*
```

→ symbol-only, no args.

> ⚠️ Cold start spike

```text
Container 시작 직후 *JIT compile·class load*
→ profile에 잘못된 hot path
```

→ warmup 후 sampling 시작.

## 정리

- **Continuous profiling** = always-on perf.
- **Parca·Pyroscope·Pixie** = eBPF 기반 modern stack.
- 1% overhead, 1년 retention.
- **Frame pointer 부활** + **sFrame** = production-friendly unwind.
- ARM **SPE** = hardware sampling.
- **OpenTelemetry Profiles** = vendor 독립 표준.
- 자동차·IoT — edge box에 long-running.

다음 part는 **Case Studies**.

## 관련 항목

- [5-09: Tracy Hotspot](/blog/embedded/performance-engineering/part5-09-tracy-hotspot)
- [6-01: Case ISR Latency](/blog/embedded/performance-engineering/part6-01-case-isr-latency)
