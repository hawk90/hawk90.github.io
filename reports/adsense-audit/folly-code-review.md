# Folly Code Review — AdSense 1차 분석

> 분석 단계: 기계 기반 원문 triage 1차  
> 대상: 공개 글 89편  
> 기준 문서: [AdSense 공개 글 평가 루브릭](../../docs/adsense-audit/rubric.md)  
> 상태: 정성 검토 전 — 콘텐츠 자동 수정·삭제 없음

## 결론

Folly 시리즈는 공개 글 89편 중 산문 중앙값이 약 2,468자이고, 45편이 산문 2,500자 미만, 2편이 1,500자 미만이다. 61편은 산문보다 코드 블록이 길다.

이 보고서는 Folly를 무조건 유지하기 위한 평가가 아니다. 기존 계획대로 공식 API·문서 요약형 글은 독립 페이지로 남길 이유를 확인한 뒤 병합하거나 draft로 전환할 후보를 찾는다. 특히 글별로 Folly만의 설계 분석, 운영상의 트레이드오프, 재현 가능한 실험이 있는지 확인한다.

## 1차 분류 요약

| 분류 | 편수 | 의미 |
| --- | ---: | --- |
| 정성 보강 검토 | 3 | 기계 신호 기반 후보. 최종 판정 아님 |
| 1차 유지 후보 | 29 | 기계 신호 기반 후보. 최종 판정 아님 |
| 근거·실전성 검토 | 57 | 기계 신호 기반 후보. 최종 판정 아님 |

### 신호 분포

| 신호 | 편수 |
| --- | ---: |
| 명시적 결론 없음 | 1 |
| 코드 우세 | 61 |
| 외부 출처 없음 | 38 |
| 실전 신호 약함 | 32 |
| 산문 <2500 | 43 |
| 산문 <1500 | 2 |

## 정성 검토 우선순위

### 1순위: 산문 1,500자 미만

- `part3-04-manual-executor.md` — folly::ManualExecutor — 결정적 테스트를 위한 수동 진행: 산문 1,469자, 코드 3,854자
- `part14-01-meta-style-review.md` — folly Meta 스타일 code review 패턴: 산문 1,487자, 코드 6,245자

### 2순위: 산문 1,500~2,500자이면서 코드 우세 또는 실전 신호 약함

이 그룹은 글자 수만으로 제외하지 않는다. 독립적인 질문·예제·결론이 있는지, 다른 Folly 글 또는 Abseil 글과 병합 가능한지 직접 비교한다.

### 3순위: Abseil과의 주제 중복

Folly의 컨테이너·문자열·동시성·future 계열은 Abseil 및 표준 C++ 설명과 겹칠 수 있다. 제목이 비슷하다는 이유로 병합하지 않고 핵심 주장·예제·결론·독자 대상이 실제로 겹치는지 확인한다.

## 다음 조치

1. 1순위 후보를 직접 읽고 루브릭 A~G 점수를 부여한다.
2. Abseil과 겹치는 주제는 통합 문서로 유지할 가치가 있는지 비교한다.
3. 유지하지 않을 글은 삭제하지 않고 draft 전환, noindex, 병합 또는 301 대상 중 하나를 선택한다.
4. 사람이 확인한 뒤에만 원문과 공개 URL을 변경한다.

## 글별 기계 triage

| # | 파일 | 제목 | 산문(자) | 코드(자) | 외부 링크 | 실전 신호 | 신호 | 1차 조치 |
| ---: | --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | `00-preface.md` | Folly Code Review — Meta의 production-grade C++ 라이브러리 코드 분석 | 4,571 | 0 | 2 | 6 | 명시적 결론 없음 | 정성 보강 검토 |
| 2 | `part1-01-overview.md` | Folly 개요 — Meta가 production에서 검증한 utility 모음 분석 | 3,767 | 842 | 1 | 5 | 없음 | 1차 유지 후보 |
| 3 | `part1-02-folly-vs-abseil-philosophy.md` | Folly vs Abseil 철학 비교 — performance-first vs std-compatible | 2,523 | 2,874 | 0 | 7 | 코드 우세, 외부 출처 없음 | 근거·실전성 검토 |
| 4 | `part1-03-build-fbcode.md` | Folly 빌드와 fbcode 환경 — monorepo의 그림자 | 2,524 | 2,238 | 2 | 6 | 없음 | 1차 유지 후보 |
| 5 | `part1-04-api-stability.md` | Folly API stability 정책 — 어떤 보장도 없다는 솔직함 | 2,582 | 1,642 | 1 | 5 | 없음 | 1차 유지 후보 |
| 6 | `part1-05-production-validation.md` | Folly production validation 문화 — peta-scale에서 단련된 코드 | 3,217 | 1,373 | 0 | 5 | 외부 출처 없음 | 근거·실전성 검토 |
| 7 | `part2-01-future-overview.md` | folly::Future 분석 — std::future의 한계를 넘는 composable async | 2,660 | 2,919 | 0 | 1 | 코드 우세, 외부 출처 없음, 실전 신호 약함 | 근거·실전성 검토 |
| 8 | `part2-02-promise-make-future.md` | folly::Promise·makeFuture — Future를 만드는 두 길 | 2,207 | 3,650 | 0 | 3 | 산문 <2500, 코드 우세, 외부 출처 없음 | 근거·실전성 검토 |
| 9 | `part2-03-semi-future-vs-future.md` | folly::SemiFuture vs Future — executor binding의 명시화 | 1,972 | 4,081 | 0 | 0 | 산문 <2500, 코드 우세, 외부 출처 없음, 실전 신호 약함 | 근거·실전성 검토 |
| 10 | `part2-04-then-value-error.md` | folly::Future thenValue·thenError·thenTry — continuation 체인 분석 | 2,124 | 3,807 | 0 | 2 | 산문 <2500, 코드 우세, 외부 출처 없음 | 근거·실전성 검토 |
| 11 | `part2-05-collect.md` | folly::collect·collectAll·collectAny — fan-in 패턴 분석 | 2,137 | 4,136 | 0 | 22 | 산문 <2500, 코드 우세, 외부 출처 없음 | 근거·실전성 검토 |
| 12 | `part2-06-retry-window-via.md` | folly::Future retry·window·via — 제어 흐름 조합자 | 2,007 | 4,350 | 0 | 4 | 산문 <2500, 코드 우세, 외부 출처 없음 | 근거·실전성 검토 |
| 13 | `part2-07-fibers.md` | folly::fibers 분석 — M:N stackful coroutine | 2,729 | 2,857 | 0 | 1 | 코드 우세, 외부 출처 없음, 실전 신호 약함 | 근거·실전성 검토 |
| 14 | `part3-01-inline-executor.md` | folly::InlineExecutor — 호출자 thread에서 즉시 실행 | 2,292 | 2,886 | 0 | 1 | 산문 <2500, 코드 우세, 외부 출처 없음, 실전 신호 약함 | 근거·실전성 검토 |
| 15 | `part3-02-cpu-thread-pool-executor.md` | folly::CPUThreadPoolExecutor — CPU-bound 작업의 표준 thread pool | 2,214 | 3,836 | 0 | 3 | 산문 <2500, 코드 우세, 외부 출처 없음 | 근거·실전성 검토 |
| 16 | `part3-03-io-thread-pool-executor.md` | folly::IOThreadPoolExecutor — libevent 기반 I/O pool | 2,058 | 3,390 | 0 | 6 | 산문 <2500, 코드 우세, 외부 출처 없음 | 근거·실전성 검토 |
| 17 | `part3-04-manual-executor.md` | folly::ManualExecutor — 결정적 테스트를 위한 수동 진행 | 1,469 | 3,854 | 0 | 3 | 산문 <1500, 코드 우세, 외부 출처 없음 | 정성 보강 검토 |
| 18 | `part3-05-event-base.md` | folly::EventBase 분석 — libevent 이벤트 루프의 핵심 | 2,513 | 2,922 | 0 | 7 | 코드 우세, 외부 출처 없음 | 근거·실전성 검토 |
| 19 | `part4-01-iobuf.md` | folly::IOBuf 분석 — zero-copy buffer chain의 기본 단위 | 2,592 | 2,367 | 0 | 1 | 외부 출처 없음, 실전 신호 약함 | 근거·실전성 검토 |
| 20 | `part4-02-iobuf-queue.md` | folly::IOBufQueue — chain의 push/pull 추상화 | 1,812 | 3,479 | 0 | 5 | 산문 <2500, 코드 우세, 외부 출처 없음 | 근거·실전성 검토 |
| 21 | `part4-03-cursor.md` | folly::io::Cursor·RWCursor — chain 위의 stream | 1,842 | 3,590 | 0 | 4 | 산문 <2500, 코드 우세, 외부 출처 없음 | 근거·실전성 검토 |
| 22 | `part4-04-zero-copy-patterns.md` | folly Zero-copy 패턴 — IOBuf로 ScatterGather I/O 표현 | 2,312 | 2,939 | 0 | 11 | 산문 <2500, 코드 우세, 외부 출처 없음 | 근거·실전성 검토 |
| 23 | `part4-05-iobuf-shared-semantics.md` | folly::IOBuf shared semantics — clone·unshare·takeOwnership | 3,116 | 2,790 | 0 | 0 | 외부 출처 없음, 실전 신호 약함 | 근거·실전성 검토 |
| 24 | `part5-01-fbstring.md` | folly::FBString 분석 — SSO + COW 구현 | 3,380 | 1,633 | 1 | 0 | 실전 신호 약함 | 근거·실전성 검토 |
| 25 | `part5-02-fmt-format-integration.md` | folly의 fmt::format 통합 — 모던 포맷팅 채택 | 2,591 | 2,346 | 2 | 5 | 없음 | 1차 유지 후보 |
| 26 | `part5-03-string-piece.md` | folly::StringPiece — string_view 호환 분석 | 2,523 | 2,587 | 1 | 2 | 코드 우세 | 1차 유지 후보 |
| 27 | `part5-04-join-split.md` | folly Join·Split utilities — 문자열 분해와 결합 | 2,315 | 3,576 | 2 | 2 | 산문 <2500, 코드 우세 | 1차 유지 후보 |
| 28 | `part6-01-to-try-to.md` | folly::to·tryTo — text↔num 변환 분석 | 2,650 | 2,867 | 1 | 6 | 코드 우세 | 1차 유지 후보 |
| 29 | `part6-02-conv-customization.md` | folly Conv Customization — 사용자 타입 지원 | 2,171 | 3,102 | 1 | 3 | 산문 <2500, 코드 우세 | 1차 유지 후보 |
| 30 | `part6-03-conv-performance.md` | folly Conv 성능 비교 — sprintf·stringstream 대비 | 2,293 | 3,049 | 1 | 1 | 산문 <2500, 코드 우세, 실전 신호 약함 | 근거·실전성 검토 |
| 31 | `part7-01-f14-value-map.md` | folly::F14ValueMap vs std::unordered_map | 2,722 | 3,134 | 2 | 1 | 코드 우세, 실전 신호 약함 | 근거·실전성 검토 |
| 32 | `part7-02-f14-node-map.md` | folly::F14NodeMap — stable pointer가 필요할 때 | 2,248 | 2,441 | 1 | 3 | 산문 <2500, 코드 우세 | 1차 유지 후보 |
| 33 | `part7-03-f14-vector-map.md` | folly::F14VectorMap — cache-friendly iteration | 2,219 | 2,973 | 1 | 2 | 산문 <2500, 코드 우세 | 1차 유지 후보 |
| 34 | `part7-04-f14-fast-map.md` | folly::F14FastMap — auto-select 동작 | 2,456 | 1,642 | 1 | 0 | 산문 <2500, 실전 신호 약함 | 근거·실전성 검토 |
| 35 | `part7-05-f14-internals.md` | folly F14 internals — SIMD probing 메커니즘 | 3,406 | 2,944 | 3 | 2 | 없음 | 1차 유지 후보 |
| 36 | `part8-01-small-vector.md` | folly::small_vector — inline storage 분석 | 2,536 | 2,521 | 1 | 0 | 실전 신호 약함 | 근거·실전성 검토 |
| 37 | `part8-02-fixed-string.md` | folly::FixedString — compile-time string | 1,933 | 3,454 | 1 | 2 | 산문 <2500, 코드 우세 | 1차 유지 후보 |
| 38 | `part8-03-atomic-hash-map.md` | folly::AtomicHashMap — lock-free read 분석 | 2,229 | 3,672 | 1 | 1 | 산문 <2500, 코드 우세, 실전 신호 약함 | 근거·실전성 검토 |
| 39 | `part8-04-concurrent-hash-map.md` | folly::ConcurrentHashMap — sharded 동시 해시 맵 | 2,592 | 2,224 | 1 | 0 | 실전 신호 약함 | 근거·실전성 검토 |
| 40 | `part8-05-evicting-cache-map.md` | folly::EvictingCacheMap — LRU 구현 분석 | 2,143 | 3,451 | 1 | 8 | 산문 <2500, 코드 우세 | 1차 유지 후보 |
| 41 | `part9-01-synchronized.md` | folly::Synchronized — lock wrapper 패턴 | 2,155 | 3,196 | 1 | 7 | 산문 <2500, 코드 우세 | 1차 유지 후보 |
| 42 | `part9-02-shared-mutex.md` | folly::SharedMutex 분석 | 2,436 | 3,269 | 1 | 4 | 산문 <2500, 코드 우세 | 1차 유지 후보 |
| 43 | `part9-03-baton.md` | folly::Baton — one-shot wait 동기화 | 2,191 | 3,772 | 1 | 1 | 산문 <2500, 코드 우세, 실전 신호 약함 | 근거·실전성 검토 |
| 44 | `part9-04-rw-spin-lock.md` | folly::RWSpinLock 분석 | 2,004 | 3,366 | 1 | 5 | 산문 <2500, 코드 우세 | 1차 유지 후보 |
| 45 | `part9-05-pico-spin-lock.md` | folly::PicoSpinLock — 1-byte spinlock | 1,847 | 3,115 | 1 | 1 | 산문 <2500, 코드 우세, 실전 신호 약함 | 근거·실전성 검토 |
| 46 | `part10-01-producer-consumer-queue.md` | folly::ProducerConsumerQueue — SPSC 큐 분석 | 3,783 | 2,242 | 0 | 2 | 외부 출처 없음 | 근거·실전성 검토 |
| 47 | `part10-02-mpmc-queue.md` | folly::MPMCQueue — multi-producer multi-consumer | 3,755 | 1,993 | 0 | 1 | 외부 출처 없음, 실전 신호 약함 | 근거·실전성 검토 |
| 48 | `part10-03-unbounded-queue.md` | folly::UnboundedQueue — 동적 크기 lock-free | 3,288 | 1,898 | 0 | 2 | 외부 출처 없음 | 근거·실전성 검토 |
| 49 | `part10-04-fibers-channel.md` | folly::fibers::Channel — Go-like channel | 2,844 | 1,510 | 0 | 1 | 외부 출처 없음, 실전 신호 약함 | 근거·실전성 검토 |
| 50 | `part11-01-dynamic.md` | folly::dynamic — JSON-like dynamic type 분석 | 2,696 | 2,257 | 0 | 4 | 외부 출처 없음 | 근거·실전성 검토 |
| 51 | `part11-02-json-conversion.md` | folly JSON conversion — toJson·parseJson | 2,878 | 2,211 | 0 | 3 | 외부 출처 없음 | 근거·실전성 검토 |
| 52 | `part11-03-dynamic-struct.md` | folly dynamic ↔ struct — manual marshaling | 2,033 | 3,894 | 0 | 5 | 산문 <2500, 코드 우세, 외부 출처 없음 | 근거·실전성 검토 |
| 53 | `part11-04-dynamic-visitor.md` | folly dynamic Visitor pattern — type별 분기 | 2,173 | 3,490 | 0 | 5 | 산문 <2500, 코드 우세, 외부 출처 없음 | 근거·실전성 검토 |
| 54 | `part12-01-singleton-vs-meyers.md` | folly::Singleton vs Meyers/static — 왜 Folly의 Singleton인가 | 3,060 | 2,727 | 0 | 1 | 외부 출처 없음, 실전 신호 약함 | 근거·실전성 검토 |
| 55 | `part12-02-singleton-vault.md` | folly::SingletonVault 분석 — 등록·소멸·의존성 | 2,229 | 2,470 | 0 | 0 | 산문 <2500, 코드 우세, 외부 출처 없음, 실전 신호 약함 | 근거·실전성 검토 |
| 56 | `part12-03-try-get-fast.md` | folly::Singleton try_get·try_get_fast — TLS-cached 접근 | 2,741 | 2,532 | 0 | 2 | 외부 출처 없음 | 근거·실전성 검토 |
| 57 | `part13-01-exception-wrapper.md` | folly::ExceptionWrapper — type-erased exception holder | 2,202 | 3,128 | 0 | 6 | 산문 <2500, 코드 우세, 외부 출처 없음 | 근거·실전성 검토 |
| 58 | `part13-02-scope-guard.md` | folly::ScopeGuard·SCOPE_EXIT — RAII cleanup | 2,606 | 2,571 | 0 | 0 | 외부 출처 없음, 실전 신호 약함 | 근거·실전성 검토 |
| 59 | `part13-03-folly-optional.md` | folly::Optional vs std::optional | 2,573 | 1,778 | 0 | 0 | 외부 출처 없음, 실전 신호 약함 | 근거·실전성 검토 |
| 60 | `part13-04-folly-function.md` | folly::Function vs std::function | 2,341 | 2,539 | 0 | 3 | 산문 <2500, 코드 우세, 외부 출처 없음 | 근거·실전성 검토 |
| 61 | `part13-05-lazy.md` | folly::Lazy — 지연 초기화 wrapper | 2,084 | 2,825 | 0 | 2 | 산문 <2500, 코드 우세, 외부 출처 없음 | 근거·실전성 검토 |
| 62 | `part14-01-meta-style-review.md` | folly Meta 스타일 code review 패턴 | 1,487 | 6,245 | 1 | 14 | 산문 <1500, 코드 우세 | 정성 보강 검토 |
| 63 | `part14-02-folly-anti-patterns.md` | folly anti-patterns — 잘못 쓰면 std보다 느림 | 2,875 | 2,624 | 0 | 7 | 외부 출처 없음 | 근거·실전성 검토 |
| 64 | `part14-03-std-vs-folly-choice.md` | folly vs std 선택 기준 분석 | 4,457 | 280 | 0 | 13 | 외부 출처 없음 | 근거·실전성 검토 |
| 65 | `part15-01-coro-overview.md` | folly::coro 개요 — production C++20 코루틴 어댑터 | 3,723 | 2,963 | 2 | 2 | 없음 | 1차 유지 후보 |
| 66 | `part15-02-coro-task.md` | folly::coro::Task — lazy single-shot 코루틴 | 3,082 | 4,088 | 1 | 1 | 코드 우세, 실전 신호 약함 | 근거·실전성 검토 |
| 67 | `part15-03-coro-async-generator.md` | folly::coro::AsyncGenerator — 비동기 스트림 | 2,753 | 3,627 | 1 | 2 | 코드 우세 | 1차 유지 후보 |
| 68 | `part15-04-coro-blocking-wait.md` | folly coro blockingWait·collectAll — 동기 경계와 fan-in | 2,391 | 3,266 | 1 | 3 | 산문 <2500, 코드 우세 | 1차 유지 후보 |
| 69 | `part15-05-coro-baton-mutex.md` | folly::coro::Baton·Mutex — 코루틴-aware 동기화 | 2,622 | 3,138 | 1 | 0 | 코드 우세, 실전 신호 약함 | 근거·실전성 검토 |
| 70 | `part16-01-expected.md` | folly::Expected — 결과 또는 오류 | 2,794 | 2,802 | 1 | 0 | 코드 우세, 실전 신호 약함 | 근거·실전성 검토 |
| 71 | `part16-02-try.md` | folly::Try — Future 결과 wrapper | 2,378 | 3,192 | 1 | 4 | 산문 <2500, 코드 우세 | 1차 유지 후보 |
| 72 | `part16-03-try-vs-expected.md` | folly::Try vs Expected 선택 기준 | 1,791 | 2,672 | 0 | 2 | 산문 <2500, 코드 우세, 외부 출처 없음 | 근거·실전성 검토 |
| 73 | `part17-01-range.md` | folly::Range — 일반 iterator pair | 2,581 | 3,644 | 1 | 0 | 코드 우세, 실전 신호 약함 | 근거·실전성 검토 |
| 74 | `part17-02-uri.md` | folly::Uri — URL 파서 | 2,295 | 3,288 | 8 | 6 | 산문 <2500, 코드 우세 | 1차 유지 후보 |
| 75 | `part17-03-hash-fingerprint.md` | folly Fingerprint64·128 — 분산 hash | 2,371 | 2,636 | 1 | 1 | 산문 <2500, 코드 우세, 실전 신호 약함 | 근거·실전성 검토 |
| 76 | `part17-04-spooky-hash.md` | folly SpookyHashV2 — fast non-crypto hash | 2,229 | 2,878 | 2 | 0 | 산문 <2500, 코드 우세, 실전 신호 약함 | 근거·실전성 검토 |
| 77 | `part18-01-init.md` | folly::Init — main() 부트스트랩 | 2,250 | 2,314 | 1 | 2 | 산문 <2500, 코드 우세 | 1차 유지 후보 |
| 78 | `part18-02-indestructible.md` | folly::Indestructible — global lifetime 패턴 | 2,694 | 2,808 | 1 | 0 | 코드 우세, 실전 신호 약함 | 근거·실전성 검토 |
| 79 | `part18-03-micro-lock.md` | folly::MicroLock — 1-byte 락 | 2,415 | 3,156 | 1 | 1 | 산문 <2500, 코드 우세, 실전 신호 약함 | 근거·실전성 검토 |
| 80 | `part18-04-micro-spin-lock.md` | folly::MicroSpinLock — 가장 좁은 spin lock | 2,928 | 2,189 | 1 | 3 | 없음 | 1차 유지 후보 |
| 81 | `part19-01-format-legacy.md` | folly::format — legacy formatter 분석 | 2,698 | 2,801 | 2 | 0 | 코드 우세, 실전 신호 약함 | 근거·실전성 검토 |
| 82 | `part19-02-demangle.md` | folly::demangle — typeid 디망글링 | 2,315 | 2,964 | 2 | 4 | 산문 <2500, 코드 우세 | 1차 유지 후보 |
| 83 | `part19-03-dynamic-converter.md` | folly::DynamicConverter — dynamic ↔ struct | 2,252 | 4,028 | 1 | 6 | 산문 <2500, 코드 우세 | 1차 유지 후보 |
| 84 | `part20-01-record-io.md` | folly::RecordIO — append-only 로그 파일 포맷 | 2,468 | 4,123 | 1 | 1 | 산문 <2500, 코드 우세, 실전 신호 약함 | 근거·실전성 검토 |
| 85 | `part20-02-compression.md` | folly::io::Compression — zstd·lz4·snappy wrapper | 2,267 | 3,417 | 1 | 3 | 산문 <2500, 코드 우세 | 1차 유지 후보 |
| 86 | `part20-03-async-io.md` | folly::AsyncIO — io_uring·Linux AIO | 2,519 | 3,677 | 2 | 2 | 코드 우세 | 1차 유지 후보 |
| 87 | `part20-04-cancellation-token.md` | folly::CancellationToken — 코루틴·Future 취소 전파 | 2,541 | 4,027 | 2 | 2 | 코드 우세 | 1차 유지 후보 |
| 88 | `part21-01-observer.md` | folly::observer — hot config의 atomic refresh | 2,660 | 3,723 | 1 | 1 | 코드 우세, 실전 신호 약함 | 근거·실전성 검토 |
| 89 | `part21-02-fbcode-patterns.md` | fbcode 패턴 모음 — folly 사용의 실전 | 3,329 | 2,724 | 2 | 2 | 없음 | 1차 유지 후보 |

## 해석상 주의

- 산문·코드 길이는 Google의 공식 컷오프가 아니다.
- 외부 링크가 적다고 독창성이 낮다고 단정하지 않는다.
- “직접”, “실제”, “측정”이라는 단어가 있다고 경험 기반 글로 확정하지 않는다.
- 중복은 제목·키워드가 아니라 핵심 주장·예제·결론을 비교해 판단한다.
- 이 보고서는 공개 글만 대상으로 하며 draft 글은 포함하지 않는다.

