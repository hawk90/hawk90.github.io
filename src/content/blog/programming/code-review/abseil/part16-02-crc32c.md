---
title: "Part 16-02: absl::ComputeCrc32c — 하드웨어 가속 체크섬"
date: 2026-05-26T09:00:00
description: "absl::ComputeCrc32c — SSE4.2 CRC32, ARM CRC 명령어로 가속된 CRC32C 구현. iSCSI·Btrfs·protobuf에서 표준화된 무결성 검사."
series: "Abseil Code Review"
seriesOrder: 77
tags: [cpp, abseil, crc32c, hardware, checksum]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
---

## 한 줄 요약

`absl::ComputeCrc32c`는 *Castagnoli 다항식 (0x1EDC6F41) 기반의 CRC32C*를 계산한다. x86 SSE4.2의 `CRC32` 명령어, ARMv8.1의 `CRC32CB/CW/CX` 명령어를 자동 활용해 GB/s 단위 처리량을 낸다. iSCSI·Btrfs·gRPC·protobuf payload 체크섬에서 표준이다.

## 동기

분산 시스템은 거의 모든 transport에 체크섬이 필요하다. MD5/SHA는 *암호학적 강도*를 위해 비용을 지불하지만 일반 무결성 검사에는 과하다. 반면 CRC32 (IEEE 802.3, ethernet에 쓰이는 다항식 0x04C11DB7)는 충돌률이 높다.

CRC32C(Castagnoli)는 *두 측면 모두에서 좋은 균형*이다.

- 같은 32bit 출력, 더 나은 충돌률 (특히 short message).
- SSE4.2 + ARMv8 CRC 명령어가 *hardware-accelerated*. byte당 1 cycle 미만.

Google이 GFS·Spanner·BigTable·Colossus 어디서나 쓰는 표준이고 protobuf의 `Cord` 체크섬도 이 알고리즘이다.

런타임에 hardware/software 경로가 갈리는 흐름은 다음과 같다.

![CRC32C SSE4.2 vs software fallback](/images/blog/abseil/diagrams/part16-02-crc32c-hardware.svg)

## API와 사용법

```cpp
#include "absl/crc/crc32c.h"

absl::string_view data = "hello";
absl::crc32c_t c = absl::ComputeCrc32c(data);

// 누적 계산 (chunk 단위)
absl::crc32c_t c = absl::crc32c_t{0};
c = absl::ExtendCrc32cByZeroes(c, /*length=*/16);  // zero-fill 처리
c = absl::ExtendCrc32c(c, chunk1);
c = absl::ExtendCrc32c(c, chunk2);

// concat 결합 (스트림 합치기)
absl::crc32c_t c = absl::ConcatCrc32c(c1, c2, /*length_b=*/c2_length);

// 비교는 ==/!=, 값 추출은 static_cast
uint32_t raw = static_cast<uint32_t>(c);
```

타입이 `uint32_t`가 아닌 *strong typedef* `crc32c_t`라는 점이 중요하다. 일반 정수와 혼동해 `XOR`/`+`로 합치는 실수를 컴파일러가 잡는다.

```cpp
// 회피 — type system이 차단
uint32_t a = absl::ComputeCrc32c(d);   // 컴파일 에러

// Good
absl::crc32c_t a = absl::ComputeCrc32c(d);
```

## 내부 구현 — 하드웨어 분기

`absl/crc/internal/crc32c.cc`는 빌드 시점에 가용한 명령어 셋에 따라 path를 고른다.

```cpp
// 요약
crc32c_t ComputeCrc32c(absl::string_view data) {
#if ABSL_HAVE_X86_INTRINSICS && CPU_HAS_SSE42
  return ComputeCrc32cX86(data);
#elif ABSL_HAVE_ARM_CRC32
  return ComputeCrc32cArm(data);
#else
  return ComputeCrc32cSoftware(data);
#endif
}
```

런타임 CPUID 체크도 있다. 빌드 시 SSE4.2가 켜져 있지 않더라도 런타임에 가용하면 `_mm_crc32_u64` 경로를 쓴다.

### x86 path

`_mm_crc32_u64`는 8byte씩 한 사이클에 누적한다. cache line 단위로 3개의 stream을 병렬 처리해 superscalar pipeline을 최대로 채우는 기법이 일반적.

```cpp
// 간소화
uint32_t crc = 0xFFFFFFFF;
const uint8_t* p = data;
const uint8_t* end = data + len;

while (p + 8 <= end) {
  crc = _mm_crc32_u64(crc, *reinterpret_cast<const uint64_t*>(p));
  p += 8;
}
while (p < end) {
  crc = _mm_crc32_u8(crc, *p);
  ++p;
}
return crc ^ 0xFFFFFFFF;
```

실제 Abseil은 *3-way slicing*과 *PCLMULQDQ folding*까지 동원해 4KB 이상 chunk에서 16~20 GB/s를 낸다.

### ARM path

ARMv8.1의 `CRC32C{B,H,W,X}` 명령어로 1/4/8 byte 단위 누적. apple silicon (M1+)에서 동일 명령어를 지원해 macOS 빌드에서도 가속.

### Software fallback

slice-by-8 table lookup. 250 MB/s 정도. 임베디드 ARM7 등에 사용된다.

## 성능 (참고치)

x86 1MB 입력 기준:

| 알고리즘 | 처리량 |
|---|---|
| MD5 | 700 MB/s |
| SHA-256 (with SHA-NI) | 1.5 GB/s |
| CRC32C software (slice-by-8) | 1 GB/s |
| CRC32C SSE4.2 | 16 GB/s |
| CRC32C PCLMULQDQ 3-way | 25 GB/s |

암호학적 hash와 비교해 *수십 배* 빠르다. RPC payload 한 줄에 정도의 비용.

## 활용 — Cord와의 통합

`absl::Cord`는 *chunk별 CRC를 누적 보관*하는 기능을 가진다. `ConcatCrc32c`로 chunk를 합칠 때 다시 전체를 스캔하지 않는다.

```cpp
absl::Cord c1 = Read(file1);
absl::Cord c2 = Read(file2);
c1.Append(c2);   // 내부적으로 두 CRC를 ConcatCrc32c로 결합

absl::crc32c_t total = c1.ExpectedChecksum().value_or(absl::crc32c_t{});
```

수 GB의 데이터를 *체크섬 재계산 없이* 합칠 수 있다. 분산 storage에서 chunk re-assembly에 매우 유용.

## 코드 리뷰 포인트

**1. uint32_t로 받는 코드는 즉시 교체**

```cpp
// 회피
uint32_t crc = absl::ComputeCrc32c(data).operator uint32_t();

// Good
absl::crc32c_t crc = absl::ComputeCrc32c(data);
```

type erasure 비용이 없는 strong typedef를 그대로 활용.

**2. 누적 계산은 ExtendCrc32c**

```cpp
// 회피 — chunk마다 새 CRC 후 XOR
auto a = absl::ComputeCrc32c(chunk1);
auto b = absl::ComputeCrc32c(chunk2);
auto combined = static_cast<uint32_t>(a) ^ static_cast<uint32_t>(b);  // 의미 없음

// Good
auto c = absl::ComputeCrc32c(chunk1);
c = absl::ExtendCrc32c(c, chunk2);
```

CRC는 단순 XOR로 합쳐지지 않는다. `ExtendCrc32c` 또는 `ConcatCrc32c`를 쓴다.

**3. 표준 다항식 일치 확인**

다음 모두 *CRC32C*(Castagnoli)와 동일한 결과를 낸다. 데이터 교환 호환성을 위한 체크 포인트.

- `crc32c` 명령어 (Linux util)
- Google `crc32c` 라이브러리
- Btrfs/iSCSI 표준
- protobuf `Crc32cCombine`

반면 `ethernet CRC32`(다항식 0x04C11DB7)는 다른 알고리즘이다. *CRC32*만 적혀 있으면 어느 쪽인지 확인 필수.

**4. boundary alignment**

```cpp
// 큰 입력은 자동으로 8 byte 정렬 처리
absl::ComputeCrc32c(buffer);   // 내부에서 align loop
```

호출 측에서 정렬할 필요는 없다.

## 자주 보는 안티패턴

**암호학적 무결성에 CRC32C**

CRC32C는 *임의 데이터 무결성*용이지 *공격자의 위조 방어*용이 아니다. 공격자가 의도적으로 충돌을 만드는 시나리오에서는 SHA-256 / BLAKE3 / HMAC이 옳다.

**CRC32(ethernet)와 혼동**

```cpp
// boost::crc는 기본이 ethernet CRC32
boost::crc_32_type c;
c.process_bytes(data, len);
uint32_t v = c.checksum();   // CRC32C와 다른 값
```

protobuf·gRPC·iSCSI 모두 CRC32C. ethernet CRC32와 섞이지 않도록.

**short message에 SHA**

```cpp
// 회피 — 8byte hash에 SHA256 (32byte 출력 + cost)
auto h = SHA256(small_key);

// Good — 8byte 식별자에 CRC32C 또는 FarmHash
absl::crc32c_t h = absl::ComputeCrc32c(small_key);
```

key fingerprint·shard 분배에는 CRC32C나 `absl::Hash` ([Part 10-01](/blog/programming/code-review/abseil/part10-01-abseil-hash-value)).

**incremental verification 누락**

```cpp
// 회피 — 메모리에 전부 적재 후 한 번에 계산
std::string entire = ReadAll(file);
auto crc = absl::ComputeCrc32c(entire);

// Good — chunk 단위 누적
absl::crc32c_t crc = absl::crc32c_t{0};
char buf[64 * 1024];
while (size_t n = Read(file, buf, sizeof(buf))) {
  crc = absl::ExtendCrc32c(crc, absl::string_view(buf, n));
}
```

대용량 file·stream은 누적 계산이 필수. CPU + memory 양쪽이 절약된다.

**network endian 가정**

```cpp
// 회피 — 직접 byte로 쓰면 endian 의존
uint32_t v = static_cast<uint32_t>(crc);
write(fd, &v, 4);   // little endian 환경에서 0x12345678 → 78 56 34 12

// Good — 표준 byte order로
uint32_t v = htonl(static_cast<uint32_t>(crc));
write(fd, &v, 4);
```

체크섬을 transport에 실을 때 endian을 명시. iSCSI/protobuf 모두 network byte order 표준.

## 정리

- `absl::ComputeCrc32c`는 *Castagnoli* CRC32C, hardware-accelerated.
- `crc32c_t` strong typedef로 일반 정수와 분리.
- `ExtendCrc32c`/`ConcatCrc32c`로 chunk 합산.
- 16~25 GB/s, SHA256보다 10배 이상 빠름.
- `Cord` 통합으로 분산 storage에서 chunk re-assembly가 자연스러움.
- 암호학적 보안에는 부적합.

## 다음 편

[Part 16-03 — PeriodicSampler](/blog/programming/code-review/abseil/part16-03-periodic-sampler)에서 sampling rate 조정 도구를 본다.

## 관련 항목

- [Part 16-03 — PeriodicSampler](/blog/programming/code-review/abseil/part16-03-periodic-sampler)
- [Part 16-01 — Stacktrace / Symbolize](/blog/programming/code-review/abseil/part16-01-stacktrace-symbolize)
- [Part 15-01 — Cord](/blog/programming/code-review/abseil/part15-01-cord) — Cord 체크섬 통합
- [Part 10-01 — AbslHashValue](/blog/programming/code-review/abseil/part10-01-abseil-hash-value)
- [Folly Part 9-02 — Hash](/blog/programming/code-review/folly/part9-02-hash)
