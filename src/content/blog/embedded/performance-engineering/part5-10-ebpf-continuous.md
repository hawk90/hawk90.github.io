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

> **"Continuous profiling은 낮은 주기(Parca agent는 CPU당 19 Hz)로 프로파일을 계속 모아 두었다가, 문제가 난 시간대를 나중에 꺼내 보는 방식입니다."** 그만큼 프로파일에 무엇이 실려 나가는지도 먼저 알아야 합니다. `perf --call-graph dwarf`는 스택 메모리를 통째로 복사해 비밀 문자열까지 파일에 남겼습니다.

## 어떤 문제를 푸는가

`perf record`는 일회성 측정입니다. 30초 capture로는 어제 새벽 3시의 latency spike를 잡을 수 없고, production에서 난 문제를 재현하려고 같은 부하를 다시 만드는 일도 어렵습니다. 블랙박스 비유로 말하면, 사고가 나고 나서 카메라를 켜는 것이 아니라 항상 켜 두고 오래된 영상은 덮어쓰는 쪽입니다.

Prometheus가 metric을 항상 모으듯 profile도 항상 모으자는 것이 continuous profiling입니다. 이것이 실용적이 된 것은 eBPF 덕분입니다. 샘플 시점에 eBPF 프로그램이 커널 안에서 user·kernel stack을 뽑으므로, 뒤에서 볼 perf의 DWARF 방식처럼 샘플마다 사용자 스택 메모리를 복사해 내보낼 필요가 없습니다. 이 글은 Parca, Pyroscope, Pixie, Tetragon을 각 프로젝트 문서로 정리하고, 같은 주기로 perf를 돌려 데이터 양과 안에 든 정보를 직접 확인합니다.

> **실행 환경** Debian 13 arm64 QEMU guest(kernel 6.12.116, perf 6.12.117, 8 vCPU, host Apple M2 Pro). Parca agent v0.51.5와 server v0.30.0의 arm64 바이너리를 내려받아 checksum까지 확인했지만, 이 작업 환경에서 내려받은 바이너리 실행이 허용되지 않아 돌리지 않았습니다. Pyroscope·Pixie·Tetragon도 실행하지 않았습니다. 이 도구들에 대한 설명은 모두 본문에 링크한 공식 문서에서 확인했습니다.

## Continuous Profiling이란

| 항목 | 일회성 profiling | Continuous profiling |
|------|------------------|----------------------|
| 수집 방식 | `perf record`로 지정 구간 수집 | agent가 낮은 주기로 계속 수집 |
| 저장 위치 | local file | 중앙 server(시간축 + label) |
| 재현 | 문제 시점을 다시 만들어야 함 | 과거 시점을 조회 |
| 범위 | 한 instance | fleet 전체를 label로 집계·비교 |
| 결과물 | flamegraph 1장 | 시간 구간 선택 + 구간 간 비교 |

핵심은 주기입니다. [Parca agent design 문서](https://www.parca.dev/docs/parca-agent-design)는 agent가 eBPF 프로그램을 `PERF_COUNT_SW_CPU_CLOCK` perf event에 붙여 *논리 CPU마다 초당 19번* stack을 뽑는다고 적습니다. 19라는 숫자도 이유가 있습니다. 문서는 100 Hz(10 ms 간격)가 사용자 코드에서 흔히 쓰는 주기라 주기적인 작업과 겹치면 그 작업이 100% CPU를 쓰는 것처럼 보일 수 있고, 소수인 19는 이런 충돌을 피한다고 설명합니다. 20에 가까워 계산도 쉽습니다. 4-CPU 머신이면 초당 약 80 샘플입니다.

같은 주기의 데이터가 얼마나 되는지 perf로 재 봤습니다. 8개 vCPU를 `stress-ng --cpu 8`로 채운 상태에서 30초 동안 system-wide로 기록했습니다.

```bash
perf record -q -F 19 -a -g -o fleet.data -- sleep 30
```

샘플은 정확히 4,560개(19 × 8 × 30)였고, `perf.data`의 data 영역은 857,376 byte, 샘플 하나에 약 188 byte였습니다(fp callchain 포함, MMAP·COMM 같은 부가 이벤트 포함). 이 비율이면 8-CPU 장치 하나가 하루에 원시 perf 형식으로 약 2.47 GB를 만듭니다. Parca agent는 이렇게 샘플을 그대로 쌓지 않고 같은 stack을 세어 pprof로 묶어 보내므로(아래 절), 실제 전송량은 이보다 작아야 정상입니다. 이 값은 집계하지 않았을 때의 상한선입니다.

## Parca — eBPF agent와 server

[Parca](https://github.com/parca-dev/parca)는 server, [Parca agent](https://github.com/parca-dev/parca-agent)는 각 노드에서 도는 수집기입니다. Agent README(v0.51.5)와 design 문서에서 확인한 내용은 다음과 같습니다.

- **요구 사항**: Linux 커널 5.3 이상과 BTF. 이 글의 Debian 6.12 커널은 `CONFIG_DEBUG_INFO_BTF=y`이고 `/sys/kernel/btf/vmlinux`가 있습니다.
- **권한**: root 또는 `CAP_SYS_ADMIN`이 필요합니다([security 문서](https://www.parca.dev/docs/parca-agent-security)).
- **수집**: user·kernel stack을 모두 뽑고, 원시 데이터로 pprof 형식 profile을 만듭니다. pprof의 sample은 "stack trace와 그 stack이 관측된 횟수"입니다.
- **심볼 처리**: 커널 stack은 agent가 `/proc/kallsyms`로 즉시 심볼화합니다. 애플리케이션은 debug symbol을 server에 올리고 server가 읽을 때 심볼화하므로, 장치에 심볼 해석 부담이 없습니다.
- **빌드 방식**: BPF CO-RE로 BPF 프로그램을 미리 컴파일해 바이너리에 넣었고, 실행 중 Clang/LLVM이 필요 없습니다. 바이너리는 정적 링크입니다.

임베디드 장치에 올릴 때는 크기가 먼저 걸립니다. 내려받은 arm64 바이너리는 agent(`parca-agent_0.51.5_Linux_aarch64`)가 107,282,464 byte, server(`parca`, v0.30.0)가 260,881,520 byte였습니다. 둘 다 릴리스의 `checksums.txt`와 SHA-256이 맞았습니다. 수십 MB 단위의 rootfs를 쓰는 보드라면 agent 하나가 rootfs보다 클 수 있다는 뜻입니다. Server README는 기본 HTTP 주소를 `:7070`으로 적고, 그 주소에서 web UI를 띄웁니다.

## Frame Pointer 복원과 sFrame

Continuous profiler가 쓸모 있으려면 stack을 끝까지 복원해야 합니다. 방법은 세 가지입니다. frame pointer 체인을 따라가거나, `.eh_frame`의 DWARF CFI를 해석하거나, 더 단순한 SFrame 형식을 씁니다.

[SFrame 명세](https://sourceware.org/binutils/docs/sframe-spec.html)는 SFrame을 `.sframe` 섹션(segment type `PT_GNU_SFRAME`)에 담는 stack trace 정보로 정의하고, 지원 ABI를 AMD64, AAPCS64, s390x로 적습니다. Debian 13의 GNU assembler 2.44로 직접 만들어 봤습니다.

```bash
gcc -O2 -Wa,--gsframe -c app.c -o app_sf.o
readelf --sframe app_sf.o
```

```text
Contents of the SFrame section .sframe:
  Header :

    Version: SFRAME_VERSION_2
    Flags: NONE
    Num FDEs: 5
    Num FREs: 14

  Function Index :

    func idx [0]: pc = 0x0, size = 132 bytes
    STARTPC         CFA       FP        RA
    0000000000000000  sp+0      u         u
    0000000000000004  sp+32     c-32      c-24
    0000000000000080  sp+0      u         u
```

함수마다 "이 PC 구간에서는 CFA가 sp+32이고, FP와 RA는 CFA-32와 CFA-24에 있다" 같은 표 몇 줄이 전부입니다. DWARF CFI처럼 바이트코드를 해석할 필요가 없어서 커널이나 eBPF에서 다루기 쉽게 만든 형식입니다. 다만 만들 수 있다는 것과 쓰이고 있다는 것은 다릅니다. 같은 guest의 `/lib/aarch64-linux-gnu/libc.so.6`에는 `.sframe` 섹션이 없었습니다. 그리고 Linux v6.12의 arm64 `perf_callchain_user()`는 `arch_stack_walk_user()`를 부르고, 이 함수는 `regs->regs[29]`(x29)에서 시작해 frame record만 따라갑니다(`arch/arm64/kernel/stacktrace.c`). 따라가면서 `ptrauth_strip_user_insn_pac()`로 반환 주소의 PAC bit를 지웁니다. v6.12 트리의 `kernel/`·`arch/`·`tools/perf/`에서 `.sframe`을 읽는 코드는 찾지 못했습니다.

Pyroscope 쪽은 다른 길을 택했습니다. [Pyroscope 클라이언트 설정 문서](https://grafana.com/docs/pyroscope/latest/configure-client/)는 eBPF profiler가 C/C++·Go·Rust·Zig를 지원하며 "Frame pointers are not required"이고 `.eh_frame` 데이터로 unwinding한다고 적습니다.

## Pixie — Kubernetes Auto-Instrumentation

[Pixie](https://docs.px.dev/about-pixie/what-is-pixie/)는 Kubernetes용 observability 플랫폼으로, CPU profile 외에 요청·서비스 단위 telemetry를 자동으로 모으고 PxL로 질의합니다. [요구 사항 문서](https://docs.px.dev/installing-pixie/requirements/)에서 확인한 조건은 다음과 같습니다.

- Kubernetes v1.21 이상, Linux 커널 v4.14 이상.
- 노드마다 데이터를 모으는 PEM이 DaemonSet으로 뜨고, 기본 메모리 한도는 PEM당 2Gi, 권장 최솟값은 1Gi입니다. 문서는 노드 전체 메모리의 25% 이하를 쓰라고 권합니다.
- BPF 프로그램을 설치하려고 `vizier-pem-*` pod가 privileged 권한을 씁니다.
- CPU 항목은 본문에 "Pixie requires an x86-64 architecture"라고 쓰여 있는데, 바로 아래 지원 표에는 x86-64와 ARM이 모두 "Supported"로 나옵니다. 같은 페이지 안에서 어긋나 있으므로 ARM 노드에 올리기 전에 해당 릴리스에서 직접 확인해야 합니다.

PEM당 1~2Gi라는 조건만으로도 메모리가 수백 MB인 임베디드 장치에는 맞지 않습니다. Pixie는 장치를 묶는 Kubernetes 클러스터, 예컨대 edge 서버에 맞는 도구입니다.

## Pyroscope — 시계열 Flamegraph

[Grafana Pyroscope](https://grafana.com/docs/pyroscope/latest/introduction/)는 문서 표현으로 "multi-tenant continuous profiling aggregation system"이고, Mimir·Loki·Tempo와 같은 구조로 metric·log·trace와 함께 Grafana에서 봅니다. 수집 경로는 세 가지입니다([클라이언트 설정 문서](https://grafana.com/docs/pyroscope/latest/configure-client/)).

1. **Grafana Alloy로 auto-instrumentation** — 코드 수정 없이 수집합니다. eBPF profiler는 CPU profile을 모으고, Java·.NET·Python·Ruby·PHP·Node.js·Perl은 언어별로 켜고 끕니다.
2. **SDK instrumentation** — 애플리케이션에 SDK를 넣으면 SDK가 주기적으로 server에 push합니다. 특정 구간만 프로파일하거나 보내는 간격을 바꿀 수 있습니다.
3. **SDK → Alloy → server** — SDK가 로컬 Alloy의 `pyroscope.receive_http`로 보내고, 인증·라우팅·label 추가는 Alloy가 맡습니다.

같은 문서는 Grafana Agent가 2025-11-01에 EOL이 됐고 새 설치는 Alloy를 쓰라고 안내합니다. 구간 비교를 할 때는 base와 target의 profile type(CPU, 메모리 등)과 label을 맞춰야 의미가 있습니다. eBPF profiler가 모으는 것은 CPU profile이므로, I/O나 lock을 기다린 off-CPU 시간은 그 비교에 나오지 않습니다.

## Cilium Tetragon — Security + Observability

Tetragon은 같은 eBPF 위에 있지만 목적이 다릅니다. CPU 샘플링이 아니라 특정 커널·사용자 함수에 hook을 걸어 보안 이벤트를 관측하고 정책을 강제합니다. [Tetragon hook points 문서](https://tetragon.io/docs/concepts/tracing-policy/hooks/)는 hook 종류를 kprobe, fentry/fexit, tracepoint, raw tracepoint, uprobe, USDT, LSM BPF로 나눕니다.

같은 문서에서 눈여겨볼 경고가 둘 있습니다. 첫째, kprobe는 커널 함수에 직접 붙으므로 커널 버전에 강하게 묶여 다른 커널로 옮기면 동작하지 않을 수 있습니다. 둘째, system call에 hook을 걸면 인자가 사용자 메모리 포인터일 때 TOCTOU 경쟁이 생깁니다. hook이 검사한 뒤 커널이 그 데이터를 쓰기 전에 사용자 공간이 내용을 바꿀 수 있기 때문입니다. 문서는 데이터가 커널로 복사된 뒤에 도는 LSM `security_` hook에 거는 것이 이 문제를 피한다고 설명합니다. 그러니 "syscall kprobe에서 프로세스를 죽였다"는 것을 "그 syscall을 안전하게 막았다"와 같다고 보면 안 됩니다.

## 임베디드 Fleet 활용

자율주행 ECU, 의료 기기, 산업 로봇처럼 같은 장치가 수백~수만 대 돌면, 한 펌웨어 버전의 성능 회귀를 fleet 전체에 퍼지기 전에 잡아야 합니다.

![Fleet Continuous Profiling — Parca 예시](/images/blog/perf-eng/diagrams/part5-10-fleet-profiling.svg)

위 문서와 측정을 장치 쪽 조건으로 바꾸면 다음과 같습니다.

| 조건 | 확인한 값 | 출처 |
|---|---|---|
| 커널 | 5.3 이상 + BTF | Parca agent README |
| 권한 | root 또는 `CAP_SYS_ADMIN` | Parca security 문서 |
| agent 바이너리 | arm64 정적 바이너리 107,282,464 byte | v0.51.5 릴리스 파일 |
| 샘플 주기 | 논리 CPU당 19 Hz | Parca design 문서 |
| 집계 없는 원시 데이터 | 샘플당 약 188 byte, 8 CPU면 하루 약 2.47 GB | 이 글의 perf 측정 |

데이터 양을 줄이는 방법은 장치 쪽 집계(pprof는 같은 stack을 횟수로 묶습니다), 일부 장치만 켜기, 그리고 label을 펌웨어 버전·하드웨어 리비전 정도로 묶어 cardinality를 낮추는 것입니다. Pyroscope 문서도 label 기반 비교를 핵심 기능으로 듭니다.

## Privacy와 보안 고려

[Linux perf security 문서](https://docs.kernel.org/admin-guide/perf-security.html)(v6.12 `Documentation/admin-guide/perf-security.rst`)는 perf_events가 모으는 데이터를 네 범주로 나눕니다. 시스템 구성(CPU 모델, 메모리 양, 커널·perf 버전, perf 명령줄), 모듈 경로·load 주소·프로세스와 스레드 이름·PID, 소프트웨어·하드웨어 counter 값, 그리고 실행 레지스터 값과 *프로세스의 user·kernel 메모리 주소와 데이터*입니다. 문서는 네 번째 범주가 민감한 프로세스 데이터를 담을 수 있다고 경고합니다.

첫 두 범주는 위 19 Hz 기록의 header에서 그대로 보입니다(`perf report --header-only` 일부).

```text
# hostname : localhost
# os release : 6.12.116+deb13-arm64
# perf version : 6.12.117
# arch : aarch64
# nrcpus online : 8
# total memory : 8120848 kB
# cmdline : /usr/bin/perf record -q -F 19 -a -g -o fleet.data -- sleep 30
```

네 번째 범주는 unwinding 방식에 따라 달라집니다. 스택에 `"TOKEN-7f3a9c2e"`라는 문자열을 둔 채 오래 도는 프로그램을 만들고 두 방식으로 기록했습니다.

```bash
perf record -e cpu-clock -F 99 --call-graph fp    -o fp.data    ./secret
perf record -e cpu-clock -F 99 --call-graph dwarf -o dwarf.data ./secret
grep -a -c TOKEN-7f3a9c2e fp.data dwarf.data
```

| 방식 | 파일 크기 | 문자열 일치 줄 수 |
|---|---|---|
| `--call-graph fp` | 28,336 byte | 0 |
| `--call-graph dwarf` | 333,960 byte | 36 |

`dwarf.data`의 event 설정은 `sample_type = ...|REGS_USER|STACK_USER|...`, `sample_stack_user = 8192`였습니다. DWARF 방식은 나중에 사용자 공간에서 unwinding하려고 샘플마다 사용자 스택 8 KB를 복사해 넣고, 그 안에 지역 변수가 그대로 들어갑니다. Parca design 문서가 설명하는 전송 형식은 pprof이고, 그 구성 요소는 sample(stack trace와 관측 횟수), location, mapping, function, string입니다. 스택 메모리 내용은 이 목록에 없습니다. 그래도 함수 이름, 바이너리 경로(mapping), label은 남습니다.

그래서 다음을 지킵니다.

- 장치에서 `perf record --call-graph dwarf` 파일을 밖으로 보내지 않습니다. 보내야 한다면 fp 방식이나 eBPF agent의 stack-only 형식으로 바꿉니다.
- header의 hostname·cmdline처럼 장치 식별 정보가 실린다는 전제로 접근 권한과 보존 기간을 정합니다.
- 전송 구간은 TLS와 인증을 씁니다.
- 일반 사용자에게 perf를 열어 줄 때는 `perf_event_paranoid` 값을 정합니다. 문서 기준으로 0 이상이면 raw tracepoint와 ftrace function tracepoint를 제외하고, 1 이상이면 system-wide 모니터링을 막아 프로세스 단위로 좁힙니다. Debian 13 guest의 기본값은 3이었습니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Frame pointer 없는 binary에 continuous profiler 적용

Linux v6.12의 arm64 커널 unwinder는 x29 frame record만 따라가므로, frame record가 없는 구간에서는 체인이 끊깁니다. Pyroscope eBPF profiler처럼 `.eh_frame`을 읽는 agent를 쓰거나, 대상 바이너리를 frame pointer를 남기도록 빌드합니다. SFrame은 binutils 2.44로 만들 수 있지만 이 guest의 libc에는 없었고 v6.12 커널도 읽지 않습니다.

> ⚠️ Profile 저장소 용량 폭증

원시 샘플을 그대로 쌓으면 위 측정처럼 8-CPU 장치 하나가 하루 약 2.47 GB입니다. 장치 수를 곱하면 금방 감당이 안 됩니다. 같은 stack을 횟수로 묶는 pprof 집계를 쓰고, label 조합을 줄이고, 전체 장치가 아니라 대표 장치 일부만 켭니다.

> ⚠️ Profile에 포함되는 값을 확인하지 않고 외부 전송

```bash
perf report --header-only -i perf.data
grep -a -c '<찾을 문자열>' perf.data
```

header에는 hostname과 명령줄이 들어가고, DWARF 방식 파일에는 사용자 스택 8 KB가 샘플마다 들어갑니다. 보내기 전에 어떤 방식으로 기록했는지(`sample_type`에 `STACK_USER`가 있는지)부터 봅니다.

> ⚠️ Per-process tagging 누락

여러 서비스나 펌웨어 버전이 같은 label로 섞이면 회귀가 어느 쪽에서 났는지 가를 수 없습니다. 서비스 이름, 펌웨어 버전, 하드웨어 리비전을 label로 정해 두고, 장치 고유 ID처럼 값이 장치 수만큼 늘어나는 label은 피합니다.

## 정리

- Continuous profiling은 낮은 주기로 계속 모아 과거 시점을 조회합니다. Parca agent는 논리 CPU당 19 Hz(소수라 주기적 작업과 겹치지 않음)로 샘플링합니다.
- 같은 주기의 원시 perf 데이터는 샘플당 약 188 byte였고, 8 CPU면 하루 약 2.47 GB입니다. pprof 집계가 이것을 줄입니다.
- Parca agent는 커널 5.3+·BTF·root가 필요하고, arm64 바이너리는 약 107 MB입니다.
- Pixie는 PEM당 1~2Gi 메모리가 필요해 장치보다 edge 클러스터에 맞습니다.
- Pyroscope eBPF profiler는 `.eh_frame`으로 unwinding해 frame pointer가 필요 없고, Alloy·SDK·SDK+Alloy 세 경로로 수집합니다.
- Tetragon은 보안용 hook 도구이며, syscall hook은 TOCTOU 때문에 LSM hook보다 약합니다.
- `perf --call-graph dwarf`는 샘플마다 사용자 스택 8 KB를 복사해 지역 변수까지 파일에 남깁니다.

이 장에서 Part 5의 프로파일링 도구를 마칩니다. 다음 Part 6에서는 지금까지의 측정 절차를 실제 성능 사례에 적용합니다.

## 관련 항목

- [5-04: eBPF/bpftrace](/blog/embedded/performance-engineering/part5-04-ebpf)
- [5-09: Tracy·Hotspot·uftrace](/blog/embedded/performance-engineering/part5-09-tracy-hotspot)
- [5-01: perf 기초](/blog/embedded/performance-engineering/part5-01-perf-basics)
- [Practical RTOS Internals 2-11: Tracing·Observability](/blog/embedded/rtos/practical-internals/part2-11-tracing-observability)
