# Embedded C++ Part 3 수정 기록 — 2026-10-22

10편 전문과 published-loop-14·15의 장별 근거를 읽고 수정했습니다. 점수·판정·factcheck 원본을 변경하지 않았습니다. 성능 수치나 인증·실기기 성공을 만들어 내지 않았습니다.

검증기: `node scripts/verify-embedded-cpp-part3-examples.mjs NN` (01~10). Clang 23.1.3·libc++ headers 230103·macOS arm64, 장별 명명 코드 직접 추출·assertions·ASan·UBSan. gate·inlineMath 장별 10/10 통과. 전체 사이트 빌드는 parent가 통합 수행합니다. 원시 로그는 이 디렉터리의 embedded-cpp-part3-NN-{examples,gate,math}.log입니다.

## embedded-cpp-part3-01

- **context**: 발행된 Embedded C++ Part3 메모리/오류/소유권 학습 글; 기존 published-loop-14/15 근거에 따라 본문 수정.
- **problem_signal**: array를 유일한 stack-only 컨테이너로 단정, 규정 일괄 금지, pmr 기본 upstream·ObjectPool 직접 호환, 미출처 크기표.
- **refutation_condition**: 객체 내부 저장과 저장 기간은 별개이며 PMR의 upstream을 null로 지정하지 않으면 heap을 사용할 수 있다.
- **hypothesis_and_alternatives**: 정적 저장 기간·유한 용량·실패 정책을 분리하고 placement new/optional 수명 예제로 확인한다.
- **evidence**: fixed-storage.cpp: placement 생성·명시 소멸·optional emplace/reset 후 live count 1→0.
- **sample_scope**: 2026-10-22 macOS arm64; Homebrew Clang 23.1.3, libc++ headers 230103; 장별 명명 블록 직접 추출; assertions·ASan·UBSan.
- **decision**: 수정. 공개 글·URL·날짜·순서·점수·기존 평가 판정은 보존. 재채점은 수행하지 않음.
- **smallest_safe_change**: 해당 장의 잘못된 설명/부분 예제·미출처 측정 수치를 정정하고 독립 실행 파일·근거 링크 추가. 장 단위 원복 가능.
- **validation**: 예제 및 의도한 거부 진단, article publish gate/inlineMath exit 0. 사이트 build는 parent 통합 단계.
- **remaining_risk**: ETL 실행·GNU ld wrap·시스템 전체 무할당·MCU 코드 크기 미검증.
- before SHA256: `dbdfdae1a4c985d973e3920d1549e0f948cb43563d41b5035727a11325cd56d8`
- after SHA256: `d1bd38c07455df0a73b877d43e3b50b2b5733967f4042d2979dbc8570dfac52c`
- 1차 근거: [array](https://eel.is/c++draft/array), [func.wrap.func.con](https://eel.is/c++draft/func.wrap.func.con)

## embedded-cpp-part3-02

- **context**: 발행된 Embedded C++ Part3 메모리/오류/소유권 학습 글; 기존 published-loop-14/15 근거에 따라 본문 수정.
- **problem_signal**: allocator_traits를 C++20 concept으로 설명, n==1 pool을 vector/string에 그대로 적용, null 반환·reset 수명·rebind 혼동.
- **refutation_condition**: C++11 traits의 연속 n개 allocation/rebind/overflow 경로가 실제 컴파일·실행되면 표준 도입 시점과 계약을 구분할 수 있다.
- **hypothesis_and_alternatives**: 완전한 CheckedAllocator를 C++11 기준선으로 제공하고 단일 슬롯 pool·TaskArena는 제한된 스케치로 명시한다.
- **evidence**: allocator.cpp C++11: reserve(4), 원소 4개, long으로 rebind_alloc, SIZE_MAX overflow→bad_alloc.
- **sample_scope**: 2026-10-22 macOS arm64; Homebrew Clang 23.1.3, libc++ headers 230103; 장별 명명 블록 직접 추출; assertions·ASan·UBSan.
- **decision**: 수정. 공개 글·URL·날짜·순서·점수·기존 평가 판정은 보존. 재채점은 수행하지 않음.
- **smallest_safe_change**: 해당 장의 잘못된 설명/부분 예제·미출처 측정 수치를 정정하고 독립 실행 파일·근거 링크 추가. 장 단위 원복 가능.
- **validation**: 예제 및 의도한 거부 진단, article publish gate/inlineMath exit 0. 사이트 build는 parent 통합 단계.
- **remaining_risk**: n==1 pool 전체 STL 적합성, task-local 저장소, allocator propagation·보드 성능 미검증.
- before SHA256: `e83d1ef5877a9d9a01714f4c3892cfc1d5f161fa1c4d489961ceb5ce97e61c76`
- after SHA256: `725846f0e48a9a29d4c7c8bb30c0085bf7cdd5292f24f2a13596b121b2c51a7a`
- 1차 근거: [n3337.pdf](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2012/n3337.pdf), [allocator.requirements](https://eel.is/c++draft/allocator.requirements)

## embedded-cpp-part3-03

- **context**: 발행된 Embedded C++ Part3 메모리/오류/소유권 학습 글; 기존 published-loop-14/15 근거에 따라 본문 수정.
- **problem_signal**: MultiPool N을 바이트 크기로 오해, 무초기화 mutex/CAS pool, noexcept 생성자 제약 부재, 임의 cycle·마진·단편화 단정.
- **refutation_condition**: N은 슬롯 개수이며 블록 payload는 T 크기로 정해진다. O(1) free-list가 WCET·동시성 안전성을 보장하지 않는다.
- **hypothesis_and_alternatives**: nothrow 생성·소멸·N>0·단일 task 제한을 명시한 union free-list와 유효 포인터 계약을 사용한다.
- **evidence**: object-pool.hpp/pool-check.cpp: empty/full, N=2 고갈, 주소 재사용, alignas(64), 생존/소멸 횟수. N=0·throwing 생성자는 컴파일 거부.
- **sample_scope**: 2026-10-22 macOS arm64; Homebrew Clang 23.1.3, libc++ headers 230103; 장별 명명 블록 직접 추출; assertions·ASan·UBSan.
- **decision**: 수정. 공개 글·URL·날짜·순서·점수·기존 평가 판정은 보존. 재채점은 수행하지 않음.
- **smallest_safe_change**: 해당 장의 잘못된 설명/부분 예제·미출처 측정 수치를 정정하고 독립 실행 파일·근거 링크 추가. 장 단위 원복 가능.
- **validation**: 예제 및 의도한 거부 진단, article publish gate/inlineMath exit 0. 사이트 build는 parent 통합 단계.
- **remaining_risk**: double-free·외부 포인터 검출 없음. pool 소멸 전 활성 T를 모두 destroy해야 한다. RTOS/ISR/lock-free/heap-pool/멀티풀 실행 미검증.
- before SHA256: `4ee063ca3a80127857f2a647f7fb74054aea9181497ad39a2910d0730c14fe07`
- after SHA256: `bf88c0ff3f557759f98c82cb031ea1e68ec7941d8cdbba6129103933ccbd4c52`
- 1차 근거: [basic.life](https://eel.is/c++draft/basic.life), [class.union](https://eel.is/c++draft/class.union)

## embedded-cpp-part3-04

- **context**: 발행된 Embedded C++ Part3 메모리/오류/소유권 학습 글; 기존 published-loop-14/15 근거에 따라 본문 수정.
- **problem_signal**: do_is_equal 기본 dynamic_cast 오해, 타입 확인 전 unsafe downcast, 버퍼 고갈 시 default upstream·release 수명·고정 비용표.
- **refutation_condition**: identity 비교는 arbitrary memory_resource에 downcast할 필요가 없다. null upstream 고갈·release 후 재할당을 구분한다.
- **hypothesis_and_alternatives**: IdentityResource를 final로 구현하고 모든 컨테이너 소멸 후 release한다. 기본 RTTI 고갈 실험과 no-RTTI identity 실험을 분리한다.
- **evidence**: pmr-check.cpp: 자기동등/다른 인스턴스·new_delete_resource 비동등, vector 정상 사용, 4096바이트 고갈 bad_alloc, release 후 16바이트 재할당. -fno-rtti -DIDENTITY_ONLY에서도 정상 경로 통과.
- **sample_scope**: 2026-10-22 macOS arm64; Homebrew Clang 23.1.3, libc++ headers 230103; 장별 명명 블록 직접 추출; assertions·ASan·UBSan.
- **decision**: 수정. 공개 글·URL·날짜·순서·점수·기존 평가 판정은 보존. 재채점은 수행하지 않음.
- **smallest_safe_change**: 해당 장의 잘못된 설명/부분 예제·미출처 측정 수치를 정정하고 독립 실행 파일·근거 링크 추가. 장 단위 원복 가능.
- **validation**: 예제 및 의도한 거부 진단, article publish gate/inlineMath exit 0. 사이트 build는 parent 통합 단계.
- **remaining_risk**: 이 Clang/libc++ host에서 -fno-rtti typed bad_alloc catch가 처리되지 않는 현상을 실제 관찰하여 분리했다. 이를 표준 일반 결론으로 확장하지 않음. no-exception 고갈·RTOS·MCU 성능 미검증.
- before SHA256: `6a5c9bba14ae404c756be3a79b2c443b21603c8986348fa292b8b92b3f1399b8`
- after SHA256: `cc8cc3d8374a39247867732ab5e646e2ffbf28219e8f15e9d514e2b9d4c585e4`
- 1차 근거: [mem.res](https://eel.is/c++draft/mem.res)

## embedded-cpp-part3-05

- **context**: 발행된 Embedded C++ Part3 메모리/오류/소유권 학습 글; 기존 published-loop-14/15 근거에 따라 본문 수정.
- **problem_signal**: 예외·인증 일괄 단정, 미출처 KB/μs·차이 7KB 산술, tl 최소 C++17 오해, 라이브러리 오류와 UB 혼동.
- **refutation_condition**: 직접 throw 컴파일 불가와 라이브러리 실패 경로를 구분하고 정상 return에서 RAII가 실행되는지 확인한다.
- **hypothesis_and_alternatives**: from_chars+expected로 빈 입력·부분 소비·범위 초과를 명시하고 함수에 nodiscard를 직접 적용한다.
- **evidence**: no-exception.cpp C++23 -fno-exceptions: 42 성공, 빈 입력/bad/12x Invalid, 큰 정수 Range, Guard 소멸 1회. -DIGNORE_RESULT는 진단으로 빌드 실패.
- **sample_scope**: 2026-10-22 macOS arm64; Homebrew Clang 23.1.3, libc++ headers 230103; 장별 명명 블록 직접 추출; assertions·ASan·UBSan.
- **decision**: 수정. 공개 글·URL·날짜·순서·점수·기존 평가 판정은 보존. 재채점은 수행하지 않음.
- **smallest_safe_change**: 해당 장의 잘못된 설명/부분 예제·미출처 측정 수치를 정정하고 독립 실행 파일·근거 링크 추가. 장 단위 원복 가능.
- **validation**: 예제 및 의도한 거부 진단, article publish gate/inlineMath exit 0. 사이트 build는 parent 통합 단계.
- **remaining_risk**: tl 실행, STM32 예외 비용, 인증 적합성, abort/reset 시 cleanup 미검증.
- before SHA256: `4bbbc05b99add24cfecea3a485bc1c8a1a48ca6d9972cd5606702a290d9ec700`
- after SHA256: `680afddf9cc95facab736c3d12ab59dec8604a00e1617136af09436203cebbc5`
- 1차 근거: [expected](https://eel.is/c++draft/expected), [charconv.from.chars](https://eel.is/c++draft/charconv.from.chars), [expected](https://github.com/TartanLlama/expected)

## embedded-cpp-part3-06

- **context**: 발행된 Embedded C++ Part3 메모리/오류/소유권 학습 글; 기존 published-loop-14/15 근거에 따라 본문 수정.
- **problem_signal**: 공유 Error::InternalError 누락, Result<float>에 ErrorContext 반환, 결정 3/4개 불일치, errno/RAII 제목 약속, CRC·종단·.noinit 보존 단정.
- **refutation_condition**: 결과의 에러 타입을 맥락형으로 선언하고 복구 분기·retry 예산을 관찰해야 한다. .noinit만으로 비휘발성이 되지 않는다.
- **hypothesis_and_alternatives**: 함수·장 제목/description을 실제 시스템 전파·복구 내용으로 정정하고 명시적 직렬화·CRC 제외·보존 조건을 설명한다.
- **evidence**: recovery.cpp -fno-exceptions: Timeout 두 번 후 3회 성공, 0회 무호출, InternalError 즉시 반환·원인 보존.
- **sample_scope**: 2026-10-22 macOS arm64; Homebrew Clang 23.1.3, libc++ headers 230103; 장별 명명 블록 직접 추출; assertions·ASan·UBSan.
- **decision**: 수정. 공개 글·URL·날짜·순서·점수·기존 평가 판정은 보존. 재채점은 수행하지 않음.
- **smallest_safe_change**: 해당 장의 잘못된 설명/부분 예제·미출처 측정 수치를 정정하고 독립 실행 파일·근거 링크 추가. 장 단위 원복 가능. 제목·description은 실제 본문 약속으로 장 단위 수동 정정.
- **validation**: 예제 및 의도한 거부 진단, article publish gate/inlineMath exit 0. 사이트 build는 parent 통합 단계.
- **remaining_risk**: FreeRTOS, retry 실제 지연·deadline, CMSIS reset·PC 저장·전원 차단·CRC 실제 구현·인증 적합성 미검증.
- before SHA256: `550a0ba0ec84c6c9ecdc3565d5b50c037e81b7df3651ba0f4030bb73b8d53827`
- after SHA256: `c3da267ce17231484f8f9876429d860236bb75fdc827438dc2597717599ff37d`
- 1차 근거: [expected](https://eel.is/c++draft/expected)

## embedded-cpp-part3-07

- **context**: 발행된 Embedded C++ Part3 메모리/오류/소유권 학습 글; 기존 published-loop-14/15 근거에 따라 본문 수정.
- **problem_signal**: 존재하지 않는 enum Error::SomeError, std/tl unexpected 혼용, Result 두 번째 인자 누락, toolchain 판 단정·기본 nodiscard·비용표.
- **refutation_condition**: 기능 매크로와 std-only 예제를 사용하고 성공·실패 시 콜백 횟수로 monadic 동작을 확인한다.
- **hypothesis_and_alternatives**: Error/Result 스케치 전제를 맞추고 and_then 성공 콜백과 or_else 실패 복구를 구분하며 compile-time nodiscard를 함수에 적용한다.
- **evidence**: expected-check.cpp -fno-exceptions: 10/2=5, INT_MIN/-1 Overflow, 0 나눗셈 실패에서 step=0, 정상 체인=10·step=1, transform_error=7, void 성공. IGNORE_RESULT 컴파일 거부.
- **sample_scope**: 2026-10-22 macOS arm64; Homebrew Clang 23.1.3, libc++ headers 230103; 장별 명명 블록 직접 추출; assertions·ASan·UBSan.
- **decision**: 수정. 공개 글·URL·날짜·순서·점수·기존 평가 판정은 보존. 재채점은 수행하지 않음.
- **smallest_safe_change**: 해당 장의 잘못된 설명/부분 예제·미출처 측정 수치를 정정하고 독립 실행 파일·근거 링크 추가. 장 단위 원복 가능.
- **validation**: 예제 및 의도한 거부 진단, article publish gate/inlineMath exit 0. 사이트 build는 parent 통합 단계.
- **remaining_risk**: 기타 vendor library 지원 버전, tl 실행, move-only combine, Cortex-M4 명령·호출 비용 미검증.
- before SHA256: `a27131bb19e43d41a6466cea2edd6477d8120f2768d3212c51cb3abdf68d7a85`
- after SHA256: `9ae4d8879deaf3f78bfa7e946784c4d1d62ba55a9449913bea1fa3f00e41cd01`
- 1차 근거: [expected](https://eel.is/c++draft/expected), [expected](https://github.com/TartanLlama/expected)

## embedded-cpp-part3-08

- **context**: 발행된 Embedded C++ Part3 메모리/오류/소유권 학습 글; 기존 published-loop-14/15 근거에 따라 본문 수정.
- **problem_signal**: no-RTTI에서 any 전면 사용 불가, RTTI/예외 세트 단정, TypeOf 선언 순서, variant 간접호출 0·미출처 크기 비교.
- **refutation_condition**: libc++ any_cast의 타입 일치/불일치와 function 호출은 -fno-rtti에서 성공하고 실제 downcast/typeid는 거부되는지 구분한다.
- **hypothesis_and_alternatives**: 도메인 tag·closed variant·CRTP 선택을 유지하고 구현별 type_info 관찰과 heap 사용을 별도 한계로 명시한다.
- **evidence**: no-rtti.cpp -fno-rtti: any_cast int 42, float nullptr, function 42, variant 방문 7. REQUIRE_RTTI 컴파일 거부.
- **sample_scope**: 2026-10-22 macOS arm64; Homebrew Clang 23.1.3, libc++ headers 230103; 장별 명명 블록 직접 추출; assertions·ASan·UBSan.
- **decision**: 수정. 공개 글·URL·날짜·순서·점수·기존 평가 판정은 보존. 재채점은 수행하지 않음.
- **smallest_safe_change**: 해당 장의 잘못된 설명/부분 예제·미출처 측정 수치를 정정하고 독립 실행 파일·근거 링크 추가. 장 단위 원복 가능.
- **validation**: 예제 및 의도한 거부 진단, article publish gate/inlineMath exit 0. 사이트 build는 parent 통합 단계.
- **remaining_risk**: libstdc++·MSVC STL 실행, cross-DSO type tag, std::visit 인라이닝·코드 크기·보드 성능 미검증.
- before SHA256: `97c1051ed7e920031ead6dcc8fbfbf0e37bbaa22a845314341eb3eb1c8959462`
- after SHA256: `046df7ea46a8721220f023f22fc713803d7403b9af02a0b2901e82394d8ea370`
- 1차 근거: [any](https://github.com/llvm/llvm-project/blob/main/libcxx/include/any), [C_002b_002b-Dialect-Options.html](https://gcc.gnu.org/onlinedocs/gcc/C_002b_002b-Dialect-Options.html)

## embedded-cpp-part3-09

- **context**: 발행된 Embedded C++ Part3 메모리/오류/소유권 학습 글; 기존 published-loop-14/15 근거에 따라 본문 수정.
- **problem_signal**: unique/shared 고정 바이트 단정, 120/15를 10배로 기재, 불완전 intrusive refcount 초기 1+retain 누수, shared 데이터 thread-safety 혼동.
- **refutation_condition**: ABI별 객체 크기와 소유 계약은 별개이다. unique 이동·한 번 해제·weak lock 수명 연장을 관찰한다.
- **hypothesis_and_alternatives**: 미출처 성능표를 소유권 예제로 대체하고 intrusive 구현의 adopt/retain·copy/move·해제 정책을 명시한다.
- **evidence**: smart-pointers.cpp: unique 이동 후 원본 null, custom deleter 1회, strong reset 뒤 pin이 수명 유지·마지막 pin 소멸 후 weak 만료. COPY_OWNER 빌드 거부.
- **sample_scope**: 2026-10-22 macOS arm64; Homebrew Clang 23.1.3, libc++ headers 230103; 장별 명명 블록 직접 추출; assertions·ASan·UBSan.
- **decision**: 수정. 공개 글·URL·날짜·순서·점수·기존 평가 판정은 보존. 재채점은 수행하지 않음.
- **smallest_safe_change**: 해당 장의 잘못된 설명/부분 예제·미출처 측정 수치를 정정하고 독립 실행 파일·근거 링크 추가. 장 단위 원복 가능.
- **validation**: 예제 및 의도한 거부 진단, article publish gate/inlineMath exit 0. 사이트 build는 parent 통합 단계.
- **remaining_risk**: 실제 pool deleter, intrusive 구현, 동시성·ISR, pointer byte 크기·cycle 미측정.
- before SHA256: `db3eea33eeeac997bde0421570dcd7a3497a182f72368100e8dfaa124676b5cb`
- after SHA256: `68c326c27bd6794f4083d80fc3d0dc5297c9805e03936ce9774d4f6d36e948f9`
- 1차 근거: [util.smartptr.shared](https://eel.is/c++draft/util.smartptr.shared), [CppCoreGuidelines#S-resource](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-resource)

## embedded-cpp-part3-10

- **context**: 발행된 Embedded C++ Part3 메모리/오류/소유권 학습 글; 기존 published-loop-14/15 근거에 따라 본문 수정.
- **problem_signal**: borrow 함수scope 자동보장 혼동, 참조 멤버 생성/대입 혼동, queue copy=소유권 이전 단정, send 실패·고갈 누락, 임의 버그 소멸 실측.
- **refutation_condition**: queue 성공 시에만 owner가 비고 실패 시 caller가 계속 소유하는지 관찰한다. 참조 복사 생성은 가능하지만 암시적 대입은 삭제된다.
- **hypothesis_and_alternatives**: 보관 observer와 호출 borrower를 계약으로 구분하고 RTOS pointer send의 성공/실패 반환·shutdown·pool 동기화 책임을 명시한다.
- **evidence**: ownership.cpp host 1-slot 모형: send 성공/실패, receive 뒤 해제·재전송·빈 수신·live=0. Observer 복사/이동 생성 trait 참·복사대입 거짓, ASSIGN_OBSERVER 빌드 거부.
- **sample_scope**: 2026-10-22 macOS arm64; Homebrew Clang 23.1.3, libc++ headers 230103; 장별 명명 블록 직접 추출; assertions·ASan·UBSan.
- **decision**: 수정. 공개 글·URL·날짜·순서·점수·기존 평가 판정은 보존. 재채점은 수행하지 않음.
- **smallest_safe_change**: 해당 장의 잘못된 설명/부분 예제·미출처 측정 수치를 정정하고 독립 실행 파일·근거 링크 추가. 장 단위 원복 가능.
- **validation**: 예제 및 의도한 거부 진단, article publish gate/inlineMath exit 0. 사이트 build는 parent 통합 단계.
- **remaining_risk**: FreeRTOS 구현/scheduler/ISR·shutdown drain·실제 callback 해제 동기화 미실행. host 모형을 RTOS 성공 증거로 쓰지 않음.
- before SHA256: `7f5b0c5934c1926bc2c36c59ea13f994d5f6a7f951b487e36e95d14358baef9b`
- after SHA256: `3e2249af44049dc47979e106f1250672e82a23271479616b097f2bf5f873d15d`
- 1차 근거: [03-xQueueSend](https://www.freertos.org/Documentation/02-Kernel/04-API-references/06-Queues/03-xQueueSend), [class.copy.assign](https://eel.is/c++draft/class.copy.assign)

