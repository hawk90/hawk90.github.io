---
title: "Ch 5: TEE — OP-TEE / ARM CCA"
date: 2026-05-08T06:00:00
description: "Trusted Execution Environment. OP-TEE, TA, GlobalPlatform API."
tags: [TEE, OP-TEE, GlobalPlatform]
series: "Embedded Security"
seriesOrder: 5
draft: false
---

## 한 줄 요약

> **"TEE는 TrustZone이라는 *방* 위에 짓는 *건물*입니다."** — Secure World라는 격리된 메모리 영역 위에 별도의 OS(OP-TEE)가 동작하고, 그 위에서 Trusted Application(TA)이 키 조작·결제·DRM 같은 *민감한 작업*을 수행합니다. Rich OS(Linux)는 TEE Client API로 TA를 호출만 할 수 있을 뿐, 안을 볼 수는 없습니다.

## 왜 TEE라는 또 한 층이 필요한가

Ch 4의 TrustZone은 *분리 메커니즘*입니다. 메모리·peripheral·interrupt에 NS 라벨을 붙여 secure side가 non-secure side로부터 보호됩니다. 그런데 그 안에서 *무엇이 동작하는지*는 별개의 문제입니다.

Secure side에 bare-metal 코드 하나만 두는 것도 가능하지만, 실무에서는 보통 여러 *서로 다른 secure 서비스*가 필요합니다. 펌웨어 서명 검증, 디스크 암호화 키 관리, DRM 라이선스 검사, mobile payment, 생체 인증 등이 한 디바이스에 다 있습니다. 이것들을 *모두 한 덩어리*로 만들면 한 서비스의 버그가 다른 서비스의 키를 노출시킵니다.

TEE는 secure side에 *경량 OS*를 깔고 *각 서비스를 격리된 TA(Trusted Application)*로 동작시키는 아키텍처입니다. TA들은 secure OS의 스케줄러 위에서 separate하게 돌고, secure storage를 통해 서로의 데이터에 직접 접근하지 못합니다.

GlobalPlatform이라는 표준화 단체가 TEE의 인터페이스를 정의했고, 가장 널리 쓰이는 오픈 소스 구현이 Linaro의 OP-TEE입니다.

## OP-TEE 아키텍처

OP-TEE의 전체 구조를 한 장으로 보면 다음과 같습니다.

```text
┌──────────────────────────── Non-Secure ────────────────────────────┐
│                                                                    │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │  CA (Client Application) — user space process               │  │
│   │  e.g. fTPM daemon, libcryptsetup-LUKS-TPM                   │  │
│   └─────────────────────┬───────────────────────────────────────┘  │
│                         │ GP TEE Client API                        │
│                         │ (libteec.so)                             │
│   ┌─────────────────────┴───────────────────────────────────────┐  │
│   │  Linux kernel — OP-TEE driver (drivers/tee/optee)           │  │
│   └─────────────────────┬───────────────────────────────────────┘  │
│                         │ SMC                                       │
└─────────────────────────┼──────────────────────────────────────────┘
                          │
                          ▼ (BL31 Secure Monitor at EL3)
┌────────────────────────── Secure ──────────────────────────────────┐
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │  OP-TEE OS (BL32) — runs at S-EL1                           │  │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │  │
│   │  │  TA #1   │ │  TA #2   │ │  TA #3   │ │ pTA      │         │  │
│   │  │ (DRM)    │ │ (Crypto) │ │ (Storage)│ │ (kernel) │         │  │
│   │  │  S-EL0   │ │  S-EL0   │ │  S-EL0   │ │  S-EL1   │         │  │
│   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │  │
│   │                                                              │  │
│   │  Core: scheduler, IPC, mmu, RPC to REE                       │  │
│   └─────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

각 부분의 역할:

- **CA (Client Application)** — non-secure에서 동작하는 일반 process. TEE Client API로 TA에 요청을 보냅니다.
- **OP-TEE Linux driver** — `/dev/tee0`을 노출하고, ioctl을 SMC로 변환합니다.
- **BL31 Secure Monitor** — ARM Trusted Firmware가 SMC를 받아 OP-TEE OS로 디스패치합니다.
- **OP-TEE OS** — S-EL1에서 동작하는 microkernel. TA를 elf로 load하고 S-EL0에서 실행합니다.
- **TA (Trusted Application)** — 실제 보안 로직. ELF binary 형태이고 GP TEE Internal API로 OS 기능에 접근합니다.
- **pTA (Pseudo-TA)** — TA처럼 보이지만 OP-TEE OS 안에 직접 link된 *kernel-mode* 모듈. peripheral 직접 접근이 필요할 때.

## REE와 TEE — 두 세계의 약속

REE(Rich Execution Environment)는 Linux + application 세계, TEE는 OP-TEE + TA 세계입니다. 둘 사이의 약속은 GlobalPlatform이 정의합니다.

| API | 어디서 쓰나 | 표준 |
|---|---|---|
| TEE Client API | REE의 CA | GP TEE Client API v1.0 |
| TEE Internal API | TEE의 TA | GP TEE Internal Core API v1.3 |
| TUI API | TA가 secure UI 그릴 때 | GP TUI API |
| TEE Sockets API | TA가 secure network 쓸 때 | GP TEE Sockets API |

CA는 *UUID로 식별되는 TA*에 *세션*을 열고 *명령*을 보냅니다. 한 TA에 여러 세션을 열 수 있고, 각 세션은 독립된 컨텍스트를 가집니다.

## TEE Client API — REE 측 호출 예제

다음은 CA가 AES 암호화 TA를 호출하는 예제입니다.

```c
#include <tee_client_api.h>
#include <stdio.h>

// TA의 UUID — TA 빌드 시 정해서 양쪽이 공유
#define AES_TA_UUID \
    { 0x5b9e0e40, 0x2636, 0x11e1, \
      { 0xad, 0x9e, 0x00, 0x02, 0xa5, 0xd5, 0xc5, 0x1b } }

// TA가 지원하는 명령 — 양쪽이 공유하는 헤더에서 정의
#define CMD_AES_ENCRYPT 1

int main(void) {
    TEEC_Context  ctx;
    TEEC_Session  sess;
    TEEC_Operation op;
    TEEC_UUID     uuid = AES_TA_UUID;
    TEEC_Result   rc;
    uint32_t      err_origin;

    uint8_t plain[64]  = { /* 평문 */ };
    uint8_t cipher[64];

    // 1. TEE와 연결
    rc = TEEC_InitializeContext(NULL, &ctx);
    if (rc != TEEC_SUCCESS) return -1;

    // 2. TA에 세션 열기
    rc = TEEC_OpenSession(&ctx, &sess, &uuid,
                          TEEC_LOGIN_PUBLIC, NULL, NULL, &err_origin);
    if (rc != TEEC_SUCCESS) goto out_ctx;

    // 3. 명령 인자 준비 — 4개의 named parameter
    memset(&op, 0, sizeof(op));
    op.paramTypes = TEEC_PARAM_TYPES(TEEC_MEMREF_TEMP_INPUT,
                                     TEEC_MEMREF_TEMP_OUTPUT,
                                     TEEC_NONE, TEEC_NONE);
    op.params[0].tmpref.buffer = plain;
    op.params[0].tmpref.size   = sizeof(plain);
    op.params[1].tmpref.buffer = cipher;
    op.params[1].tmpref.size   = sizeof(cipher);

    // 4. 명령 호출 — 여기서 SMC가 발사돼 TEE로 들어감
    rc = TEEC_InvokeCommand(&sess, CMD_AES_ENCRYPT, &op, &err_origin);
    if (rc != TEEC_SUCCESS) {
        fprintf(stderr, "Invoke failed: 0x%x origin 0x%x\n", rc, err_origin);
    }

    // 5. 정리
    TEEC_CloseSession(&sess);
out_ctx:
    TEEC_FinalizeContext(&ctx);
    return rc;
}
```

`TEEC_InvokeCommand`가 호출되는 순간 다음 일이 일어납니다.

```text
1. libteec가 ioctl(/dev/tee0, TEE_IOC_INVOKE, ...)
2. OP-TEE Linux driver가 SMC 발사 (smc #0)
3. EL3 BL31이 받아 OP-TEE OS로 world switch
4. OP-TEE core가 UUID로 TA를 찾아 (이미 load 안 됐으면 load)
5. TA의 invoke entry를 호출
6. TA가 작업 후 return
7. OP-TEE core가 결과를 REE 측 driver에 RPC로 전달
8. 다시 SMC return → ioctl return → libteec return
```

이 round trip의 latency는 platform에 따라 다르지만 일반적으로 *수십 µs*입니다. AES 한 블록을 호출하면 *blocksize/latency*가 압도적으로 latency가 큽니다. 따라서 *큰 단위로 호출*하는 것이 효율적입니다.

## TA 개발 — Hello World

TA는 ELF binary로, OP-TEE OS가 S-EL0에서 동작시키는 일종의 *user space process*입니다. 빌드는 `optee_os/ta/`의 toolchain을 씁니다.

기본 TA의 entry point들:

```c
#include <tee_internal_api.h>

#define CMD_AES_ENCRYPT 1

// TA 생성 시 한 번
TEE_Result TA_CreateEntryPoint(void) {
    DMSG("TA created");
    return TEE_SUCCESS;
}

// TA 종료 시 한 번
void TA_DestroyEntryPoint(void) {
    DMSG("TA destroyed");
}

// 새 세션이 열릴 때
TEE_Result TA_OpenSessionEntryPoint(uint32_t param_types,
                                    TEE_Param params[4],
                                    void **sess_ctx) {
    *sess_ctx = NULL;
    return TEE_SUCCESS;
}

// 세션이 닫힐 때
void TA_CloseSessionEntryPoint(void *sess_ctx) {
    (void)sess_ctx;
}

// 명령 dispatch
TEE_Result TA_InvokeCommandEntryPoint(void *sess_ctx,
                                       uint32_t cmd_id,
                                       uint32_t param_types,
                                       TEE_Param params[4]) {
    (void)sess_ctx;
    switch (cmd_id) {
    case CMD_AES_ENCRYPT:
        return do_aes_encrypt(param_types, params);
    default:
        return TEE_ERROR_BAD_PARAMETERS;
    }
}
```

실제 AES 작업은 OP-TEE Internal API로 합니다.

```c
static TEE_Result do_aes_encrypt(uint32_t param_types, TEE_Param params[4]) {
    const uint32_t expected = TEE_PARAM_TYPES(
        TEE_PARAM_TYPE_MEMREF_INPUT,
        TEE_PARAM_TYPE_MEMREF_OUTPUT,
        TEE_PARAM_TYPE_NONE, TEE_PARAM_TYPE_NONE);

    if (param_types != expected) return TEE_ERROR_BAD_PARAMETERS;

    void  *in  = params[0].memref.buffer;
    size_t in_len = params[0].memref.size;
    void  *out = params[1].memref.buffer;
    size_t out_len = params[1].memref.size;

    // 1. 키 객체 생성
    TEE_ObjectHandle key;
    TEE_AllocateTransientObject(TEE_TYPE_AES, 128, &key);

    uint8_t key_material[16];
    // secure storage에서 키를 읽어 채우거나, fixed key를 사용
    load_device_key(key_material);

    TEE_Attribute attr;
    TEE_InitRefAttribute(&attr, TEE_ATTR_SECRET_VALUE, key_material, 16);
    TEE_PopulateTransientObject(key, &attr, 1);

    // 2. 암호화 operation
    TEE_OperationHandle op;
    TEE_AllocateOperation(&op, TEE_ALG_AES_CTR, TEE_MODE_ENCRYPT, 128);
    TEE_SetOperationKey(op, key);

    uint8_t iv[16] = { /* random */ };
    TEE_CipherInit(op, iv, sizeof(iv));

    TEE_Result rc = TEE_CipherDoFinal(op, in, in_len, out, &out_len);

    // 3. 정리
    TEE_FreeOperation(op);
    TEE_FreeTransientObject(key);
    TEE_MemFill(key_material, 0, sizeof(key_material));  // zeroize

    params[1].memref.size = out_len;
    return rc;
}
```

TA의 manifest는 `user_ta_header_defines.h`에서 정의합니다.

```c
#define TA_UUID \
    { 0x5b9e0e40, 0x2636, 0x11e1, \
      { 0xad, 0x9e, 0x00, 0x02, 0xa5, 0xd5, 0xc5, 0x1b } }

#define TA_FLAGS                  (TA_FLAG_EXEC_DDR | TA_FLAG_SINGLE_INSTANCE)
#define TA_STACK_SIZE             (4 * 1024)
#define TA_DATA_SIZE              (32 * 1024)

#define TA_VERSION                "1.0"
#define TA_DESCRIPTION            "AES encryption TA"
```

빌드는 OP-TEE의 TA dev kit을 씁니다.

```bash
export TA_DEV_KIT_DIR=/opt/optee_os/out/arm-plat-vexpress/export-ta_arm64
export CROSS_COMPILE_TA=aarch64-linux-gnu-

make -C ta O=out

# 결과: out/5b9e0e40-2636-11e1-ad9e-0002a5d5c51b.ta
```

생성된 `.ta` 파일은 OP-TEE의 *secure signed* 형식입니다. OP-TEE OS는 부팅 시 등록된 TA 서명 키로 검증한 뒤에만 load합니다.

## Secure Storage — TA가 데이터를 저장하는 방법

TA는 자기만의 영구 저장소를 가질 수 있습니다. GP TEE Internal API의 *Trusted Storage*입니다.

```c
TEE_ObjectHandle obj;
const char     id[] = "user_credential_v1";

// 새 객체 생성 또는 기존 객체 열기
TEE_Result rc = TEE_OpenPersistentObject(
    TEE_STORAGE_PRIVATE,
    id, sizeof(id) - 1,
    TEE_DATA_FLAG_ACCESS_READ | TEE_DATA_FLAG_ACCESS_WRITE,
    &obj);

if (rc == TEE_ERROR_ITEM_NOT_FOUND) {
    uint8_t initial[64] = { /* 초기값 */ };
    TEE_CreatePersistentObject(
        TEE_STORAGE_PRIVATE,
        id, sizeof(id) - 1,
        TEE_DATA_FLAG_ACCESS_READ | TEE_DATA_FLAG_ACCESS_WRITE,
        TEE_HANDLE_NULL,
        initial, sizeof(initial),
        &obj);
}

uint8_t buf[64];
uint32_t bytes_read;
TEE_ReadObjectData(obj, buf, sizeof(buf), &bytes_read);

TEE_CloseObject(obj);
```

저장 위치는 *플랫폼별*입니다.

- **RPMB partition** — eMMC의 *Replay Protected Memory Block*. eMMC controller가 monotonic counter로 replay 방어. 가장 안전.
- **REE filesystem** — Linux의 `/data/tee/` 같은 디렉터리. OP-TEE가 *암호화 + 인증*해서 저장. REE가 파일을 *삭제*할 수는 있지만 *내용을 읽을 수는 없음*.
- **Secure storage of SE** — 외부 secure element. 일부 플랫폼.

TA마다 *키가 다릅니다*. OP-TEE의 *Trusted Key Derivation*이 huk(hardware unique key) + TA UUID로 storage key를 유도하므로, 한 TA의 secure storage 파일을 다른 TA가 열어도 복호화 못 합니다.

## Build & test workflow

OP-TEE 전체 빌드의 흐름은 다음과 같습니다.

```bash
# manifest 기반 통합 빌드 (Linaro repo)
mkdir optee && cd optee
repo init -u https://github.com/OP-TEE/manifest.git -m qemu_v8.xml
repo sync -j8

# 빌드 — toolchain까지 자동
cd build
make -j$(nproc) toolchains
make -j$(nproc) all

# QEMU로 실행
make run-only
```

부팅 후 두 개의 콘솔이 뜹니다. 하나는 *normal world Linux*, 다른 하나는 *secure world OP-TEE*. Linux에서 example TA를 호출해 봅니다.

```bash
# normal world
$ xtest                 # 전체 회귀 테스트
$ optee_example_hello_world
D/TC:? 0 main:39 Invoke command
D/TC:? 0 main:65 hello world

$ optee_example_aes
D/TC:? 0 prepare_aes:131 Prepare encode operation
D/TC:? 0 set_aes_key:153 Load key in TA
D/TC:? 0 cipher_buffer:222 Encrypt buffer from TA
Text successfully encrypted/decrypted
```

`xtest`는 GlobalPlatform compliance test의 일부를 포함해 약 50,000개 테스트를 돌립니다. 새 platform port의 검증에 표준으로 쓰입니다.

## ARM CCA — Confidential Compute Architecture

ARMv9-A의 새로운 보안 아키텍처가 CCA(Confidential Compute Architecture)입니다. TrustZone과 *완전히 다른* 추가 차원의 격리를 도입합니다.

```text
                    Non-secure           Secure        Realm        Root
  EL3 (Monitor)  ────────────────────────────────────────────────── Root
  EL2 (Hyper)    │ KVM/Xen        │ Secure Partition │ RMM       │
  EL1 (OS)       │ Linux           │ OP-TEE OS        │ Realm OS  │
  EL0 (User)     │ Apps            │ TAs              │ Realm     │
                                                       Apps
```

기존 두 세계(Non-secure, Secure)에 *Realm world*와 *Root world*가 추가됩니다.

- **Realm world** — 사용자가 만든 *confidential VM*. 호스트 hypervisor가 메모리를 *볼 수 없음*.
- **Root world** — 위 세 세계 모두를 monitor하는 EL3 펌웨어 세계.

Realm은 *원격 attestation*과 *암호화된 메모리*를 받아, 클라우드의 multi-tenant 환경에서 *host operator도 못 보는* VM을 만들 수 있게 합니다. Intel SGX, AMD SEV, NVIDIA H100 confidential compute의 ARM 대응입니다.

CCA의 핵심 컴포넌트:

- **RMM (Realm Management Monitor)** — Realm world의 R-EL2 펌웨어. 메모리 ownership 관리.
- **GPC (Granule Protection Check)** — 4KB granule 단위로 어느 world가 소유하는지를 하드웨어가 강제.
- **Attestation** — RMM이 발행하는 cryptographic evidence가 realm의 무결성을 원격으로 증명.

CCA는 2026년 현재 ARMv9.2-A 일부 SoC에 처음 양산되기 시작했고, 향후 5~10년에 걸쳐 모바일·서버 양 쪽에 확산할 것으로 예상됩니다.

## Intel SGX / AMD SEV / NVIDIA CC 비교

ARM CCA와 같은 *confidential compute* 카테고리의 다른 접근들입니다.

| 기술 | 단위 | 격리 강도 | 메모 |
|---|---|---|---|
| **Intel SGX** | Enclave (process 일부) | Hardware encrypted memory | Skylake 도입, Ice Lake에서 large-enclave |
| **Intel TDX** | VM 단위 | Hardware encrypted memory | Sapphire Rapids 도입 |
| **AMD SEV / SEV-ES / SEV-SNP** | VM 단위 | Hardware encrypted memory | EPYC, register-level encryption까지 |
| **ARM CCA** | Realm (VM 단위) | GPC + 메모리 암호화 | ARMv9.2-A |
| **NVIDIA H100 CC** | GPU compute | encrypted PCIe transfer | LLM 추론 같은 GPU workload |

Intel SGX의 한 시기 큰 인기에 비해, 산업의 흐름은 *VM 단위 confidential compute*로 옮겨가는 추세입니다. 그 이유는 *기존 application을 거의 그대로* 돌릴 수 있기 때문입니다. SGX는 application을 enclave에 맞게 *재작성*해야 했습니다.

## 자주 하는 실수

- **TA를 *작은 호출 단위*로 자주 invoke합니다.** SMC round trip이 수십 µs라 throughput이 떨어집니다. *배치*해서 큰 단위로 호출합니다.
- **TA의 stack/heap을 작게 잡습니다.** TA는 default heap이 *수 KB* 수준입니다. crypto 작업에 충분치 않아 `TEE_ERROR_OUT_OF_MEMORY`가 납니다. manifest에서 `TA_STACK_SIZE`, `TA_DATA_SIZE`를 적절히 늘립니다.
- **REE 측 포인터를 TA가 직접 dereference합니다.** GP API의 memref는 *OP-TEE OS가 shared memory로 mapping*해 줍니다. mapping 안 된 raw 포인터는 secure fault를 일으킵니다. 인자는 `params[i].memref`로만 접근합니다.
- **TA의 secure storage를 백업 안 합니다.** RPMB든 REE filesystem이든 *파일 자체를 잃을 수 있습니다*. 중요한 키는 KMS로 sealed back-up하거나, 키 회전 정책으로 잃어도 복구 가능하게 설계합니다.
- **xtest를 안 돌리고 platform port를 commit합니다.** OP-TEE는 platform-specific 코드가 매우 많아, xtest 통과 여부가 *port 완성도의 거의 유일한 객관적 척도*입니다.
- **TA 서명 키를 제품 빌드와 개발 빌드가 공유합니다.** 개발 키로 서명된 TA가 양산 디바이스에 load되지 않도록 빌드 시스템에서 분리합니다.
- **CCA realm 안에서 host I/O를 무조건 신뢰합니다.** realm은 메모리는 격리되지만 *I/O는 host hypervisor가 매개*합니다. 디스크 데이터는 realm 안에서 따로 암호화·인증해야 합니다.

## 정리

- TEE는 TrustZone 위에 secure OS를 깔고 격리된 Trusted Application들을 동작시키는 아키텍처입니다.
- OP-TEE는 Linaro의 오픈 소스 TEE OS로, ARM Trusted Firmware의 BL32 자리에 들어가 S-EL1에서 동작합니다.
- REE(Linux)와 TEE 사이의 인터페이스는 GlobalPlatform TEE Client API와 TEE Internal API로 표준화돼 있습니다.
- TA는 ELF binary이며 UUID로 식별되고, REE의 CA가 세션을 열어 명령을 invoke하는 방식으로 호출됩니다.
- Secure storage는 RPMB(가장 안전), REE filesystem(암호화·인증), secure element 중 하나에 저장됩니다.
- ARM CCA는 ARMv9-A의 새 보안 아키텍처로, Realm world와 GPC로 *confidential VM*을 가능하게 합니다.
- Intel SGX/TDX, AMD SEV-SNP, NVIDIA H100 CC가 같은 confidential compute 카테고리의 경쟁 기술입니다.
- TEE 활용의 핵심은 secure storage·키 관리·attestation 세 service의 조합이며, 결제·DRM·생체 인증·fTPM 같은 영역에서 표준화돼 있습니다.

다음 편은 **Ch 6: OTA 업데이트 — 안전한 펌웨어 배포**. 지금까지 다진 secure boot·crypto·TEE 기반 위에서, 양산 디바이스에 펌웨어를 *원격으로 안전하게* 갱신하는 메커니즘을 봅니다.

## 관련 항목

- [Ch 2: Secure Boot — 부트 체인 검증](/blog/embedded/embedded-security/chapter02-secure-boot)
- [Ch 3: MCU 크립토 — HW accelerator](/blog/embedded/embedded-security/chapter03-mcu-crypto)
- [Ch 4: TrustZone — Cortex-A / Cortex-M](/blog/embedded/embedded-security/chapter04-trustzone)
- [Ch 6: OTA 업데이트](/blog/embedded/embedded-security/chapter06-ota-update)
- [Ch 7: 사이드채널 공격](/blog/embedded/embedded-security/chapter07-side-channel)
- [Practical RTOS Internals — Part 4-11: TrustZone & TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
- [AUTOSAR Adaptive — 차량 보안](/blog/embedded/automotive/autosar-adaptive)
- [DO-178C — 항공 SW 보증](/blog/embedded/aerospace-standards/do-178c)
