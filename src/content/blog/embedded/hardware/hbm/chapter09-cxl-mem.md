---
title: "CXL.mem 분석 — HBM·GDDR·DDR 다음의 메모리 계층"
slug: "embedded/hardware/hbm/chapter09-cxl-mem"
date: 2026-06-15T09:01:00
description: "CPU가 CXL 장치 메모리에 접근하는 경로와 Linux 노출 모드를 살펴보고 GPU offload와의 차이를 구분합니다."
series: "HBM·GDDR 심화"
seriesOrder: 9
tags: [cxl, memory-tiering, hbm, ddr, ndp]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"HBM은 *대역폭*을, DDR은 *용량*을 풀지만, 서버 한 대에 꽂을 수 있는 메모리에는 한계가 있습니다."** — CXL.mem은 PCIe 물리 계층 위에서 *호스트 CPU가 외부 디바이스의 DRAM을 load/store로 직접 접근*하게 합니다. local DDR보다 멀리 있어 *지연은 더 크지만*, *용량을 링크 너머로 늘리는* 새 메모리 단을 만듭니다.

[Ch 8](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)에서 Llama 2 70B를 batch 128·seq 2048로 서빙하면 *weight+KV 소계 약 226 GB*(나머지 runtime 메모리 제외)가 나온다는 것을 봤습니다. H100 80 GB로는 *weight조차* 한 장에 들어가지 않습니다. CXL.mem은 먼저 **호스트 CPU의 장치 메모리 접근**을 확장합니다. CXL 1.1 규격이 Type 3를 *호스트를 위한 memory expander*로 정의하므로, 이 메모리는 GPU의 HBM이 아니라 호스트 쪽 용량입니다. GPU가 이 용량을 쓰는 경로는 이 장에서 다루지 않습니다. 이 장은 *CXL.mem이 메모리 계층의 어디에 끼는지*를 정리합니다.

## 메모리 계층의 새 자리

| Tier | 위치 | 접근 방식 |
|------|------|-----------|
| HBM | GPU·가속기 패키지 안 | load/store |
| DDR DIMM | CPU 소켓 옆 메모리 채널 | load/store |
| **CXL.mem** | **CXL 링크 너머 디바이스** | **load/store** |
| NAND SSD | NVMe | block I/O (드라이버·DMA) |

SSD는 *block I/O*라서 CPU의 load 명령으로 바로 읽을 수 없습니다. 드라이버 호출과 DMA가 끼어듭니다. 이 표는 접근 방식만 비교하며 속도 순위표가 아닙니다. CXL 장치의 지연은 [Ch 10](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol)에서 본 Sun 등의 실측처럼 같은 CPU에서도 장치마다 원격 소켓 DDR5 대비 1.35~3배로 갈렸으므로, 한 값으로 적지 않습니다.

## PCIe 위에 *load/store*를 얹는 길

CXL은 *PCIe 물리 계층을 재사용*합니다. CXL 3.1 규격(2023년 8월, 컨소시엄 공개 evaluation copy) §1.5는 Flex Bus가 *PAM4로 64 GT/s*, degraded rate로 32·16·8 GT/s를 지원한다고 적습니다. 그 위에 *세 프로토콜*을 함께 흘립니다.

| 프로토콜 | 목적 |
|----------|------|
| CXL.io | PCIe 호환 discovery·configuration·DMA |
| CXL.cache | 디바이스가 호스트 메모리를 *캐시* |
| CXL.mem | 호스트가 디바이스 메모리를 *load/store* |

CXL.mem에서는 CPU의 *load instruction*이 *MMU 변환 → 메모리 컨트롤러 → CXL 링크 → 디바이스 DRAM*을 거쳐 cache line을 가져옵니다. NVMe SSD처럼 *드라이버를 호출하거나 DMA를 설정하지 않습니다*.

이게 가능한 것은 호스트와 디바이스의 *HDM(Host-managed Device Memory) Decoder*가 *물리 주소 범위*를 CXL 디바이스로 보내도록 설정되기 때문입니다. [Linux v6.12 메모리 장치 문서](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/driver-api/cxl/memory-devices.rst)는 *주소 공간을 HDM decoder로 처리*한다고 설명합니다. 초기화·주소 매핑은 driver/firmware가 담당하고, 매 load/store마다 driver 함수를 호출하는 것은 아닙니다.

링크 원시 전송률은 `GT/s × lane 수 ÷ 8`로 어림합니다. PCIe 5.0 x16은 `32 × 16 ÷ 8 = 64 GB/s`, 64 GT/s x16은 `64 × 16 ÷ 8 = 128 GB/s`(한 방향)입니다. 실제 제품 값의 예로 Micron은 PCIe Gen5 *x8* CZ120의 읽기·쓰기 대역폭을 *최대 36 GB/s*로 밝혔습니다(MLC, read:write 2:1). 같은 x8의 원시값 `32 × 8 ÷ 8 = 32 GB/s`(한 방향)과 비교할 때는 방향 합산 여부를 구별해야 합니다.

## CXL 버전

| 버전 | 발표 | 주요 내용 |
|------|------|-----------|
| CXL 2.0 | 2020년 11월 10일 | switching(fan-out), memory pooling, persistent memory 지원, 1.1·1.0과 하위 호환 |
| CXL 3.0 | 2022년 8월 | data rate 2배(64 GT/s), fabric 기능과 관리, memory sharing·pooling 개선, peer-to-peer 통신 |

버전 표는 [CXL 2.0의 2020년 11월 10일 발표](https://computeexpresslink.org/wp-content/uploads/2024/02/0c1418_caa15c61bc7b499087ad4ec3713df1ec.pdf)와 [CXL 3.0 소개](https://computeexpresslink.org/event/cxl-3-0-enabling-composable-systems-with-expanded-fabric-capabilities/)를 기준으로 합니다. switch를 거치는 구성과 pooling은 *CXL 2.0부터*입니다. 3.0 소개 페이지는 64 GT/s를 *CXL 2.0 대비 지연 추가 없이 data rate를 두 배로* 올린 것으로 설명합니다.

## 공개 제품 사례

CXL Type 3 메모리 디바이스는 DRAM을 CXL 링크 너머에 붙이는 모듈입니다.

| 제품 | 회사 | 내용 |
|------|------|------|
| [CMM-D MD220](https://semiconductor.samsung.com/cxl-memory/cmm-d/) | Samsung | CXL 2.0, 128·256 GB, PCIe Gen5, E3.S |
| CMM-DDR5 | SK hynix | CXL 2.0. [2025년 4월 발표](https://www.storagenewsletter.com/2025/04/23/sk-hynix-completes-customer-validation-of-cxl-2-0-based-ddr5/)에서 96 GB는 고객 검증 완료, 128 GB(1bnm 32 Gb DDR5)는 검증 중 |
| [CZ120](https://www.nasdaq.com/press-release/micron-launches-memory-expansion-module-portfolio-to-accelerate-cxl-2.0-adoption-2023) | Micron | CXL 2.0 Type 3, 128·256 GB, E3.S 2T, PCIe Gen5 x8, 읽기·쓰기 최대 36 GB/s (2023-08-07 샘플 발표) |
| Leo (메모리 컨트롤러) | Astera Labs | CXL 2.0, 컨트롤러당 최대 2 TB |

각 행은 괄호 안 날짜의 벤더 발표 기준이며 현재 판매·인증 현황을 나타내지 않습니다. Samsung 페이지는 같은 제품군의 후속으로 *CXL 3.2·PCIe Gen 6, 최대 72 GB/s*의 MD310도 적습니다. [Astera Labs의 2025년 11월 18일 발표](https://www.globenewswire.com/news-release/2025/11/18/3190508/0/en/astera-labs-leo-cxl-smart-memory-controllers-on-microsoft-azure-m-series-virtual-machines-overcome-the-memory-wall.html)는 Azure M-series VM의 **preview**에서 Leo 기반 CXL 메모리 확장을 평가할 수 있다고 설명하고, 같은 발표의 forward-looking 문단은 이를 *private preview*라고 부릅니다. 이를 전체 Azure의 일반 제공이나 GPU HBM 확장으로 해석하면 안 됩니다.

## 어디서 쓰면 효과가 크나

CXL.mem은 *local DDR보다 지연이 크고*, 대신 *용량을 늘릴 수 있습니다*. 그래서 *지연보다 용량이 먼저 부족한* 워크로드에 맞습니다. Astera Labs는 같은 발표에서 Leo로 *서버 메모리 용량을 1.5배 넘게* 늘릴 수 있다며, in-memory database·big data 분석·LLM의 KV cache 저장·추천 시스템을 용도로 듭니다.

반대로 대역폭이 먼저인 일은 링크가 상한입니다. PCIe 5.0 x16의 64 GB/s는 [Ch 3](/blog/embedded/hardware/hbm/chapter03-hbm-generations)의 HBM3 stack 하나(819 GB/s)의 `64 ÷ 819 ≈ 8%`입니다.

## OS·소프트웨어 통합

CXL.mem은 *load/store가 native로 가능*하지만, *OS가 인식하고 배치를 결정*해야 합니다. Linux의 CXL 서브시스템이 이를 어떻게 보여 주는지 QEMU의 CXL Type 3 에뮬레이션으로 직접 확인했습니다. 실제 CXL 하드웨어가 아니므로 지연·대역폭은 재지 않았습니다.

- 호스트: Apple M2 Pro, QEMU 11.1.3, `-M virt,cxl=on` (hvf 가속에서는 firmware가 `unhandled exception`으로 멈춰 TCG로 실행)
- 장치: `pxb-cxl` → `cxl-rp` → `cxl-type3`(volatile 256 MiB), CXL Fixed Memory Window 4 GiB
- 게스트: Debian 13.7 arm64 (`debian-13-nocloud-arm64.qcow2`, SHA512 검증), kernel 6.12.116+deb13-arm64, `cxl`·`daxctl`·`ndctl` 81-1

```bash
qemu-system-aarch64 -M virt,gic-version=3,cxl=on -accel tcg -cpu max -m 4g,maxmem=8g,slots=4 \
  -object memory-backend-ram,id=vmem0,share=on,size=256M \
  -device pxb-cxl,bus_nr=12,bus=pcie.0,id=cxl.1 \
  -device cxl-rp,port=0,bus=cxl.1,id=root_port13,chassis=0,slot=2 \
  -device cxl-type3,bus=root_port13,volatile-memdev=vmem0,id=cxl-vmem0 \
  -M cxl-fmw.0.targets.0=cxl.1,cxl-fmw.0.size=4G ...
```

게스트의 `sysfs`에는 root·port·decoder·endpoint·memdev가 따로 나타납니다.

```text
# ls /sys/bus/cxl/devices/
decoder0.0
decoder1.0
decoder2.0
decoder2.1
decoder2.2
decoder2.3
endpoint2
mem0
nvdimm-bridge0
port1
root0
```

[ndctl의 `cxl list`](https://github.com/pmem/ndctl/blob/04815e5f8b87e02a4fb5a61aeebaa5cad25a15c3/Documentation/cxl/cxl-list.txt)로 memdev·port·decoder를 함께 보면 다음과 같습니다.

```text
# cxl list -M -P -D
[
  {
    "ports":[
      {
        "port":"port1",
        "host":"pci0000:0c",
        "depth":1,
        "decoders_committed":0,
        "memdevs:port1":[
          {
            "memdev":"mem0",
            "ram_size":268435456,
            "serial":0,
            "host":"0000:0d:00.0",
            "firmware_version":"BWFW VERSION 00"
          }
        ]
      }
    ]
  },
  {
    "root decoders":[
      {
        "decoder":"decoder0.0",
        "resource":1099511627776,
        "size":4294967296,
        "interleave_ways":1,
        "max_available_extent":4294967296,
        "pmem_capable":true,
        "volatile_capable":true,
        "accelmem_capable":true,
        "qos_class":0,
        "nr_targets":1
      }
    ]
  }
]
```

`mem0`의 `ram_size` 268435456은 QEMU에 준 256 MiB이고, root decoder `decoder0.0`의 `size` 4294967296은 4 GiB 창입니다. `resource` 1099511627776은 `0x10000000000`으로, 게스트 `/proc/iomem`의 `10000000000-100ffffffff : CXL Window 0`과 같은 주소입니다. 이 상태에서 region은 아직 없습니다.

```text
# cxl list -R
  Warning: no matching devices found

[]
# daxctl list
# numactl --hardware
available: 2 nodes (0-1)
node 0 cpus: 0 1 2 3
node 0 size: 3911 MB
node 0 free: 3360 MB
node 1 cpus:
node 1 size: 0 MB
node 1 free: 0 MB
```

CPU 없는 node 1이 *region을 만들기 전부터* 0 MB로 보입니다. CXL 창에 NUMA node 번호가 미리 잡힌 것이고, 메모리가 붙은 것은 아닙니다.

region을 만들면 decoder가 commit되어 HPA 범위가 장치 DPA로 이어집니다. [create-region v80](https://github.com/pmem/ndctl/blob/04815e5f8b87e02a4fb5a61aeebaa5cad25a15c3/Documentation/cxl/cxl-create-region.txt)대로 volatile 타입을 지정해 실행한 결과입니다.

```text
# cxl create-region -d decoder0.0 -m mem0 -t ram
cxl region: create_region: region0: failed to commit decode: No such device or address
cxl region: cmd_create_region: created 0 regions
```

같은 순간 커널 로그에는 `cxl region0: Failed to synchronize CPU cache state`와 `drivers/cxl/core/region.c:235`의 WARNING이 찍혔습니다. [Linux v6.12 `region.c`](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/cxl/core/region.c)의 `cxl_region_invalidate_memregion()`은 `cpu_cache_has_invalidate_memregion()`이 false면 이 경고를 내고 `-ENXIO`를 돌려줍니다. [`include/linux/memregion.h`](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/include/linux/memregion.h)는 `CONFIG_ARCH_HAS_CPU_CACHE_INVALIDATE_MEMREGION`이 없으면 이 함수를 `false`로 두는데, v6.12에서 이 옵션을 select하는 것은 `arch/x86/Kconfig`이고 `arch/arm64/Kconfig`에는 없습니다. 그래서 이 arm64 게스트에서는 memdev·decoder가 모두 보이는데도 region 생성이 실패했고, node 1은 계속 0 MB였습니다. **장치가 enumerate된 것과 메모리로 쓸 수 있는 것은 다른 단계**라는 것이 실제로 보입니다.

**region의 volatile/persistent 타입(`-t ram`/`-t pmem`)과 devdax/System RAM 노출 모드는 다른 축**입니다. region 생성이 성공해도 System RAM으로 online되는 것은 그다음 단계입니다.

구성이 끝난 CXL 메모리의 대표적인 Linux 노출 방식은 다음과 같습니다.

| 모드 | 어떻게 보이나 | 용도 |
|------|--------------|------|
| **System RAM** | 메모리 hotplug·online 뒤 CPU 없는 NUMA node의 일반 RAM (위 node 1 자리) | application 수정 없이 사용 |
| **Device DAX** | `/dev/daxX.Y`, mmap으로 직접 접근 (NUMA locality 메타데이터와 별개) | application이 *어디에 둘지* 결정 |

## 자주 하는 실수

### "CXL.mem은 DRAM을 대체한다"

*그렇지 않습니다*. 링크 너머에 있어 local DDR보다 *지연이 큽니다*([Ch 10](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol)의 실측 1.35~3배는 *원격 소켓* DDR5 대비입니다). CXL.mem은 DDR을 대체하는 게 아니라 *DDR 너머의 확장*입니다. Astera Labs의 표현도 *CPU-attached DRAM의 한계 너머로 메모리를 확장*하는 것입니다.

### "CXL = NVMe와 비슷한 거다"

다릅니다. NVMe는 *block 단위 I/O*와 *드라이버 호출*입니다. CXL.mem은 *cache line 단위 load/store*이고 드라이버가 접근 경로에 끼지 않습니다.

### "CXL.mem은 HBM의 대체"

*반대*입니다. HBM은 *대역폭*, CXL.mem은 *용량*입니다. 서로 보완합니다.

### "CXL 1.1과 2.0과 3.0은 다 같다"

switching과 pooling은 *CXL 2.0부터*, fabric과 64 GT/s는 *CXL 3.0부터*입니다. 버전마다 할 수 있는 구성이 다릅니다.

## 정리

- CXL.mem은 PCIe PHY 위에서 *호스트가 디바이스 DRAM을 load/store로 접근*하게 하는 프로토콜입니다.
- 호스트·디바이스의 *HDM Decoder*가 물리 주소 범위를 CXL 디바이스로 보냅니다.
- CPU의 load/store 메모리 영역을 확장하며, GPU에서 사용하는 경로는 별도 구성입니다.
- CXL 2.0은 switching·pooling, CXL 3.0은 PCIe 6.0(64 GT/s)·fabric을 더했습니다.
- *HBM 대체가 아닙니다*. HBM은 대역폭, CXL.mem은 용량입니다.
- Samsung CMM-D, SK hynix CMM-DDR5, Micron CZ120, Astera Labs Leo가 CXL 2.0 메모리 제품입니다.
- Linux는 CXL 디바이스를 sysfs에 노출하고, `cxl` 도구로 region을 만듭니다. QEMU arm64 게스트(kernel 6.12)에서는 장치가 보여도 CPU cache invalidate 지원이 없어 region 생성이 실패했습니다.

## 다음 편

[Ch 10: CXL.mem 프로토콜 분해](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol)에서는 CXL.mem 메시지가 어떻게 흐르는지, 왕복 횟수가 지연을 어떻게 만드는지를 분해합니다.

## 관련 항목

- [Ch 8: NPU·GPU에서의 HBM 활용](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage) — KV cache 폭증 문제, CXL.mem이 푸는 자리
- [Ch 5: 메모리 대역폭 병목 분석](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck) — 공칭 대역폭과 workload 병목을 구분하는 방법
- [Ch 10: CXL.mem 프로토콜 분해](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol) (다음 편)
- [Ch 11: CXL Type 1·2·3 디바이스 분류](/blog/embedded/hardware/hbm/chapter11-cxl-device-types)
- [Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric)
