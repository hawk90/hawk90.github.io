---
title: "OP-TEE — CA·TA 호출과 보안 저장소의 신뢰 경계"
slug: "embedded/embedded-security/chapter05-tee"
date: 2026-05-21T09:05:00
description: "OP-TEE 4.5.0의 호출·객체 수명·저장소와 CCA 등 격리 기술을 비교할 기준을 설명합니다."
tags: [TEE, OP-TEE, GlobalPlatform]
series: "Embedded Security"
seriesOrder: 5
draft: false
topics: ["embedded"]
---


## TEE가 추가하는 경계

TrustZone은 실행 상태와 접근을 분리하는 메커니즘이고, OP-TEE는 그 위에서 TA(Trusted Application)와 보안 서비스를 실행하는 구현입니다. TEE가 있다는 사실만으로 모든 TA·shared memory·저장소·I/O가 같은 보안 보장을 갖는 것은 아닙니다. Secure OS와 platform firmware가 신뢰 경계 안에 들어가며, 그 결함도 고려해야 합니다.

이 장의 소스 기준은 [OP-TEE OS 4.5.0](https://github.com/OP-TEE/optee_os/tree/0919de0f7c79ad35ad3c8ace5f823ad1344b4716)과 [같은 판 secure storage 문서](https://optee.readthedocs.io/en/4.5.0/architecture/secure_storage.html)입니다. 아래 C helper는 4.5.0의 실제 `tee_internal_api.h`로 Debian 13 GCC 14.2.0에서 compile하고, storage 함수를 흉내 낸 host mock으로 반환값과 close 횟수를 확인했습니다. OP-TEE boot·QEMU guest·실제 TA 실행·RPMB provisioning은 하지 않았습니다.

## CA에서 TA로 이어지는 경로

OP-TEE user TA는 별도 주소 공간에서 실행됩니다. Pseudo-TA는 secure kernel 안에 link되는 별도 종류이므로 같은 격리 수준으로 취급하지 않습니다. 다음 그림은 SMC 기반 Cortex-A 구성 예이며 모든 OP-TEE transport의 필수 배치가 아닙니다.

![OP-TEE 아키텍처 — CA·driver·monitor·secure OS·TA의 호출 경로](/images/blog/embedded-security/diagrams/ch05-optee-arch.svg)

| 구성 요소 | 담당하는 것 |
|------|------|
| CA와 libteec | context·session·operation 구성, 결과와 error origin 처리 |
| Linux TEE·OP-TEE driver | ioctl·shared memory와 secure 호출 transport |
| Secure monitor·dispatcher | 해당 ABI에 따라 OP-TEE로 전환. SMC 외 구성을 일반화하지 않음 |
| OP-TEE core | TA session·권한·메모리와 실행 관리 |
| User TA | command별 parameter type·length·권한·상태 검증 |
| tee-supplicant | 필요 시 REE 측 TA loading·파일 작업 등 RPC 지원 |

TA의 수명은 TA header의 flag가 정합니다. 4.5.0 [`user_ta_header.h`](https://github.com/OP-TEE/optee_os/blob/0919de0f7c79ad35ad3c8ace5f823ad1344b4716/lib/libutee/include/user_ta_header.h#L15-L17)에는 `TA_FLAG_SINGLE_INSTANCE`(모든 session이 instance 하나를 공유), `TA_FLAG_MULTI_SESSION`(그 instance에 session 여러 개 허용), `TA_FLAG_INSTANCE_KEEP_ALIVE`(마지막 session이 닫혀도 instance 유지)가 있습니다. TA load는 `TEEC_OpenSession()`에서 일어나고, 이후 `TEEC_InvokeCommand()`는 이미 열린 session에 command를 보냅니다. RPC는 secure world가 파일 읽기처럼 normal world의 도움이 필요할 때만 tee-supplicant로 나가는 별도 단계입니다.

## Client·TA의 수명과 실패 처리

CA는 context 초기화, session 열기, command invoke, session close, context finalize의 자원을 순서대로 관리합니다. 실패한 session을 close하거나 초기화 실패한 context를 finalize하지 않고, 이미 성공한 자원만 정리합니다. Public login으로 session을 열었다고 TA가 caller에게 모든 키·command 권한을 줘서는 안 됩니다.

| TA 입력 | 필요한 검사 |
|------|------|
| Command ID | 지원한 command와 현재 session·객체 상태 |
| `paramTypes` | 정확한 input·output·value·memref 조합 |
| Memref | capacity·실제 길이·overflow·중첩·접근 권한 |
| Key·object ID | 해당 caller가 쓸 수 있는 객체인지 |
| 공유 metadata | 검사 뒤 normal world가 바꿀 수 있으므로 secure copy와 검증·사용 일관성 |
| Output | short-buffer 길이와 오류 시 비밀값 노출 방지 |

Shared memory mapping은 포인터를 읽을 수 있게 해 주지만 내용의 불변성·권한을 보장하지 않습니다. 또한 TA의 AES-CTR 예에서 `{ /* random */ }`은 실제 random IV가 아니라 0으로 초기화된 배열입니다. 매 호출 같은 counter로 암호화하는 불완전 예제는 쓰지 않습니다. 검증된 AEAD 사용과 nonce 정책은 [Ch 3](/blog/embedded/embedded-security/chapter03-mcu-crypto)에서 다룹니다.

## Persistent object — 실패해도 handle을 닫기

아래는 TA 내부에서 비밀키가 아닌 저장된 설정 객체를 읽는 helper입니다. Command handler 전체가 아니며, caller는 유효한 TA-owned buffer와 size pointer를 제공해야 합니다. 권한 정책과 shared buffer 검증은 호출 경계에서 따로 수행합니다.

```c title="ta-read-config.c"
#include <tee_internal_api.h>

TEE_Result read_config(void *buffer, size_t capacity, size_t *actual)
{
    static const char id[] = "policy-version";
    TEE_ObjectHandle object;
    TEE_ObjectInfo info;
    if (!actual || (!buffer && capacity))
        return TEE_ERROR_BAD_PARAMETERS;
    *actual = 0;
    TEE_Result rc = TEE_OpenPersistentObject(
        TEE_STORAGE_PRIVATE, id, sizeof(id) - 1,
        TEE_DATA_FLAG_ACCESS_READ, &object);
    if (rc != TEE_SUCCESS) return rc;
    rc = TEE_GetObjectInfo1(object, &info);
    if (rc == TEE_SUCCESS && info.dataSize > capacity) {
        *actual = info.dataSize;
        rc = TEE_ERROR_SHORT_BUFFER;
    } else if (rc == TEE_SUCCESS) {
        rc = TEE_ReadObjectData(object, buffer, capacity, actual);
    }
    TEE_CloseObject(object);
    return rc;
}
```

4.5.0의 [`TEE_ReadObjectData()`](https://github.com/OP-TEE/optee_os/blob/0919de0f7c79ad35ad3c8ace5f823ad1344b4716/lib/libutee/include/tee_internal_api.h#L272-L275)는 `size_t size, size_t *count`를 받습니다. 바로 아래 GP 1.1 호환 `__GP11_TEE_ReadObjectData()`는 `uint32_t size, uint32_t *count`입니다. 64-bit TA에서 둘을 섞으면 `count`가 가리키는 크기가 4 B와 8 B로 어긋납니다.

Mock 실행 결과는 다음과 같습니다.

```text
success      rc=0x00000000 actual=5 closes=1
open fail    rc=0xffff0008 actual=0 closes=0
info fail    rc=0xf0100001 actual=0 closes=1
short buffer rc=0xffff0010 actual=64 closes=1
read fail    rc=0xf0100003 actual=0 closes=1
null actual  rc=0xffff0006 closes=0
null buf cap rc=0xffff0006 closes=0
```

Open이 실패하면(`TEE_ERROR_ITEM_NOT_FOUND`, `0xffff0008`) handle이 없으므로 close가 0번, 그 뒤의 실패와 성공에서는 정확히 1번입니다. Short buffer(`0xffff0010`)에서는 `actual`에 필요한 크기 64를 돌려줍니다. 인자 검사 실패는 `TEE_ERROR_BAD_PARAMETERS`(`0xffff0006`)입니다. 이 시험은 helper의 자원 정리만 보며, 실제 storage의 원자성·rollback 내성은 아래 절에서 source로 봅니다.

## 저장소 위치와 rollback

OP-TEE 4.5.0의 저장소 backend는 REE FS와 RPMB 두 가지입니다. [`core/include/tee/tee_fs.h`](https://github.com/OP-TEE/optee_os/blob/0919de0f7c79ad35ad3c8ace5f823ad1344b4716/core/include/tee/tee_fs.h#L78-L106)의 `tee_svc_storage_file_ops()`는 `TEE_STORAGE_PRIVATE`를 받으면 `CFG_REE_FS`가 켜져 있을 때 REE FS를, 아니면 RPMB를 고릅니다. 기본값은 [`mk/config.mk`](https://github.com/OP-TEE/optee_os/blob/0919de0f7c79ad35ad3c8ace5f823ad1344b4716/mk/config.mk#L147-L157)에서 `CFG_REE_FS ?= y`, `CFG_RPMB_FS ?= n`입니다. 그래서 기본 빌드에서 `TEE_STORAGE_PRIVATE`로 만든 객체는 normal world 파일시스템(기본 `/data/tee`)에 암호화돼 저장됩니다. RPMB에 두려면 `CFG_RPMB_FS=y`로 빌드하고 `TEE_STORAGE_PRIVATE_RPMB`를 명시합니다.

| 경로 | 보호와 남은 조건 |
|------|------|
| REE filesystem | 암호화·무결성 보호. Normal world가 파일을 삭제·사용 불가로 만들 수 있음 |
| RPMB | 인증된 접근·write counter를 활용한 replay 보호. key provisioning·device·driver·firmware 조건 확인 |
| TA별 key 분리 | HUK → SSK → TSK → FEK로 파생. 기본 [`otp_stubs.c`](https://github.com/OP-TEE/optee_os/blob/0919de0f7c79ad35ad3c8ace5f823ad1344b4716/core/kernel/otp_stubs.c#L13-L24)의 `tee_otp_get_hw_unique_key()`는 HUK를 전부 0으로 채우는 `__weak` stub이므로 platform이 fuse 값으로 덮어써야 함 |
| 저장소 복원 | 오래된 snapshot·metadata rollback·counter 동기화와 가용성 정책 검증 |

[4.5.0 secure storage 문서](https://optee.readthedocs.io/en/4.5.0/architecture/secure_storage.html)는 GP의 rollback protection level로 이 차이를 적습니다. `CFG_RPMB_FS=y`면 rollback 보호를 TEE가 제어하며 level 1000, `CFG_RPMB_FS=n`이면 rollback 보호가 없고 level 0입니다. `config.mk`도 REE FS의 rollback 보호(`CFG_REE_FS_INTEGRITY_RPMB`)는 `CFG_RPMB_FS=y`일 때만 동작한다고 주석을 답니다. 따라서 "암호화된 REE 파일이면 이전 버전 복원도 막는다"는 결론은 틀립니다. 기본 빌드에서는 normal world가 `/data/tee`의 옛 파일을 되돌려 놓아도 TA는 정상 read에 성공합니다.

RPMB 쪽에도 함정이 있습니다. `CFG_RPMB_WRITE_KEY=y`는 RPMB key가 아직 없을 때 TEE가 key를 써 넣게 하는데, `config.mk`는 이 옵션을 product build에서 켜면 "TEE가 RPMB key를 유출할 수 있다"고 경고합니다. 공장 provisioning 전용입니다. `CFG_RPMB_TESTKEY=y`는 HUK에서 파생하는 대신 고정 key를 씁니다.

## TA 빌드·서명·시험

OP-TEE release·TA dev kit·target ABI·toolchain을 함께 고정합니다. `user_ta_header_defines.h`의 UUID·flags·stack·data size와 실제 output 이름을 맞춥니다. 서명키는 기본값을 그대로 두면 안 됩니다. 4.5.0 [`mk/config.mk`](https://github.com/OP-TEE/optee_os/blob/0919de0f7c79ad35ad3c8ace5f823ad1344b4716/mk/config.mk#L226-L232)는 `TA_SIGN_KEY ?= keys/default_ta.pem`이고, `TA_PUBLIC_KEY`가 이 키를 따라가 OP-TEE OS image에 박힙니다. 그 `keys/default_ta.pem`은 source tree에 공개된 RSA 2048-bit private key입니다(`openssl pkey -text`로 확인). 기본값으로 빌드한 장치는 누구나 서명한 TA를 load합니다. 같은 주석은 HSM 서명을 쓸 때 `TA_SIGN_KEY`를 dummy로, `TA_PUBLIC_KEY`를 HSM 공개키로 두라고 안내합니다.

빌드 성공은 TA load·서명 거부·command 권한·저장소 복구까지 검증했다는 뜻이 아닙니다. `xtest`의 기능·회귀 결과와 별도로 negative test를 정합니다. 자원 기본값은 source에 있습니다. 4.5.0 `mk/config.mk`는 core heap을 `CFG_CORE_HEAP_SIZE ?= 65536`(64 KiB, 592행), secure world thread 수를 `CFG_NUM_THREADS ?= 2`(113행)로 둡니다. Thread가 모자라면 OP-TEE는 SMC 반환값 `OPTEE_SMC_RETURN_ETHREAD_LIMIT`(`0x1`)을 돌려주고, `core/arch/arm/include/sm/optee_smc.h`의 주석은 이 값을 "Trusted OS thread 수 초과, 나중에 다시 시도"로 정의합니다. 이 작업에서는 xtest를 실행하지 않았습니다.

## Arm CCA·SGX와 비교할 축

OP-TEE TA, SGX enclave, TDX·SEV-SNP VM, CCA Realm은 보호 단위와 TCB가 다릅니다. “메모리 암호화가 있다”는 한 칸으로 격리 강도를 순위 매길 수 없습니다. CCA의 RME는 Non-secure·Secure·Realm·Root 보안 상태를 구분하며 Root를 일반 guest VM처럼 취급하지 않습니다.

[TF-A v2.15.0의 RME 문서](https://github.com/TrustedFirmware-A/trusted-firmware-a/blob/da738d5eae93af342fdc4995dd3c05acb4c9d757/docs/components/realm-management-extension.rst)는 RME를 Armv9-A의 FEAT_RME로 설명하고, Arm CCA가 Root와 Realm이라는 보안 상태·주소 공간을 추가한다고 적습니다. TF-A는 Root world에서 돌고, Realm VM은 Realm world의 RMM이 관리하며, TF-A의 RME 지원은 v2.6부터입니다. RME는 granule 단위 접근 제어이므로 외부 메모리 암호화나 device I/O 인증은 별도 기능입니다. Device를 Realm에 붙이는 방법은 [Ch 13](/blog/embedded/embedded-security/chapter13-cxl-tee)의 TDISP에서 다룹니다.

| 비교 축 | 제품에서 확인할 질문 |
|------|------|
| 보호 단위 | process 일부·TA·VM 중 어느 범위인가? |
| TCB | OS·monitor·hypervisor·device 중 무엇을 신뢰하는가? |
| 메모리·I/O | 접근 제어·암호화·DMA·외부 저장의 위협 경계는 어디인가? |
| Attestation | 신뢰 anchor·measurement·freshness와 verifier 정책은 무엇인가? |
| 복구·운영 | patch·rollback·key 회전·데이터 복구와 가용성 책임은 누구에게 있는가? |

## 정리

- OP-TEE의 CA·driver·monitor·core·TA·supplicant 역할을 구분합니다.
- 세션 login과 command별 권한, mapping과 내용의 신뢰는 다릅니다.
- Persistent object는 실패 경로에서도 획득한 handle을 정확히 닫습니다.
- API 판에 맞는 `size_t`·호환 signature를 사용합니다.
- 기본 빌드(`CFG_REE_FS=y`, `CFG_RPMB_FS=n`)의 `TEE_STORAGE_PRIVATE`는 REE FS이고 rollback 보호 level은 0입니다.
- 기본 HUK stub은 전부 0이므로 platform이 fuse 값을 넣지 않으면 TA별 key 분리가 의미를 잃습니다.
- Host mock은 helper의 close 횟수만 확인했고, 실제 TA·저장소 실행은 하지 않았습니다.

다음 편은 **Ch 6: OTA 업데이트 — 안전한 펌웨어 배포**. 지금까지 다진 secure boot·crypto·TEE 기반 위에서, 양산 디바이스에 펌웨어를 *원격으로 안전하게* 갱신하는 메커니즘을 봅니다.

## 관련 항목

- [Ch 2: Secure Boot — 부트 체인 검증](/blog/embedded/embedded-security/chapter02-secure-boot)
- [Ch 3: MCU 크립토 — HW accelerator](/blog/embedded/embedded-security/chapter03-mcu-crypto)
- [Ch 4: TrustZone — Cortex-A / Cortex-M](/blog/embedded/embedded-security/chapter04-trustzone)
- [Ch 6: OTA 업데이트](/blog/embedded/embedded-security/chapter06-ota-update)
- [Ch 7: 사이드채널 공격](/blog/embedded/embedded-security/chapter07-side-channel)
- [Practical RTOS Internals — Part 4-11: TrustZone & TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
- AUTOSAR Adaptive — 차량 보안
- DO-178C — 항공 SW 보증
