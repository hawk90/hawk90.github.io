---
title: "연속 프로파일링 — Parca·Pixie·Pyroscope·Tetragon"
slug: "embedded/performance-engineering/part5-10-ebpf-continuous"
date: 2026-04-27T09:09:00
description: "eBPF 기반 continuous profiling. Parca, Pixie, Pyroscope, Cilium Tetragon으로 24/7 분석."
series: "Embedded Performance Engineering"
seriesOrder: 49
tags: [profiling, ebpf, parca, pixie, pyroscope, tetragon, continuous-profiling]
topics: ["embedded"]
---

## 한 줄 요약

> **"Continuous profiling은 프로파일을 주기적으로 수집해 시간대별 변화를 비교할 수 있게 합니다."**

## 어떤 문제를 푸는가

`perf record`는 일회성 측정입니다. 30초 capture로 어제 새벽 3시의 latency spike는 잡을 수 없습니다. Production에서 문제가 발생한 뒤 재현하려고 같은 부하를 만드는 일이 어려울 때도 많습니다.

Continuous profiling agent는 설정한 주기와 표본화 방식으로 profile을 수집해 저장합니다. 오버헤드와 보존 범위는 agent 설정, workload, sampling rate, symbol 처리, 저장·전송 방식에 따라 달라지므로 배포 전 측정합니다. Prometheus가 metric을 항상 수집하듯 profile을 항상 수집한다는 사고 방식입니다.

eBPF의 등장으로 이 방식이 실용적이 되었습니다. 이 글에서는 Parca, Pixie, Pyroscope, Cilium Tetragon을 살펴봅니다. 임베디드 fleet 관리에도 응용할 수 있는 도구들입니다.

## Continuous Profiling이란

| 항목 | 일회성 profiling | Continuous profiling |
|------|------------------|----------------------|
| 수집 방식 | `perf record`로 지정 구간 수집 | agent 설정에 따른 연속 수집 |
| 저장 위치 | local file | 중앙 저장소(시계열) |
| 재현 | 재현 어려움 | 과거 시점 조회 |
| 범위 | 한 instance | fleet 전체 aggregate |
| 결과물 | flamegraph 1장 | 시간 슬라이드 + diff |

Agent의 표본화·집계·전송·unwinding 경로는 제품·release에 따릅니다. Map 집계를 쓴다는 사실만으로 무시할 수 있는 overhead를 보장하지 않습니다.

| 도구 | 수집 방식 |
|------|----------|
| `perf record` | sample → file |
| BCC profile | sample → console |
| Parca agent | agent 설정에 따라 sample → server |
| Pyroscope agent | agent 설정에 따라 sample → server |

## Parca — CNCF eBPF 기반

[Parca 공식 overview](https://www.parca.dev/docs/overview/)는 profile의 수집·저장·시간별 조회와 label 기반 data model을 설명합니다. Agent와 server의 실제 release·설정·인증·전송 호환성을 함께 고정합니다. 이 글은 CNCF 등급·managed service wire 호환성을 독립 검증하지 않아 단정하지 않습니다.

기존의 `latest` image·privileged container command는 대상 release·권한 범위·TLS·예상 결과를 확인하지 않은 채 배포 가능한 recipe로 두지 않습니다. 이 환경에서는 Parca agent/server를 실행하지 않았습니다. Capture 성공·symbolization·label 구분·loss·server 전송 실패를 각각 검사해야 합니다.

## Frame Pointer 복원과 sFrame

Unwinding은 binary·library의 frame pointer·DWARF·SFrame 등 가용 정보와 unwinder 구현에 따릅니다. Ubuntu/Fedora 전체 binary의 기본 설정이나 compiler version만으로 지원을 단정하지 않습니다. [SFrame specification](https://sourceware.org/binutils/docs/sframe-spec/index.html)과 producer(compiler·assembler/linker), consumer(profiler)의 ISA·format version을 따로 확인합니다.

```bash
readelf -W -S app
```

`.sframe` section 존재는 첫 단서입니다. 모든 frame이 복원되거나 선택한 agent가 지원한다는 증거는 아닙니다. 이 command와 실제 unwinding은 여기서 실행하지 않았습니다.

## Pixie — Kubernetes Auto-Instrumentation

[Pixie 공식 overview](https://docs.px.dev/about-pixie/what-is-pixie/)는 Kubernetes observability·자동 telemetry·PxL query를 설명합니다. Continuous CPU profile뿐 아니라 request·service 정보 등 수집 범위를 구분합니다. 모든 TLS·runtime·protocol을 code 수정 없이 해석한다고 일반화하지 않습니다.

기존 원격 install script와 확인하지 않은 query를 실행 성공 예로 제시하지 않습니다. 필요한 kernel feature·권한·지원 protocol/library·수집 내용·in-cluster 저장과 외부 전송 경계를 해당 release에서 확인합니다. Pixie를 배포하거나 application request를 수집하지 않았습니다.

## Pyroscope — 시계열 Flamegraph

[Grafana Pyroscope 공식 문서](https://grafana.com/docs/pyroscope/latest/)는 continuous profile 집계와 Grafana의 다른 관측 신호와의 연결을 설명합니다. SDK와 auto-instrumentation은 서로 다른 수집 경로입니다. 선택한 language·agent·server release와 label schema로 확인해야 합니다.

불완전한 Go snippet·untagged server command·가상 diff 결과를 실제 회귀 분석으로 쓰지 않습니다. 같은 profile type·단위·sampling·시간 범위·workload·label을 맞춘 뒤 base/target를 비교하고, CPU profile만으로 off-CPU wait·latency 원인을 모두 설명하지 않습니다. 이 환경에서는 실제 Pyroscope·Datadog profile을 수집하지 않았습니다.

## Cilium Tetragon — Security + Observability

[Tetragon hook points 문서](https://tetragon.io/docs/concepts/tracing-policy/hooks/)는 kprobe·fentry/fexit·tracepoint·uprobe 등 hook을 구분합니다. 보안 관측·enforcement는 CPU sampling profiler와 다른 목적입니다.

기존 `sys_openat`·생략된 argument type·Sigkill YAML은 kernel/CRD/ABI에 맞는 동작을 확인하지 않아 제거했습니다. Kprobe policy를 BPF LSM hook이라고 부르거나 process kill을 해당 syscall의 안전한 사전 거부와 같다고 보지 않습니다. 적용한다면 지원 hook·argument 추출·action 시점·권한·관찰/차단 mode·오탐 복구를 검증해야 합니다. 실제 정책을 실행하지 않았습니다.

## 임베디드 Fleet 활용

자율주행 ECU, 의료 기기, 산업 로봇 같은 fleet은 수백에서 수만 대의 device가 운영됩니다. 한 device의 latency 회귀가 fleet 전체에 퍼지기 전에 발견해야 합니다.

![Fleet Continuous Profiling — Parca 예시](/images/blog/perf-eng/diagrams/part5-10-fleet-profiling.svg)

Parca agent의 지원 아키텍처·필수 kernel feature·메모리 footprint는 선택한 release와 target 환경에 따라 달라집니다. 임베디드 보드에 배포하기 전 공식 release 지원표와 실제 resource 사용량을 확인합니다.

데이터 양이 문제라면 fleet에서 일부 device만 sampling하거나, 해당 agent가 지원하는 집계·전송·buffer 정책을 선택합니다. 임의의1시간 aggregation 옵션이 모든 agent에 있다고 가정하지 않습니다.

이 장의 공식 문서는2026-10-24에 선택 절을 대조했습니다. Product 배포·sample·overhead·retention을 실행 검증한 결과는 아닙니다.

## Privacy와 보안 고려

Linux perf security 문서는 수집 가능한 profile metadata와 접근 권한의 위험을 설명합니다([공식 문서](https://docs.kernel.org/admin-guide/perf-security.html)). 실제 agent가 기록하는 필드는 제품·설정별로 점검해야 합니다.

Stack trace에는 다음 정보가 포함될 수 있습니다.

- **함수 이름** — 내부 기능·구성을 드러낼 수 있습니다.
- **source file path** — 계정·repository·내부 경로가 포함될 수 있습니다.
- **Stack profile:** 보통 호출 주소·symbol과 process metadata를 담습니다. 임의의 local 변수 값이나 inline 상수는 자동으로 포함되지 않습니다. 수집된 주소·경로·process 이름은 민감할 수 있습니다.
- **사용자 데이터** — 수집 단계에서 drop해야 합니다.

그래서 다음을 권장합니다.

- symbol·path·process metadata가 포함될 수 있으므로 외부 전송 전 수집 필드와 접근 권한을 검토합니다.
- internal network에만 전송합니다.
- TLS와 인증 토큰을 필수로 둡니다.
- 보존 기간을 조직 정책에 따라 정합니다.

eBPF program의 접근은 verifier, helper, attach type, kernel 권한에 제한됩니다. profile agent도 설정된 stack collection과 권한을 검토해 데이터 흐름을 문서화합니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Frame pointer 없는 binary에 continuous profiler 적용

Frame-pointer 기반 unwinding은 binary의 build option에 영향을 받습니다. 누락된 stack frame과 unwinder 지원을 target runtime에서 점검합니다.

프레임 포인터나 별도 unwind information 제공 여부를 배포판·binary·profiler 조합에서 확인합니다. sFrame 지원은 compiler, assembler/linker와 agent version별 문서에서 각각 확인해야 합니다.

> ⚠️ Profile 저장소 용량 폭증

단순 raw 크기의 모델은 device 수 × sample/초 × byte/sample × 보존 초입니다. 집계·압축·symbol·label cardinality·compaction·복제·index를 포함한 실제 저장량은 따로 측정합니다. 이 식만으로 특정 fleet이 수십TB라거나 hourly downsampling이 제공된다고 단정하지 않습니다.

> ⚠️ Profile에 포함되는 값을 확인하지 않고 외부 전송

```bash
# 예시: 전송 전에 수집 필드·symbol·경로·process metadata를 점검
perf report --header-only
```

위 command는 perf header metadata를 읽는 예이며 agent의 전체 payload·privacy 검사를 대신하지 않습니다. 일반적인 call-stack sampling은 local 변수 내용을 덤프하지 않습니다. 다만 주소·symbol·경로·process metadata 등 제품이 실제 수집하는 필드를 확인하고, 별도 memory/argument capture 기능은 민감 정보 취급 정책에 맞춰 제한합니다.

> ⚠️ Per-process tagging 누락

동일 label을 쓰면 service 구분이 어려워질 수 있으므로, profile에 포함되는 label schema를 사전에 정합니다.

실제 제품·release의 label 이름과 service/device/build 식별자를 정합니다. 고정 device ID의 cardinality·접근 권한·보존 정책도 검토합니다.

## 정리

- Continuous profiling은 상시 또는 주기적으로 profile을 수집할 수 있으며, sampling 비용과 저장량은 실제 배포 설정으로 측정합니다.
- Parca·Pyroscope의 profile type·label·time window와 수집/저장 경계를 구분합니다.
- Pixie의 자동 telemetry 범위는 kernel·library·protocol 지원 조건으로 확인합니다.
- Pyroscope는 Grafana 통합이 진행 중이며 시간 슬라이더와 diff flamegraph를 제공합니다.
- Cilium Tetragon은 같은 eBPF 기반이지만 보안 정책 enforcement에 초점이 있습니다.
- Unwinding 자료의 존재와 실제 agent 복원 성공을 구분합니다.
- Fleet에서는 loss·resource budget·고유 label·전송 실패·접근 제어를 작은 대상부터 검증합니다.

이 장에서 Part 5의 프로파일링 도구를 마칩니다. 실제 선택은 OS·SoC 기능, 수집 권한, 계측 비용과 필요한 시간 범위에 따라 달라집니다. 다음 Part 6에서는 프로파일링과 측정 절차를 실제 성능 사례에 적용합니다.

## 관련 항목

- [5-04: eBPF/bpftrace](/blog/embedded/performance-engineering/part5-04-ebpf)
- [5-09: Tracy·Hotspot·uftrace](/blog/embedded/performance-engineering/part5-09-tracy-hotspot)
- [5-01: perf 기초](/blog/embedded/performance-engineering/part5-01-perf-basics)
- [Practical RTOS Internals 2-11: Tracing·Observability](/blog/embedded/rtos/practical-internals/part2-11-tracing-observability)
