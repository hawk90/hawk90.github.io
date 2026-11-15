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

이 장의 소스 기준은 [OP-TEE OS 4.5.0](https://github.com/OP-TEE/optee_os/tree/0919de0f7c79ad35ad3c8ace5f823ad1344b4716)과 [같은 판 secure storage 문서](https://optee.readthedocs.io/en/4.5.0/architecture/secure_storage.html)입니다. 아래 C helper는 실제 header로 compile하고 host mock으로 자원 정리만 확인합니다. OP-TEE boot·QEMU guest·실제 TA 실행·RPMB provisioning이나 GP 적합성 시험을 수행한 것은 아닙니다.

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

TA가 이미 load됐는지와 instance·session flag에 따라 수명은 달라집니다. `TEEC_OpenSession()`과 invoke의 역할을 구분하고, 매 invoke가 UUID를 찾아 새 TA를 load한다는 고정 흐름으로 설명하지 않습니다. 결과 반환도 항상 RPC를 거치는 것은 아닙니다. RPC는 normal world의 도움을 요청하는 별도 단계입니다.

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

4.5.0의 `TEE_ReadObjectData()`는 `size_t *count`를 받습니다. 같은 header에 있는 GP 1.1 호환 `__GP11_TEE_ReadObjectData()`의 `uint32_t *count`와 섞지 않습니다. 위 helper는 open 실패·info 실패·short buffer·read 실패·성공에서 반환과 close 횟수를 host mock으로 확인합니다. 실제 storage의 원자성·rollback 내성을 검사하는 것은 아닙니다.

## 저장소 위치와 rollback

OP-TEE 4.5.0 문서는 REE FS와 RPMB backend를 설명합니다. `TEE_STORAGE_PRIVATE`는 REE FS가 있으면 먼저 선택하고, 없으면 RPMB를 선택하므로 이름만으로 RPMB 저장을 보장하지 않습니다. 두 backend를 구체적인 storage ID로 선택하는 구성도 있습니다.

| 경로 | 보호와 남은 조건 |
|------|------|
| REE filesystem | 암호화·무결성 보호. Normal world가 파일을 삭제·사용 불가로 만들 수 있음 |
| RPMB | 인증된 접근·write counter를 활용한 replay 보호. key provisioning·device·driver·firmware 조건 확인 |
| TA별 key 분리 | HUK·SSK·TSK·FEK 등 실제 key derivation과 platform HUK 구현 확인 |
| 저장소 복원 | 오래된 snapshot·metadata rollback·counter 동기화와 가용성 정책 검증 |

문서는 `CFG_RPMB_FS=n`일 때 rollback 보호가 없다고 구분합니다. 따라서 “암호화된 REE 파일이면 이전 버전 복원도 막는다”는 결론은 틀립니다. RPMB도 모든 공격에 대해 가장 안전하다는 하나의 서열로 표현하지 않습니다. 정상 read 성공이 최신 데이터라는 사실을 입증하는지도 product 정책으로 확인해야 합니다.

## TA 빌드·서명·시험

OP-TEE release·TA dev kit·target ABI·toolchain을 함께 고정합니다. `user_ta_header_defines.h`의 UUID·flags·stack·data size와 실제 output 이름을 맞추고, loader가 신뢰할 서명키와 배포 경로를 확인해야 합니다. Development signing key와 production 신뢰 anchor는 분리합니다.

빌드 성공은 TA load·서명 거부·command 권한·저장소 복구까지 검증했다는 뜻이 아닙니다. `xtest`의 기능·회귀 결과와 별도로 필요한 negative test를 정합니다. 테스트 개수·고정 SMC 비용·기본 heap 크기는 release·platform·구성에 따라 확인해야 하므로 보편값을 제시하지 않습니다. 이 작업에서는 xtest나 example의 console log를 생성하지 않았습니다.

## Arm CCA·SGX와 비교할 축

OP-TEE TA, SGX enclave, TDX·SEV-SNP VM, CCA Realm은 보호 단위와 TCB가 다릅니다. “메모리 암호화가 있다”는 한 칸으로 격리 강도를 순위 매길 수 없습니다. CCA의 RME는 Non-secure·Secure·Realm·Root 보안 상태를 구분하며 Root를 일반 guest VM처럼 취급하지 않습니다.

[TF-A의 RME 설명](https://trustedfirmware-a.readthedocs.io/en/v2.12.0/components/realm-management-extension.html)과 사용하는 RMM·platform 자료로 granule 소유권·attestation·I/O 경계를 확인합니다. RME 자체의 접근 제어를 임의 platform의 외부 메모리 암호화 보장으로 확대하지 않습니다. Realm이 외부 I/O의 인증·기밀성을 자동 제공하지도 않습니다.

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
- REE 암호화·RPMB replay 방지·TA별 key 분리·가용성을 따로 확인합니다.
- Compile·host mock과 실제 TA·저장소·attestation 실행 검증을 구분합니다.

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
