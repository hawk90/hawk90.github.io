#!/usr/bin/env node
// Rename all remaining KEEP series titles in one pass.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');
const DRY = process.argv.includes('--dry-run');

// Each entry: [dir, file, newTitle, newDate]
const ALL = [];

// ---- GDB Extension and IDE (2026-05-27)
const gdbExtDir = 'src/content/blog/tools/debugging/gdb-extension';
[
  ['chapter01-python-api-basics.md',   'GDB Python API 입문 — Value·Type·Frame 객체 활용',                              '01'],
  ['chapter02-commands-events.md',     'GDB 커스텀 명령·Convenience Function·Event 훅·Breakpoint',                       '02'],
  ['chapter03-pretty-printers.md',     'GDB Pretty-Printer 심화 — STL·커스텀 타입 시각화',                                '03'],
  ['chapter04-frame-unwinder.md',      'GDB FrameDecorator·Unwinder — 콜스택 가공과 JIT 지원',                            '04'],
  ['chapter05-mi-dap-protocol.md',     'GDB MI와 DAP 프로토콜 — IDE 통합 인터페이스 분석',                                 '05'],
  ['chapter06-frontends.md',           'GDB 프런트엔드 비교 — TUI·cgdb·dashboard·gef·IDE',                                '06'],
].forEach(([f, t, m]) => ALL.push([gdbExtDir, f, t, `2026-05-27T09:${m}:00`]));

// ---- Valgrind (2026-05-28)
const valDir = 'src/content/blog/tools/debugging/valgrind';
[
  ['chapter01-intro.md',          'Valgrind 도구 개요 — Memcheck·Helgrind·DRD 비교',                                    '01'],
  ['chapter02-memcheck.md',       'Valgrind Memcheck 실전 — 메모리 오류 탐지 워크플로',                                  '02'],
  ['chapter03-leak-report.md',    'Valgrind Leak Report 분석 — definitely·indirectly·possibly·still reachable',          '03'],
  ['chapter04-helgrind-drd.md',   'Valgrind Helgrind와 DRD — 멀티스레드 레이스 진단',                                     '04'],
  ['chapter05-suppressions.md',   'Valgrind Suppression과 실무 운용 — 노이즈 제거와 CI 통합',                              '05'],
].forEach(([f, t, m]) => ALL.push([valDir, f, t, `2026-05-28T09:${m}:00`]));

// ---- Sanitizers (2026-05-29)
const sanDir = 'src/content/blog/tools/debugging/sanitizers';
[
  ['chapter01-intro.md',         'Sanitizer 종류 비교 — ASan·UBSan·LSan·TSan·MSan',                                     '01'],
  ['chapter02-asan-ubsan.md',    'ASan과 UBSan 실전 설정 — 컴파일 옵션과 런타임 동작',                                  '02'],
  ['chapter03-lsan-leaks.md',    'LSan 누수 분석 — Stop-the-world Leak Detection 메커니즘',                              '03'],
  ['chapter04-tsan.md',          'TSan으로 데이터 레이스 디버깅 — Happens-before 추적',                                  '04'],
  ['chapter05-cmake-ci.md',      'Sanitizer를 CMake와 CI에 통합 — Multi-config 빌드 전략',                                 '05'],
].forEach(([f, t, m]) => ALL.push([sanDir, f, t, `2026-05-29T09:${m}:00`]));

// ---- Python Debugging (2026-05-30)
const pyDbgDir = 'src/content/blog/tools/debugging/python';
[
  ['chapter01-pdb-basics.md',                   'pdb 기본 사용법과 breakpoint() 빌트인 — 스크립트 디버깅',                  '01'],
  ['chapter02-debugpy-ide.md',                  'debugpy 활용 — VSCode·PyCharm·원격 attach 통합',                            '02'],
  ['chapter03-asyncio.md',                      'asyncio 디버깅 — 짧은 콜스택과 slow callback 추적',                          '03'],
  ['chapter04-py-spy.md',                       'py-spy 운영 분석 — 코드 수정 없이 프로세스 검사',                            '04'],
  ['chapter05-faulthandler-tracemalloc.md',     'Python faulthandler·tracemalloc·objgraph — 죽음과 누수 진단',                  '05'],
].forEach(([f, t, m]) => ALL.push([pyDbgDir, f, t, `2026-05-30T09:${m}:00`]));

// ---- Memory Diagnostics (2026-05-31)
const memDiagDir = 'src/content/blog/tools/debugging/memory';
[
  ['chapter01-memory-accounting.md',     '리눅스 메모리 회계 — RSS·VSS·PSS·smaps 해석',                                     '01'],
  ['chapter02-heaptrack.md',             'heaptrack 분석 — 가벼운 heap profiler 활용',                                       '02'],
  ['chapter03-jemalloc-tcmalloc.md',     'jemalloc·tcmalloc Profiling — 운영 allocator의 진단 기능',                          '03'],
  ['chapter04-glibc-tools.md',           'glibc 메모리 도구 — mtrace·mcheck·MALLOC_CHECK_',                                  '04'],
  ['chapter05-prod-leak-diagnosis.md',   '운영 메모리 누수 진단 — long-running 프로세스의 진단 전략',                          '05'],
].forEach(([f, t, m]) => ALL.push([memDiagDir, f, t, `2026-05-31T09:${m}:00`]));

// ---- Postmortem Debugging (2026-06-01)
const pmDir = 'src/content/blog/tools/debugging/postmortem';
[
  ['chapter01-core-generation.md',                  'Core Dump 생성 메커니즘 — kernel의 dump path 분석',                       '01'],
  ['chapter02-elf-core-format.md',                  'ELF Core 파일 포맷 분해 — NT_PRSTATUS·NT_PRPSINFO·NT_FILE',               '02'],
  ['chapter03-gdb-core-analysis.md',                'GDB로 Core 분석 — backtrace·info threads·py 활용',                          '03'],
  ['chapter04-debuginfod-minidump-automation.md',   '포스트모템 자동화 — debuginfod·Minidump 파이프라인',                       '04'],
].forEach(([f, t, m]) => ALL.push([pmDir, f, t, `2026-06-01T09:${m}:00`]));

// ---- CMake (2026-06-02)
const cmakeDir = 'src/content/blog/tools/build/cmake';
[
  ['chapter01-intro.md',                'CMake 소개와 첫 프로젝트 — 설치부터 빌드까지',                                       '01'],
  ['chapter02-language.md',             'CMake 언어 분석 — 변수·조건문·함수의 동작',                                          '02'],
  ['chapter03-targets.md',              'CMake 타겟과 라이브러리 — INTERFACE·PUBLIC·PRIVATE 전파',                            '03'],
  ['chapter04-options.md',              'CMake 옵션과 캐시 변수 — option·set·cache type 분석',                                  '04'],
  ['chapter05-find-package.md',         'CMake find_package와 외부 의존성 — Module·Config·FetchContent',                       '05'],
  ['chapter06-testing.md',              'CMake 테스트와 CTest — add_test·테스트 fixture·리포트',                                '06'],
  ['chapter07-install.md',              'CMake 설치와 패키징 — install·EXPORT·CPack',                                          '07'],
  ['chapter08-best-practices.md',       'Modern CMake 베스트 프랙티스 — target_* 중심 설계',                                    '08'],
  ['chapter09-modern-advanced.md',      'Modern CMake 고급 — BUILD/INSTALL_INTERFACE·Presets·cmake -E',                          '09'],
].forEach(([f, t, m]) => ALL.push([cmakeDir, f, t, `2026-06-02T09:${m}:00`]));

// ---- GNU Make (2026-06-03)
const makeDir = 'src/content/blog/tools/build/gnu-make';
[
  ['chapter01-intro.md',          'GNU Make 소개와 첫 Makefile — 설치부터 첫 빌드까지',                                       '01'],
  ['chapter02-rules.md',          'Make 규칙 분석 — 타겟·의존성·레시피의 평가',                                                '02'],
  ['chapter03-variables.md',      'Make 변수와 자동 변수 — $@·$<·$^·재귀 vs 단순 할당',                                         '03'],
  ['chapter04-pattern-rules.md',  'Make 패턴 규칙과 암시적 규칙 — % 매칭 동작',                                                 '04'],
  ['chapter05-functions.md',      'Make 함수 분석 — wildcard·patsubst·foreach·shell',                                            '05'],
  ['chapter06-conditionals.md',   'Make 조건문과 include — ifeq·ifdef·include·-include',                                          '06'],
  ['chapter07-practical.md',      '실전 Makefile 예제 — C/C++ 프로젝트용 기본 골격',                                            '07'],
].forEach(([f, t, m]) => ALL.push([makeDir, f, t, `2026-06-03T09:${m}:00`]));

// ---- Folly Code Review (2026-06-04 ~ 06-08, ~18/day)
const follyDir = 'src/content/blog/programming/code-review/folly';
const folly = [
  // Part 1
  [ 0, '00-preface.md',                            'Folly Code Review — Meta의 production-grade C++ 라이브러리 코드 분석'],
  [ 1, 'part1-01-overview.md',                     'Folly 개요 — Meta가 production에서 검증한 utility 모음 분석'],
  [ 2, 'part1-02-folly-vs-abseil-philosophy.md',   'Folly vs Abseil 철학 비교 — performance-first vs std-compatible'],
  [ 3, 'part1-03-build-fbcode.md',                 'Folly 빌드와 fbcode 환경 — monorepo의 그림자'],
  [ 4, 'part1-04-api-stability.md',                'Folly API stability 정책 — 어떤 보장도 없다는 솔직함'],
  [ 5, 'part1-05-production-validation.md',        'Folly production validation 문화 — peta-scale에서 단련된 코드'],
  // Part 2 - Future
  [ 6, 'part2-01-future-overview.md',              'folly::Future 분석 — std::future의 한계를 넘는 composable async'],
  [ 7, 'part2-02-promise-make-future.md',          'folly::Promise·makeFuture — Future를 만드는 두 길'],
  [ 8, 'part2-03-semi-future-vs-future.md',        'folly::SemiFuture vs Future — executor binding의 명시화'],
  [ 9, 'part2-04-then-value-error.md',             'folly::Future thenValue·thenError·thenTry — continuation 체인 분석'],
  [10, 'part2-05-collect.md',                      'folly::collect·collectAll·collectAny — fan-in 패턴 분석'],
  [11, 'part2-06-retry-window-via.md',             'folly::Future retry·window·via — 제어 흐름 조합자'],
  [12, 'part2-07-fibers.md',                       'folly::fibers 분석 — M:N stackful coroutine'],
  // Part 3 - Executor
  [13, 'part3-01-inline-executor.md',              'folly::InlineExecutor — 호출자 thread에서 즉시 실행'],
  [14, 'part3-02-cpu-thread-pool-executor.md',     'folly::CPUThreadPoolExecutor — CPU-bound 작업의 표준 thread pool'],
  [15, 'part3-03-io-thread-pool-executor.md',      'folly::IOThreadPoolExecutor — libevent 기반 I/O pool'],
  [16, 'part3-04-manual-executor.md',              'folly::ManualExecutor — 결정적 테스트를 위한 수동 진행'],
  [17, 'part3-05-event-base.md',                   'folly::EventBase 분석 — libevent 이벤트 루프의 핵심'],
  // Part 4 - IOBuf
  [18, 'part4-01-iobuf.md',                        'folly::IOBuf 분석 — zero-copy buffer chain의 기본 단위'],
  [19, 'part4-02-iobuf-queue.md',                  'folly::IOBufQueue — chain의 push/pull 추상화'],
  [20, 'part4-03-cursor.md',                       'folly::io::Cursor·RWCursor — chain 위의 stream'],
  [21, 'part4-04-zero-copy-patterns.md',           'folly Zero-copy 패턴 — IOBuf로 ScatterGather I/O 표현'],
  [22, 'part4-05-iobuf-shared-semantics.md',       'folly::IOBuf shared semantics — clone·unshare·takeOwnership'],
  // Part 5 - String
  [23, 'part5-01-fbstring.md',                     'folly::FBString 분석 — SSO + COW 구현'],
  [24, 'part5-02-fmt-format-integration.md',       'folly의 fmt::format 통합 — 모던 포맷팅 채택'],
  [25, 'part5-03-string-piece.md',                 'folly::StringPiece — string_view 호환 분석'],
  [26, 'part5-04-join-split.md',                   'folly Join·Split utilities — 문자열 분해와 결합'],
  // Part 6 - Conv
  [27, 'part6-01-to-try-to.md',                    'folly::to·tryTo — text↔num 변환 분석'],
  [28, 'part6-02-conv-customization.md',           'folly Conv Customization — 사용자 타입 지원'],
  [29, 'part6-03-conv-performance.md',             'folly Conv 성능 비교 — sprintf·stringstream 대비'],
  // Part 7 - F14
  [30, 'part7-01-f14-value-map.md',                'folly::F14ValueMap vs std::unordered_map'],
  [31, 'part7-02-f14-node-map.md',                 'folly::F14NodeMap — stable pointer가 필요할 때'],
  [32, 'part7-03-f14-vector-map.md',               'folly::F14VectorMap — cache-friendly iteration'],
  [33, 'part7-04-f14-fast-map.md',                 'folly::F14FastMap — auto-select 동작'],
  [34, 'part7-05-f14-internals.md',                'folly F14 internals — SIMD probing 메커니즘'],
  // Part 8 - Container
  [35, 'part8-01-small-vector.md',                 'folly::SmallVector — inline storage 분석'],
  [36, 'part8-02-fixed-string.md',                 'folly::FixedString — compile-time string'],
  [37, 'part8-03-atomic-hash-map.md',              'folly::AtomicHashMap — lock-free read 분석'],
  [38, 'part8-04-concurrent-hash-map.md',          'folly::ConcurrentHashMap — sharded 동시 해시 맵'],
  [39, 'part8-05-evicting-cache-map.md',           'folly::EvictingCacheMap — LRU 구현 분석'],
  // Part 9 - Sync
  [40, 'part9-01-synchronized.md',                 'folly::Synchronized — lock wrapper 패턴'],
  [41, 'part9-02-shared-mutex.md',                 'folly::SharedMutex 분석'],
  [42, 'part9-03-baton.md',                        'folly::Baton — one-shot wait 동기화'],
  [43, 'part9-04-rw-spin-lock.md',                 'folly::RWSpinLock 분석'],
  [44, 'part9-05-pico-spin-lock.md',               'folly::PicoSpinLock — 1-byte spinlock'],
  // Part 10 - Queue
  [45, 'part10-01-producer-consumer-queue.md',     'folly::ProducerConsumerQueue — SPSC 큐 분석'],
  [46, 'part10-02-mpmc-queue.md',                  'folly::MPMCQueue — multi-producer multi-consumer'],
  [47, 'part10-03-unbounded-queue.md',             'folly::UnboundedQueue — 동적 크기 lock-free'],
  [48, 'part10-04-fibers-channel.md',              'folly::fibers::Channel — Go-like channel'],
  // Part 11 - Dynamic
  [49, 'part11-01-dynamic.md',                     'folly::dynamic — JSON-like dynamic type 분석'],
  [50, 'part11-02-json-conversion.md',             'folly JSON conversion — toJson·parseJson'],
  [51, 'part11-03-dynamic-struct.md',              'folly dynamic ↔ struct — manual marshaling'],
  [52, 'part11-04-dynamic-visitor.md',             'folly dynamic Visitor pattern — type별 분기'],
  // Part 12 - Singleton
  [53, 'part12-01-singleton-vs-meyers.md',         'folly::Singleton vs Meyers/static — 왜 Folly의 Singleton인가'],
  [54, 'part12-02-singleton-vault.md',             'folly::SingletonVault 분석 — 등록·소멸·의존성'],
  [55, 'part12-03-try-get-fast.md',                'folly::Singleton try_get·try_get_fast — TLS-cached 접근'],
  // Part 13 - Optional / Function
  [56, 'part13-01-exception-wrapper.md',           'folly::ExceptionWrapper — type-erased exception holder'],
  [57, 'part13-02-scope-guard.md',                 'folly::ScopeGuard·SCOPE_EXIT — RAII cleanup'],
  [58, 'part13-03-folly-optional.md',              'folly::Optional vs std::optional'],
  [59, 'part13-04-folly-function.md',              'folly::Function vs std::function'],
  [60, 'part13-05-lazy.md',                        'folly::Lazy — 지연 초기화 wrapper'],
  // Part 14 - Style
  [61, 'part14-01-meta-style-review.md',           'folly Meta 스타일 code review 패턴'],
  [62, 'part14-02-folly-anti-patterns.md',         'folly anti-patterns — 잘못 쓰면 std보다 느림'],
  [63, 'part14-03-std-vs-folly-choice.md',         'folly vs std 선택 기준 분석'],
  // Part 15 - Coro
  [64, 'part15-01-coro-overview.md',               'folly::coro 개요 — production C++20 코루틴 어댑터'],
  [65, 'part15-02-coro-task.md',                   'folly::coro::Task — lazy single-shot 코루틴'],
  [66, 'part15-03-coro-async-generator.md',        'folly::coro::AsyncGenerator — 비동기 스트림'],
  [67, 'part15-04-coro-blocking-wait.md',          'folly coro blockingWait·collectAll — 동기 경계와 fan-in'],
  [68, 'part15-05-coro-baton-mutex.md',            'folly::coro::Baton·Mutex — 코루틴-aware 동기화'],
  // Part 16 - Expected / Try
  [69, 'part16-01-expected.md',                    'folly::Expected — 결과 또는 오류'],
  [70, 'part16-02-try.md',                         'folly::Try — Future 결과 wrapper'],
  [71, 'part16-03-try-vs-expected.md',             'folly::Try vs Expected 선택 기준'],
  // Part 17 - Util
  [72, 'part17-01-range.md',                       'folly::Range — 일반 iterator pair'],
  [73, 'part17-02-uri.md',                         'folly::Uri — URL 파서'],
  [74, 'part17-03-hash-fingerprint.md',            'folly Fingerprint64·128 — 분산 hash'],
  [75, 'part17-04-spooky-hash.md',                 'folly SpookyHashV2 — fast non-crypto hash'],
  // Part 18 - Init / Lock
  [76, 'part18-01-init.md',                        'folly::Init — main() 부트스트랩'],
  [77, 'part18-02-indestructible.md',              'folly::Indestructible — global lifetime 패턴'],
  [78, 'part18-03-micro-lock.md',                  'folly::MicroLock — 1-byte 락'],
  [79, 'part18-04-micro-spin-lock.md',             'folly::MicroSpinLock — 가장 좁은 spin lock'],
  // Part 19 - Format
  [80, 'part19-01-format-legacy.md',               'folly::format — legacy formatter 분석'],
  [81, 'part19-02-demangle.md',                    'folly::demangle — typeid 디망글링'],
  [82, 'part19-03-dynamic-converter.md',           'folly::DynamicConverter — dynamic ↔ struct'],
  // Part 20 - IO
  [83, 'part20-01-record-io.md',                   'folly::RecordIO — append-only 로그 파일 포맷'],
  [84, 'part20-02-compression.md',                 'folly::io::Compression — zstd·lz4·snappy wrapper'],
  [85, 'part20-03-async-io.md',                    'folly::AsyncIO — io_uring·Linux AIO'],
  [86, 'part20-04-cancellation-token.md',          'folly::CancellationToken — 코루틴·Future 취소 전파'],
  // Part 21 - Misc
  [87, 'part21-01-observer.md',                    'folly::observer — hot config의 atomic refresh'],
  [88, 'part21-02-fbcode-patterns.md',             'fbcode 패턴 모음 — folly 사용의 실전'],
];
// Folly date: spread across 5 days (06-04..06-08), ~18 per day
folly.forEach(([order, file, title]) => {
  const dayIdx = Math.floor(order / 18); // 0..4
  const minute = order % 18;
  const day = `2026-06-0${4 + dayIdx}`;
  ALL.push([follyDir, file, title, `${day}T09:${minute.toString().padStart(2, '0')}:00`]);
});

// ---- Abseil Code Review (2026-06-09 ~ 06-13, ~16/day)
const abslDir = 'src/content/blog/programming/code-review/abseil';
const abseil = [
  [ 0, '00-preface.md',                            'Abseil Code Review — Google production-grade C++ 라이브러리 분석'],
  // Part 1
  [ 1, 'part1-01-overview.md',                     'Abseil 개요 — Google이 std를 보완한 이유'],
  [ 2, 'part1-02-design-philosophy.md',            'Abseil 설계 철학 — std 호환과 추가 기능의 균형'],
  [ 3, 'part1-03-build-dependency-bazel.md',       'Abseil 빌드와 의존성 — Bazel vs CMake'],
  [ 4, 'part1-04-lts-vs-head-release.md',          'Abseil LTS vs HEAD 릴리스 모델 분석'],
  [ 5, 'part1-05-versioning-abi.md',               'Abseil Versioning과 ABI 호환성 정책'],
  // Part 2 - Base
  [ 6, 'part2-01-abseil-macros.md',                'Abseil 매크로 — ABSL_HAVE_*·ABSL_ATTRIBUTE_*',
],
  [ 7, 'part2-02-predict-branch-hint.md',          'Abseil ABSL_PREDICT_TRUE/FALSE — branch hint'],
  [ 8, 'part2-03-log-severity.md',                 'absl::LogSeverity — 로그 레벨 타입'],
  [ 9, 'part2-04-type-traits.md',                  'Abseil type_traits — negation·conjunction·void_t'],
  [10, 'part2-05-conformance-policy.md',           'Abseil Conformance·Policy 분석'],
  [11, 'part2-06-memory-utilities.md',             'Abseil Memory utilities 분석'],
  [12, 'part2-07-raw-logging.md',                  'Abseil raw_logging — heap-free 로깅'],
  [13, 'part2-08-thread-annotations.md',           'Abseil thread_annotations — clang TSA 통합'],
  // Part 3 - Status
  [14, 'part3-01-status.md',                       'absl::Status — exception-free error handling'],
  [15, 'part3-02-status-or.md',                    'absl::StatusOr<T> — 값 또는 에러'],
  [16, 'part3-03-status-macros.md',                'absl status_macros — ASSIGN_OR_RETURN·RETURN_IF_ERROR'],
  [17, 'part3-04-status-payload.md',               'absl::Status payload — 구조화된 에러 컨텍스트'],
  [18, 'part3-05-status-exception-conversion.md',  'absl::Status ↔ exception 변환 패턴'],
  // Part 4 - String
  [19, 'part4-01-string-view.md',                  'absl::string_view — non-owning 문자열 참조'],
  [20, 'part4-02-string-view-pitfalls.md',         'absl::string_view 함정 — dangling·c_str·임시 객체'],
  [21, 'part4-03-str-cat.md',                      'absl::StrCat — 가변 인자 문자열 연결과 AlphaNum'],
  [22, 'part4-04-str-split.md',                    'absl::StrSplit — Delimiter·Predicate·컨테이너 변환'],
  [23, 'part4-05-str-join.md',                     'absl::StrJoin — 컨테이너 결합과 Formatter'],
  [24, 'part4-06-str-format.md',                   'absl::StrFormat — type-safe printf·FormatSpec'],
  [25, 'part4-07-ascii-functions.md',              'Abseil ASCII 함수 — locale-free 분류·대소문자 변환'],
  [26, 'part4-08-escaping-base64.md',              'Abseil Escape — CEscape·HexEscape·Base64'],
  // Part 5 - Container
  [27, 'part5-01-flat-hash-map.md',                'absl::flat_hash_map — Swiss Table 기반 hash map'],
  [28, 'part5-02-flat-hash-set.md',                'absl::flat_hash_set — set 버전 Swiss Table'],
  [29, 'part5-03-node-hash-map.md',                'absl::node_hash_map — stable pointer가 필요할 때'],
  [30, 'part5-04-btree-map.md',                    'absl::btree_map — sorted·cache-friendly B-tree'],
  [31, 'part5-05-fixed-array.md',                  'absl::FixedArray — 런타임 크기 stack 배열'],
  [32, 'part5-06-inlined-vector.md',               'absl::InlinedVector — small buffer optimization'],
  [33, 'part5-07-swiss-table-internals.md',        'Abseil Swiss Table internals — control byte·SIMD probing'],
  // Part 6 - Sync
  [34, 'part6-01-mutex.md',                        'absl::Mutex — reader-writer·fairness·deadlock 검출'],
  [35, 'part6-02-conditional-critical-section.md', 'absl::Mutex Conditional Critical Section — Await로 cv 없애기'],
  [36, 'part6-03-notification.md',                 'absl::Notification — once-only signal'],
  [37, 'part6-04-blocking-counter-barrier.md',     'absl::BlockingCounter·Barrier — 다중 thread 조율'],
  [38, 'part6-05-mutex-annotations.md',            'absl::Mutex annotations — clang thread-safety로 race를 컴파일 타임에'],
  // Part 7 - Time
  [39, 'part7-01-time-duration-overview.md',       'absl::Time·Duration 분석 — 단단한 type'],
  [40, 'part7-02-format-parse.md',                 'absl::Time Format·Parse'],
  [41, 'part7-03-civil-time.md',                   'absl::CivilTime 분석'],
  [42, 'part7-04-time-zone.md',                    'absl::time_zone 분석'],
  [43, 'part7-05-time-mocking.md',                 'absl::Time mocking — 테스트 친화 시간'],
  // Part 8 - Random
  [44, 'part8-01-bit-gen.md',                      'absl::BitGen — 모던 난수 생성기'],
  [45, 'part8-02-distributions.md',                'Abseil Random Distributions — Uniform·Exponential'],
  [46, 'part8-03-mocking-random.md',               'Abseil Mocking Random — 테스트 결정성'],
  [47, 'part8-04-seeding-entropy.md',              'Abseil Random Seeding·Entropy'],
  // Part 9 - Numeric / Type
  [48, 'part9-01-int128.md',                       'absl::int128·uint128 분석'],
  [49, 'part9-02-bits.md',                         'absl::bits — popcount·countl_zero'],
  [50, 'part9-03-optional.md',                     'absl::optional vs std::optional'],
  [51, 'part9-04-variant.md',                      'absl::variant 분석'],
  [52, 'part9-05-span.md',                         'absl::span 분석'],
  [53, 'part9-06-any.md',                          'absl::any 분석'],
  [54, 'part9-07-compare.md',                      'absl::compare — three-way 비교'],
  [55, 'part9-08-utility.md',                      'Abseil utility — apply·in_place'],
  // Part 10 - Hash
  [56, 'part10-01-abseil-hash-value.md',           'Abseil AbslHashValue 분석'],
  [57, 'part10-02-hash-state-chaining.md',         'Abseil HashState chaining'],
  [58, 'part10-03-custom-hashable.md',             'Abseil Custom hashable 구현'],
  // Part 11 - Log
  [59, 'part11-01-log-vlog-check.md',              'Abseil LOG·VLOG·CHECK 분석'],
  [60, 'part11-02-log-sink.md',                    'Abseil LogSink 분석'],
  [61, 'part11-03-log-entry-structured.md',        'Abseil LogEntry·structured logging'],
  [62, 'part11-04-stack-trace-handler.md',         'Abseil Stack trace·failure_signal_handler'],
  // Part 12 - Flag
  [63, 'part12-01-absl-flag-define.md',            'ABSL_FLAG 정의 분석'],
  [64, 'part12-02-parse-command-line.md',          'Abseil ParseCommandLine 동작'],
  [65, 'part12-03-flag-introspection.md',          'Abseil Flag introspection·validation'],
  // Part 13 - Style
  [66, 'part13-01-google-style-patterns.md',       'Google 스타일의 Abseil 사용 패턴'],
  [67, 'part13-02-anti-patterns.md',               'Abseil 자주 보는 anti-pattern'],
  [68, 'part13-03-std-to-absl-migration.md',       'std → absl 마이그레이션 전략'],
  // Part 14 - Functional
  [69, 'part14-01-cleanup.md',                     'absl::Cleanup — 함수 종료 시 실행 보장'],
  [70, 'part14-02-algorithm-container-ext.md',     'Abseil algorithm container 확장 — c_sort·c_find_if·c_count_if'],
  [71, 'part14-03-function-ref-any-invocable.md',  'absl::function_ref와 any_invocable — 함수 객체 전달의 두 축'],
  [72, 'part14-04-bind-front-overload.md',         'absl::bind_front와 Overload — 함수 객체 보조 도구'],
  // Part 15 - Strings
  [73, 'part15-01-cord.md',                        'absl::Cord — 분산 시스템용 대용량 문자열'],
  [74, 'part15-02-charconv.md',                    'absl::from_chars·SimpleAtoi — 빠른 숫자 변환'],
  [75, 'part15-03-cord-vs-string.md',              'absl::Cord vs std::string — 선택 기준과 메모리 프로파일'],
  // Part 16 - Profiling
  [76, 'part16-01-stacktrace-symbolize.md',        'absl::GetStackTrace와 Symbolize — crash 시 readable stack'],
  [77, 'part16-02-crc32c.md',                      'absl::ComputeCrc32c — 하드웨어 가속 체크섬'],
  [78, 'part16-03-periodic-sampler.md',            'absl::PeriodicSampler — 적응형 샘플링·jitter 회피'],
];
// Abseil date: spread across 5 days (06-09..06-13), ~16 per day
abseil.forEach(([order, file, title]) => {
  const dayIdx = Math.floor(order / 16);
  const minute = order % 16;
  const day = `2026-06-${(9 + dayIdx).toString().padStart(2, '0')}`;
  ALL.push([abslDir, file, title, `${day}T09:${minute.toString().padStart(2, '0')}:00`]);
});

function applyEdit(filePath, newTitle, newDate) {
  const raw = readFileSync(filePath, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`no frontmatter: ${filePath}`);
  const [, fm, body] = m;
  let newFm = fm.replace(/^title:\s*.*$/m, `title: "${newTitle}"`).replace(/^date:\s*.*$/m, `date: ${newDate}`);
  const out = `---\n${newFm}\n---\n${body}`;
  if (!DRY) writeFileSync(filePath, out);
}

let count = 0;
const errors = [];
for (const [dir, file, title, date] of ALL) {
  const path = join(REPO, dir, file);
  try {
    applyEdit(path, title, date);
    count++;
  } catch (e) {
    errors.push(`${file}: ${e.message}`);
  }
}
console.log(`${DRY ? 'DRY RUN' : 'APPLIED'}: ${count} / ${ALL.length} files`);
if (errors.length) {
  console.log('\nErrors:');
  errors.forEach(e => console.log('  ' + e));
  process.exit(1);
}
