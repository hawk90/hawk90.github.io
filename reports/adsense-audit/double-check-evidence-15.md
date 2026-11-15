# 공개 글 루프 15 근거 초벌 대조

> 범위: `published-loop-15.md`의 Embedded C++ 공개 글 10편. 원문은 바꾸지 않았다.
> 방법: 아래 각 source_file을 1행부터 마지막 행까지 다시 읽고, 보고서의 A~G 위치를 대조했다. D에 적힌 형제 글의 대응 줄을 현재 checkout에서 확인하고, F의 본문 링크 대상 slug·title·seriesOrder/draft 및 라벨 뒤 설명을 대조했다. 점수나 최종 factcheck 판정은 이 문서에서 새로 확정하지 않는다.
> 근거 한계: 웹의 1차 자료 대조 및 코드 컴파일/측정은 수행하지 않았다. 기술/API 의심은 이를 확인할 자료·실행 조건을 표시한다.

## 글별 대조

### part3-06-error-handling-patterns.md

- `source_file`: `src/content/blog/embedded/embedded-cpp/part3-06-error-handling-patterns.md`; 전체 1–467행을 읽음.
- A/B/C/E/G: 기존 위치가 본문과 맞는다. 특히 제목의 errno·optional 비교(2행)와 본문 부재, exception-free RAII description(5행)과 본문, 372행 `Error::InternalError`(71–100행 enum에 없음), `Result<float>` 별칭(120–121행)과 `ErrorContext` 반환(167–170행), 측정 주장(421–447행), 출처·버전 부재를 확인했다. 이들은 근거 위치가 정확하다.
- D: 현재 비교도 같은 질문을 다룬다. `part3-05-no-exception-design.md` 210–273·367–383행, `part3-07-expected.md` 113–144·298–323행과 현재 원문을 대조했다. 이 글의 chain·측정과 실제 겹침이 있어 D 근거 동의. 측정 수치/동작이 맞는지와 중복 판단은 별개다.
- F: 460–462행 링크는 대상 제목과 맞고, `/blog/...` slug로 해당 파일이 존재한다. 463행 Refactoring Pattern 40은 링크가 없으며 기존 보고서가 지적한 대상은 draft. 467행 다음 글 설명은 3-07의 현재 제목·주제에 부합한다. F 근거 동의.
- 3-1 factcheck: 기존 `미검증`을 지지한다. 본문만으로 기술 API 오류를 확정할 근거는 없음. 372행 누락 enum 이름, 169행 `unexpected<ErrorContext>`와 alias의 호환, GNU statement expression 및 `-fno-exceptions` 주장은 C++/GCC·tl::expected 자료로 확인해야 한다. 15행/28행의 결정 수 차이는 rubric상 단순 개수 표기 문제다. `.noinit` 유지, CRC 범위/NUL 종단도 구현·링커/대상 MCU 확인이 필요하다. 측정 환경 없음은 C 근거이지 오류 확인 근거가 아니다.

### part3-07-expected.md

- `source_file`: `src/content/blog/embedded/embedded-cpp/part3-07-expected.md`; 전체 1–343행을 읽음.
- A/B/C/E/G: 원 보고서 근거 위치에 동의한다. 60행 `Error::SomeError`(29행 enum과 불일치), 64행 선언되지 않은 함수, 120–132행 미정의 alias/API 예, 131행 `std::expected` 문맥의 `tl::unexpected`, 환경 없는 302–321행 결과가 실제로 있다. 제목의 분석 범위가 74–86행 수준 설명에 그친다는 E 지적도 부합한다.
- D: `part3-05`의 121–164·254–271행, `part3-06`의 118–129·428–447행, `part1-08-cpp-standard-choice.md` 241–244행과 대응 관계가 현재 원문에서 확인된다. D 근거 동의.
- F: 336–339행 관련 링크 라벨은 3-05·3-06·1-08의 대상과 맞는다. 343행 다음 편 라벨과 요약은 대상 3-08과 맞는다. 대상 파일/순서는 유효하다.
- 3-1 factcheck: `미검증` 지지. 예시의 API/표준 의미 및 구현별 동작은 C++ 표준, P0323/P2505 이력, libstdc++·libc++·tl::expected 소스가 필요하다. 예제 조각의 미정의 이름은 자체 코드의 컴파일 불완전성을 보여 주지만, 기술 동작을 `오류 확인`으로 확정하려면 의존 API/언어 규칙 확인이 필요하다. 80행 layout와 317행 설명은 표현이 상충해 보이나 union/layout 구현 자료 필요. 비교 글과의 버전 표 차이도 사실 오류로 승격하지 않는 편이 rubric에 맞다.

### part3-08-no-rtti-design.md

- `source_file`: `src/content/blog/embedded/embedded-cpp/part3-08-no-rtti-design.md`; 전체 1–403행을 읽음.
- A/B/C/E/G: 보고서의 근거 위치 동의. 81–91행은 `TypeOf` 사용 전 정의 순서, 303–308행은 같은 이름의 class/struct 재정의, 368–382행은 RTTI와 exceptions를 함께 바꾼 출처 없는 수치다. 이를 실행 실패나 측정 오류로 단정하진 않는다.
- D: `part1-02-compiler-flags.md` 120–147행, `part4-06-state-machine.md` 104–130행, `part2-08-static-polymorphism.md`와 `part3-05-no-exception-design.md` 367–383행의 비교 위치를 기존 보고서에 따라 현재 원문과 대조했다. RTTI 대안 설명 및 측정 일부 중복에 동의. 각 비교 원문/줄은 보고서에 대응되어 있다.
- F: 396–398행 대상 label·title이 맞고 링크가 존재한다. 399행 Visitor 항목은 무링크이고 보고서가 가리킨 대상은 draft. 403행 다음 편 안내는 3-09로 맞다. 링크 문제와 글 내부 포인터는 구분 필요.
- 3-1 factcheck: `미검증` 지지. 측정 산술 자체(58−38=20; 20/58≈34.5%)는 맞아 내부 모순 근거가 아니다. `std::any`/`std::function`의 `-fno-rtti` 동작, variant 방문 비용, Boost.TypeIndex 설명은 libstdc++·libc++/Boost 소스와 GCC/Clang 문서 확인 필요. 중복 정의는 실제 컴파일로 확인 가능. 기존 uncertainty가 이를 오류로 확정하지 않은 점 동의.

### part3-09-smart-pointer-choice.md

- `source_file`: `src/content/blog/embedded/embedded-cpp/part3-09-smart-pointer-choice.md`; 전체 1–350행을 읽음.
- A/B/C/E/G: 근거 위치 동의. 297–304행 표의 120→15 cycles 및 1.2→0.15 ms는 8배인데 결론은 10배다. 실행 환경 부재도 별도로 명시돼 있다.
- D: 현재 `part3-10-ownership-model.md` 333–338·305–323·170–183행, `part2-02-raii-patterns.md` 198–226행과 비교 대상/핵심 내용이 대응한다. D 중복 근거 동의.
- F: 342–345행 대상 라벨은 title에 맞고 파일 존재. 346행 Pattern 33은 링크 없는 항목이며 보고서의 대상은 draft. 350행 다음 편 안내는 3-10과 맞는다.
- 3-1 factcheck: 299–304행 산술 불일치는 두 진술만으로 확인 가능하므로 기존 `오류 확인` 사유가 rubric 3-1 조건을 충족한다. 다만 측정값의 진위·cycles→시간 변환(클럭 전제)은 미검증으로 남긴다. `sizeof(shared_ptr)`와 deleter 크기 등 별도 의심은 표준 구현/ABI 자료가 필요하며 이 내부 산술 판정과 혼합하지 않는다.

### part3-10-ownership-model.md

- `source_file`: `src/content/blog/embedded/embedded-cpp/part3-10-ownership-model.md`; 전체 1–410행을 읽음.
- A/B/C/E/G: 기존 근거와 일치. 특히 89행 borrower의 함수 수명 정의와 113–123행 멤버 참조 보관, 360–366행 저장 금지 예의 용어상 긴장이 실제로 있다. 374–390행 수치는 환경/방법이 없다.
- D: `part3-09-smart-pointer-choice.md` 276–281·157–185·241–254행과 이 글의 333–338·51–71·305–323·170–183행의 중복을 확인했다. 기존 D 근거 동의.
- F: 403–404행 링크 label과 target title은 맞고, 405행 Pattern 33은 무링크·draft 대상이다. 406행 Core Guidelines 링크는 해당 절과 연결된다. 410행 다음 편은 4-01과 맞다.
- 3-1 factcheck: `미검증` 지지. 본문만으로 오류 확인되는 두 기술 진술은 찾지 못했다. Borrower 용어 충돌은 rubric의 오류 판정 대상이 아니라 B/uncertainty 성격. Lambda const-callable 여부(284–286행), reference member의 copy/move 의미(358행), `gsl::owner` 주장(323행)은 C++ 표준 및 Core Guidelines/GSL 자료로 확인해야 한다. 측정(374–390행)의 수치는 로그·환경 없이는 확인할 수 없고 그 부재만으로 오류 판정 불가.

### part4-01-intrusive-containers.md

- `source_file`: `src/content/blog/embedded/embedded-cpp/part4-01-intrusive-containers.md`; 전체 1–424행을 읽음.
- A/B/C/E/G: 보고서 위치 동의. 72–76행 sentinel 초기화, 99–143행 API와 354/362/371행 예제의 호출 불일치, 322–330행 생성/할당 수명, 386–404행 측정이 지적 위치에 있다. tree/hash 설명은 짧고 측정 근거가 없다.
- D: 현재 `part4-02-etl-library.md` 77–90행, `part3-03-pool-allocator.md` 39–55행 및 RTOS `part2-01-ready-list.md` 48–55행, `part5-02-zephyr-source.md` 104–108행과 대조했다. intrusive container 전용 질문은 독립적이나 ready queue·list idiom은 실제 겹친다. 기존 12점이 이 범위를 반영했다는 설명은 타당하며, 기존 보고서가 비교 파일·대응 위치를 제공한다.
- F: 417–419·424행 내부 링크 대상은 title·seriesOrder와 부합한다. 420행 `Practical RTOS Internals` 라벨이 실제로 가리키는 것은 `00-preface`이며 scheduler 특정 글이 아니다. 링크 오안내 근거 동의.
- 3-1 factcheck: `미검증` 유지. 기존 보고서가 산술을 오류로 승격하지 않은 것은 적절하다: 392–400행 cycle과 ms는 1 MHz를 전제하면 내부 일치 가능하므로 글 안의 명시 조건 부족만으로 모순은 아니다. `std::list::erase` 복잡도·C++ 표준 시작 버전, Boost/ETL API, sentinel/초기화 수명은 표준·upstream 문서/실행이 필요하다. 비교 글과의 구현 차이도 먼저 해당 코드/버전 확인 필요.

### part4-02-etl-library.md

- `source_file`: `src/content/blog/embedded/embedded-cpp/part4-02-etl-library.md`; 전체 1–428행을 읽음.
- A/B/C/E/G: 원 보고서 근거 동의. 15행 factory 약속은 본문 구현 예가 없고, 327–339·384행 예외/초과 동작 설명은 자체적으로 일관되지 않은 듯하지만 upstream 의미 확인 전 오류 확정은 보류해야 한다. 350–364행은 보드 외 재현 조건을 주지 않는다.
- D: 현 `part3-01-no-dynamic-alloc.md`와 `part4-06-state-machine.md`의 대응 절(루프 보고서에 기재된 위치), plus `rtos/practical-internals/part4-13-cpp-in-rtos.md` 226–250행을 대조 대상으로 확인했다. 컨테이너·delegate·FSM 예시와 측정의 반복 지적에 동의. ETL 예제가 현 upstream과 맞는지는 별도 문제.
- F: 421–424행 내부 링크는 part3-01, 4-01, 4-06으로 가며 label·대상 제목이 맞는다. 428행 다음 편은 4-03과 맞는다.
- 3-1 factcheck: `미검증` 지지. `s.size()>64`와 “잘림” 문구(70·75행)는 API 동작을 알아야 판단하므로 자체 모순으로 확정할 수 없다. ETL throw 설정, `ETL_NO_EXCEPTIONS`/프로필 매크로, fixed-container 초과 처리, `etl::delegate` 크기, aggregate 초기화 및 FSM state 배열은 ETL 공식 문서/해당 upstream 버전 소스와 C++ 표준, 가능하면 최소 컴파일 필요. 측정·15배 산술 자체는 6.2/0.4=15.5라 내부 산술 오류가 아니다.

### part4-03-lock-free-basics.md

- `source_file`: `src/content/blog/embedded/embedded-cpp/part4-03-lock-free-basics.md`; 전체 1–341행을 읽음.
- A/B/C/E/G: 보고서 위치 동의. 28–41행은 같은 함수/변수 재정의를 포함하고, 312–321행 측정은 Cortex-M4·1M ops만 기록한다. LDREX/STREX·M0 atomic 설명은 출처가 필요하다.
- D: 현재 `part4-04-lock-free-container.md` 38–68·137–142·220–256·331–342·358–406행을 대응시켜, SPSC·ABA·MPMC/함정 반복을 확인했다. 다른 시리즈의 performance-engineering part4-07 및 Modern Embedded Recipes part9-*는 현재 존재하지만 사용자 지시대로 앵커 검증에는 사용하지 않았다. D에서 Modern Embedded Recipes를 비교한 것은 중복 검토 범위와는 별도로, 평가 대상 406편에서 제외라는 범위 규칙과 충돌할 수 있으므로 점수 근거로 사용했는지 Sol 검토가 필요하다.
- F: 기존 보고서의 334–337행 대상/라벨과 341행 next target을 대조한다. 확인된 문제 후보는 336행 시리즈 소개 라벨이 `00-preface`를 가리키는 것, 337행 CppCon의 검색 URL이 특정 출처를 가리키지 않는 것이다. 다음 편 4-04는 올바른 대상이다.
- 3-1 factcheck: `미검증` 지지. M0 word load/store와 RMW 원자성 범위, 컴파일러의 libatomic fallback, exclusive monitor/DMA/peripheral 접근, memory-order 효과는 ARMv6-M/v7-M Architecture Reference Manual 및 GCC/Clang/C++ 자료로 확인 필요. measured cycles는 재현 환경 필요. 65행의 single instruction 일반화와 M0 RMW 제약은 범위를 나누면 공존할 수 있어 원문 내부 모순이라고 확정하지 않은 점 적절.

### part4-04-lock-free-container.md

- `source_file`: `src/content/blog/embedded/embedded-cpp/part4-04-lock-free-container.md`; 전체 1–417행을 읽음.
- A/B/C/E/G: 기존 보고 근거 동의. H2/코드 주석의 ISR+여러 consumer(258–284행), 같은 글의 SPSC 단일 consumer 한정(324·328–329행), 결론(402행)이 직접 충돌한다. 이는 측정/표준 외부 자료 없이 원문 안에서 확인 가능하다.
- D: 현 `part4-03`의 160–195·96–115·221–231·297–302·258–274·328–330행과 대응되는 반복을 확인했다. 기존 비교가 파일명 및 줄을 대응시켰다. 외부 시리즈 비교는 별도 범위상 신중히 처리.
- F: 410–413행 내부 링크는 label·대상 제목이 일치한다. 417행 next target `part4-05` title 및 order 33 일치. 413행 RTOS 시리즈명 링크가 소개 글이라는 보고서 지적은 타당하다.
- 3-1 factcheck: 기존 `오류 확인`은 rubric의 원문 내부 모순 조건을 충족한다. 258·261·263–284행의 “여러 consumer task”와 324·328–329·402행의 SPSC 전제가 양립하지 않는다. 288행 한 task 사례만으로 앞의 다중 consumer 예를 해소하지 못한다. 점수/판정 확정은 부모 검토 몫이다. 나머지 lock-free 알고리즘 correctness는 실행/메모리 모델 자료 확인이 별도 필요하다.

### part4-05-type-safe-flags.md

- `source_file`: `src/content/blog/embedded/embedded-cpp/part4-05-type-safe-flags.md`; 전체 1–411행을 읽음.
- A/B/C/E/G: 기존 근거 위치 동의. 본문은 enum flags/연산자 자동화 주제이고 `Tag` 자체는 빠져 있다(2행 vs 1–411행). 212행 3-bit mask와 `pin*2` 간격(217행) 및 202행 3-bit value의 충돌은 자체 산술로 재현 가능. 239행 AnyError mask와 98–101행 all-bits `has_flag`의 결과는 단일 bit를 넣으면 false임을 계산할 수 있다. 322행 `Flags` 예의 `|=` 구현 부재도 확인됨.
- D: `part5-01-register-abstraction.md` 154–170행을 비교했다. MODER 2-bit 필드와 이 글 196–224행 예제가 같은 질문을 다루며, 필드 mask 폭과 값 설명이 차별점이다. 인접 lock-free 및 state-machine 본문과는 해당 비교 내용 기준 중복이 작다. D의 12점 근거 동의.
- F: 405–407행 링크는 part2-09/part5-01/part5-02와 각각 연결되고 title 라벨이 맞다. 411행 next link는 4-06이며 title/order 맞다. 기존 보고서는 본문 안내가 없는 동주제 part5-01 때문에 템플릿 링크 외 고유 F 근거가 부족하다고 했다. 이 구분에 동의.
- 3-1 factcheck: 기존 `오류 확인`에 강한 원문 내부 근거가 있다. (1) `has_flag`는 모든 mask bit가 설정됐는지 검사(98–101행)하므로 AnyError(239행)를 써서 단일 오류를 검사한다는 설명(255–256행)과 맞지 않는다. (2) 212행 3-bit clear mask는 217행의 2-bit GPIO stride와 겹친다(특히 224행 pin 5). (3) 202행 3-bit AnalogMode 역시 2-bit 필드 설계와 겹친다. 3번째는 1·2와 같은 예 안의 확장 근거다. STM32 reference manual로 GPIO encoding 자체를 확인해야 하지만, mask-width/stride 충돌은 코드가 선언한 자기 간격만으로 판정 가능. 실제 레지스터 해석은 STM32 family reference manual 필요.

## 앵커 및 범위 메모

- `docs/adsense-audit/anchors.md`의 세 `anchor_ref`는 git 객체 `10550ca1`에서 `src/content/blog/embedded/modern-recipes/part1-04-uart-hardware.md`, `part6-09-isr-api.md`, `part7-05-kernel-build.md` 경로로 확인했다. 해당 객체들은 현재 Recipes 본문/Part12 이름과 다른 과거 원문이다. 이 자료는 점수 앵커 전용이며 비교 D 대상이 아니다.
- Git 상태에서 사용자가 작업 중인 `package.json`, `scripts/adsense-score-loop.mjs`, `reports/adsense-audit/embedded-performance-engineering-loop-01.md`는 보존했고 변경하지 않았다. 이 evidence note만 새로 작성했다.
- 기존 루프 요약의 10편 `factcheck: 오류 확인` 3건(3-09·4-04·4-05)은 원문 내 산술/구조 모순 근거가 rubric 3-1에 직접 부합한다. 나머지 7편은 1차 출처 확인 기록이 없고, 이번 대조도 외부 1차 자료/실행을 하지 않았으므로 `미검증` 근거가 유지된다.
- D current-source line mapping은 published-loop-15가 적은 현재 원문 줄과 다시 대조했다. Modern Embedded Recipes가 406편의 재채점 대상에서 제외된다는 것은 대상 선정에만 적용된다. D는 루브릭이 다른 시리즈의 동일 주제 글과 비교하도록 명시하므로, Recipes를 D 비교 대상으로 쓰는 것은 범위상 허용되며 점수 근거와 충돌하지 않는다.
