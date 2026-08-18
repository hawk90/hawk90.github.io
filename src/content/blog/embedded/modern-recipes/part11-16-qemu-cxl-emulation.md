---
title: "QEMU CXL Type 3 디바이스 에뮬레이션 — 노트북에서 CXL 개발 환경 구축"
date: 2026-06-18T09:02:00
description: "QEMU 8.0+로 CXL Type 3 개발 환경을 30분 안에 세우는 레시피 — 한 번에 붙여넣는 실행 명령, 부팅 후 검증 순서, 처음 세울 때 걸리는 함정."
series: "Modern Embedded Recipes"
seriesOrder: 150
tags: [recipes, cxl, qemu, emulation, virtualization, type-3]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"실 CXL 카드 없이도 노트북에서 *CXL 드라이버·BIOS 개발*이 가능합니다."** QEMU 8.0+가 Type 3 memory expander를 stable 지원합니다.

## 왜 에뮬레이션이 필요한가

[Ch 149](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)에서 CXL의 PHY·프로토콜을 봤습니다. 그런데 드라이버 prototype이나 BIOS의 CXL 초기화 코드를 손보려면 *디바이스가 실제로 있어야* 합니다. Astera Leo 같은 Type 3 카드는 수십만 원에서 수백만 원이고, 그것을 꽂을 CXL 지원 보드까지 필요합니다. 개발자 한 명이 책상 위에서 시작하기엔 문턱이 높습니다.

QEMU는 그 문턱을 없애 줍니다. Linux guest 입장에서는 `lspci`에도 잡히고 `/sys/bus/cxl/devices/`에도 등록되는, 실 디바이스와 구분이 안 되는 CXL 디바이스가 생깁니다. 대여한 장비를 반납할 걱정 없이 커널 모듈을 몇 번이고 다시 올렸다 내렸다 할 수 있는 셈입니다.

이 글은 *환경을 세우는 레시피*입니다. QEMU의 CXL 지원 범위와 내부 동작, CEDT 테이블 구조, 4.0 기능의 구현 현황은 [CXL 4.0 Internals Ch 12](/blog/embedded/hardware/cxl/chapter12-qemu-emulation)에서 다룹니다.

## 준비물

시작하기 전에 호스트 쪽 조건을 확인합니다. 여기서 하나라도 어긋나면 아래 명령이 조용히 실패합니다.

| 항목 | 최소 | 확인 명령 |
|------|------|----------|
| QEMU | 8.0+ | `qemu-system-x86_64 --version` |
| Guest 커널 | 6.0+ | guest에서 `uname -r` |
| Guest 이미지 | Ubuntu 24.04+ 또는 Fedora 38+ | — |
| CPU 가상화 | KVM 활성 | `ls /dev/kvm` |
| 여유 디스크 | backing store 크기 + 여유 | `df -h .` |

Guest 배포판을 최신으로 고르는 이유는 하나입니다. CXL 서브시스템은 커널 6.0에 mainline으로 들어갔고, 5.15 LTS에는 OEM 패치 없이는 `cxl_acpi` 모듈 자체가 없습니다.

## 한 번에 붙여넣는 실행

backing store 파일을 먼저 만들고, 그 파일을 CXL 디바이스의 메모리로 붙이는 순서입니다. 아래 블록을 그대로 실행하면 256 MB짜리 Type 3 expander 한 개가 달린 guest가 뜹니다.

```bash
# 1. backing store — CXL 디바이스의 메모리가 실제로 저장되는 파일
truncate -s 256M ./cxl-mem-backing

# 2. guest 실행
qemu-system-x86_64 \
    -machine q35,cxl=on \
    -m 8G,slots=8,maxmem=32G \
    -smp 4 -enable-kvm \
    -drive file=./ubuntu-24.04.qcow2,if=virtio \
    \
    -object memory-backend-file,id=cxl-mem0,share=on,mem-path=./cxl-mem-backing,size=256M \
    \
    -device pxb-cxl,bus_nr=12,bus=pcie.0,id=cxl.1 \
    -device cxl-rp,port=0,bus=cxl.1,id=root_port0,chassis=0,slot=0 \
    -device cxl-type3,bus=root_port0,memdev=cxl-mem0,id=cxl-mem0-dev \
    \
    -M cxl-fmw.0.targets.0=cxl.1,cxl-fmw.0.size=512M
```

디바이스 스택은 실 하드웨어의 계층을 그대로 흉내 냅니다. host bridge(`pxb-cxl`) 아래 root port(`cxl-rp`)가 있고 그 아래 endpoint(`cxl-type3`)가 붙는 구조입니다. `cxl-fmw`는 펌웨어가 잡아 주는 주소 창(CFMWS)에 해당하고, 여기서는 그 역할을 QEMU가 대신합니다.

FMW 크기를 디바이스 크기의 두 배로 잡은 것은 오타가 아닙니다. 나중에 디바이스를 하나 더 붙여 interleave를 시험하려면 창이 그만큼 넉넉해야 합니다.

## 부팅 후 3분 검증

디바이스가 제대로 붙었는지는 아래 순서로 확인합니다. 위에서부터 하나씩 통과해야 다음 것이 의미가 있습니다.

```bash
# 커널이 CXL을 아는 버전인가
guest$ uname -r
6.8.0-...

# 모듈 로딩
guest$ modprobe cxl_acpi
guest$ modprobe cxl_pci

# PCIe 레벨에서 보이는가
guest$ lspci -nn | grep CXL
0c:00.0 CXL: ... [1af4:0d93]

# CXL 서브시스템에 등록됐는가
guest$ ls /sys/bus/cxl/devices/
mem0/  decoder0.0/  port0/  root0/

# 토폴로지가 기대대로인가
guest$ cxl list -RT
```

여기까지 통과하면 환경은 완성입니다. 이제 메모리로 쓸 수 있게 region을 만들고 NUMA 노드로 올립니다.

```bash
guest$ cxl create-region -d decoder0.0 -t ram -s 256M
guest$ daxctl reconfigure-device dax0.0 -m system-ram

guest$ numactl --hardware
node 0 size: 8000 MB     # 기본 RAM
node 1 size: 256 MB      # CXL Type 3 expander
```

`numactl`에 노드가 하나 더 보이면 끝입니다. 이 시점부터 guest 안의 모든 명령은 실 디바이스를 상대할 때와 똑같이 동작합니다.

## 처음 세울 때 걸리는 함정

이 레시피가 실패하는 지점은 거의 정해져 있습니다. 증상만 보면 원인이 안 보이는 것들이라 미리 적어 둡니다.

| 증상 | 원인 | 고치는 법 |
|------|------|----------|
| `cxl option requires q35 machine` | `-machine pc`로 실행 | `q35`로 바꿉니다. CXL은 PCIe 5.0 기반이고 PCIe가 q35 전용입니다 |
| guest 시작 직후 segfault | backing 파일에 QEMU 프로세스의 쓰기 권한 없음 | `mem-path`를 `/tmp/` 아래로 옮기거나 소유권을 맞춥니다 |
| `modprobe: cxl_acpi not found` | guest 커널이 6.0 미만 | guest 이미지를 Ubuntu 24.04+ / Fedora 38+로 교체합니다 |
| region은 만들어지는데 interleave가 안 됨 | FMW 크기가 디바이스 크기와 같음 | FMW를 디바이스의 2배 이상으로 잡습니다 |
| 두 번째 디바이스가 안 붙음 | root port끼리 `(chassis, slot)` 충돌 | slot을 `1, 2, 3...`으로 증가시킵니다 |

## 커널 모듈을 고쳐 가며 쓰기

이 환경의 값어치는 반복 속도에 있습니다. 실 하드웨어라면 reboot과 flash에 몇 분씩 쓰지만, 여기서는 컴파일부터 확인까지 수십 초입니다.

CXL mock 프레임워크는 `drivers/cxl/`이 아니라 `tools/testing/cxl/`에 있습니다. 처음 찾을 때 헷갈리는 자리입니다.

```bash
host$ make -C ~/linux M=tools/testing/cxl
host$ scp tools/testing/cxl/cxl_mock.ko guest:/tmp/

guest$ insmod /tmp/cxl_mock.ko
guest$ dmesg | tail
guest$ ls /sys/bus/cxl/devices/

host$ vim tools/testing/cxl/test/mock.c   # 고치고 다시
```

## 여기서 멈춰야 할 때

QEMU가 흉내 내지 못하는 영역이 있습니다. 아래에 해당하는 작업이라면 이 환경에서 나온 결과를 믿으면 안 됩니다.

- **성능 측정·튜닝** — latency 모델이 실제와 다릅니다.
- **PHY·signal integrity 디버깅** — 실 PCIe 링크가 없어 LTSSM 버그가 재현되지 않습니다.
- **Type 2 accelerator의 coherency 검증** — CXL.cache가 구현돼 있지 않습니다.
- **RAS 운영 시나리오** — poison·MCTP·VDM이 없습니다.

지원 범위 매트릭스, 정밀 시뮬레이터·FPGA와의 비교, CXL 4.0 기능의 QEMU 구현 현황은 [CXL 4.0 Internals Ch 12](/blog/embedded/hardware/cxl/chapter12-qemu-emulation)에 정리돼 있습니다.

## 정리

- `truncate`로 backing store를 만들고 `-machine q35,cxl=on`에 `pxb-cxl → cxl-rp → cxl-type3`를 쌓는 것이 전부입니다.
- FMW는 디바이스 크기의 2배 이상으로 잡아야 나중에 interleave를 시험할 수 있습니다.
- 검증은 `lspci` → `/sys/bus/cxl/devices/` → `cxl list -RT` → `numactl --hardware` 순서로 위에서부터 통과시킵니다.
- 실패는 대부분 q35 미사용, backing 파일 권한, guest 커널 6.0 미만 셋 중 하나입니다.
- mock 모듈은 `tools/testing/cxl/`에 있습니다. `drivers/cxl/`에서 찾으면 안 나옵니다.

다음 편은 **Ch 151: Linux CXL 드라이버 분석** — `drivers/cxl/` 디렉터리의 코드를 진입점부터 sysfs까지 분해합니다.

## 관련 항목

- [Ch 149: PCIe → CXL 진화](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)
- [Ch 151: Linux CXL 드라이버 분석](/blog/embedded/modern-recipes/part11-17-linux-cxl-driver) (다음 편)
- [CXL 4.0 Internals Ch 12: QEMU CXL 에뮬레이션](/blog/embedded/hardware/cxl/chapter12-qemu-emulation) — 지원 범위·CEDT 구조·4.0 기능 현황
- [Bootloader Internals Ch 35: EFI·UEFI에서 CXL 초기화](/blog/embedded/bootloader/chapter35-uefi-cxl-init) — CEDT 생성
- [Kernel Debugging Ch 8: CXL 커널 드라이버 디버깅](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)
- [QEMU CXL 문서](https://qemu.readthedocs.io/en/latest/system/devices/cxl.html)
