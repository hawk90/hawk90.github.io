---
title: "Part 8-04: Seeding & entropy"
date: 2026-05-25T01:00:00
description: "BitGen 시드 관리 — OS entropy, SeedSeq, 결정적 재현성. 그리고 보안 한계."
series: "Abseil Code Review"
seriesOrder: 47
tags: [cpp, abseil, random, seed, entropy]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## 기본은 OS entropy

`absl::BitGen bg;`는 OS의 entropy source(`/dev/urandom`, Windows `BCryptGenRandom`)에서 시드를 받는다. 사용자가 시드 코드를 *쓰지 않는 것*이 권장 방식이다.

```cpp
#include "absl/random/random.h"

absl::BitGen bg;   // 자동 시드 — 매 프로세스, 매 객체 다른 시퀀스
```

OS entropy는 cryptographically strong하므로 시드 자체는 *예측 불가* 다. 다만 BitGen 자체가 cryptographic이 아니라는 점은 별개다(*시드*만 안전).

## 결정적 재현 — SeedSeq

테스트 또는 재현 가능한 시뮬레이션에는 명시 시드를 쓴다.

```cpp
absl::SeedSeq seed{1, 2, 3, 4};
absl::BitGen bg(seed);

absl::SeedSeq same{1, 2, 3, 4};
absl::BitGen bg2(same);
// bg와 bg2는 동일 시퀀스
```

`absl::SeedSeq`는 `std::seed_seq` 호환 컨셉이다. 정수 시퀀스로 초기화하고, 엔진이 내부적으로 *큰 entropy pool*을 채울 만큼 stretch한다.

## SeedGen — sequence 헬퍼

여러 BitGen을 같은 base seed에서 파생할 때.

```cpp
absl::SeedSeq seed{42};
absl::BitGen bg1(seed);
absl::BitGen bg2(seed);   // bg1과 동일 시퀀스 ❌ 보통 원하지 않음
```

각 BitGen이 *독립* 이어야 하면 base seed를 stretch 한 뒤 나눠 쓴다.

```cpp
absl::SeedSeq base{42};
std::vector<std::uint32_t> spread(8);
base.generate(spread.begin(), spread.end());

absl::BitGen bg1(absl::SeedSeq(spread.begin(), spread.begin() + 4));
absl::BitGen bg2(absl::SeedSeq(spread.begin() + 4, spread.end()));
// bg1, bg2 독립
```

## 시드 누출 — 회피

시드 값을 로그에 남기는 것은 *예측 가능성* 을 만든다.

```cpp
// 회피 — 시드 노출
absl::SeedSeq seed{absl::ToUnixNanos(absl::Now())};   // 현재 시각 — 추측 가능
LOG(INFO) << "seed = " << seed_value;

// Good — OS entropy 그대로
absl::BitGen bg;
```

시뮬레이션 재현성을 위해 시드를 저장해야 하면 *별도 채널*(설정 파일, 안전 저장소)로 관리하고 로그에는 hash나 ID만 남긴다.

## 비-cryptographic 한계

BitGen의 시드가 안전하더라도, *출력으로부터 상태를 역추적*할 수 있다. 충분한 출력을 본 공격자는 다음 출력을 예측한다.

| 용도 | BitGen 사용 가능? |
|------|------------------|
| 게임 로직 random | ✓ |
| 캐시 키 무작위화 | ✓ |
| A/B 테스트 분기 | ✓ |
| 부하 시뮬레이션 | ✓ |
| 토큰 생성 | ✗ — 예측 가능 |
| 세션 ID | ✗ — 예측 가능 |
| 암호 키 | ✗ — 예측 가능 |
| Nonce | ✗ — 예측 가능 |

암호학적 random이 필요하면 `boringssl::RAND_bytes` 또는 `getrandom(2)`을 직접 호출한다.

```cpp
// 토큰 생성 — BitGen 절대 안 됨
unsigned char token[32];
ABSL_CHECK_EQ(RAND_bytes(token, sizeof(token)), 1);
```

## thread별 BitGen

`thread_local`은 자동 시드 BitGen과 잘 맞는다.

```cpp
thread_local absl::BitGen tls_bg;

int RandomShard(int n) {
    return absl::Uniform(tls_bg, 0, n);
}
```

각 스레드가 독립 entropy로 시드된 BitGen을 가진다. 락 없음, 시퀀스 충돌 없음.

## 분산 시뮬레이션의 재현성

여러 worker가 같은 시뮬레이션을 재현하려면 worker ID + base seed로 결정.

```cpp
absl::BitGen MakeWorkerGen(int64_t base_seed, int worker_id) {
    absl::SeedSeq seed{
        static_cast<std::uint32_t>(base_seed >> 32),
        static_cast<std::uint32_t>(base_seed & 0xffffffff),
        static_cast<std::uint32_t>(worker_id),
    };
    return absl::BitGen(seed);
}
```

같은 `base_seed`로 시뮬레이션을 두 번 돌리면 모든 worker가 동일 시퀀스를 본다.

## seed 자료형 호환

`absl::SeedSeq`는 표준의 `std::seed_seq`와 동등하게 동작하므로 std 엔진에도 쓸 수 있다.

```cpp
absl::SeedSeq seed{1, 2, 3};
std::mt19937 mt(seed);     // OK
absl::BitGen bg(seed);     // OK
```

반대로 `std::seed_seq`도 `absl::BitGen`에 넣을 수 있다. 두 시스템이 호환된다.

## 작은 예시 — 재현 가능한 부하 테스트

```cpp
ABSL_FLAG(int64_t, sim_seed, 0, "0 → OS entropy; non-zero → reproducible");

absl::BitGen MakeSimGen() {
    int64_t s = absl::GetFlag(FLAGS_sim_seed);
    if (s == 0) {
        return absl::BitGen{};   // 자동 entropy
    }
    return absl::BitGen(absl::SeedSeq{
        static_cast<std::uint32_t>(s >> 32),
        static_cast<std::uint32_t>(s & 0xffffffff),
    });
}

int main(int argc, char** argv) {
    absl::ParseCommandLine(argc, argv);
    absl::BitGen bg = MakeSimGen();

    LOG(INFO) << "sim_seed = "
              << (absl::GetFlag(FLAGS_sim_seed) == 0
                  ? "ENTROPY"
                  : absl::StrCat(absl::GetFlag(FLAGS_sim_seed)));

    RunSimulation(bg);
}
```

Flag 하나로 production-스타일과 재현 가능 모드를 토글한다.

## 코드 리뷰 체크리스트

```cpp
// 회피 — 약한 시드
std::mt19937 bg(static_cast<unsigned>(std::time(nullptr)));

// Good — OS entropy
absl::BitGen bg;
```

```cpp
// 회피 — 매 호출 새 BitGen
int Pick() {
    absl::BitGen bg;   // ❌ 매번 시드 갱신 = 비싸고 thread 충돌 가능
    return absl::Uniform(bg, 0, 100);
}

// Good — thread_local
thread_local absl::BitGen bg;
int Pick() { return absl::Uniform(bg, 0, 100); }
```

```cpp
// 회피 — 토큰 생성에 BitGen
std::string Token() {
    absl::BitGen bg;
    return absl::StrCat(absl::Uniform<uint64_t>(bg, 0, ~0ull));   // ❌ 예측 가능
}

// Good — 암호학적 random
std::string Token() {
    unsigned char b[16];
    RAND_bytes(b, sizeof(b));
    return absl::BytesToHexString({reinterpret_cast<char*>(b), sizeof(b)});
}
```

## 정리

- 기본 — `absl::BitGen bg;`로 OS entropy 시드. 시드 코드를 쓰지 않는 것이 안전.
- 결정적 재현 — `absl::SeedSeq`로 명시 시드. 시뮬레이션·테스트 한정.
- 여러 BitGen 독립 — base seed를 stretch 후 나눠 분배.
- 시드 값은 로그에 남기지 않음(예측 가능성을 만든다).
- 토큰·세션·암호 키 — BitGen 사용 *금지*. `RAND_bytes`/`getrandom` 사용.

## 다음 장 예고

[Part 9-01: int128 / uint128](/blog/programming/code-review/abseil/part9-01-int128) — 128비트 정수.

## 관련 항목

- [Part 8-01: BitGen](/blog/programming/code-review/abseil/part8-01-bit-gen)
- [Part 8-02: Distributions](/blog/programming/code-review/abseil/part8-02-distributions)
- [Part 8-03: Mocking random](/blog/programming/code-review/abseil/part8-03-mocking-random)
- [Part 12-01: ABSL_FLAG](/blog/programming/code-review/abseil/part12-01-absl-flag-define)
- [원문 — Seed Sequences](https://abseil.io/docs/cpp/guides/random#seeding-bit-generators)
