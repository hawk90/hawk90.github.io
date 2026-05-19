---
title: "5-10: 연속 프로파일링 — Parca·Pixie·Pyroscope·Tetragon"
date: 2026-05-08T29:00:00
description: "eBPF 기반 continuous profiling. Parca, Pixie, Pyroscope, Cilium Tetragon으로 24/7 분석."
series: "Embedded Performance Engineering"
seriesOrder: 52
tags: [profiling, ebpf, parca, pixie, pyroscope, tetragon, continuous-profiling]
---

## 한 줄 요약

> **"Continuous profiling은 항상 켜진 채로 1% 이하 overhead로 fleet 전체의 hotspot을 시계열로 저장합니다."**

## 어떤 문제를 푸는가

`perf record`는 일회성 측정입니다. 30초 capture로 어제 새벽 3시의 latency spike는 잡을 수 없습니다. Production에서 문제가 발생한 뒤 재현하려고 같은 부하를 만드는 일이 어려울 때도 많습니다.

Continuous profiling은 24시간 항상 sampling을 켜 두고 결과를 시계열로 저장합니다. 평소에는 overhead가 1% 이하라 production에 부담이 없고, 문제가 발생하면 그 시점의 stack을 timestamp로 조회합니다. Prometheus가 metric을 항상 수집하듯 profile을 항상 수집한다는 사고 방식입니다.

eBPF의 등장으로 이 방식이 실용적이 되었습니다. 이 글에서는 Parca, Pixie, Pyroscope, Cilium Tetragon을 살펴봅니다. 임베디드 fleet 관리에도 응용할 수 있는 도구들입니다.

## Continuous Profiling이란

```text
일회성 profiling          continuous profiling
----------------          ---------------------
perf record 30s           1% overhead, 24/7 sampling
local file                중앙 저장소(시계열)
재현 어려움                과거 시점 조회
한 instance               fleet 전체 aggregate
flamegraph 1장             시간 슬라이드 + diff
```

eBPF의 BPF profile sampler가 stack을 hash map에 집계하므로 raw event를 dump하지 않습니다. 그 결과 overhead가 매우 낮습니다.

```text
도구                  Overhead    수집 방식
perf record           3-5%        sample → file
BCC profile           1-2%        sample → console
Parca agent           <1%         sample → server (시계열)
Pyroscope agent       <1%         sample → server (시계열)
```

## Parca — CNCF eBPF 기반

Parca는 Polar Signals가 만든 오픈 소스 continuous profiler이며 CNCF 인큐베이션 프로젝트입니다. Agent와 server의 두 컴포넌트로 구성됩니다.

```bash
# Agent (각 노드)
docker run --name parca-agent \
  --privileged --pid=host \
  ghcr.io/parca-dev/parca-agent:latest \
  --remote-store-address=parca-server:7070

# Server (중앙)
docker run --name parca \
  -p 7070:7070 \
  ghcr.io/parca-dev/parca:latest
```

Agent는 eBPF로 99 Hz CPU profile을 수집해 server에 전송합니다. Server는 시계열 storage에 저장하고 web UI를 제공합니다.

```text
http://parca-server:7070/

Query   : process_cpu:samples:count:cpu:nanoseconds:delta
Time    : 2026-05-08 14:00 ~ 15:00
View    : flamegraph / icicle / sandwich
Compare : 2026-05-08 14:00 vs 2026-05-08 13:00
```

PromQL과 유사한 query 언어로 시간 범위, label, process 필터를 지정합니다.

Polar Signals Cloud는 Parca의 managed 서비스이며, self-hosted Parca와 동일한 wire format을 사용합니다.

## Frame Pointer 복원과 sFrame

Continuous profiling의 핵심 난관은 stack unwinding입니다. DWARF unwind는 정확하지만 무겁고, frame pointer는 빠르지만 모든 라이브러리가 `-fno-omit-frame-pointer`로 빌드되어야 합니다.

Ubuntu 24.04는 모든 시스템 라이브러리를 frame pointer로 빌드하기로 결정했고 Fedora도 따라가는 중입니다. 이 결정이 continuous profiling 도구의 신뢰도를 크게 올렸습니다.

sFrame은 binary에 minimal한 unwind 정보를 ELF section으로 포함하는 새로운 포맷입니다. DWARF보다 작고 빠르며 frame pointer 없이도 unwind 가능합니다.

```bash
readelf -W -S app | grep sframe
```

GCC 14, LLVM 17 이후 지원되며 Parca와 Pyroscope agent가 모두 인식합니다.

## Pixie — Kubernetes Auto-Instrumentation

Pixie는 New Relic이 인수한 도구로, Kubernetes 환경에서 코드 수정 없이 instrumentation을 제공합니다.

```bash
# Pixie CLI 설치
bash -c "$(curl -fsSL https://withpixie.ai/install.sh)"

# Cluster에 배포
px deploy
```

Agent가 모든 노드에 DaemonSet으로 배포되어 다음을 자동 수집합니다.

```text
- CPU profile (eBPF)
- HTTP requests (kprobe + uprobe)
- gRPC / Kafka / MySQL / PostgreSQL / DNS
- Pod 간 service map
- Open Telemetry export
```

특이한 점은 application 코드 수정이 0이라는 점입니다. eBPF uprobe로 OpenSSL의 read/write hook을 걸어 HTTP/2와 TLS도 디코드합니다.

```bash
px run px/http_data --start-time=-5m
```

Pixie는 PxL이라는 Python-like DSL로 query를 작성합니다.

## Pyroscope — 시계열 Flamegraph

Pyroscope는 Grafana Labs가 인수해 Grafana 통합이 진행 중입니다. Java, Go, Python, Ruby, Rust, eBPF 등 다양한 source를 지원합니다.

```bash
# Server
docker run -p 4040:4040 grafana/pyroscope

# Agent (Go application 예)
PYROSCOPE_APPLICATION_NAME=myapp \
PYROSCOPE_SERVER_ADDRESS=http://pyroscope:4040 \
./app
```

```go
import (
    "github.com/grafana/pyroscope-go"
)
pyroscope.Start(pyroscope.Config{
    ApplicationName: "myapp",
    ServerAddress:   "http://pyroscope:4040",
})
```

Web UI는 시간 슬라이더와 flamegraph diff를 제공해, "어제 14시에는 빨랐는데 오늘 14시에는 느림"의 원인을 한 화면에서 확인할 수 있습니다.

```text
Compare:
  Base   : 2026-05-07 14:00-14:30
  Target : 2026-05-08 14:00-14:30
  Diff   : json_parse +120%, db_query +5%
```

Grafana datasource로 Pyroscope를 추가하면 Tempo trace, Loki log와 함께 timeline에서 cross-correlate가 가능합니다.

## Datadog Continuous Profiler — 상용 비교

Datadog의 Continuous Profiler는 같은 사고 방식의 상용 제품입니다. APM trace와 자동 연동되어, trace span을 클릭하면 그 span 동안의 CPU profile이 표시됩니다.

```text
Trace: GET /api/order  (1.2s)
└── span: process_payment (800ms)  ← 클릭
    └── profile: 80% in encrypt_aes(), 15% in db_write()
```

기능은 강력하지만 호스트당 가격이 부과되며 fleet 규모가 커지면 비용이 크게 늘어납니다.

## Cilium Tetragon — Security + Observability

Cilium Tetragon은 eBPF 기반의 보안과 observability 도구입니다. BPF_LSM hook으로 syscall과 file access, network connection을 실시간 감시하고 정책 위반 시 차단합니다.

```yaml
apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: block-suspicious
spec:
  kprobes:
  - call: "sys_openat"
    selectors:
    - matchArgs:
      - index: 1
        operator: "Equal"
        values: ["/etc/shadow"]
      matchActions:
      - action: "Sigkill"
```

Continuous profiling이 "느린 곳"을 찾는다면 Tetragon은 "이상한 행동"을 찾습니다. 컨테이너 환경의 supply chain attack을 막는 용도로 채택이 늘고 있습니다.

## 임베디드 Fleet 활용

자율주행 ECU, 의료 기기, 산업 로봇 같은 fleet은 수백에서 수만 대의 device가 운영됩니다. 한 device의 latency 회귀가 fleet 전체에 퍼지기 전에 발견해야 합니다.

```text
Device 1   →  Parca agent  ↘
Device 2   →  Parca agent  →  중앙 collector  →  알람
Device N   →  Parca agent  ↗
```

Parca agent는 ARM aarch64 binary가 제공되며 Linux를 실행하는 임베디드 보드에 그대로 배포 가능합니다. Memory footprint는 30-50 MB 수준이라 작은 보드에는 부담스럽지만, 게이트웨이 급 보드에는 적용 가능합니다.

데이터 양이 문제라면 fleet에서 일부 device만 sampling하거나, agent 측에서 1시간 단위 aggregate한 결과만 보내도록 설정합니다.

## Privacy와 보안 고려

```text
Stack trace에 포함될 수 있는 정보
├── 함수 이름 (대체로 안전)
├── source file path (드물게 회사 정보 노출)
├── inline된 상수 (key, password 위험)
└── 사용자 데이터 (drop)

권장
- profile 데이터를 외부로 보내기 전 inline 상수 scrubbing
- internal network에만 전송
- TLS 필수, 인증 토큰 필수
- 보존 기간 정책 (기본 30일 권장)
```

eBPF로 사용자 메모리에 접근 가능하므로 SOC 2, ISO 27001 같은 인증 환경에서는 agent 권한과 데이터 흐름을 명시적으로 문서화해야 합니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Frame pointer 없는 binary에 continuous profiler 적용

```text
JVM, glibc, libssl 등이 frame pointer 없이 빌드됨
→ stack이 5단계 이상 깨져 flamegraph가 무의미
```

Ubuntu 24.04 또는 frame pointer 빌드된 distro를 사용하거나, sFrame을 지원하는 toolchain으로 빌드합니다.

> ⚠️ Profile 저장소 용량 폭증

```text
Fleet 1000대 × 4 Hz × 30일 = 수십 TB
```

집계와 retention 정책 없이는 storage가 폭발합니다. 시간이 지난 데이터는 hourly aggregate로 다운샘플링합니다.

> ⚠️ Inline 상수에 secret 노출

```c
const char *api_key = "sk-1234567890abcdef";
do_api_call(api_key);
```

Stack frame에 api_key가 inline되면 profile에 노출됩니다. Secret은 환경 변수로 분리하고 stack frame에 띄우지 않습니다.

> ⚠️ Per-process tagging 누락

```text
모든 process가 같은 label로 들어옴 → 어느 service인지 구분 불가
```

Pyroscope의 `application_name`, Parca의 `service.name` label을 명시적으로 설정합니다.

## 정리

- Continuous profiling은 1% 이하 overhead로 24/7 sampling을 시계열 저장합니다.
- Parca는 CNCF 오픈 소스이며 Prometheus와 사고 방식이 유사합니다.
- Pixie는 Kubernetes auto-instrumentation으로 코드 수정 없이 HTTP, gRPC, DB까지 디코드합니다.
- Pyroscope는 Grafana 통합이 진행 중이며 시간 슬라이더와 diff flamegraph를 제공합니다.
- Cilium Tetragon은 같은 eBPF 기반이지만 보안 정책 enforcement에 초점이 있습니다.
- Frame pointer 또는 sFrame이 stack unwinding 신뢰도의 전제 조건입니다.
- 임베디드 fleet에서는 일부 device sampling과 hourly aggregate로 데이터 양을 관리합니다.

이로써 Part 5(측정과 분석)와 Embedded Performance Engineering 시리즈의 본문이 마무리됩니다. perf의 sampling부터 ETM hardware trace, Tracy ns marker, 그리고 continuous profiling까지 임베디드 시스템의 성능을 측정하는 거의 모든 도구를 한 번씩 다뤘습니다. 실제 현장에서는 한 도구로 끝나지 않으며, 큰 그림은 perf와 Nsight으로, 깊은 분석은 ETM과 Tracy로, 장기 추적은 Parca나 Pyroscope로 조합하는 식이 자연스럽습니다.

## 관련 항목

- [5-04: eBPF/bpftrace](/blog/embedded/performance-engineering/part5-04-ebpf)
- [5-09: Tracy·Hotspot·uftrace](/blog/embedded/performance-engineering/part5-09-tracy-hotspot)
- [5-01: perf 기초](/blog/embedded/performance-engineering/part5-01-perf-basics)
- [Practical RTOS Internals 2-11: Tracing·Observability](/blog/embedded/rtos/practical-internals/part2-11-tracing-observability)
