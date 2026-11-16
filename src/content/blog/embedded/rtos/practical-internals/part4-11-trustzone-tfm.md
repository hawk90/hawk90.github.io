---
title: "TrustZone과 TF-M — Secure/Non-Secure·NSC Veneer·PSA"
slug: "embedded/rtos/practical-internals/part4-11-trustzone-tfm"
date: 2026-05-07T09:43:00
description: "Cortex-M33/M55/M85의 TrustZone-M과 TF-M secure firmware를 정리합니다. SAU/IDAU로 메모리를 secure/non-secure로 가르고, NSC veneer + SG 명령으로 안전하게 cross-world call을 수행하는 구조, PSA Crypto/Storage/Attestation API, secure boot chain까지 다룹니다."
series: "Practical RTOS Internals"
seriesOrder: 43
tags: [trustzone, tf-m, security, cortex-m33, psa, secure-boot]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"TrustZone-M은 같은 CPU 위에 *두 개의 세계*를 만듭니다."** — Secure World와 Non-Secure World가 hardware로 분리되고, 일반적인 NS→Secure 서비스 호출은 NSC gateway를 통과하며 예외·복귀 경로는 별도로 존재합니다.

## 어떤 문제를 푸는가

이전 편에서 user/kernel을 MPU로 분리하는 방법을 보았습니다. 그 분리는 *한 OS 안의 권한 경계*이고, privileged kernel은 여전히 모든 메모리를 봅니다. TrustZone은 security state라는 별도의 경계를 만듭니다. 아파트 비유로 보면 MPU는 각 집의 현관문이고, TrustZone은 관리사무소 금고실입니다. 관리인(privileged kernel)이라도 금고실에는 정해진 창구(NSC)로만 요청할 수 있습니다.

대표적인 시나리오가 *secure key storage*입니다. IoT 디바이스에 device-unique private key가 들어 있다고 합시다. 일반 application은 그 key로 *서명만* 부탁할 수 있어야 하고, key 자체는 *읽을 수 없어야* 합니다. application firmware가 손상되더라도 key는 새지 않아야 합니다.

같은 core에서 *Secure World(S)*와 *Non-Secure World(NS)*가 hardware로 갈립니다. NS에 있는 FreeRTOS는 S의 crypto·secure storage·attestation 서비스를 호출할 수만 있고, S 메모리를 직접 읽을 수 없습니다.

이번 편은 TrustZone-M의 메모리 분할, NSC veneer를 통한 cross-world call, TF-M(Trusted Firmware-M)과 PSA API를 정리합니다. 실행한 것은 컴파일러와 linker까지입니다. `-mcmse` entry 함수를 `arm-none-eabi-gcc` 16.2.0으로 Cortex-M33용으로 빌드해 veneer와 생성 코드를 objdump로 확인했습니다. NS/S 두 image를 실제로 띄워 cross-world call을 돌리지는 않았고, 그 부분은 Arm ACLE CMSE 사양과 TF-M v2.1.0 소스·문서로 확인했습니다.

## 두 세계 — Secure와 Non-Secure

Cortex-M33/M55/M85에서 TrustZone for Armv8-M은 두 세계를 만듭니다.

Secure World (S)

- TF-M 또는 자체 secure firmware
- crypto, secure storage, attestation, secure boot root

Non-Secure World (NS)

- FreeRTOS / Zephyr / application
- 일반 펌웨어 코드

같은 CPU, 같은 메모리, 같은 peripheral — region별 attribute로 분리합니다.

두 세계가 같은 칩 위에서 어떻게 갈라지는지 그림으로 보면 이렇습니다. Secure Flash/SRAM/Peripheral과 Non-Secure 영역이 attribute로 분리되고, NSC veneer가 일반 서비스 호출의 통로가 됩니다. 그림은 예외·interrupt·복귀의 모든 전이를 표현하지 않습니다.

![TrustZone-M secure / non-secure world](/images/blog/rtos/diagrams/part4-11-trustzone-worlds.svg)

Arm의 ACLE CMSE 사양(version aef52c2, 2024-06-21)은 "The stack pointer is banked, resulting in a stack pointer for each combination of security state and exception level"이라고 적습니다. 반면 범용 register는 한 벌이라, secure 함수가 NS로 돌아갈 때 register에 남은 secure 값을 지워야 합니다. 이 일을 컴파일러가 해 주는 것이 아래 `cmse_nonsecure_entry`입니다.

## Memory 분할 — SAU와 IDAU

주소마다 S·NS·NSC 중 무엇인지(security attribution)는 SAU 설정과 칩이 고정해 둔 IDAU가 함께 정합니다. MPU의 읽기/쓰기 권한과는 다른 축입니다. NSC는 secure code 안에서 NS가 부를 수 있는 입구 영역이고, 아래 veneer가 놓이는 곳입니다.

secure와 non-secure가 같은 메모리를 다른 주소로 보는 alias는 칩마다 다릅니다. 예전 판의 예인 0x08000000과 0x0C000000은 차이가 **0x04000000, bit 26**이므로 "모든 칩이 bit 28 alias"라는 설명과 맞지 않습니다. 어느 bit를 쓰는지는 그 칩의 reference manual이 정하고, `-mcmse`가 주소를 바꿔 주지는 않습니다. 이 글은 특정 칩의 SAU register 예를 싣지 않습니다.

## NSC Veneer — 합법 Cross-World Call

NS가 secure 함수를 부를 때는 NSC 영역의 veneer로 들어갑니다. ACLE CMSE 사양은 veneer를 "an `SG` instruction followed by a `B.W` instruction that targets the entry function it veneers"로 정의하고, veneer들은 "expected to be placed in NSC memory"라고 적습니다. `cmse_nonsecure_entry`는 컴파일러와 linker에게 이 veneer와 entry ABI를 만들라고 표시하는 속성입니다.

```c title="cmse-entry.c"
#include <arm_cmse.h>
#include <stdint.h>
#include <stddef.h>

/* 공개 정수 하나를 읽어 공개 결과를 쓰는 교육용 서비스. crypto/권한 모델 아님. */
__attribute__((cmse_nonsecure_entry))
int secure_increment(const uint32_t *input, uint32_t *output)
{
    if (input == NULL || output == NULL ||
        ((uintptr_t)input % _Alignof(uint32_t)) != 0 ||
        ((uintptr_t)output % _Alignof(uint32_t)) != 0) return -1;
    const volatile uint32_t *in = cmse_check_address_range((void *)input,
        sizeof(*input), CMSE_NONSECURE | CMSE_MPU_READ);
    volatile uint32_t *out = cmse_check_address_range(output,
        sizeof(*output), CMSE_NONSECURE | CMSE_MPU_READWRITE);
    if (in == NULL || out == NULL) return -1;
    uint32_t snapshot = *in;
    *out = snapshot + UINT32_C(1); /* unsigned modular 결과 */
    return 0;
}
```

이 파일을 Cortex-M33용으로 빌드하고, secure image를 `0x10000000`에, veneer section `.gnu.sgstubs`를 `0x10100000`에 두고 link했습니다. `--cmse-implib --out-implib=veneers.o`는 NS image가 link할 import library를 만듭니다.

```text
$ arm-none-eabi-objdump -d -j .gnu.sgstubs secure.elf
10100000 <secure_increment>:
10100000:	e97f e97f 	sg
10100004:	f6ff bffc 	b.w	10000000 <__acle_se_secure_increment>
$ arm-none-eabi-nm veneers.o
10100000 A secure_increment
```

NS에서 보이는 `secure_increment`는 `sg` + `b.w`의 veneer 주소이고, 실제 함수는 `__acle_se_secure_increment`라는 이름으로 secure 영역에 있습니다. 함수 끝부분은 이렇게 컴파일됐습니다.

```text
1000003e:	4671      	mov	r1, lr
10000040:	4672      	mov	r2, lr
10000042:	4673      	mov	r3, lr
10000044:	46f4      	mov	ip, lr
10000046:	f38e 8c00 	msr	CPSR_fs, lr
1000004a:	4774      	bxns	lr
```

반환값 `r0`를 뺀 caller-saved register(`r1`~`r3`, `ip`)와 flag를 NS의 반환 주소 값으로 덮은 뒤 `bxns`로 돌아갑니다. ACLE 사양의 요구(결과와 반환 주소를 뺀 caller-saved register를 지우고 "An entry function must use the BXNS instruction")가 그대로 코드가 됐습니다. 같은 파일을 `-mcpu=cortex-m3`로 빌드하면 "target CPU does not support ARMv8-M Security Extensions"로 거절됩니다.

## NS Pointer 검증 — `cmse_check_address_range`

ACLE 사양에 따르면 `cmse_check_address_range(p, size, flags)`는 검사에 실패하면 `NULL`, 성공하면 `p`를 돌려주고, 범위가 MPU region 경계를 걸치면 실패합니다. `CMSE_NONSECURE`는 그 범위가 NS에 속하는지, `CMSE_MPU_READ`·`CMSE_MPU_READWRITE`는 MPU 읽기·쓰기 권한이 있는지를 봅니다. 위 secure image의 objdump에는 libgcc 구현에서 나온 `tt`·`ttt`·`tta`·`ttat` 명령이 보입니다. 이 명령들이 주소의 attribution과 권한을 hardware에 묻습니다.

같은 사양은 "Non-secure memory can be changed asynchronously to the execution of secure code"라고 경고하고 "Secure code must handle non-secure memory as volatile"이라고 요구합니다. 검사한 뒤 NS 쪽 다른 thread가 값을 바꿀 수 있기 때문입니다. 위 예가 `*in`을 한 번만 읽어 `snapshot`에 담는 이유가 이것입니다. 길이를 받는 API라면 길이도 먼저 secure 쪽에 복사한 뒤, 그 복사본으로 범위를 검사하고 씁니다.

## TF-M — ARM 공식 Secure Firmware

이 글의 기준은 **TF-Mv2.1.0**, commit `0c4c99ba33b3e66deea070e149279278dc7647f4`(2024-05-13)입니다. TF-M은 secure 쪽에서 SPM(Secure Partition Manager)과 crypto·storage·attestation 같은 secure partition을 돌리는 firmware입니다.

TrustZone은 S와 NS 두 칸만 나누지만, TF-M은 secure 안을 다시 나눕니다. `docs/design_docs/ff_isolation.rst:22-45`가 FF-M의 isolation level 3단계를 정리합니다. Level 1은 SPE(secure 전체)를 NSPE로부터만 보호하고, Level 2는 Application RoT를 NSPE로부터, PSA RoT를 NSPE와 Application RoT로부터 보호합니다. Level 3은 secure partition끼리도 서로 보호합니다.

## PSA Crypto API — Vendor 독립 표준

PSA Crypto API에서 key는 handle(`psa_key_id_t`)로 다루지만, 그렇다고 꺼낼 수 없는 것은 아닙니다. TF-M v2.1.0 `interface/include/psa/crypto.h:741`에 `psa_export_key()`가 있고, 그 주석(`:710-714`)은 key policy에 `PSA_KEY_USAGE_EXPORT` usage flag가 있어야 한다고 적습니다(공개 key는 예외). 서명용 private key를 만들 때 이 flag를 빼는 것이 "key는 읽을 수 없고 서명만 부탁할 수 있다"를 만드는 방법입니다.

`psa_import_key()`(`crypto.h:646`)는 호출자가 가진 key bytes를 secure 쪽으로 가져옵니다. import 이전에 그 bytes가 NS 메모리에 있었다는 사실은 import로 지워지지 않으므로, 꺼내지 못해야 하는 key는 secure 쪽에서 `psa_generate_key()`로 만듭니다.

AES-GCM은 nonce 재사용에 약합니다. NIST SP 800-38D §8은 같은 key와 같은 IV로 서로 다른 입력을 암호화할 확률이 2^-32을 넘지 않아야 한다고 요구하고, IV가 한 번이라도 반복되면 forgery 공격에 취약할 수 있다고 적습니다. 예전 판의 고정 zero nonce 예는 이 요구를 어겨 지웠습니다. 이 절은 API와 사양을 대조한 것이고 TF-M crypto service를 실행하지는 않았습니다.

## Initial Attestation — Device 신원 증명

attestation은 장치가 "나는 이 firmware를 돌리는 진짜 장치"임을 서명된 token으로 증명하는 일입니다. verifier가 보낸 challenge를 token에 넣어 서명하므로 재전송된 옛 token을 걸러 낼 수 있습니다. token에 무엇이 들어가는지는 TF-M의 attestation partition과 platform 설정이 정하고, 이 글에서는 token을 만들어 보지 않았습니다.

## Secure Boot Chain

TF-Mv2.1.0 `docs/design_docs/booting/tfm_secure_boot.rst:68-77`은 bootloader(MCUboot 기반 BL2)가 secure와 non-secure image를 따로(multiple image boot) 또는 함께(single image boot) 다룰 수 있다고 설명합니다. multiple image boot는 두 image를 서로 다른 key로 따로 서명해 따로 update할 수 있고, single image boot는 둘을 이어 붙인 한 blob을 서명합니다. 같은 디렉터리의 `secure_boot_rollback_protection.rst`가 rollback 방지를 다룹니다.

**secure/verified boot는 서명을 검증해 실행을 허락하는 일, measured boot는 무엇이 실행됐는지 측정값을 기록하는 일**입니다. 둘은 함께 쓸 수 있지만 같은 말이 아닙니다.

## PSA Certified — 보안 인증 등급

PSA Certified의 "Getting certified" 페이지는 등급을 이렇게 나눕니다. Level 1은 질문지를 작성하고 lab이 검토하는 단계이고 attack 시험은 없습니다. Level 2는 칩의 PSA-RoT가 software attack을 막는지 lab에서 취약점 평가를 받고, Level 3은 "substantial hardware and software attacks"까지 범위를 넓힙니다. Level 4는 integrated Secure Enclave나 외부 Secure Element를 쓰는 칩 대상입니다. TF-M을 쓴다고 이 인증이 따라오지는 않고, 제품마다 평가를 받아야 합니다. 예전 판의 "Level 1은 질문 10개", "Level 4 = CC EAL4+" 같은 표현은 이 페이지에 없어 지웠습니다.

## SoC 사례 — Cortex-M33 칩들

TF-M v2.1.0이 지원하는 board는 소스 트리의 `platform/ext/target/` 아래에 vendor별 디렉터리(`arm`, `nordic_nrf`, `nxp`, `stm` 등)로 있습니다. core가 Cortex-M33이라고 해서 그 칩이 이 목록에 있거나 vendor SDK가 같은 TF-M service를 제공하는 것은 아닙니다. 예전 판의 S32K3·RP2350 설명은 원문을 확인하지 않아 지웠습니다.

## Cross-World Call Overhead

이 글에서는 재지 않았습니다. 예전 판의 "55 cycle·109 µs·32 ms" 표는 원시 자료가 없어 지웠습니다. 구조로 보면 entry 한 번은 veneer의 `sg`·`b.w`, 진입 함수 안의 `tt` 검사, 끝의 register 정리와 `bxns`를 지나갑니다. TF-M service라면 여기에 SPM이 partition으로 요청을 넘기는 비용이 더해집니다.

## 자주 보는 함정과 안티패턴

- `.gnu.sgstubs`에 주소를 주지 않습니다. 이 linker는 "no address assigned to the veneers output section .gnu.sgstubs"로 멈췄습니다.
- input만 확인하고 output pointer·output length·length overflow를 놓칩니다.
- NS가 바꿀 수 있는 값을 검사한 뒤 다시 읽어 씁니다.
- SAU만 설정하고 bus master(DMA)·debug 접근의 보안 설정을 빠뜨립니다.
- key policy에 `PSA_KEY_USAGE_EXPORT`를 넣어 두고 "handle만 쓰니 안전하다"고 봅니다.

## 정리

- security state와 privilege/MPU permission은 별도 축입니다.
- `cmse_nonsecure_entry`는 `sg`+`b.w` veneer와, 끝에서 register를 지우고 `bxns`하는 entry를 만듭니다(objdump로 확인).
- stack pointer는 security state별로 banked지만 범용 register는 한 벌이라 지워야 합니다.
- `cmse_check_address_range()`는 `tt` 명령으로 범위를 묻고, NS 메모리는 volatile로 다뤄 한 번만 읽습니다.
- TF-M isolation level, MCUboot single/multiple image boot, PSA export policy, PSA Certified 등급은 각 원문대로 구분합니다.

## 근거 자료

- [Arm ACLE CMSE](https://arm-software.github.io/acle/cmse/cmse.html) (version aef52c2, 2024-06-21): veneer·entry ABI·range check·NS data 변경·banked SP.
- [TF-Mv2.1.0 secure boot](https://git.trustedfirmware.org/TF-M/trusted-firmware-m.git/tree/docs/design_docs/booting/tfm_secure_boot.rst?h=TF-Mv2.1.0), [isolation](https://git.trustedfirmware.org/TF-M/trusted-firmware-m.git/tree/docs/design_docs/ff_isolation.rst?h=TF-Mv2.1.0), [interface/include/psa/crypto.h](https://git.trustedfirmware.org/TF-M/trusted-firmware-m.git/tree/interface/include/psa/crypto.h?h=TF-Mv2.1.0).
- [NIST SP 800-38D](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf) §8: GCM IV 유일성 요구.
- [PSA Certified 평가 범위](https://www.psacertified.org/getting-certified/).



다음 편은 [4-12 AMP와 OpenAMP](/blog/embedded/rtos/practical-internals/part4-12-amp-openamp)에서 *서로 다른 코어가 서로 다른 OS를 돌리는* heterogeneous SoC를 다룹니다.

## 관련 항목

- [4-06: Stack Overflow 탐지](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)
- [4-10: System Call](/blog/embedded/rtos/practical-internals/part4-10-syscall)
- [4-12: AMP와 OpenAMP](/blog/embedded/rtos/practical-internals/part4-12-amp-openamp)
- [Embedded C++ 2-01: RAII 기초](/blog/embedded/embedded-cpp/part2-01-raii-basics)
