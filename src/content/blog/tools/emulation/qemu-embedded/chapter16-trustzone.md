---
title: "Ch 16: TrustZone Secure World"
date: 2026-05-17T16:00:00
description: "EL3·secure·non-secure 분리 — OP-TEE 부팅."
tags: [QEMU, trustzone, op-tee, secure-world, EL3, ATF]
series: "QEMU Embedded Emulation"
seriesOrder: 16
draft: true
---

모바일과 IoT 디바이스의 *지문·얼굴 인식·DRM·결제·키 보관*은 모두 **TrustZone** 안에서 동작합니다. ARM이 single core 위에 *secure world*와 *non-secure world*를 하드웨어로 분리해, Linux를 신뢰하지 않는 상태에서도 비밀을 보호합니다. 이 장은 QEMU `virt,secure=on` + ARM Trusted Firmware + OP-TEE로 완전한 secure boot chain을 시뮬레이션하는 흐름을 다룹니다.

## ARM Exception Level

AArch64의 *4단계 privilege*.

| EL | 영역 | 예 |
|----|------|-----|
| **EL3** | Secure Monitor (world switch) | ARM Trusted Firmware |
| EL2 | Hypervisor | KVM, Xen |
| **EL1 (S)** | Secure OS | OP-TEE OS |
| EL1 (NS) | Non-secure OS | Linux |
| EL0 | User app | apps (양쪽 world) |

NS bit가 secure(`0`) ↔ non-secure(`1`) world를 구분. *EL3가 world switch의 유일한 관문*.

## TrustZone — single core 분리

같은 CPU가 *두 world*를 *시분할*합니다. 한 시점에 *secure or non-secure 중 하나*만 동작.

```text
Time →
[NS World — Linux app]  ──SMC──▶  [EL3 Secure Monitor]
                                          │
                                          ▼
                                  [S World — OP-TEE]
                                          │
                                   (work done)
                                          │
                                          ▼
              ◀────── return ── [EL3 Secure Monitor]
```

`SMC #0` 명령이 *EL3로 trap*. EL3가 두 world의 context를 save/restore해 *반대편 world*로 전환합니다.

## QEMU 활성

```bash
qemu-system-aarch64 -M virt,secure=on -cpu cortex-a57 ...
```

`secure=on`이 EL3·EL1S를 활성. 이 상태에서 부팅하는 firmware가 ATF·OP-TEE·U-Boot chain.

## ARM Trusted Firmware (ATF) 부팅 단계

| Stage | 역할 | 위치 |
|-------|------|------|
| **BL1** | Boot ROM | 영구 ROM |
| **BL2** | Trusted Boot Firmware | EL3 |
| **BL31** | Runtime Secure Monitor | EL3 |
| BL32 | Secure OS (OP-TEE) | EL1S |
| BL33 | Non-secure bootloader (U-Boot) | EL1 NS → Linux |

각 stage가 *다음 stage*를 *측정·서명 검증*하고 jump합니다. *chain of trust*.

## QEMU + ATF + OP-TEE + Linux

```bash
qemu-system-aarch64 -M virt,secure=on,virtualization=on \
    -cpu cortex-a57 -smp 2 -m 1G \
    -bios bl1.bin \
    -device loader,file=fip.bin,addr=0x40100000 \
    -kernel Image -dtb virt.dtb -initrd rootfs.cpio.gz \
    -nographic -append "console=ttyAMA0"
```

`fip.bin`(Firmware Image Package)이 BL2+BL31+BL32(OP-TEE)+BL33(U-Boot)을 한 binary로 묶은 것.

부팅 시퀀스 콘솔.

```text
NOTICE:  Booting Trusted Firmware
NOTICE:  BL1: v2.10.0
NOTICE:  BL2: v2.10.0
NOTICE:  BL31: v2.10.0
NOTICE:  OP-TEE v4.0 (...)

U-Boot 2024.04 ...
...
[    0.000000] Linux version 6.6.0 ...
```

## SMC call

non-secure side에서 secure side로 가는 *유일한 통로*.

```text
# ARM AArch64
smc #0
```

`x0`=function ID, `x1`~`x6`=arguments. EL3가 trap해서 secure side function을 호출.

## OP-TEE 사용 — Linux side

```c
#include <tee_client_api.h>

void invoke_ta(void) {
    TEEC_Context ctx;
    TEEC_Session sess;
    TEEC_Operation op = {0};
    TEEC_UUID uuid = TA_HELLO_UUID;
    uint32_t err_origin;

    TEEC_InitializeContext(NULL, &ctx);
    TEEC_OpenSession(&ctx, &sess, &uuid,
                     TEEC_LOGIN_PUBLIC, NULL, NULL, &err_origin);

    op.paramTypes = TEEC_PARAM_TYPES(TEEC_VALUE_INOUT, 0, 0, 0);
    op.params[0].value.a = 42;
    TEEC_InvokeCommand(&sess, TA_HELLO_INC_VALUE, &op, &err_origin);

    printf("TA result: %d\n", op.params[0].value.a);

    TEEC_CloseSession(&sess);
    TEEC_FinalizeContext(&ctx);
}
```

`TEEC_*`은 GlobalPlatform TEE Client API. 내부적으로 SMC call로 secure world로.

## Trusted Application (TA) — OP-TEE side

```c
#include <tee_internal_api.h>

TEE_Result TA_InvokeCommandEntryPoint(void *sess_ctx, uint32_t cmd,
                                       uint32_t param_types,
                                       TEE_Param params[4]) {
    switch (cmd) {
    case TA_HELLO_INC_VALUE:
        params[0].value.a += 100;   /* secure 안에서 처리 */
        return TEE_SUCCESS;
    default:
        return TEE_ERROR_BAD_PARAMETERS;
    }
}
```

TA는 EL1S에서 동작. *secure DRAM*에 저장된 데이터에 접근 가능.

## Secure memory

DRAM 일부를 *NS=0*으로 marking. non-secure 측이 *어떤 주소로 접근*해도 *trap 없이 reject*. *키 보관*의 물리적 격리.

## Secure DMA

DMA도 *secure* attribute를 가집니다. SMMU(System MMU)가 *stage-2 translation*에서 secure stream만 허용.

## Use case

| 도메인 | TrustZone 활용 |
|--------|-----------------|
| 모바일 결제 | 카드 PAN·CVV가 secure world에서만 |
| 지문/얼굴 인식 | template이 secure DRAM에 |
| DRM | premium video decoder가 TA |
| OS keystore | Android Keymaster, iOS Secure Enclave |
| IoT root of trust | OP-TEE on STM32MP1 |

## OP-TEE build (QEMU target)

```bash
git clone https://github.com/OP-TEE/build.git
cd build
git checkout 4.0.0

# QEMU AArch64 target
make -f qemu_v8.mk toolchains
make -f qemu_v8.mk -j$(nproc)
make -f qemu_v8.mk run
```

`run` target이 자동으로 QEMU + ATF + OP-TEE + Linux 부팅. *전체 chain*이 *몇 명령*에.

## RealmME — TrustZone의 차세대

ARMv9의 **CCA**(Confidential Compute Architecture)가 TrustZone을 *4-world*로 확장(non-secure·secure·realm·root). *cloud workload의 보안 격리* 표준이 될 전망.

## Cortex-M TrustZone

ARMv8-M(Cortex-M23/M33/M55)도 TrustZone을 *다른 모델*로 구현 — *Secure attribution unit*(SAU)으로 영역 분리. mps2-an521(Ch 13) machine으로 학습 가능.

## 흔한 함정

- **`secure=on` 누락** — fip.bin 부팅이 EL3 missing으로 fail.
- **CPU 미지원** — `cortex-a53`은 secure=on 가능, `cortex-a72`도 가능. `host`는 KVM 의존.
- **OP-TEE 빌드 환경** — gcc + clang 둘 다 필요, 의존 많음. Docker container 권장.
- **SMC ID 충돌** — vendor-defined SMC ID와 ARM 표준 ID가 겹치면 trap 안 됨.

## 정리

- **TrustZone**은 *secure world*와 *non-secure world*의 하드웨어 격리. ARM의 보안 표준.
- Exception Level: EL3(Secure Monitor)·EL2(Hypervisor)·EL1(OS S/NS)·EL0(App).
- ARM Trusted Firmware(ATF) chain: BL1→BL2→BL31→BL32(OP-TEE)→BL33(U-Boot)→Linux.
- **SMC call**(`smc #0`)이 world switch의 유일한 통로 — EL3 trap.
- **OP-TEE**는 open-source secure OS. GlobalPlatform TEE API 호환.
- Trusted Application(TA)이 secure world에서 동작. Linux는 TEEC API로 호출.
- Use case: 결제·생체 인식·DRM·keystore·IoT RoT.
- QEMU `virt,secure=on,virtualization=on`으로 *전체 chain* 시뮬레이션 가능.

## 다음 장 예고

다음 장은 *EL2의 다른 활용* — **ARM Hypervisor**. KVM/Xen 기반 가상화와 nested 시뮬레이션.

## 관련 항목

- [Ch 15: OpenAMP·RPMsg](/blog/tools/emulation/qemu-embedded/chapter15-openamp-rpmsg)
- [Ch 17: ARM Hypervisor](/blog/tools/emulation/qemu-embedded/chapter17-hypervisor)
- [QEMU OpenTitan](/blog/tools/emulation/qemu-riscv/chapter06-opentitan) — RISC-V root of trust
- [Embedded Security](/blog/embedded/embedded-security/chapter01-overview)
