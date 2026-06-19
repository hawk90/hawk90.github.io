---
title: "QEMU CXL Type 3 디바이스 에뮬레이션 — 노트북에서 CXL 개발 환경 구축"
date: 2026-06-18T09:02:00
description: "QEMU 8.0+ CXL 지원 — 노트북에서 CXL Type 3 디바이스를 에뮬레이션해 드라이버·BIOS 개발 환경 만들기."
series: "Modern Embedded Recipes"
seriesOrder: 150
tags: [recipes, cxl, qemu, emulation, virtualization, type-3]
draft: false
---

## 한 줄 요약

> **"실 CXL 카드 없이도 노트북에서 *CXL 드라이버·BIOS 개발*이 가능합니다."** QEMU 8.0+가 Type 3 memory expander를 stable 지원합니다.

## 왜 에뮬레이션이 필요한가

[Ch 149](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)에서 CXL의 PHY·프로토콜을 봤습니다. 그런데 *드라이버 prototype·kernel module 검증·BIOS CXL 코드 개발*에는 *실 하드웨어가 필요*합니다. Astera Leo는 *수십 만 원~수백 만 원*. 개발자 한 명이 *책상 위에서* 시작하기엔 부담입니다.

QEMU가 *CXL 디바이스를 에뮬레이션*해서 *Linux guest 안에서 마치 실 디바이스인 양* 동작합니다. *성능은 못 측정*하지만 *드라이버 동작·sysfs 노출·CEDT 파싱*은 *real에 가깝게* 검증 가능합니다.

## QEMU CXL 지원 현황

| 디바이스 유형 | 지원 | 안정도 |
|--------------|-----|--------|
| Type 3 memory expander | 8.0+ | stable |
| Type 2 accelerator + memory | 9.0+ | experimental |
| Type 1 cache-only | — | not supported |
| Multi-LD pooling | 8.2+ | partial |
| CXL Switch | 8.2+ | basic |
| CXL 3.0 fabric | — | not yet |

대부분 개발은 *Type 3*가 충분합니다. *드라이버 path*가 *Type별로 크게 갈리지 않습니다*.

## 호스트 머신 모델

QEMU에 *CXL host bridge를 자동 생성*하는 옵션:

```bash
qemu-system-x86_64 \
    -machine q35,cxl=on \
    -m 8G,slots=8,maxmem=32G \
    -smp 4 \
    -enable-kvm \
    ...
```

핵심 옵션:

| 옵션 | 의미 |
|------|------|
| `cxl=on` | CXL host bridge 자동 생성 |
| `slots=N,maxmem=M` | hot-add 가능한 메모리 슬롯 |
| `q35` | PCIe support 머신 (i440fx 안 됨) |

`-machine`이 켜져야 *CEDT가 자동 생성*되어 *Linux guest가 CXL을 인식*합니다.

## CXL Type 3 디바이스 추가

CXL Type 3 memory expander 한 개를 emulation:

```bash
qemu-system-x86_64 \
    -machine q35,cxl=on \
    -m 8G,slots=8,maxmem=32G \
    \
    -object memory-backend-file,id=cxl-mem0,share=on,mem-path=./cxl-mem-backing,size=256M \
    \
    -device pxb-cxl,bus_nr=12,bus=pcie.0,id=cxl.1 \
    -device cxl-rp,port=0,bus=cxl.1,id=root_port0,chassis=0,slot=0 \
    -device cxl-type3,bus=root_port0,memdev=cxl-mem0,id=cxl-mem0-dev \
    \
    -M cxl-fmw.0.targets.0=cxl.1,cxl-fmw.0.size=512M
```

각 옵션 의미:

| 옵션 | 역할 |
|------|------|
| `memory-backend-file` | 실 파일이 CXL device의 backing store 역할 |
| `pxb-cxl` | CXL host bridge (PCI Expander Bus, CXL flavor) |
| `cxl-rp` | CXL Root Port (PCIe Root Port의 CXL 버전) |
| `cxl-type3` | Type 3 디바이스 자체 |
| `cxl-fmw` | Fixed Memory Window (CFMWS 항목) |

*FMW size*는 *device 자체 메모리보다 커야* 합니다 — multiple device interleave를 위한 *예약 영역*.

## Linux guest 측 인식

QEMU 안에서 부팅한 Linux:

```bash
# 커널 6.0+이어야 CXL 서브시스템 동작
guest$ uname -r
6.8.0-...

# CXL 모듈 로딩
guest$ modprobe cxl_acpi
guest$ modprobe cxl_pci

# PCIe로 보임
guest$ lspci -nn | grep CXL
0c:00.0 CXL: ... [1af4:0d93]    # virtio vendor + CXL ID

# CXL sysfs 등록 확인
guest$ ls /sys/bus/cxl/devices/
mem0/  decoder0.0/  port0/  root0/

# 토폴로지
guest$ cxl list -RT
[
  {
    "root":"root0",
    "decoders":[
      {
        "decoder":"decoder0.0",
        "size":536870912
      }
    ],
    "endpoints":[
      {
        "memdev":"mem0",
        "ram_size":268435456
      }
    ]
  }
]

# Region 생성
guest$ cxl create-region -d decoder0.0 -t ram -s 256M
{
  "region":"region0",
  "size":268435456,
  "decoder":"decoder0.0"
}

# DAX 모드 또는 system RAM 모드
guest$ daxctl reconfigure-device dax0.0 -m system-ram

# numactl로 CXL 노드 확인
guest$ numactl --hardware
node 0 size: 8000 MB     # 기본 RAM
node 1 size: 256 MB      # CXL Type 3 expander
```

guest 안에서 *모든 명령이 실 디바이스와 동일하게* 동작합니다.

## CEDT 검증

QEMU가 *자동 생성한 ACPI CEDT*를 확인:

```bash
guest$ acpidump -b
guest$ iasl -d cedt.dat

# cedt.dsl 파일 내용
[001h] Signature              "CEDT"
[004h] Table Length           0x0000005C
[008h] Revision               0x01
[009h] Checksum               0x...

[Subtable Type: CHBS (CXL Host Bridge Structure)]
[001h] Subtable Type          0x00
[003h] UID                    0x0000
[007h] CXL Version            0x0001
[00Bh] Base                   0x...
[013h] Length                 0x...

[Subtable Type: CFMWS (CXL Fixed Memory Window)]
[001h] Subtable Type          0x01
...
```

CEDT 내용이 *실 BIOS와 동일한 형식*입니다. *드라이버가 같은 path*로 인식.

## 드라이버 개발 워크플로

QEMU 환경에서 *kernel module 개발 사이클*:

```bash
# host에서 cross-compile
host$ make ARCH=x86_64 CROSS_COMPILE=x86_64-linux-gnu- M=drivers/cxl/

# 결과 .ko를 guest로 복사
host$ scp drivers/cxl/cxl_mock.ko guest:/tmp/

# guest에서 load·테스트
guest$ insmod /tmp/cxl_mock.ko
guest$ dmesg | tail
guest$ ls /sys/bus/cxl/devices/

# 수정·반복
host$ vim drivers/cxl/cxl_mock.c
host$ make ...
```

*컴파일·load·테스트* 사이클이 *수십 초*. *실 하드웨어에 reboot·flash*하는 시간보다 *훨씬 빠름*.

## QEMU CXL의 한계

QEMU CXL은 *정확도가 떨어지는 영역*:

| 한계 | 영향 |
|------|------|
| latency 시뮬레이션 미정확 | 성능 측정에 못 씀 |
| 실 PCIe link 없음 | PHY·LTSSM 버그 못 잡음 |
| CXL.cache 미지원 (Type 2) | accelerator coherency 검증 한계 |
| Fabric·switch 시뮬레이션 제한 | 대규모 토폴로지 못 봄 |
| RAS·MCTP·VDM 미구현 | 운영 시나리오 검증 한계 |

*적합한 사용*:
- 드라이버 prototype·디버깅
- Kernel module ABI 변경 검증
- BIOS·UEFI CXL 코드 개발
- userland tool (cxl-cli 등) 개발
- 회귀 테스트

*부적합*:
- 성능 측정·튜닝
- 실 하드웨어 호환성 검증
- PHY·signal integrity 디버깅

## 대체 도구

QEMU 외 대안:

| 도구 | 정확도 | 속도 | 용도 |
|------|--------|------|------|
| QEMU CXL | medium | fast | 드라이버·BIOS 개발 |
| Intel CXL Modeling Project | high | slow | 정밀 시뮬레이션 |
| gem5 CXL 모델 | very high | very slow | 아키텍처 연구 |
| FPGA 보드 + CXL IP | exact | hardware | 양산 검증 |

대부분 개발자는 *QEMU + FPGA 보드 조합*이 *비용·정확도 균형*입니다.

## 자주 하는 실수

> ⚠️ `q35` 머신 안 쓰고 i440fx로 시도

```bash
$ qemu-system-x86_64 -machine pc,cxl=on ...
qemu-system-x86_64: warning: cxl option requires q35 machine
```

CXL은 *PCIe 5.0 기반*. *PCIe 자체*가 *q35 머신만 지원*. 옛 머신 모델로는 CXL이 동작 안 합니다.

> ⚠️ Backing file 권한 잘못

```bash
$ qemu-system-x86_64 \
    -object memory-backend-file,id=mem0,mem-path=/root/cxl-mem,...
# guest 시작 시 segfault — 권한 거부
```

QEMU 프로세스가 *읽기·쓰기 권한*을 가져야 합니다. `/tmp/` 또는 sudo 환경.

> ⚠️ Guest kernel 5.x 사용

```bash
guest$ uname -r
5.15.0-...
guest$ modprobe cxl_acpi
modprobe: FATAL: Module cxl_acpi not found
```

CXL subsystem은 *6.0+ mainline*. *5.15 LTS*는 OEM patch 없이는 동작 안 함. Ubuntu 24.04+ 또는 Fedora 38+ 권장.

> ⚠️ FMW size를 device size와 같게

```bash
-object memory-backend-file,...,size=256M
-M cxl-fmw.0.size=256M   # 같으면 interleave 영역 없음
```

FMW는 *interleave를 위한 예약 영역*도 포함해야. *device size의 2배 이상* 권장.

> ⚠️ Multi-device emulation 시 chassis·slot 충돌

```bash
-device cxl-rp,port=0,...,chassis=0,slot=0
-device cxl-rp,port=1,...,chassis=0,slot=0  # 충돌!
```

각 root port는 *고유 (chassis, slot)*이어야. slot을 *1, 2, 3...* 로 증가.

## 정리

- QEMU 8.0+가 *CXL Type 3 디바이스 에뮬레이션*을 stable 지원해 *드라이버·BIOS 개발*을 *노트북에서* 가능하게 합니다.
- `-machine q35,cxl=on`이 기본. `pxb-cxl·cxl-rp·cxl-type3·memory-backend-file`을 조합해 디바이스 추가.
- Linux guest는 *kernel 6.0+*에서 *cxl_acpi·cxl_pci·cxl_mem* 자동 인식. `cxl list -RT`로 토폴로지 확인.
- *latency·신호 무결성·CXL.cache* 시뮬레이션은 한계. 성능 측정·PHY 디버깅은 실 HW 필요.
- *컴파일·load·테스트 사이클이 수십 초*로 매우 빨라 *드라이버 prototype에 이상적*.

다음 편은 **Ch 151: Linux CXL 드라이버 분석** — `drivers/cxl/` 디렉터리의 코드를 *진입점부터 sysfs까지* 분해합니다.

## 관련 항목

- [Ch 149: PCIe → CXL 진화](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)
- [Ch 151: Linux CXL 드라이버 분석](/blog/embedded/modern-recipes/part11-17-linux-cxl-driver) (다음 편)
- [Bootloader Internals Ch 35: EFI·UEFI에서 CXL 초기화](/blog/embedded/bootloader/chapter35-uefi-cxl-init) — CEDT 생성
- [Kernel Debugging Ch 8: CXL 커널 드라이버 디버깅](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)
- [QEMU CXL 문서](https://qemu.readthedocs.io/en/latest/system/devices/cxl.html)
