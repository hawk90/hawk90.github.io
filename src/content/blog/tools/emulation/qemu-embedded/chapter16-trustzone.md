---
title: "Ch 16: TrustZone Secure World"
date: 2026-05-17T16:00:00
description: "EL3·secure·non-secure 분리 — OP-TEE 부팅."
tags: [QEMU, trustzone, op-tee, secure-world]
series: "QEMU Embedded Emulation"
seriesOrder: 16
draft: true
---

## 이 챕터의 의도

모바일과 IoT 디바이스의 지문·얼굴 인식, DRM, 결제, 키 보관은 모두 TrustZone 안에서 동작한다. ARM이 secure world와 non-secure world를 하드웨어로 분리해, Linux를 신뢰하지 않는 상태에서도 비밀을 보호한다. 이 장에서는 QEMU `virt,secure=on` + ARM Trusted Firmware + OP-TEE로 완전한 secure boot 체인을 시뮬레이션한다.

## 핵심 항목

- ✦ **ARM TrustZone** — single core 위에 *secure*와 *non-secure* 두 world, NS bit로 구분
- ✦ Exception Level — **EL3** (Secure Monitor), **EL2** (Hypervisor), **EL1** (OS), **EL0** (App)
  - EL3 = Secure Monitor (world switch)
  - EL1S = Secure OS (예: OP-TEE)
  - EL1NS = Non-Secure OS (예: Linux)
  - EL0 양쪽 모두 user app
- ✦ **QEMU virt secure=on** — `-machine virt,secure=on` activate secure world
- ✦ **ATF (ARM Trusted Firmware)** 부팅 단계
  - BL1 (Boot ROM) → BL2 (Trusted Boot Firmware) → BL31 (Runtime Secure Monitor)
  - BL32 = OP-TEE OS (optional)
  - BL33 = Non-secure bootloader (U-Boot) → Linux
- ✦ **OP-TEE OS** — Linaro 발 open-source secure OS, GlobalPlatform TEE API 구현
- ✦ **SMC call (Secure Monitor Call)** — `smc #0` → EL3 trap → world switch
- ✦ World switch — context save/restore (regs + EL1 system regs)
- ✦ Secure memory — DRAM의 일부를 *NS=0*으로 marking, non-secure 측 접근 불가
- ✦ Secure DMA — SMMU stage 2로 DMA stream 분리
- ✦ Trusted Application (TA) — OP-TEE 안에서 동작, REE에서 SMC로 호출
- ✦ Use case — 키 보관(OP-TEE Keystore), DRM 디코더, 결제 (Android Keymaster, iOS Secure Enclave 유사)
- ◦ RealmME (ARM CCA) — secure world의 차세대, Ch 17 hypervisor와 결합
- ◦ Cortex-M TrustZone (ARMv8-M) — 다른 모델

## 다이어그램 (4)

1. TrustZone secure/non-secure world + Exception Level
2. ATF 부팅 단계 — BL1→BL2→BL31→BL32(OP-TEE)→BL33(U-Boot)→Linux
3. SMC call world switch 흐름 (EL1NS→EL3→EL1S→EL3→EL1NS)
4. Secure memory + secure DMA 격리 영역

## 코드 sketch

```bash
# QEMU 부팅 — ATF + OP-TEE + Linux
qemu-system-aarch64 -M virt,secure=on,virtualization=on \
    -cpu cortex-a57 -smp 2 -m 1G \
    -bios bl1.bin \
    -device loader,file=fip.bin,addr=0x40100000 \
    -kernel Image -dtb virt.dtb -initrd rootfs.cpio.gz \
    -nographic -append "console=ttyAMA0"
# fip.bin = BL2 + BL31 + BL32(OP-TEE) + BL33(U-Boot) packaged
```

```c
/* Linux (Non-Secure) → OP-TEE TA 호출 */
#include <tee_client_api.h>

void invoke_ta(void) {
    TEEC_Context ctx;
    TEEC_Session sess;
    TEEC_Operation op = {0};
    TEEC_UUID uuid = TA_HELLO_UUID;
    uint32_t err_origin;

    TEEC_InitializeContext(NULL, &ctx);
    TEEC_OpenSession(&ctx, &sess, &uuid, TEEC_LOGIN_PUBLIC, NULL, NULL, &err_origin);

    op.paramTypes = TEEC_PARAM_TYPES(TEEC_VALUE_INOUT, 0, 0, 0);
    op.params[0].value.a = 42;
    TEEC_InvokeCommand(&sess, TA_HELLO_INC_VALUE, &op, &err_origin);

    printf("TA result: %d\n", op.params[0].value.a);

    TEEC_CloseSession(&sess);
    TEEC_FinalizeContext(&ctx);
}
```

```c
/* OP-TEE TA (Secure World) */
#include <tee_internal_api.h>

TEE_Result TA_InvokeCommandEntryPoint(void *sess_ctx, uint32_t cmd,
                                       uint32_t param_types, TEE_Param params[4]) {
    switch (cmd) {
    case TA_HELLO_INC_VALUE:
        params[0].value.a += 100;   // secure 안에서 처리
        return TEE_SUCCESS;
    default:
        return TEE_ERROR_BAD_PARAMETERS;
    }
}
```

## 레퍼런스

- ARM Architecture Reference Manual §D7 (Security Model)
- ARM Trusted Firmware-A — github.com/ARM-software/arm-trusted-firmware
- OP-TEE OS — github.com/OP-TEE/optee_os
- OP-TEE build env — github.com/OP-TEE/build (QEMU target 지원)
- GlobalPlatform TEE Internal/Client API spec
- "Building secure systems with ARM TrustZone" — Linaro

## 관련 항목

- [Ch 11: Bare-metal](/blog/tools/emulation/qemu-embedded/chapter11-baremetal) (기존)
- [Ch 15: OpenAMP](/blog/tools/emulation/qemu-embedded/chapter15-openamp-rpmsg)
- [Ch 17: ARM Hypervisor (EL2)](/blog/tools/emulation/qemu-embedded/chapter17-hypervisor)
