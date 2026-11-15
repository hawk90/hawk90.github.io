# 공개 글 독립 재채점 — 루프 15

평가일 2026-10-18. 루브릭 v1.2·anchors·antipatterns(AP-C-23/24)를 적용했다. 기준 HEAD `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. 10편을 첫 행부터 끝까지 직접 읽고, 초벌 `double-check-evidence-15.md`와 기존 `published-loop-15.md`의 근거를 다시 대조했다. 본문·기존 보고서·사용자 미커밋 작업은 수정하지 않았다. 전편 score_status=잠정, confidence=중간이다.

기존 보고서 커밋 `ba9f71046915e5a7c2b2feb58f51539909e45c57`부터 대상 10편 및 아래 실제 D 비교 파일들의 diff는 없다. 따라서 아래 점수·게이트 차이는 원문 수정 효과가 아니라 기존 평가의 재판정이다. Modern Embedded Recipes는 **재채점 대상에서만 제외**되며 D 비교에는 사용할 수 있다. 초벌의 범위 충돌 의심은 기각했다. 앵커 UART=`part1-04-uart-hardware.md`(49), ISR=`part6-09-isr-api.md`(40), Build=`part7-05-kernel-build.md`(50)는 `git show 10550ca1:src/content/blog/embedded/modern-recipes/<파일명>`의 과거 전문을 읽었다. 현재 Recipes 수정본이나 Part12 이름 변경과 섞지 않았다.

아래 D/F의 같은 시리즈 짧은 파일명은 `src/content/blog/embedded/embedded-cpp/` 기준이다. RTOS는 `src/content/blog/embedded/rtos/practical-internals/`, Performance는 `src/content/blog/embedded/performance-engineering/`, Recipes는 `src/content/blog/embedded/modern-recipes/` 기준이다. 줄 번호는 현재 파일이며 D에는 실제로 읽은 양쪽 구간을 적었다. F는 링크 라벨 뒤 설명까지 확인하고 실제 slug·title·seriesOrder·공개 상태와 비교했다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `part3-06-error-handling-patterns.md` | 12 | 9 | 5 | 9 | 4 | 5 | 1 | 45 | 오류 확인 | 우선 조치 |
| `part3-07-expected.md` | 11 | 11 | 6 | 9 | 5 | 6 | 2 | 50 | 오류 확인 | 우선 조치 |
| `part3-08-no-rtti-design.md` | 11 | 11 | 6 | 11 | 7 | 5 | 1 | 52 | 오류 확인 | 우선 조치 |
| `part3-09-smart-pointer-choice.md` | 12 | 12 | 6 | 9 | 7 | 5 | 1 | 52 | 오류 확인 | 우선 조치 |
| `part3-10-ownership-model.md` | 10 | 10 | 5 | 10 | 6 | 5 | 2 | 48 | 미검증 | 병합 검토 |
| `part4-01-intrusive-containers.md` | 12 | 12 | 6 | 12 | 5 | 5 | 1 | 53 | 미검증 | 병합 검토 |
| `part4-02-etl-library.md` | 9 | 10 | 6 | 9 | 5 | 6 | 2 | 47 | 미검증 | 병합 검토 |
| `part4-03-lock-free-basics.md` | 10 | 11 | 6 | 7 | 7 | 6 | 1 | 48 | 미검증 | 병합 검토 |
| `part4-04-lock-free-container.md` | 10 | 10 | 6 | 7 | 7 | 7 | 1 | 48 | 오류 확인 | 우선 조치 |
| `part4-05-type-safe-flags.md` | 10 | 10 | 4 | 12 | 5 | 6 | 1 | 48 | 오류 확인 | 우선 조치 |

합계491, 평균49.1, 범위45~53. 우선 조치6편·병합 검토4편. 기존495 대비−4. 점수 동의6/10, 판정 동의7/10. P0는 본문 범위에서 미발견이며 전체 구체 주장 대조를 끝낸 글은 없다. [공통 게이트](double-check-gates-2026-10-18.md)의 check/build/links/sitemap/ads/anchors/reading 통과를 인용한다. 이를 본문 정확성 검증이나 모바일 육안 확인으로 간주하지 않았다.

| 파일 | 이전총점 | 새총점 | 차이 | 이전판정 | 새판정 | 항목 동의/변경 |
| --- | ---: | ---: | ---: | --- | --- | --- |
| `part3-06-error-handling-patterns.md` | 46 | 45 | -1 | 병합 검토 | 우선 조치 | B10→9: 공유 enum에 없는 InternalError를 컴파일로 확인. 나머지 동의 |
| `part3-07-expected.md` | 51 | 50 | -1 | 병합 검토 | 우선 조치 | B12→11: 기본 실패 예의 SomeError 컴파일 실패 확인. 나머지 동의 |
| `part3-08-no-rtti-design.md` | 55 | 52 | -3 | 병합 검토 | 우선 조치 | B12→11: any 불가 단정 반례; F7→5: 무링크 draft Visitor 상한. 나머지 동의 |
| `part3-09-smart-pointer-choice.md` | 52 | 52 | 0 | 우선 조치 | 우선 조치 | A~G 동의 |
| `part3-10-ownership-model.md` | 48 | 48 | 0 | 병합 검토 | 병합 검토 | A~G 동의 |
| `part4-01-intrusive-containers.md` | 53 | 53 | 0 | 병합 검토 | 병합 검토 | A~G 동의 |
| `part4-02-etl-library.md` | 47 | 47 | 0 | 병합 검토 | 병합 검토 | A~G 동의 |
| `part4-03-lock-free-basics.md` | 48 | 48 | 0 | 병합 검토 | 병합 검토 | A~G 동의; Recipes D 비교 허용 |
| `part4-04-lock-free-container.md` | 48 | 48 | 0 | 우선 조치 | 우선 조치 | A~G 동의 |
| `part4-05-type-safe-flags.md` | 47 | 48 | +1 | 우선 조치 | 우선 조치 | F5→6: 후행 concept 설명도 실제 대상에 있음. 기본 연결 정상. 나머지 동의 |

## 오류게이트 확인과 초벌 채택/기각

초벌의 줄 위치·대부분 D 중복·실측 조건 부재는 채택했다. 다만 초벌은 별도 최종 채점을 하지 않았으므로 ‘Luna 점수’와 비교한 표가 아니다. 기존 3건 오류 중 3-09의 산술과 4-04의 상반된 적용 조건은 유지했다. 4-05는 언어 의미를 요구하는 부분을 단순 산술 오류로 뭉뚱그리지 않고 추가 컴파일 근거를 뒀다. 새 오류3건은 아래 실제 실행 뒤에만 확정했다.

실행 환경은 Homebrew clang23.1.3, arm64-apple-darwin25.6.0, libc++ `_LIBCPP_VERSION=230103`, 헤더 `/opt/homebrew/Cellar/llvm/23.1.3_2/include/c++/v1/`이다. MCU 성능 측정이나 전체 예제 빌드가 아니다.

| 글 | 재현 입력·명령·관찰 | 게이트 |
| --- | --- | --- |
| 3-06 | 원문71~100행 enum을 그대로 추출, `<cstdint>` 추가 후 `Error operation(){return Error::InternalError;}`(372행의 반환식)만 검사. `clang++ -std=c++17 -fsyntax-only /private/tmp/adsense-loop15-error_enum.cpp` exit1, `no member named 'InternalError' in 'Error'`. 다른 도우미 함수 스텁 없음. | 공유 Error 정의와 실제 반환식 결합의 결함 확인. 미검증→오류 확인 |
| 3-07 | 원문29행 enum 그대로 + `Error failure(){return Error::SomeError;}`(60행의 에러 값). `clang++ -std=c++17 -fsyntax-only /private/tmp/adsense-loop15-expected_enum.cpp` exit1, `no member named 'SomeError' in 'Error'`. expected 라이브러리 문제로 확대하지 않는다. | 기본 실패 예를 앞서 제시한 Error로 구성할 수 없음. 미검증→오류 확인 |
| 3-08 | `#include <any>`와 `int main(){std::any a=42;auto* p=std::any_cast<int>(&a);return !p||*p!=42;}`. `clang++ -std=c++17 -fno-rtti -o /private/tmp/adsense-loop15-any /private/tmp/adsense-loop15-no_rtti_any.cpp` exit0, 실행 exit0. 본문285~286행과 같은 API가 RTTI 없이 성공. | 289·391행 ‘컴파일 에러라 any 사용 불가’의 보편 단정 반례 확인. 모든 구현의 any 기능을 검증했다는 뜻 아님 |
| 3-09 | 299~302행120/15=8, 1.2/0.15=8. 304행은10배. 표의 두 수치 축 모두8배다. | 같은 측정 비교의 산술 불일치 유지 |
| 4-04 | 258행 H2·261행 ‘여러 task가 consumer’ 및263행 하나의 SpscQueue 사용 ↔ 288행 ‘단일 task’·324행 ‘producer와 consumer 정확히 하나씩’. 별개의 다른 예를 비교한 것이 아니라 동일 EventBus 적용 조건이 상반된다. | 내부 적용 조건 모순 유지. 실제 다중 consumer 실행 검증은 별도 |
| 4-05 | 원문185행 Permission·298~317행 Flags 정의·320~322행 사용을 추출하고 `<cstdint>`, `<type_traits>`, main만 추가. `clang++ -std=c++17 -fsyntax-only /private/tmp/adsense-loop15-flags_wrapper.cpp` exit1, `no viable overloaded '\|='`. | 이미 오류 확인인 상태 유지, 언어 결함에 독립된 컴파일 근거 추가 |

4-05의 AnyError는 원문98~101행 all-bits 식을 UartStatus에도 일반화한다는 가정 아래 2 & 30 = 2 ≠ 30이므로 단일 Overrun에서 false다. 그러나 현 has_flag는 Flag 전용이라 원문의 UartStatus 호출 그대로를 실행했다고 쓰지 않는다. 212행 마스크는 pin5에서10~12비트를 지워 2비트 stride의 다음 필드 비트12도 지운다. 이는 자체 비트 배치 결함이며 실제 STM32 레지스터 인코딩의 정오 판정은 아니다. 오류게이트는 위 실제 Flags 컴파일 실패만으로도 유지된다.

초벌의 7편 ‘미검증 지지’ 중3-06/07/08은 추가 실행으로 변경했다. 3-08 F7 유지는 무링크 draft도 예외 없이 F≤5라는 규칙 때문에 기각한다. 4-03/04의 시리즈명→preface 링크는 정상이고, 초벌의 ‘소개 글이라 문제 후보’라는 암시는 채택하지 않는다. 4-01은 후행 ‘RTOS scheduler’까지 있어 본문 구현 안내로는 약한 별도 사례다. 4-05의 Type Traits 뒤 ‘concept 활용’은 대상205~222행에 실제 concept 예가 있으므로 오안내가 아니다.

## 글별 근거

### part3-06-error-handling-patterns.md

source_file: `src/content/blog/embedded/embedded-cpp/part3-06-error-handling-patterns.md`

score_status: 잠정 · score:45 · confidence:중간 · factcheck:오류 확인 · anchor_ref:ISR, UART. blockers:P0 미발견/P1 공유 enum의 반환식 컴파일 실패. uncertainties:167~170행 ErrorContext와 Result 별칭 호환, .noinit/CRC/종단 및 인증 규칙353~379행 미대조. 15/28행 결정 수 차이는 단순 개수 문제다.

| 항목 | 근거 |
| --- | --- |
| A12 | 30~174행 fatal/recoverable·숫자 범위 표준화·전파,309~349행 CrashInfo 통합은 단순 API 목록보다 낫다. 그러나 실제 장애 사례나 선택 검증은 없어 UART/ISR 앵커 부근이다. |
| B9 | 30~379행 시스템 패턴은 이어지나 enum 실패·Context 결과형 의심이 핵심 통합을 약화한다. description5행 exception-free RAII는 자체 RAII 구현으로 이어지지 않는다. 정확성 의심으로 B≤13. |
| C5 | 237~263행 retry/fallback 예와326~346행 저장 예는 있지만 실행 조건·관찰 결과가 없다. 425~445행8/10/16/18/312B는 compiler·flags·측정원문 없음. §3-1 C≤8 적용. |
| D9 | 이 글132~172행 chain/context ↔ part3-05 210~273행, part3-07 113~144·194~214행. 이 글425~447행 ↔ 3-07 298~323행은 반환 비용 비교 뼈대 중복. 이 글309~349행 ↔ Recipes part10-12-postmortem-analysis.md87~150행은 reset 뒤 crash 보존으로 질문 일부 중복이나 이 글은 에러 시스템 통합, 비교글은 dump 분석이다. |
| E4 | 2행 errno·optional 비교 약속 대비 errno는 구현/비교가 없고 optional은393·434~436행 한두 줄이다. 제목의 비교 범위를 충족하지 못한다. |
| F5 | 19·303·460~462·467행→3-05/4-06/3-07 공개·제목·주제 대응, next order25 확인. 463행 무링크 Pattern40은 실제 refactoring-catalog/pattern40-introduce-assertion.md9행 draft:true. F≤5. |
| G1 | 351~379행 인증·425~445행 수치에 본문 1차 자료·toolchain 판 없음. 공통 저자 템플릿은 세지 않았다. |

병합 대상:part3-05의계층화절·part3-07의Result/chain절. 다음 조치:오류 수정 후 시스템 에러 분류·복구 역할로 보강하고 중복 예는 정본 링크로 줄인다.

### part3-07-expected.md

source_file: `src/content/blog/embedded/embedded-cpp/part3-07-expected.md`

score_status:잠정 · score:50 · confidence:중간 · factcheck:오류 확인 · anchor_ref:Build, ISR. blockers:P1 기본 실패 enum 예 미성립/P0 미발견. uncertainties:92~98행 지원판·tl최소표준,131행tl/std혼용,202~204행Result 두 인자 alias 전제,261행예외비활성실패경로,281·332행nodiscard 미검증.

| 항목 | 근거 |
| --- | --- |
| A11 | 146~237행 driverchain·에러변환·combine 응용은 있지만 대부분 expected 입문 관용구다. Build보다 구조화했어도 관찰 기반 고유 결론은 없다. |
| B11 | 17~252행 문제→기본→layout→지원→monadic→응용 완결. 60행 실패 예를 앞 enum으로 쓸 수 없고 alias/API 전제가 빠져12→11. B≤13. |
| C6 | 31~43행divide검사·155~172행driverchain은 실행 가능한 절차 전체가 아니다. 302~321행sizeof/4~8instructions에 compiler·옵션·소스 없음. §3-1 C≤8. |
| D9 | 28~44·98~111·117~144행 ↔ part3-05 121~164·254~271행. 177~192·302~323행 ↔ part3-06 118~129·425~447행. divide31~35행 ↔ part1-08-cpp-standard-choice.md241~244행. combine220~237행 전용 질문은 남는다. |
| E5 | 2행‘분석’대비74~86행layout정성소개,298~323행조건없는수치. API 예제 중심으로 분석 약속3~5구간. |
| F6 | 336~338행3-05/06/1-08라벨과내용대응,343행3-08next order26맞음. 339행은RustResult공식문서URL. 기본 H2 흐름은 기능하나 글 고유 전제·실험 안내가 약하다. |
| G2 | 102행TartanLlama저장소URL·339행Rust문서는있으나C++표준/API판·비용주장에직접출처없음. |

병합 대상:part3-05/06의expected소개·chain. 다음조치:기본예·판별되는결과를검증하고expected정본으로보강.

### part3-08-no-rtti-design.md

source_file: `src/content/blog/embedded/embedded-cpp/part3-08-no-rtti-design.md`

score_status:잠정 · score:52 · confidence:중간 · factcheck:오류 확인 · anchor_ref:Build, ISR. blockers:P1no-rtti에서any불가단정반례/P0미발견. uncertainties:83행TypeOf이름조회·303~308행대안클래스선언을하나의TU로합칠지,361행std::function제한범위·variant방문비용·Boost.TypeIndex구현미대조. 서로 다른 대안을 같은 TU에 억지로 이어 붙인 오류는 확정하지 않았다.

| 항목 | 근거 |
| --- | --- |
| A11 | 44~276행enum/variant/CRTP/type-id대안과293~326행event응용을묶지만표준입문범위. 실제교체사례나선택검증은없다. |
| B11 | 세대안·type-id·any·event·함정흐름은완성. 289·391행의핵심사용불가결론이반례로깨져12→11, 정확성의심B≤13. |
| C6 | 127~149행visit분기예는있지만실행조건없다. 368~382행STM32F4표는두옵션을함께바꾸고compiler/프로그램/명령없어RTTI단독효과검증아님. §3-1 C≤8. 58−38=20KB와35%반올림은맞다. |
| D11 | 19~31·44~211행 ↔ part1-02-compiler-flags.md120~147행은요약/심화역할이갈린다. 141~149·313~323행 ↔ part4-06-state-machine.md104~130행visit구조,187~211행 ↔ part2-08-static-polymorphism.md64~86행CRTP구조. 366~382행 ↔ part3-05 367~383행크기표뼈대. RTOS part4-13 252~265행은플래그개괄이라전용대안질문은남는다. |
| E7 | 2·5행dynamic_cast대체/정적분기를44~276행이행. 구현의제약이남아9점이상아님. |
| F5 | 185·189·396~398행→4-06/2-08/1-02실제내용대응,403행3-09next order27맞음. 그러나399행GoF23Visitor는무링크이고실제gof-design-patterns/item23-visitor.md9행draft:true. 고유구조가있어도F≤5상한이먼저다. |
| G1 | 27~29·76·368~384행비용/크기주장에본문출처·버전없다. local검증은본문출처G가점아님. |

병합 대상없음. 다음조치:독립No-RTTI대안질문으로보강. any/함수래퍼의구현별범위부터수정하고draft안내를정리한다.

### part3-09-smart-pointer-choice.md

source_file: `src/content/blog/embedded/embedded-cpp/part3-09-smart-pointer-choice.md`

score_status:잠정 · score:52 · confidence:중간 · factcheck:오류 확인 · anchor_ref:UART, Build. blockers:P1표8배/결론10배산술/P0미발견. uncertainties:42·94·101·274행ABI별크기·atomic카운터범위·intrusive-refcount계약미대조. 193~218행factory의직접new와262행make_unique권고는전제가다르므로별도오류로묶지않았다.

| 항목 | 근거 |
| --- | --- |
| A12 | 67~84행pooldeleter·187~220행결정트리/factory·222~254행optional대안이임베디드선택에도움되나실측근거없음. |
| B12 | 28~185행각포인터→선택/응용→함정→측정→직접refcount로끝까지이어진다. 성능결론산술이틀리고intrusivewrapper는326행생략이커B≤13. |
| C6 | 46~62·195~218행예는있으나환경·독립빌드·관찰없다. 297~304행수치조건없어§3-1C≤8, 표산술결론도오류다. |
| D9 | 276~281행cycle ↔ part3-10 333~338행동일예. 157~185·241~254행 ↔ 3-10 51~71·305~323·170~183행observer/Guidelines/optional반복. 67~84·270~274행 ↔ part2-02-raii-patterns.md198~226행pool·functiondeleter. 차이는포인터선택트리다. |
| E7 | 2·5행unique/shared/custom선택을28~254행이행. 15행‘shared거의회피’는113~115행예외조건과양립하는권고로보았다. |
| F5 | 342~345행2-01/02/3-03/10라벨및설명맞고350행next3-10 order28맞음. 346행Pattern33은무링크·실제refactoring-catalog/pattern33-change-reference-to-value.md9행draft:true라F≤5. |
| G1 | 180행Guidelines이름만있고링크없음. 297~302행측정·42행크기보장의출처/판없음. |

병합 대상:part3-10소유권·part2-02customdeleter중복부분. 다음조치:산술수정뒤선택트리의독립의도를살려보강.

### part3-10-ownership-model.md

source_file: `src/content/blog/embedded/embedded-cpp/part3-10-ownership-model.md`

score_status:잠정 · score:48 · confidence:중간 · factcheck:미검증 · anchor_ref:ISR, Build. blockers:P0미발견/기술주장대조미완료. uncertainties:89행borrower함수scope정의와113~130행멤버borrow용어불명확,358행참조멤버copy/move설명·323행gsl주장·374~390행버그감소실측미검증. 284~286행빈lambda는const문제있는호출을하지않으므로새오류근거로사용하지않았다.

| 항목 | 근거 |
| --- | --- |
| A10 | 98~186행함수/멤버결정표·189~303행RTOS/callback응용은있으나일반owner/observer설명중심. |
| B10 | 30~186행역할/결정→RTOS/callback→Guidelines→함정흐름. borrower용어의범위가흔들리고소유권명시만으로버그완전소멸390행은근거부족. B≤13. |
| C5 | 203~235행queue/pool예는있으나초기화·고갈실패·예상관찰없다.374~390행1주스트레스수치에프로젝트/환경/로그없어§3-1C≤8. |
| D10 | 333~338행 ↔ part3-09 276~281행cycle동일. 51~71·305~323·170~183행 ↔ 3-09 157~185·241~254행observer/Guidelines/optional반복. 다음part4-01 19~49행은intrusivelink질문으로다르다. RTOS소유권전달189~266행이라는역할은남는다. |
| E6 | 2행single/shared/borrow를30~186행다루지만shared는104·176행표중심. 15행한owner원칙과드문shared예외는권고범위차이로보며기계적으로모순확정하지않음. |
| F5 | 403~404행3-09/2-01맞고410행next4-01 order29와intrusive설명맞음.405행Pattern33무링크·draft로F≤5.406행은CoreGuidelinesResourceManagement의실제절을가리킨다. |
| G2 | 406행1차Guidelines링크는있지만개별주장조항·GSL판·측정환경연결이없다. |

병합 대상:part3-09중복선택/함정부분. 다음조치:함수borrow·보관observer구분과RTOS전달계약으로차별화보강.

### part4-01-intrusive-containers.md

source_file: `src/content/blog/embedded/embedded-cpp/part4-01-intrusive-containers.md`

score_status:잠정 · score:53 · confidence:중간 · factcheck:미검증 · anchor_ref:ISR, UART. blockers:P0미발견/표준·API대조미완료. uncertainties:70~76행sentinel초기화·229행std::listerase복잡도·232행표준시점·322~330행pool객체수명·354/362/371행어느listAPI인지미검증. 서로다른library예를자작IntrusiveList와같다고전제해컴파일오류확정하지않았다.

| 항목 | 근거 |
| --- | --- |
| A12 | 99~168행두link멤버·288~344행readyqueue/eventpool통합으로일반목록보다구체적이나실제프로젝트측정은없다. |
| B12 | 19~168행구조/자작→Boost/ETL→tree/hash→응용/함정. tree258~273행과hash275~286행은최소형선언에그쳐description의설계범위를완결하진못함. B≤13. |
| C6 | 156~165·325~340행사용예있으나실행관찰/환경없음.386~404행STM32F4외조건부재로§3-1C≤8. cycles/ms는1MHz를전제하면일치하므로내부산술오류로올리지않음. |
| D12 | 238~252행intrusive_list ↔ part4-02 77~90행pool형list는역할다름.314~344행eventpool ↔ part3-03 39~55행freelist는기법만인접.292~310행priorityqueue ↔ RTOS part2-01-ready-list.md48~55행,80~87행container_of ↔ RTOS part5-02-zephyr-source.md104~108행은일부중복. intrusive전담역할은남는다. |
| E5 | 2행‘분석’대비주로API소개/구현조각,386~404행측정의방법·근거없음. 분석약속3~5구간. |
| F5 | 417~419행3-01/03/4-02공개·내용대응,424행next4-02 order30와컨테이너/FSM맞음.420행후행‘RTOS scheduler’까지확인: RTOS00-preface는2행시리즈소개이며72~88행학습목록일뿐scheduler구현으로바로안내하지않는다. 기존F5유지. 같은시리즈명만있는4-03/04와구분한다. |
| G1 | Linux/Boost/ETL이름55·170·236행은있어도본문공식출처·판·표준조항없음. |

병합 대상없음. 다음조치:독립intrusive질문으로보강. 표준/API검증·대상실행조건과링크정확도부터확인.

### part4-02-etl-library.md

source_file: `src/content/blog/embedded/embedded-cpp/part4-02-etl-library.md`

score_status:잠정 · score:47 · confidence:중간 · factcheck:미검증 · anchor_ref:ISR, Build. blockers:P0미발견/ETL버전과설정대조미완료. uncertainties:70·75행초과string검사,140행delegate크기,145~146행API,327~341·384행초과/예외설정,391행지역객체bss단정미대조. ETL모드조건이달라질수있으므로예외/무시/abort표현만보고내부모순확정하지않음.

| 항목 | 근거 |
| --- | --- |
| A9 | 39~305행container/delegate/observer/fsm/router목록은공식입문재구성수준. 고유선택판단은394행요구따라선택정도로Build앵커부근. |
| B10 | 39~346행기본→특수기능→설정/에러완결.15행factory약속은별도사용예없고고갈동작/모드재현이빠짐. B≤13. |
| C6 | 195~243행상태이벤트·255~277행router사용은구체적이나설정/빌드/예상관찰없음.350~364행보드이름외조건없어§3-1C≤8.6.2/0.4=15.5이므로15배근사만으로오류확정안함. |
| D9 | 41~75·92~103행ETL예 ↔ part3-01 69~84행,120~140행delegate ↔ 3-01 283~301행,350~364행수치 ↔ 3-01 387~395행.179~246행FSM ↔ part4-06 197~248행뼈대. RTOS part4-13 226~250행은요약후이글링크라전용ETL역할은남는다. |
| E5 | 2행‘분석’대비container/API목록과주장형측정이중심,analysis3~5구간.5행FSM/router약속은179~280행이행. |
| F6 | 248·421~423행4-06/3-01/4-01라벨·내용맞음,428행next4-03 order31및atomic/CAS/memoryorder대응.424행ETL홈URL있음.기본구조정상,고유전제/실험길잡이는약함. |
| G2 | 37·424행ETL공식홈출처는있으나릴리스판·API문서조항·측정source없음. |

병합 대상:part3-01 ETL소개·part4-06 FSM재수록부분. 다음조치:ETL정본역할로보강,버전별설정·용량초과의관찰부터확인.

### part4-03-lock-free-basics.md

source_file: `src/content/blog/embedded/embedded-cpp/part4-03-lock-free-basics.md`

score_status:잠정 · score:48 · confidence:중간 · factcheck:미검증 · anchor_ref:ISR, UART. blockers:P0미발견/ARM·C++주장대조미완료. uncertainties:15·219·256행deterministic/ISR안전범위,65~71행명령수,260~274·329행M0atomic일괄미지원,302행4byte기준·313~321행측정미검증.28~41행은mutex대안과atomic대안을분리한설명이라하나의TU중복정의만으로새오류확정하지않았다.

| 항목 | 근거 |
| --- | --- |
| A10 | 46~138행atomic/CAS/ABA/order는일반입문,140~256행ISRcounter/SPSC/criticalsection은임베디드응용이나실제트레이드오프관찰없음. |
| B11 | API→ABA/order→ISR/SPSC→MPMC→코어한계→함정흐름은완결. 기술범위의불확실이남아B≤13. |
| C6 | 161~217행queue사용예있으나컴파일/실행/실패관찰없음.313~319행M4counter수치에compiler/clock/방법없어§3-1C≤8. |
| D7 | 160~195·96~115·221~231·297~302행 ↔ part4-04 38~68·137~142·220~256·334~339행구현/ABA/library/함정반복.75~85행 ↔ part3-03 260~296행CASfreelist패턴. Performance part4-07-lock-free.md34~58·110~145·170~237행 ↔ 이글69~138·156~231행CAS/회수/SPSC질문. Recipes part9-01-lock-free-ring.md17~51·65~103행 ↔ 이글156~219행ring/order/ISR질문. std::atomic기본API입문역할은남지만중복상당. |
| E7 | 2·5행atomic/order/CAS를46~199행구체API와예로답한다.수치검증부재만으로제목불일치로바꾸지않음. |
| F6 | 334~335행4-04/3-03‘atomicfreelist’는대상260~296행에있음.341행next4-04 order32및queue/stack/SPSC/MPMC내용맞음.336행은시리즈명만이므로RTOSpreface정상.337행CppCon은검색URL이라특정강연근거는못되나없는페이지오류는아님. |
| G1 | 44·65·260행ARM동작과313~319행수치에본문1차자료없음. YouTube검색은특정주장출처가아님. |

병합 대상:part4-04SPSC/ABA공통절. 다음조치:입문API와구현심화를분리해보강,ARM자료대조후ISR안전조건확정.

### part4-04-lock-free-container.md

source_file: `src/content/blog/embedded/embedded-cpp/part4-04-lock-free-container.md`

score_status:잠정 · score:48 · confidence:중간 · factcheck:오류 확인 · anchor_ref:UART, ISR. blockers:P1동일EventBus의다중/단일consumer조건충돌/P0미발견. uncertainties:156·389·406행코어atomic범위·373~375행DMA/exclusive동작·LockFreePool수명/순서·Treiber노드회수미대조.141행32bit대상64bit묶음과153행64bit대상16byte는서로다른조건이라내부모순으로추가하지않음.

| 항목 | 근거 |
| --- | --- |
| A10 | 36행재수록명시SPSC,95~164행Treiber/tag,220~256행library목록중심.170~216행pool·260~286행EventBus가고유하지만실제관찰없음. |
| B10 | SPSC→false-sharing→stack/pool→library→ISR→측정/한계로완결.258~288행적용조건충돌과tag구현/회수생략으로B≤13. |
| C6 | 38~68·170~216·260~309행구현조각은있다.315~322행M4/1Mops외실행조건·방법·출처없어§3-1C≤8. 측정비율8x/4x/5x근사는자체모순아님. |
| D7 | 38~68·137~142·224~237·334~339·406행 ↔ part4-03 161~194·96~113·221~229·297~302·329행대폭반복.95~164·38~68행 ↔ Performance part4-07-lock-free.md79~145·194~222행stack/tag/SPSC질문.38~68·220~256행 ↔ Recipes part9-10-mpmc-queue.md110~139·157~177행SPSC/Boost/moodycamel. Recipes part9-01 17~51행도SPSC전담. 고유pool/EventBus를남겨역할재설계필요. |
| E7 | 2·5행SPSC/ring/stack구현은30~216행에있다.258행다중task는같은예본문288행과불일치하여제목이행의신뢰도낮음. |
| F7 | 19·36행전제4-03·168행3-03심화관계가실제내용과맞음.410~413행4-03/3-03/4-01/RTOS시리즈명라벨정상,417행next4-05 order33맞음.구현단계와전제안내로7. RTOS시리즈소개라는이유만으로감점안함. |
| G1 | 222~256행library판/URL·358~375행ARM출처·315~322행측정조건없음. |

병합 대상:part4-03공통입문절. 다음조치:EventBus조건오류우선수정후전용구현/실패조건으로보강.다른시리즈는차별화비교대상이다.

### part4-05-type-safe-flags.md

source_file: `src/content/blog/embedded/embedded-cpp/part4-05-type-safe-flags.md`

score_status:잠정 · score:48 · confidence:중간 · factcheck:오류 확인 · anchor_ref:ISR, UART. blockers:P1Flags의존재하지않는복합연산자사용/P0미발견. uncertainties:216·255·282행Flag전용has_flag를다른enum에호출,196~224·232~246행실제STM32registerencoding,291행reflection시점,383~391행asm미검증. AnyError판정의API가정과bit산술은오류표에서분리했다.

| 항목 | 근거 |
| --- | --- |
| A10 | 60~187행enum연산자/trait/concept/macro는일반관용구,196~259행GPIO/UART응용은있으나검증되지않고필드폭문제도있다. |
| B10 | 문제→연산자→자동화→register→문자열→wrapper→함정흐름.322행wrapper사용실패확인,has_flag일반화도없고제목Tag절이없어B≤13. |
| C4 | 코드많아도실행조건·관찰없음.383~391행asm은compiler/flags/target없어§3-1C≤8.322행정상예컴파일실패와212~213행stride문제로ISR앵커의낮은실전성수준. |
| D12 | 196~224행MODER타입안전쓰기 ↔ part5-01-register-abstraction.md154~170행같은질문,방식/마스크폭다름. 인접part4-04 38~68행SPSC와part4-06-state-machine.md52~65·104~130행state전이는다른질문. 연산자자동화122~189행전담역할은남는다. |
| E5 | 2행EnumClass/StrongTypedef/Tag중Tag미이행,293~327행Flagswrapper만으로strongtypedef의전체약속을답하긴어려워키워드절반이상미이행3~5구간.5행description은연산자주제와맞음. |
| F6 | 405행TypeTraits—‘concept활용’은대상part2-09 205~222행Stringifiableconcept가있어맞음.406행Register추상화—‘type-saferegister’는5-01 154~170행,407행GPIO는5-02제목/주제맞음.411행next4-06 order34와enum+switch/variant설명52/104행대응.기본구조정상이라6; 고유실험/전제안내없어7은아님. |
| G1 | 291행표준시점·196~259행MMIO·383~391행asm주장에본문1차출처/버전없음. |

병합 대상없음. 다음조치:연산자자동화독립의도로보강. wrapper복합연산자예/any-all검사/실제MCU필드계약을먼저검증하고제목범위를맞춘다.

## 공통 문제와 스냅샷

10편 모두 출처·환경 없는 측정/asm 절이 있어 C≤8을 적용했다. 사실 불확실이 열려 있어 B≤13이다. 표준·라이브러리·MCU를 한데 묶은 단정, 반복 H2와함정, 인접예제재수록은시리즈공통문제다. 무링크draft관련항목은3-06/08/09/10에서F≤5로일관되게적용했다. 구체 주장 출처가 없다는 이유만으로 오류라고 하지 않았고 완곡/단정·권고/예외 차이도 자동 오류 처리하지 않았다.

시작과 종료 시 SHA-256이 같음을 확인했다(평가 중 본문 변경 없음). 각 행의 전문 읽기 범위와 해시는 다음과 같다.

| 파일 | 전문 | SHA-256 |
| --- | --- | --- |
| part3-06-error-handling-patterns.md | 1~467행 | 550a0ba0ec84c6c9ecdc3565d5b50c037e81b7df3651ba0f4030bb73b8d53827 |
| part3-07-expected.md | 1~343행 | a27131bb19e43d41a6466cea2edd6477d8120f2768d3212c51cb3abdf68d7a85 |
| part3-08-no-rtti-design.md | 1~403행 | 97c1051ed7e920031ead6dcc8fbfbf0e37bbaa22a845314341eb3eb1c8959462 |
| part3-09-smart-pointer-choice.md | 1~350행 | db3eea33eeeac997bde0421570dcd7a3497a182f72368100e8dfaa124676b5cb |
| part3-10-ownership-model.md | 1~410행 | 7f5b0c5934c1926bc2c36c59ea13f994d5f6a7f951b487e36e95d14358baef9b |
| part4-01-intrusive-containers.md | 1~424행 | 874f797d76ad3d1d092fcf8524eb711346853174f44be2640708f303b3b691e7 |
| part4-02-etl-library.md | 1~428행 | f5636c585039d05ef66991a50d2fe5c96caacc2ba7aff5c8a780384a7dbc5a4e |
| part4-03-lock-free-basics.md | 1~341행 | f65ecd8a0071193e78e8f29aa43151f46154ff723e0488ab5faa0e69a2223e14 |
| part4-04-lock-free-container.md | 1~417행 | 7fa99a74fa05b0c8bfa93e838f602ed584fb227ad1921ddb57b4a5b1aa9d8a5c |
| part4-05-type-safe-flags.md | 1~411행 | 14b6bc1b6ef4f3a0e5aa1d626377dc301ef25fa55c265a6c0e8c268220cbcb6d |
