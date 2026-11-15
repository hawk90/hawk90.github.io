# 공개 글 AdSense 평가 — 루프 14

> **현재 점수 정본 — 2026-10-19 독립 재검토 반영.**
> [갱신 전 평가](archive/published-2026-10-12/published-loop-14.md) · [재검토 기록](double-check-loop-14.md) · [전체 요약](published-summary.md)

아래 점수·판정·A~G 근거는 재검토 결과로 함께 갱신했다. 재검토 기록 안의 “기존 보고서 수정 없음”은 검토 당시의 상태를 뜻하며, 이번 반영에서 이 정본을 갱신했다. 원문·공개 상태는 변경하지 않았다. 이전 점수·철회 근거는 비교 기록과 보관본에서 확인한다.

평가일 2026-10-18. 루브릭 v1.2와 앵커 문서(2026-10-11), AP-C-24를 적용했다. 기준 커밋 `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. 기존 보고서 작성 커밋 ba9f7104 이후 아래 10편의 원문 diff는 없다. 원문·기존 보고서·미커밋 작업은 변경하지 않았다. 따라서 점수 차이는 재평가 차이다. 전편 본문 전체를 읽었고 D는 표시한 대응 절을 직접 비교했다. 내부 링크는 slug→실제 파일로 해석해 제목·공개 상태·seriesOrder·내용을 대조했다.

앵커 UART=`part1-04-uart-hardware.md`(49), Build=`part7-05-kernel-build.md`(50), LLM=`part12-10-on-device-llm.md`(74)는 **문서 작성 시점의 점수·근거**다. 현재 개선된 앵커 원문과 과거 점수를 섞지 않았다. 아래 짧은 파일명은 `src/content/blog/embedded/embedded-cpp/` 기준이며 RTOS는 `src/content/blog/embedded/rtos/practical-internals/part4-13-cpp-in-rtos.md`를 뜻한다.

## 점수

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part2-06-templates-basics.md` | 11 | 12 | 7 | 10 | 5 | 7 | 1 | **53** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part2-07-templates-cost.md` | 11 | 11 | 6 | 10 | 6 | 7 | 2 | **53** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part2-08-static-polymorphism.md` | 11 | 11 | 6 | 11 | 5 | 5 | 1 | **50** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part2-09-type-traits.md` | 13 | 13 | 7 | 11 | 6 | 7 | 1 | **58** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part2-10-concepts.md` | 11 | 11 | 5 | 11 | 7 | 7 | 1 | **53** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part3-01-no-dynamic-alloc.md` | 10 | 11 | 6 | 9 | 7 | 7 | 2 | **52** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part3-02-custom-allocator-basics.md` | 10 | 10 | 5 | 10 | 5 | 5 | 1 | **46** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part3-03-pool-allocator.md` | 11 | 10 | 6 | 8 | 7 | 7 | 1 | **50** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part3-04-pmr.md` | 10 | 10 | 6 | 11 | 5 | 6 | 1 | **49** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part3-05-no-exception-design.md` | 10 | 10 | 6 | 8 | 6 | 7 | 1 | **48** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |

합계 512, 평균 51.2, 범위 46~58. 우선 조치 8편·병합 검토 2편이다. 기존 합계517 대비 -5. 전편 score_status=잠정, confidence=중간. 전체의 구체 주장을 대조하지 않았으므로 검증됨·확정으로 올린 글은 없다. 본문 범위 P0는 미발견이다. 렌더·빌드는 직접 실행하지 않았고 [부모 공통 검사](double-check-gates-2026-10-18.md)의 전 항목 exit0·links0 broken·reading위반0을 인용한다. 이 검사는 기술 주장 통과를 뜻하지 않는다.

| 파일 | 이전총점 | 새총점 | 차이 | 이전판정 | 새판정 | 항목 동의/변경 |
| --- | ---: | ---: | ---: | --- | --- | --- |
| `part2-06-templates-basics.md` | 53 | 53 | 0 | 우선 조치 | 우선 조치 | A~G 동의 |
| `part2-07-templates-cost.md` | 53 | 53 | 0 | 우선 조치 | 우선 조치 | A~G 동의 |
| `part2-08-static-polymorphism.md` | 52 | 50 | -2 | 병합 검토 | 우선 조치 | A C D F G 동의; B12→11(검증한 concept 예 실패), E6→5(분석 약속·개념 소개 규칙) |
| `part2-09-type-traits.md` | 59 | 58 | -1 | 병합 검토 | 병합 검토 | A C D E F G 동의; B14→13(AP-C-24 정확성 불확실 상한) |
| `part2-10-concepts.md` | 54 | 53 | -1 | 병합 검토 | 우선 조치 | A C D E F G 동의; B12→11(정상 UartLogger도 제약 실패) |
| `part3-01-no-dynamic-alloc.md` | 52 | 52 | 0 | 병합 검토 | 병합 검토 | A~G 동의 |
| `part3-02-custom-allocator-basics.md` | 46 | 46 | 0 | 우선 조치 | 우선 조치 | A~G 동의; 오류 근거를 N3337 대조로 보강 |
| `part3-03-pool-allocator.md` | 50 | 50 | 0 | 우선 조치 | 우선 조치 | A~G 동의; 303행 Lock-free 기초 연결은 유효 |
| `part3-04-pmr.md` | 50 | 49 | -1 | 우선 조치 | 우선 조치 | A B C D F G 동의; E6→5(‘분석’인데 예제·수치 소개 수준) |
| `part3-05-no-exception-design.md` | 48 | 48 | 0 | 우선 조치 | 우선 조치 | A~G 동의 |

총점 동의6/10, 최종판정 동의8/10. 점수를 유지한 행도 아래의 현재 원문 근거를 다시 확인했다. B14→13은 명시 규칙 적용이고 B·E의 나머지 1점 차이는 근거에 따른 재량 차이다.

## 정확성 게이트

| 글 | 재검토 결과 |
| --- | --- |
| 2-06 | 395~399행 push/pop 합계는 492 B, 401·404행은 ~432/432 B. 산술 재실행으로 기존 오류 확인 유지. |
| 2-07 | 53~57행 nm 수치 합은 3328 B, 60·99행은3344 B. 산술 재실행으로 유지. |
| 2-08 | 기존 미검증→오류 확인. 382~393행 constrained CRTP base에 `class UartLogger : public LoggerBase<UartLogger> { public: void log_impl(const char*) {} };`를 붙여 사용하면 정상 구현도 제약 실패. 아래 재현과 [표준 초안 atomic constraint 규칙](https://eel.is/c++draft/temp.constr.atomic#3)을 대조했다. 기존의 vtable 크기·EBO 의심까지 확정한 것은 아니다. |
| 2-09 | 미검증 유지. 30행 C 타입분기 불가능, 70행 scalar 목록, 132행 모든 인스턴스 실패를 SFINAE로 포괄, 386행 discarded branch 주석은 1차 대조 전 uncertainties다. B14는 AP-C-24를 위반하므로13으로 교정. |
| 2-10 | 기존 미검증→오류 확인. 242~258행을 원문 그대로 추출하고 `<concepts>`만 제공해도 255행 **올바른 UartLogger**에서 constraints not satisfied. 262~264행 누락 메서드만 거부한다는 대조가 성립하지 않는다. 언어/API 지식이 필요한 결함이므로 원문 내부 모순만으로 승격하지 않고 실행·표준을 함께 사용했다. |
| 3-01 | 미검증 유지. 257행 ObjectPool을 pmr resource로 전달하는 예, pmr의 default upstream, 36행 인증 규정 등은 미대조. 제한된 예제에서 실제로 heap을 썼다고 추정하지 않는다. |
| 3-02 | 오류 확인 유지하되 **예시 typedef 개수만**으로 모순을 확정하지 않는다. 314·324행의 ‘C++17 이전에는 수많은 typedef, 이후 traits 기본값’은 이미 C++11 후속 초안 [N3337 allocator.traits](https://timsong-cpp.github.io/cppwp/n3337/allocator.traits)가 pointer·size_type·construct·destroy 등의 defaults를 명시하므로 시점 설명 오류다. |
| 3-03 | 오류 확인 유지. 64~72행에서 N은 `Slot slots_[N]` 개수이고 Slot 정의는 T에만 의존한다. 411~413행은 같은 T=std::byte에 N=16/64/256만 바꾼 세 pool을 **블록 크기16/64/256**으로 주장해 서로 성립 불가. 이는 std::byte의 실제 크기나 CPU 포인터 폭을 몰라도 세 Slot 크기가 같아야 한다는 원문 구조만으로 성립한다. 41행 allocated/free 용어 실수는 단독 확정 근거에서 제외한다. |
| 3-04 | 오류 확인 유지. 324행 ‘default do_is_equal이 dynamic_cast’는 [표준 memory_resource](https://eel.is/c++draft/mem.res.class#mem.res.class.general)의 순수 가상 선언 및 [monotonic_buffer_resource::do_is_equal](https://eel.is/c++draft/mem.res.monotonic.buffer.mem#10)의 자기 주소 비교와 맞지 않는다. 순수 가상도 out-of-line 정의를 가질 수 있으므로 `=0`만으로 기본 구현 불가능이라고 증명하지 않는다. 실제 표준 요구·구체 resource 동작으로 확정했다. |
| 3-05 | 오류 확인 유지. 373~380행42+4.2+3.1−38=11.3 KB(대략49−38=11), 383행은약7 KB. rounding으로 해결되지 않는 같은 비교의 산술 차이다. |

재현 환경: Homebrew clang23.1.3, target arm64-apple-darwin25.6.0. 2-10은 원문242~258행에 `#include <concepts>`와 빈 main만 추가했고, 2-08은 원문382~393행에 위 최소 derived를 붙였다. 각각 `clang++ -std=c++20 -fsyntax-only /tmp/adsense-loop14-concept.cpp` 및 `/tmp/adsense-loop14-crtp.cpp`가 exit1. 진단은 `UartLogger does not satisfy LoggerImpl/Logger`, `t.log_impl(msg) ... no member named log_impl`였다. 개념 제약은 base 지정 시점의 incomplete Derived에서 평가된다. 실제 MCU·성능 검사를 수행한 것으로 표현하지 않았다.

## 글별 근거

### `part2-06-templates-basics.md`

source_file: `src/content/blog/embedded/embedded-cpp/part2-06-templates-basics.md`

score_status: 잠정 · score:53 · confidence:중간 · factcheck:오류 확인 · anchor_ref:UART, Build. blockers:P0 미발견/P1 크기 합계 오류. uncertainties:288~308행 이름 조회·322/328행 itoa/ftoa 선언·GPIO 대상 MCU·406행1% 근거 미검증.

| 항목 | 근거 |
| --- | --- |
| A | 11 | 126~163 RingBuffer·169~205 GPIO·211~249 serializer는 임베디드 색이 있으나 일반 template 교육 예. 앵커 UART 수준의 고유 관점, 측정 기반 선택은 없다. |
| B | 12 | 17~122 문제/문법→124~345 응용→347~406 함정/크기→408~414 정리. 기본 완결성은 있으나 측정 결론 오류와 언어 의심으로 B≤13. |
| C | 7 | 72~80·195~201행 asm·394~402행 크기표는 compiler/version/flags 없이 제시. §3-1 C≤8 적용, 합계 오류로 검증 결과의 신뢰가 낮다. |
| D | 10 | 364~406행 bloat→인접 part2-07 26~60·367~384행 bloat 크기와 동일 질문. part2-09 224~264행 serialize↔211~249행은 trait 분기/명시 specialization으로 방식이 다르다. RTOS180~224행 type-safe StaticQueue↔126~163행 ring은 기초 관점만 겹쳐 독립 소개 역할이 남는다. |
| E | 5 | 2행 분석·5행 zero-cost 약속에 비해 53~309행 문법 소개, 환경 없는 asm/수치가 근거 전부. 분석 약속+개념 소개의3~5구간. |
| F | 7 | 426행 next→2-07(seriesOrder15). 418~422행2-07/08/09/10/5-02 모두 공개·제목/역할 대응. 365·414행 bloat 해법을2-07로 보내는 고유 안내가 있다. |
| G | 1 | 311행 GCC13 언급은 있어도 본문 출처0, 레지스터 대상·manual 판도 없다. |

병합 대상:2-07(bloat 측정 부분). 다음 조치:입문과 비용 분석의 독립 의도를 살려 부분 병합·보강.

### `part2-07-templates-cost.md`

source_file: `src/content/blog/embedded/embedded-cpp/part2-07-templates-cost.md`

score_status:잠정 · score:53 · confidence:중간 · factcheck:오류 확인 · anchor_ref:UART, Build. blockers:P1 nm 합계 불일치/P0미발견. uncertainties:122행variant code한번·273행static_assert 메시지·407행toolchain 지원/예측·369~384 실제 프로젝트 진위 미검증.

| 항목 | 근거 |
| --- | --- |
| A | 11 | 62~239행 공통 helper/base/extern template 패턴은 유용하나 흔한 처방. 369~384행 프로젝트 수치에는 환경·원자료가 없다. |
| B | 11 | 문제→패턴1~5→241~327도구/빌드시간→329~416함정/결론 흐름. 364~365행 debug정보는 두 문장, 측정 합계도 오류. B≤13. |
| C | 6 | 51행nm·245~255bloaty·302~325PCH/unity 명령은 있다. 98~104·310·327·381행비율/크기에 환경없어C≤8, 재현가능한 before/after프로그램 없다. |
| D | 10 | part2-06 364~406↔26~60·367~384행 bloat중복. RTOS415~421행 얇은wrapper/비templatebase↔62~104·138~182행 공통분리처방, RTOS는RTOS종합/이글은비용전담. part2-08은214~239행 virtual대체와맞물리나 별도CRTP질문. |
| E | 6 | 2행code폭증/인스턴스화는26~278행이행, debug정보측정은364~365행언급만. 키워드1개부분미이행으로6. |
| F | 7 | 19행전제2-06, 427행next2-08(order16), 420~423행2-06/1-04/2-08/4-02 실제제목·역할일치. 패턴1~5가긴글의방향제공. |
| G | 2 | 323행CMake3.16,407행GCC11버전은있으나 공식release/주장출처없고 실제compiler미지정. |

병합 대상:2-06의bloat절. 다음조치보강:합계·실측근거·디버그정보측정확인.

### `part2-08-static-polymorphism.md`

source_file: `src/content/blog/embedded/embedded-cpp/part2-08-static-polymorphism.md`

score_status:잠정 · score:50 · confidence:중간 · factcheck:오류 확인 · anchor_ref:UART, Build. blockers:P1concept으로제약한CRTP패턴실패/P0미발견. uncertainties:433행EBO·268행aggregate초기화·447행vtableoffset·275행CRTP가능표준시점·STM32레지스터환경미검증.

| 항목 | 근거 |
| --- | --- |
| A | 11 | 90~142logger·185~231peripheral예는유용하나구조/비교/mixin은표준CRTP입문. 465행1000B산술은맞으나실험데이터는아니다. |
| B | 11 | 60~231구조/응용→233~310mixin/단점→312~433패턴/함정→435~485효과/정리. 함정절3개반복,381~393행보완패턴의실패확인으로12보다낮다. B≤13. |
| C | 6 | 437행M4/-O2만있고실제컴파일러/objdump명령없다. 450~465행12/4/1000B는환경없는수치C≤8. 재현실험으로가점하지않음. |
| D | 11 | part2-10 241~258↔381~393행constrainedLoggerBase거의동일. RTOS344~359행SensorBase↔64~86행Base/Derived구조동일하지만RTOS는개괄후이글을정본으로342행링크한다. 전용CRTP역할인정. |
| E | 5 | 2행‘패턴분석’인데60~86·233~433행개념/관용구소개,435~465행출처없는예시asm. 분석소개규칙으로5. |
| F | 5 | 497행next2-09(order17),489~491의기초/traits/concepts는맞다. 492행5-03의‘CRTPperipheral’은대상164~186행conceptinterface이고CRTP가없어F≤5. 493행GoF21은링크없는draft자료안내. |
| G | 1 | C++표준·ABI·MCUmanual·compiler출처없다(21~24·155~158·437~465행수치). |

병합 대상없음. CRTP정본의독립의도가있어다음조치보강:제약검사를Derived완성이후로옮기는방식검증,asm·출처·라벨수정.

### `part2-09-type-traits.md`

source_file: `src/content/blog/embedded/embedded-cpp/part2-09-type-traits.md`

score_status:잠정 · score:58 · confidence:중간 · factcheck:미검증 · anchor_ref:Build, LLM. blockers:P0미발견/정확성미대조. uncertainties:30행Ctype정보·70행scalar범위·132행SFINAE범위·370행compiler차이·386행discardedbranch주석미대조. **불확실이열려있으므로B14불가**.

| 항목 | 근거 |
| --- | --- |
| A | 13 | 113~126register검사·228~264정수/float/enum직렬화·301~315customregistertrait로단순목록이상의응용. 실제사용실패·검증은없어LLM18보다낮다. |
| B | 13 | 47~109catalog→130~222SFINAE/void_t→224~347응용/tag→349~436함정/정리. 기본구성충분하나is_pod82행한줄·언어의미불확실로AP-C-24상한13. |
| C | 7 | 192~193·292~294행static_assert합격/실패검사는있다. 420~426행STM32F4수치는compiler/flags/명령없어C≤8. 실제크기·성능관찰없음. |
| D | 11 | part2-10 269~290행enable_if↔134~156행,2-10 188~206decode↔228~256serialize분기구조가겹친다. RTOS180~224행타입안전queue는trait검사설명없이wrapper이므로동일질문아님. C++17trait/void_t정본역할남음. |
| E | 6 | 2행SFINAE/컴파일타임검사이행, is_pod은82행deprecated주석만. 키워드일부미이행6. |
| F | 7 | 447행next2-10(order18),440~443행2-06/08/10/3-08라벨·공개상태확인. typeid함정(355행)→3-08 No-RTTI는기능상대응. trait→SFINAE→응용단계로안내. |
| G | 1 | 표준도입시점109행·is_pod82행및420~426수치에1차출처없다. |

병합대상없음. 다음조치보강:언어규칙대조·is_pod의대체·검증조건명시.

### `part2-10-concepts.md`

source_file: `src/content/blog/embedded/embedded-cpp/part2-10-concepts.md`

score_status:잠정 · score:53 · confidence:중간 · factcheck:오류 확인 · anchor_ref:UART, Build. blockers:P1올바른derived도concept미충족/P0미발견. uncertainties:372·412행지원버전·331행subsumption범위·394행compiletime더빠름·400행에러30→1~2줄미대조.

| 항목 | 근거 |
| --- | --- |
| A | 11 | 162~209Driver/decode·221~235LightweightNumeric는응용이나문법/목록/입문예중심. 394·400행정량·정성결론근거없음. |
| B | 11 | 45~160정의/문법→162~331응용/오버로드→333~412함정/정리로완결. CRTP합성(237~267)의정상/오류대조가실제로작동하지않아12→11. B≤13. |
| C | 5 | 36~40·63~65행진단출력은compiler미지정,377~396측정절은두코드뒤동일/빠르다결론뿐. 실제실행조건없고400행수치는C≤8,실전평가는5. |
| D | 11 | part2-08 381~393↔241~253행LoggerBase반복,part2-09 205~221↔188~206행compile-time dispatch뼈대중복. RTOS344~359CRTP예에는concept없어독립concept제약역할은남음. |
| E | 7 | 2·5행제약가독성/진단개선을47~68·269~291행나란한코드로이행. ‘분석/추적’제목이아니므로실측미비만으로E5로내리지않음. |
| F | 7 | 239행전제CRTP링크,423행next3-01(order19),416~419행2-06/08/09/1-08모두실제제목/역할맞음. syntax3가지번호구조가고유길잡이. 폰폭미검사만으로7을배제하지않음. |
| G | 1 | 412행compiler지원기준·예시진단·성능결론에공식출처없음. |

병합대상없음. 다음조치보강:CRTPconcept의제약시점부터검증,실제툴체인진단과표준조건명시.

### `part3-01-no-dynamic-alloc.md`

source_file: `src/content/blog/embedded/embedded-cpp/part3-01-no-dynamic-alloc.md`

score_status:잠정 · score:52 · confidence:중간 · factcheck:미검증 · anchor_ref:Build, UART. blockers:P0미발견/인증·할당범위미대조. uncertainties:36행MISRA/AUTOSAR/DO178일괄금지·42행array유일stack-only·257행ObjectPool→pmr호환·298행captureless함수heap없음·실측진위미검증.

| 항목 | 근거 |
| --- | --- |
| A | 10 | 40~301행array/ETL/pmr/pool/optional/factory/대체는일반적회피목록. 고유측정주장387~395행은검증환경불충분해차별화로인정하기어렵다. |
| B | 11 | 19~38위험→40~301선택지→303~367함정/추적→369~404비교/정리. 선택지별실패조건은일부존재하나257행호환·규정범위미해결,B≤13. |
| C | 6 | 353~367행wrap_malloc링커옵션으로추적법은있다. 실제호출횟수출력없고387~393행STM32F4/newlib-nano/-Os만으로compiler·소스없어C≤8. |
| D | 9 | part3-04 103~109행↔103~109행pmr예그대로. part3-03 104~152행↔137~180행ObjectPoolconstruct/destroy중복. RTOS230~250행ETLvector/string/map↔69~91행같은선택. Part3도입의독립가치여부재검토필요. |
| E | 7 | 2·5행placementnew/정적객체/pool·heap없는컨테이너약속을40~301행이행. 제목범위는맞다. |
| F | 7 | 112/135행심화3-04/03안내,416행next3-02(order20).408~412행3-02/03/04/4-01/02공개·제목일치. 미리보기→심화장구조로다음행동안내. |
| G | 2 | 67행ETL공식사이트·95행C++17등표준판은있으나규정조항·라이브러리버전·실측환경연결없음. |

병합대상없음(후속장여럿에분산). 판정병합검토, 다음조치보강:도입의선택기준을명확히하고동일예제는링크로줄인다.

### `part3-02-custom-allocator-basics.md`

source_file: `src/content/blog/embedded/embedded-cpp/part3-02-custom-allocator-basics.md`

score_status:잠정 · score:46 · confidence:중간 · factcheck:오류 확인 · anchor_ref:UART, Build. blockers:P1allocator_traits도입시점오류/P0미발견. uncertainties:92행n1한정pool을277~288행vector/string에적용·108행alignas·341행throw동작·235~269reset수명미대조.

| 항목 | 근거 |
| --- | --- |
| A | 10 | 39~65기본interface·80~111bitsetpool·199~227arena는입문예. 235~269taskarena도있지만성능/선택판단의실측근거없음. |
| B | 10 | 35~314요구/구현/상태/컨테이너→316~373함정/정리완결. 표준시점설명과pool사용계약미해결로실용완결성부족,B≤13. |
| C | 5 | 353~363행1.2/0.4ms출처·보드·compiler·procedure없어C≤8. 예제실행·fail관찰없고MinimalAllocator304~305몸체비어있음. |
| D | 10 | part3-01 137~180↔80~111행bitsetpool,part3-04 250~270↔235~271행framearenareset중복. RTOS180~224의staticqueue는STLallocatorinterface와달라병합근거아님. |
| E | 5 | 2행‘interface분석’대비67~74요구목록·코드소개중심,allocator_traits실제동작/propagate등추적없음. |
| F | 5 | 384행next3-03(order21)는맞고377~380행관련라벨도맞다. 그러나373행‘pmr다음chapter’는실제next3-03pool과불일치라F≤5. |
| G | 1 | 74·314·324행표준시점에본문출처없고측정환경없음. |

병합대상없음. 다음조치보강:allocator_traits시점/요구사항·STL적용계약·next문구수정.

### `part3-03-pool-allocator.md`

source_file: `src/content/blog/embedded/embedded-cpp/part3-03-pool-allocator.md`

score_status:잠정 · score:50 · confidence:중간 · factcheck:오류 확인 · anchor_ref:UART, Build. blockers:P1MultiPool의N을blocksize로오해/P0미발견. uncertainties:222~256ThreadSafePool초기화·273~294CASmemoryorder/ABA·155행예외안전·258/439~455행성능주장미대조.

| 항목 | 근거 |
| --- | --- |
| A | 11 | 63~124free-list·159~199소유wrapper·309~343통계가통합되지만전형적구현. 실제제품capacity선정기록없고394행10~20%무출처. |
| B | 10 | 요구→구현/소유→동시성→통계→heap/multipool→정리.222~233행freehead초기화생략,411~419행원정의와상충.B≤13. |
| C | 6 | 139~152사용법·통계변수는있다. 439행STM32F4외compiler/clock/측정방법없고443~450행cycle·258행μs는C≤8. 실제실패조건별관찰없음. |
| D | 8 | part3-01 137~180↔104~118construct/destroy,part3-02 80~111↔63~124pool변형및349~365↔437~455성능비교반복. part2-02 199~217 PoolDeleter↔159~214소유wrapper역할동일. RTOS는413행ISRpool을권장할뿐구현없음. |
| E | 7 | 2행fixedblock/O1을63~124행실제freehead알고리즘이답한다. 전체변형까지항상일정시간이라는23행은추가검증대상이며근거없이새언어결함으로감점하지않음. |
| F | 7 | 19행전제3-02,476행next3-04(order22),468~472관련3-01/02/04/4-03/2-02내용대응.303행은‘lock-free자세히’라고만하므로4-03의CAS/ABA/memoryorder로보내는안내는맞다. pool정본4-04가아니라는이유만으로오답아님. |
| G | 1 | 본문에C++/FreeRTOS1차자료·실측설정없음. |

병합대상:3-01미리보기·3-02pool중복부분. 다음조치보강:MultiPoolblock계약정정·구현가능범위와측정조건명시.

### `part3-04-pmr.md`

source_file: `src/content/blog/embedded/embedded-cpp/part3-04-pmr.md`

score_status:잠정 · score:49 · confidence:중간 · factcheck:오류 확인 · anchor_ref:UART, Build. blockers:P1defaultdo_is_equal설명오류/P0미발견. uncertainties:209행downcast후type검사안전성·121/253행upstream고갈경로·277행헤더범위·340~345크기/cycle미검증.

| 항목 | 근거 |
| --- | --- |
| A | 10 | 47~111인터페이스/표준resource소개·117~142staticbuffer·250~273frame패턴은전형적.158행직접pool더빠름은실측없는비교. |
| B | 10 | 17~73문제/interface→75~216resource/customRTTI→218~288API/컨테이너→292~357함정/정리.196~213customresource는할당구현없고324행기본동작오류가핵심해설을흐린다.B≤13. |
| C | 6 | 정적buffer·vector예는있으나Order/input등독립컴파일전제없음(124~131·264~266행).340~345행2.4/0.8KB·10/15cycles환경없어C≤8. |
| D | 11 | part3-01 103~109↔103~109행pmr코드동일;part3-02 199~227·235~271행arena↔113·250~270행같은reset역할. RTOS에는pmr상세대응없고3-03은rawpool,이글은memory_resourceinterface라독립의도. |
| E | 5 | 2행‘분석’약속에비해47~111·275~288행목록/예제중심,334~348행비교는환경없는숫자표. 분석약속규칙3~5적용. |
| F | 6 | 368행next3-05(order23),361~364행3-02/03/01/1-08공개/라벨일치.19/113행Arena전제링크도맞지만단계별관찰/판단길잡이는약한기본구조. |
| G | 1 | 표준조항·라이브러리판·compiler출처없고71행vptr4byte환경도없다. |

병합대상없음. 다음조치보강:표준resource동작·RTTI없는비교의타입안전을검증하고실제환경을명시.

### `part3-05-no-exception-design.md`

source_file: `src/content/blog/embedded/embedded-cpp/part3-05-no-exception-design.md`

score_status:잠정 · score:48 · confidence:중간 · factcheck:오류 확인 · anchor_ref:UART, Build. blockers:P1동일비교의차이11KB/7KB산술불일치/P0미발견. uncertainties:24/26인증·toolchain관행·153행tl::expected최소표준·191~195STL의abort/UB분기·297행RAM0일괄주장미검증.

| 항목 | 근거 |
| --- | --- |
| A | 10 | 30~173errorcode/optional/expected비교는일반입문.210~251계층화·275~297staticerrorlookup은조금구체적이나상위선택기준은약하다. |
| B | 10 | 문제→4패턴→175~273STL/전파→275~327message/RAII→329~392함정/정리.결정성은22행한줄이며성능비교결론도틀림.B≤13. |
| C | 6 | 44~59예와304~324factory예있으나외부함수/클래스전제생략.369~381행STM32F4외compiler·프로그램·명령없어C≤8,산술도불일치. |
| D | 8 | part3-07 17~72·117~132행↔119~149·257~264행expected/errorchain,part3-06 145~175행↔210~251행계층변환중복. RTOS53·265행↔301·335행noexceptionRAII/STL회피겹침. 독립의도는예외없는선택기준이나여러장에분산. |
| E | 6 | 2행noexception/크기는30~365·367~383행이행.결정성은22행한줄,키워드부분미이행6~8구간. |
| F | 7 | 403행next3-06(order24),396~399행1-02/3-06/3-07/2-01공개/라벨일치.149행expected심화및327행RAII생성실패절(2-01 406~427)안내맞음.4패턴번호와166~173표가길잡이. |
| G | 1 | 본문에표준·compiler·tlupstream출처없고369행측정설정도불명확. |

병합대상:3-07 expected절·3-06계층화절. 다음조치보강:공통내용은정본링크로줄이고noexception선택과검증가능한비교에집중.

## 공통 문제와 검증

10편 모두 컴파일 명령·컴파일러 판·실제 보드 설정과 관찰 결과 연결이 부족하다. 출처 없는 수치가 있는 경우 C≤8, 절차만 있는 경우 C≤9를 먼저 적용했으며 모든 B는 정확성 uncertainties 때문에13이하다. 단지 누락된 기술 한계가 떠오른다는 이유로 감점하지 않았다. 개념 소개 수준의 ‘분석’ 제목(2-06·2-08·3-02·3-04), 후속 장과의 예제 재사용, 측정 표의 조건 미공개는 시리즈 공통 문제다.

관련 링크는 2-08 492행 및3-02 373행이 확실한 결함이다. 3-03의4-03안내는일반lock-free설명으로맞으므로F7을유지했다. 렌더검사없이도고유구조와올바른연결이면F7~8가능하며F9이상은공통reading통과만으로자동부여하지않았다.

산술은492/3328/11.3을직접재계산했다. 표10행A~G/합계·이전점수/차이·필수source_file10개를기계검증한다. 성능·MCU검증·전체API대조를수행했다고주장하지않는다.
