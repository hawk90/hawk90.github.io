---
title: "CXL Interconnect 분석 — AI 시대 메모리 대역폭 확장"
slug: "embedded/performance-engineering/part3-11-cxl-interconnect"
date: 2026-04-25T09:10:00
description: "CXL 2.0/3.1과 Neoverse V2가 만든 cache-coherent interconnect. CXL.io·CXL.cache·CXL.mem 세 프로토콜, Type 1/2/3 디바이스, latency·대역폭의 현실."
series: "Embedded Performance Engineering"
seriesOrder: 29
tags: [cxl, interconnect, memory-bandwidth, ai, neoverse, accelerator]
topics: ["embedded"]
---

## 한 줄 요약

> **"CXL은 PCIe 전기 규격 위에 I/O·캐시·메모리 세 프로토콜을 함께 싣는 링크입니다."** CXL 3.1 명세 1.4.1절의 표현으로는 "dynamic multi-protocol technology designed to support accelerators and memory devices"입니다.

## 어떤 문제를 푸는가

전통적인 PCIe 가속기는 자기 메모리를 *별도 주소 공간*에 둡니다. GPU에 텐서를 올렸다가 결과를 받아오는 코드에 `cudaMemcpy`가 줄줄이 나오는 이유가 여기 있습니다. CPU와 가속기가 같은 자료구조를 coherent하게 볼 수 없으니, 매번 복사로 넘겨야 합니다. 두 사무실이 같은 서류를 보려면 매번 복사본을 택배로 보내야 하는 상황과 같습니다.

복사 경로의 상한도 정해져 있습니다. lane당 32 GT/s인 x16 링크라면, 인코딩·프로토콜 오버헤드를 빼기 전 원시 전송률이 한 방향 32 × 16 ÷ 8 = 64 GB/s입니다.

CXL 3.1 명세 2.2절은 Type 2 디바이스의 목표를 이렇게 적습니다. 호스트가 디바이스 메모리에 피연산자를 넣고 결과를 꺼내는 데 드는 소프트웨어·하드웨어 비용이 가속의 이득을 갉아먹지 않게 하는 것입니다. 같은 명세 1.4.1절은 CXL 2.0부터 switch를 통한 fan-out과 여러 virtual hierarchy에 걸친 디바이스 pooling을 지원한다고 적습니다. 정리하면 CXL은 *coherent 공유*와 *메모리 확장·pooling* 두 방향으로 이 문제를 다룹니다.

이 글은 세 프로토콜과 Type 1/2/3 분류를 명세 절 번호와 함께 정리하고, Arm RD-V2 문서에서 CXL이 붙는 자리를 확인합니다. 그리고 QEMU CXL Type 3 장치를 Linux 6.12 arm64에서 실제로 붙여 본 결과와, 실제 CXL 디바이스를 잰 MICRO 2023 논문의 숫자를 봅니다.

## CXL 세대별 정리

날짜는 CXL 3.1 명세의 Revision History에서 옮겼습니다. 신호 속도는 1.4.1절의 "The maximum Data Rate doubles to 64.0 GT/s with PAM-4 signaling"(CXL 3.0 설명)과 1.5절(PAM4가 아니면 32 GT/s)에서 옮겼습니다. x16 원시 전송률은 신호 속도 × 16 ÷ 8로 계산한 값입니다.

| 세대 | 명세 날짜 | 신호 속도 | x16 원시 전송률(계산, 한 방향) | Revision History·본문에 적힌 주요 추가 |
|---|---|---|---|---|
| 1.0 | 2019년 3월 | 32 GT/s | 64 GB/s | Initial release |
| 1.1 | 2019년 6월 | 32 GT/s | 64 GB/s | 1.0 정정·용어 추가 |
| 2.0 | 2020년 10월 26일 | 32 GT/s | 64 GB/s | managed Hot-Plug, single-level switching, device pooling (1.4.1절) |
| 3.0 | 2022년 8월 1일 | 64 GT/s (PAM4) | 128 GB/s | 256B Flit mode, multi-level switching(최대 4K 포트), UIO를 쓴 HDM peer-to-peer (1.4.1절) |
| 3.1 | 2023년 8월 7일 | 64 GT/s (PAM4) | 128 GB/s | TEE Security Protocol(TSP, 11.5절), fabric switch reset flow |

1.5절은 Flex Bus 링크 속성으로 "With PAM4, signaling rate of 64 GT/s ... Otherwise, signaling rate of 32 GT/s"를 적습니다. 3.x에서 여러 호스트가 같은 메모리를 나눠 쓰는 구성은 2.4.3절(Pooled Memory and Shared FAM)과 2.8절(Global FAM Type 3 Device)에 정의되어 있습니다.

## 세 프로토콜 — CXL.io·cache·mem

세 프로토콜은 한 링크를 나눠 씁니다. 명세 1.6절에 따르면 트랜잭션·링크 계층이 CXL.io 쪽과 CXL.cache+CXL.mem 쪽으로 나뉘고, 그 아래의 **ARB/MUX가 두 흐름을 interleave**해서 Flex Bus 물리 계층으로 보냅니다. 한 도로를 화물차와 승용차가 차로를 번갈아 쓰며 달리는 모습입니다.

| 프로토콜 | 용도 (CXL 3.1 명세) |
|---|---|
| CXL.io | discovery·enumeration, 오류 보고, CXL 메모리 P2P 접근, HPA lookup (1.4.1절). PCIe와 비슷한 I/O semantics |
| CXL.cache | 디바이스가 호스트 메모리를 coherent하게 캐시 (2.1절, 3.2절) |
| CXL.mem | 호스트가 디바이스에 붙은 메모리(HDM)에 load/store (2.3절, 3.3절) |

1.4.1절은 "CXL.io is required for discovery and enumeration"이라고 적고, CXL.cache와 CXL.mem은 디바이스 용도에 따라 선택적으로 구현한다고 적습니다.

![CXL 세 프로토콜 — 한 링크 위에서 interleave](/images/blog/perf-eng/diagrams/part3-11-cxl-protocols.svg)

## Type 1/2/3 디바이스

어떤 프로토콜을 쓰느냐로 디바이스가 세 종류로 나뉩니다. 명세 2.1~2.3절의 정의를 옮기면 다음과 같습니다.

| Type | 프로토콜 | 명세의 설명 |
|---|---|---|
| Type 1 | CXL.io + CXL.cache | 디바이스 안에 fully coherent cache가 필요한 경우. 예로 PCIe 표준 atomic에 없는 복잡한 atomic 연산을 듭니다. 지원 가능한 캐시 크기는 호스트 snoop filter 용량에 달려 있습니다(2.1절) |
| Type 2 | CXL.io + CXL.cache + CXL.mem | coherent cache에 더해 DDR·HBM 같은 디바이스 메모리를 가짐. 이 메모리를 HDM-D/HDM-DB라 부릅니다(2.2절) |
| Type 3 | CXL.io + CXL.mem | 예: HDM-H memory expander. CXL.cache로는 요청을 내지 않습니다(2.3절) |

2.2절은 Type 2와 기존 GPU 메모리의 차이도 짚습니다. GDDR을 단 GPGPU는 디바이스 메모리를 private(PDM)로 다뤄 호스트가 접근할 수 없지만, HDM은 시스템 주소에 매핑되어 coherent하게 보입니다.

![CXL Type 1/2/3 device topology — accelerator, accelerator+mem, memory expander](/images/blog/perf-eng/diagrams/part3-11-cxl-types.svg)

## Neoverse V2와 CHI-E

Arm의 *Neoverse V2 reference design Technical Overview*(문서 102759_0000_03_en, Release C)는 RD-V2를 V2 코어 32개와 CMN-700 mesh로 구성합니다. CMN-700은 AMBA 5 CHI issue E(CHI-E)를 따르는 coherent mesh입니다.

![Neoverse V2 + CHI-E + CXL 연결 구조](/images/blog/perf-eng/diagrams/part3-11-neoverse-chi.svg)

| 항목 | RD-V2 (2장, 3.3.1절) |
|------|------|
| 코어 | Neoverse V2 32개, 코어당 private L2 2 MB |
| Interconnect | CMN-700 6×6 mesh, AMBA 5 CHI issue E |
| Home Node | Fully coherent HN-F 32개(각 1 MB, SLC 합계 32 MB), Snoop Filter 128 MB |
| 외부 링크 | 가속기용 CML 링크 8개(CML_SMP와 CXL 2.0 지원), chip/socket 간 CML_SMP 링크 8개 |

coherency는 HN-F의 snoop filter가 추적합니다(4-09편 참고). CXL 2.0 가속기는 이 CML 링크로 같은 mesh에 붙습니다.

## 코드 — Type 3 expander를 Linux에서 보기

Type 3 장치를 Linux에서 보는 첫 단계는 `/sys/bus/cxl/devices/`와 ndctl의 `cxl list`입니다. 실보드가 없어 QEMU 11.1.3의 `cxl-type3` 장치(volatile 256 MiB)를 `-M virt,cxl=on`에 붙이고 Debian 13 arm64(커널 6.12.116+deb13-arm64, ndctl 81)를 부팅했습니다. 같은 설정을 HVF 가속으로 돌리면 UEFI 펌웨어 출력이 하나도 나오기 전부터 `0x0: unhandled exception ec=0x20`(PC 0x0)이 반복되며 부팅하지 못해, 이 측정은 TCG(`-accel tcg -cpu max`)로 했습니다.

```bash
qemu-system-aarch64 -M virt,gic-version=3,cxl=on,cxl-fmw.0.targets.0=cxl.1,cxl-fmw.0.size=4G \
  -accel tcg -cpu max -m 4g -smp 4 ... \
  -object memory-backend-ram,id=vmem0,share=on,size=256M \
  -device pxb-cxl,bus_nr=12,bus=pcie.0,id=cxl.1 \
  -device cxl-rp,port=0,bus=cxl.1,id=root_port13,chassis=0,slot=2 \
  -device cxl-type3,bus=root_port13,volatile-memdev=vmem0,id=cxl-vmem0
```

게스트에서는 root·port·endpoint·memdev와 decoder가 모두 보였습니다.

```text
# ls /sys/bus/cxl/devices/
decoder0.0  decoder1.0  decoder2.0  decoder2.1  decoder2.2  decoder2.3
endpoint2  mem0  nvdimm-bridge0  port1  root0
# cxl list -M -u
    "memdev":"mem0",
    "ram_size":"256.00 MiB (268.44 MB)",
```

장치가 보인다고 메모리가 쓸 수 있는 상태는 아닙니다. region을 만들어 decoder를 commit해야 합니다. 그런데 이 단계가 arm64에서 실패했습니다.

```text
# cxl create-region -m -d decoder0.0 -w 1 -t ram -s 256M mem0
cxl region: create_region: region0: failed to commit decode: No such device or address
cxl region: cmd_create_region: created 0 regions
# dmesg
cxl region0: Failed to synchronize CPU cache state
WARNING: CPU: 3 PID: 1595 at drivers/cxl/core/region.c:235 cxl_region_invalidate_memregion.isra.0+0x3c/0x58
```

원인은 v6.12 `drivers/cxl/core/region.c:226-243`의 `cxl_region_invalidate_memregion()`입니다. CPU가 메모리 범위 캐시 무효화(`cpu_cache_has_invalidate_memregion()`)를 지원하지 않으면, 테스트용 `CONFIG_CXL_REGION_INVALIDATION_TEST`가 꺼진 커널에서는 `-ENXIO`를 돌려줍니다. v6.12에서 `ARCH_HAS_CPU_CACHE_INVALIDATE_MEMREGION`을 select하는 아키텍처는 x86(`arch/x86/Kconfig:76`)뿐이고, Debian 커널은 그 테스트 옵션을 켜지 않았습니다. 그래서 이 환경의 `numactl -H`는 `available: 1 nodes (0)`로, CXL 메모리가 node로 올라오지 않았습니다.

region이 만들어지는 환경이라면 다음 경로가 이어집니다. region이 DAX 장치가 되고, `drivers/dax/kmem.c`가 그 범위를 `add_memory_driver_managed()`로 `dev_dax->target_node`에 붙입니다(85, 170행). 이때 `mt_calc_adistance()`로 memory tier의 abstract distance를 정하고, 플랫폼이 값을 주지 않으면 `MEMTIER_DEFAULT_DAX_ADISTANCE`(DRAM의 5배)를 씁니다. `numactl -H`의 `node distances`는 이와 별개로 ACPI SLIT 표에서 옵니다(`drivers/acpi/numa/srat.c`의 `acpi_parse_slit()`). 둘 다 상대값이라 실제 지연은 따로 재야 합니다.

## 측정 — Latency penalty

실제 CXL 디바이스의 지연은 Sun et al., *Demystifying CXL Memory with Genuine CXL-Ready Systems and Devices*(MICRO 2023, [arXiv:2303.15375](https://arxiv.org/abs/2303.15375))가 쟀습니다. 시스템은 Xeon 6430 두 소켓이고(Table 1), 비교 기준은 다른 소켓의 DDR5(DDR5-R)입니다. 4.1절 (O2)와 Figure 3의 load(ld) 지연은 다음과 같습니다.

| 디바이스 (Table 1) | CXL IP / 메모리 | ld 지연, DDR5-R 대비 (4.1절 O2) |
|---|---|---|
| CXL-A | Hard IP / DDR5-4800 | 35% 더 김 |
| CXL-B | Hard IP / 2× DDR4-2400 | 거의 2배 |
| CXL-C | Soft IP / DDR4-3200 | 거의 3배 |

논문은 이 결과에서 "true CXL memory 접근 지연은 CXL 컨트롤러 설계에 크게 좌우된다"고 결론 냅니다. 같은 DDR4를 쓴 CXL-C가 CXL-B보다 ld 지연이 67% 길었다는 점이 근거입니다. switch 경유와 CXL.cache의 지연은 이 논문의 측정 범위 밖입니다.

이런 숫자는 pointer chasing으로 잽니다. 버퍼를 무작위 순환 사슬로 엮고, 앞 load의 결과가 다음 주소가 되게 해서 load를 하나씩 직렬로 겁니다. 다음은 이 글에서 실제로 돌린 `chase.c`의 핵심입니다(128-byte 간격, 2,000만 번 load의 평균).

```c
for (size_t i = 0; i < n; i++)                 /* one random cycle */
    *(void **)(buf + perm[i] * stride) = buf + perm[(i + 1) % n] * stride;

void **p = (void **)(buf + perm[0] * stride);
for (size_t i = 0; i < n; i++) p = *p;         /* warm-up pass */
uint64_t t0 = now_ns();                        /* clock_gettime(CLOCK_MONOTONIC) */
for (long i = 0; i < iters; i++) p = *p;
uint64_t t1 = now_ns();
printf("size=%zu KiB  %.2f ns/load  (end=%p)\n", size >> 10,
       (double)(t1 - t0) / iters, (void *)p);
```

CXL 장치가 없으니 같은 코드로 *계층에 따라 지연이 어떻게 갈리는지*를 Apple M2 Pro(macOS 27.2.1, Apple clang 21.0.0 `-O2`)에서 쟀습니다. `sysctl` 기준 P 코어 L1d는 128 KiB, P 클러스터 L2는 16 MiB입니다. 크기마다 5회 돌린 중앙값이고, 다른 작업이 함께 돌던 호스트라(load average 약 8~13) 큰 버퍼일수록 편차가 컸습니다.

| 버퍼 | 중앙값 (ns/load) | 5회 범위 |
|---|---|---|
| 32 KiB | 0.92 | 0.91~0.92 |
| 128 KiB | 0.92 | 0.90~1.25 |
| 1 MiB | 5.98 | 5.96~6.04 |
| 8 MiB | 7.86 | 7.79~8.52 |
| 32 MiB | 88.98 | 86.07~105.16 |
| 128 MiB | 119.50 | 118.48~119.81 |
| 512 MiB | 142.84 | 125.25~265.43 |

L2(16 MiB)를 넘는 순간 지연이 10배 넘게 뜁니다. CXL 장치가 붙은 서버에서는 이런 계단 아래에 한 칸이 더 생깁니다. Sun et al.은 그 칸을 같은 서버의 원격 소켓 DDR5와 비교해 35%에서 거의 3배까지 더 길다고 보고했습니다. 이 Mac의 값은 그 비교의 기준선이 아닙니다.

## 대역폭 — Peak vs Sustained

링크 원시 전송률은 상한일 뿐이고, 링크 위에는 flit 형식의 오버헤드가 있습니다. CXL 3.1 명세 4.2.1절과 4.2.2절은 68B Flit mode를 이렇게 정의합니다.

- 68B flit은 링크 계층의 66B와 ARB/MUX의 2B로 이루어지고, 32 GT/s까지의 물리 계층에서 씁니다(4.2.1절).
- 66B(528b) 안에는 16B slot 4개와 2B CRC가 들어갑니다(4.2.2절). slot 하나는 header slot입니다(Figure 4-3).
- 32 GT/s를 넘는 속도에서는 256B flit이 필수입니다(4.2.1절).

CXL.io와 CXL.cache·CXL.mem이 ARB/MUX에서 같은 링크를 나눠 쓰므로, 트래픽이 섞이면 서로의 몫이 줄어듭니다. 실효 대역폭은 STREAM 같은 벤치마크로 재야 하고, 이 글의 환경에는 잴 CXL 장치가 없었습니다.

## CXL.cache 트랜잭션 흐름

CXL.cache는 MESI 상태를 디바이스와 호스트 사이로 넓힙니다. 데이터 단위는 64-byte cacheline입니다(3.2.1절). 명세 3.2.4절의 메시지로 디바이스가 line을 읽고, 호스트가 그 line에 쓰려는 흐름을 그리면 다음과 같습니다.

| 단계 | 메시지 | 명세 |
|------|------|------|
| 1 | Device → host D2H 요청. `RdShared`(Shared로 캐시) 또는 `RdOwn`(쓰기 가능 상태로 캐시) | 3.2.4.2.8, 3.2.4.2.7 |
| 2 | 호스트가 다른 캐시의 상태를 확인하고 필요하면 snoop | 3.2.4.4 |
| 3 | Host → device `GO` 응답. RspType에 MESI 상태(GO-S, GO-E, GO-M 등) | 3.2.4.5.2 |
| 4 | 호스트 쪽 쓰기가 생기면 host → device H2D `SnpInv` | 3.2.4.4.2 |
| 5 | 디바이스는 모든 사본을 무효화하고, dirty면 데이터를 돌려줌 | 3.2.4.4.2 |

3.2.4.4.2절은 `SnpInv`를 "typically triggered by write requests"라고 적고, 받은 디바이스가 "must invalidate all cachelines"라고 정합니다. CXL.cache의 H2D 요청은 `SnpData`, `SnpInv`, `SnpCur` 세 가지이고(Table 3-26), 그중 무효화를 맡는 것이 `SnpInv`입니다. 이름에 Inv가 들어간 `MemInv`·`MemInvNT`는 CXL.mem 쪽 명령입니다. 호스트와 디바이스가 같은 line을 번갈아 쓰면 `RdOwn`과 `SnpInv`가 링크를 오가는 ping-pong이 생깁니다.

## 자주 보는 함정과 안티패턴

> ⚠️ CXL.cache에서 false sharing

CXL.cache의 coherency 단위는 64-byte line입니다(3.2.1절). 같은 line을 호스트와 디바이스가 번갈아 쓰면 위 4~5단계가 쓰기마다 반복됩니다. `alignas(64)`로 라인을 분리하고, 디바이스가 쓰는 영역과 호스트가 쓰는 영역을 처음부터 다른 line에 둡니다.

> ⚠️ CXL.mem을 hot data 저장소로 사용

Sun et al.의 세 디바이스 중 가장 빠른 CXL-A도 원격 소켓 DDR5보다 ld 지연이 35% 길었습니다. 지연에 민감한 hot working set은 `numactl --membind`나 `mbind()`로 local node에 두고, CXL tier에는 덜 쓰는 데이터를 둡니다.

> ⚠️ region 생성 실패를 장치 문제로 오해

`cxl list`에 memdev가 보이는데 region commit이 `ENXIO`로 실패하면, 장치보다 아키텍처 지원부터 봅니다. 위에서 본 것처럼 v6.12 arm64는 `cpu_cache_has_invalidate_memregion()`이 없어 `Failed to synchronize CPU cache state` 경고와 함께 실패합니다.

> ⚠️ Peak 대역폭 가정

64 GB/s는 32 GT/s x16 링크의 오버헤드 전 원시 전송률입니다. 그 위에 68B flit의 CRC·header slot 오버헤드가 있으니, throughput 모델은 STREAM 같은 벤치마크로 잰 sustained 값으로 세웁니다.

## 정리

- CXL은 PCIe 전기 규격 위에 CXL.io·CXL.cache·CXL.mem을 ARB/MUX로 섞어 보내는 링크입니다(명세 1.4~1.6절). CXL.io는 필수입니다.
- Type 1은 캐시만 가진 디바이스, Type 2는 캐시와 HDM을 가진 디바이스, Type 3은 CXL.cache 요청을 내지 않는 memory expander입니다(2.1~2.3절).
- Arm RD-V2는 CHI issue E 기반 CMN-700 mesh에 CML_SMP/CXL 2.0 겸용 링크 8개를 둡니다.
- QEMU `cxl-type3` + Linux 6.12 arm64에서는 장치 열거까지는 되지만 region commit이 `ENXIO`로 실패합니다. 원인은 `region.c:235`의 캐시 무효화 경로입니다.
- 실제 CXL 디바이스의 ld 지연은 원격 소켓 DDR5 대비 35% 증가부터 거의 3배까지 디바이스마다 갈립니다(Sun et al., MICRO 2023, 4.1절).
- 68B flit은 16B slot 4개 + 2B CRC + ARB/MUX 2B입니다. 대역폭 모델은 이 오버헤드를 넣거나 실측값으로 세웁니다.

다음 편은 [3-12: CXL.mem 지연·대역폭 실측](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)으로, 토폴로지별로 지연을 어떻게 재는지 이어서 봅니다.

## 관련 항목

- [3-01: 임베디드 Bus Architecture — AHB·AXI·CHI](/blog/embedded/performance-engineering/part3-01-bus-architecture)
- [2-08: 메모리 대역폭 분석](/blog/embedded/performance-engineering/part2-08-memory-bandwidth)
- [4-09: Cache Coherency 프로토콜 — MESI·MOESI](/blog/embedded/performance-engineering/part4-09-cache-coherency)
- [3-10: Thermal Throttling 분석](/blog/embedded/performance-engineering/part3-10-thermal)
