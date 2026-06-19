---
title: "Ch 12: QEMU CXL 에뮬레이션 — 노트북에서 CXL 개발"
date: 2026-05-16T09:12:00
description: "QEMU 8.0+의 CXL Type 3 에뮬레이션과 드라이버 검증 워크플로."
series: "CXL 4.0 Internals"
seriesOrder: 12
tags: [cxl, qemu, emulation, type-3, dev-workflow]
draft: false
---

## 한 줄 요약

> **"QEMU 8.0+가 *CXL Type 3 디바이스 에뮬레이션*을 stable 지원해 *노트북에서 CXL 드라이버·BIOS 개발*이 가능해졌습니다."** — `-machine q35,cxl=on` 옵션과 `pxb-cxl·cxl-rp·cxl-type3·memory-backend-file` 조합으로 *실 디바이스 없이* *Linux guest가 CXL을 인식*합니다. *Latency 시뮬레이션은 부정확*하지만 *드라이버 prototype·BIOS 코드 검증*에는 충분.

[Ch 11](/blog/embedded/hardware/cxl/chapter11-linux-driver)에서 *Linux drivers/cxl/ 코드*를 봤습니다. *드라이버 개발·디버깅에는 실 디바이스 또는 에뮬레이션*이 필요합니다. Astera Leo 카드가 *수십~수백 만원*이라 *책상 위에서 시작*하기엔 부담. QEMU가 그 갭을 채웁니다.

## QEMU CXL 지원 현황

QEMU 8.0+의 *CXL 기능 매트릭스*:

| 항목 | 지원 | 안정도 |
|------|-----|--------|
| Type 3 memory expander | 8.0+ | stable |
| Type 2 accelerator + memory | 9.0+ | experimental |
| Type 1 cache-only | — | not supported |
| Multi-LD pooling | 8.2+ | partial |
| CXL Switch | 8.2+ | basic |
| CXL 3.0 fabric | — | not yet |

*대부분 개발은 Type 3로 충분*. *드라이버 path*가 *Type별로 크게 갈리지 않습니다*.

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
| `slots=N,maxmem=M` | hot-add 가능한 memory 슬롯 |
| `q35` | PCIe support machine (i440fx 안 됨) |

*`-machine`이 켜져야* *CEDT가 자동 생성*되어 *Linux guest가 CXL 인식*.

## CXL Type 3 디바이스 추가

전체 옵션 조합:

```bash
qemu-system-x86_64 \
    -machine q35,cxl=on \
    -m 8G,slots=8,maxmem=32G \
    \
    -object memory-backend-file,id=cxl-mem0,share=on,\
            mem-path=./cxl-mem-backing,size=256M \
    \
    -device pxb-cxl,bus_nr=12,bus=pcie.0,id=cxl.1 \
    -device cxl-rp,port=0,bus=cxl.1,id=root_port0,\
            chassis=0,slot=0 \
    -device cxl-type3,bus=root_port0,memdev=cxl-mem0,\
            id=cxl-mem0-dev \
    \
    -M cxl-fmw.0.targets.0=cxl.1,cxl-fmw.0.size=512M
```

각 옵션 의미:

| 옵션 | 역할 |
|------|------|
| `memory-backend-file` | 실 파일이 CXL device의 backing store |
| `pxb-cxl` | CXL host bridge (PCI Expander Bus, CXL flavor) |
| `cxl-rp` | CXL Root Port |
| `cxl-type3` | Type 3 디바이스 자체 |
| `cxl-fmw` | Fixed Memory Window (CFMWS entry) |

*FMW size*는 *디바이스 자체 메모리보다 커야*. multiple device interleave를 위한 *예약 영역*.

## Linux Guest의 인식 흐름

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

QEMU가 *자동 생성한 ACPI CEDT* 확인:

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
host$ make ARCH=x86_64 CROSS_COMPILE=x86_64-linux-gnu- \
    M=drivers/cxl/

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
| Intel/AMD reference | high | slow | 정밀 시뮬레이션 |
| gem5 CXL 모델 | very high | very slow | 아키텍처 연구 |
| FPGA 보드 + CXL IP | exact | hardware | 양산 검증 |

대부분 개발자는 *QEMU + FPGA 보드 조합*이 *비용·정확도 균형*입니다.

## QEMU 4.0 spec 지원

CXL 4.0 *Bundled Port·128 GT/s·Streamlined Port* 같은 *새 기능*은 *QEMU 진행 중*:

| 기능 | QEMU 상태 (대략) |
|------|----------------|
| 128 GT/s 시뮬레이션 | latency model만 (실 신호 없음) |
| Bundled Port | 실험 단계 |
| Streamlined Port | 미지원 |
| Host-initiated PPR | 미지원 |

대부분 *4.0 기능 개발*은 *QEMU patch 직접 작성 후 test*하는 방식. *Mainline 합류는 시간 걸림*.

## 자주 하는 실수

### `q35` 머신 안 쓰고 i440fx로 시도

```bash
$ qemu-system-x86_64 -machine pc,cxl=on ...
qemu-system-x86_64: warning: cxl option requires q35 machine
```

CXL은 *PCIe 5.0 기반*. *PCIe 자체*가 *q35 머신만 지원*. 옛 머신 모델로는 CXL이 동작 안 합니다.

### Backing file 권한 잘못

```bash
$ qemu-system-x86_64 \
    -object memory-backend-file,id=mem0,\
            mem-path=/root/cxl-mem,...
# guest 시작 시 segfault — 권한 거부
```

QEMU 프로세스가 *읽기·쓰기 권한*. `/tmp/` 또는 sudo 환경.

### Guest kernel 5.x 사용

```bash
guest$ uname -r
5.15.0-...
guest$ modprobe cxl_acpi
modprobe: FATAL: Module cxl_acpi not found
```

CXL subsystem은 *6.0+ mainline*. *5.15 LTS*는 OEM patch 없이는 동작 안 함. Ubuntu 24.04+ 또는 Fedora 38+ 권장.

### FMW size를 device size와 같게

```bash
-object memory-backend-file,...,size=256M
-M cxl-fmw.0.size=256M   # 같으면 interleave 영역 없음
```

FMW는 *interleave를 위한 예약 영역*도 포함해야. *device size의 2배 이상* 권장.

### Multi-device emulation 시 chassis·slot 충돌

```bash
-device cxl-rp,port=0,...,chassis=0,slot=0
-device cxl-rp,port=1,...,chassis=0,slot=0  # 충돌!
```

각 root port는 *고유 (chassis, slot)*. slot을 *1, 2, 3...* 로 증가.

## 정리

- QEMU 8.0+가 *CXL Type 3 디바이스 에뮬레이션*을 stable 지원해 *드라이버·BIOS 개발*을 *노트북에서* 가능하게 합니다.
- `-machine q35,cxl=on`이 기본. `pxb-cxl·cxl-rp·cxl-type3·memory-backend-file`을 조합해 디바이스 추가.
- Linux guest는 *kernel 6.0+*에서 *cxl_acpi·cxl_pci·cxl_mem* 자동 인식. `cxl list -RT`로 토폴로지 확인.
- *latency·신호 무결성·CXL.cache* 시뮬레이션은 한계. 성능 측정·PHY 디버깅은 실 HW 필요.
- *컴파일·load·테스트 사이클이 수십 초*로 *드라이버 prototype에 이상적*.

## 다음 편

[Ch 13: Switching·Fabric Manager — 2.0 pooling에서 3.x fabric까지](/blog/embedded/hardware/cxl/chapter13-switching-fabric)에서 *CXL switch의 진화*와 *Fabric Manager의 역할*을 본격적으로 분해합니다.

## 관련 항목

- [Ch 11: Linux drivers/cxl/ 분석](/blog/embedded/hardware/cxl/chapter11-linux-driver)
- [Modern Embedded Recipes Ch 150: QEMU CXL Type 3 디바이스 에뮬레이션](/blog/embedded/modern-recipes/part11-16-qemu-cxl-emulation)
- [QEMU 공식 CXL 문서](https://qemu.readthedocs.io/en/latest/system/devices/cxl.html)

## 시리즈 자료 출처 안내

본 글은 *QEMU 공식 문서 (GPL)·QEMU 소스·Linux drivers/cxl/ 소스*를 1차 자료로 합니다. CXL 4.0 Specification은 *§ navigation aid*로만 인용. 자세한 spec 인용 정책은 [Ch 1 footer](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내) 참고.
