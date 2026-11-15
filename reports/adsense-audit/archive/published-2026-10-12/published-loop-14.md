# 공개 글 AdSense 평가 — 루프 14

> 대상: 공개 글 10편 (Embedded C++ for Real Systems, `seriesOrder` 14~23)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 열네 번째 루프다. 대상은 `src/content/blog/embedded/embedded-cpp/`의 Part 2 후반(part2-06~part2-10, 템플릿·CRTP·type traits·concepts)과 Part 3 앞부분(part3-01~part3-05, 동적 할당 회피·allocator·pool·pmr·no-exception) 10편이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. `score_status`는 모두 잠정이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part2-06-templates-basics.md` | 11 | 12 | 7 | 10 | 5 | 7 | 1 | **53** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `part2-07-templates-cost.md` | 11 | 11 | 6 | 10 | 6 | 7 | 2 | **53** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `part2-08-static-polymorphism.md` | 11 | 12 | 6 | 11 | 6 | 5 | 1 | **52** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `part2-09-type-traits.md` | 13 | 14 | 7 | 11 | 6 | 7 | 1 | **59** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part12-10-on-device-llm.md` |
| `part2-10-concepts.md` | 11 | 12 | 5 | 11 | 7 | 7 | 1 | **54** | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `part3-01-no-dynamic-alloc.md` | 10 | 11 | 6 | 9 | 7 | 7 | 2 | **52** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part6-09-isr-api.md` |
| `part3-02-custom-allocator-basics.md` | 10 | 10 | 5 | 10 | 5 | 5 | 1 | **46** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `part3-03-pool-allocator.md` | 11 | 10 | 6 | 8 | 7 | 7 | 1 | **50** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part3-04-pmr.md` | 10 | 10 | 6 | 11 | 6 | 6 | 1 | **50** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `part3-05-no-exception-design.md` | 10 | 10 | 6 | 8 | 6 | 7 | 1 | **48** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |

평균 51.7점(10편, 합 517점), 범위 46~59점이다. 판정은 우선 조치 6편, 병합 검토 4편이고 유지·검증 대기·보강·제외 검토는 없다. 10편 모두 점수 구간은 병합 검토(40~59)이며, 오류 확인 6건(part2-06·2-07·3-02·3-03·3-04·3-05) 때문에 6편이 우선 조치로 올라갔다. 오류 확인 5건은 원문 내부 산술 불일치·모순이고, 1건(part3-04)은 내부 모순에 더해 libc++ `memory_resource.h`·`monotonic_buffer_resource.h`를 열어 확인한 1차 자료 근거가 있다. 10편 모두 git log에 1차 자료 대조 커밋이 없어 '검증됨'은 0편이다. P0는 찾지 못했다. 확인 범위는 각 글 본문 전체, 다음 편 안내의 실제 seriesOrder+1 파일, 관련 항목 링크 대상 파일의 제목·seriesOrder·`draft`까지이고, 렌더링·광고 배치·sitemap은 보지 않았다. 시리즈 공통 H2 뼈대는 글 단위 P0가 아니라 시리즈 단위 scaled content 점검 대상으로 넘겼다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `part2-06-templates-basics.md` | 55 | 53 | -2 | 없음 |
| `part2-07-templates-cost.md` | 53 | 53 | 0 | 없음 |
| `part2-08-static-polymorphism.md` | 53 | 52 | -1 | 없음 |
| `part2-09-type-traits.md` | 59 | 59 | 0 | 없음 |
| `part2-10-concepts.md` | 54 | 54 | 0 | 없음 |
| `part3-01-no-dynamic-alloc.md` | 52 | 52 | 0 | 없음 |
| `part3-02-custom-allocator-basics.md` | 46 | 46 | 0 | 없음 |
| `part3-03-pool-allocator.md` | 50 | 50 | 0 | 없음 |
| `part3-04-pmr.md` | 50 | 50 | 0 | 없음 |
| `part3-05-no-exception-design.md` | 47 | 48 | +1 | 없음 |

- 기각한 오류 확인: 없다. 평가자가 올린 오류 확인 6건(part2-06·2-07·3-02·3-03·3-04·3-05)을 원문에서 다시 계산·대조해 모두 유지했다.
- 추가한 오류 확인 근거: part3-03 41행 '할당된 블록의 메모리에는 next pointer를 저장해 둡니다'와 59행 'free list에서 빠져나온 block0의 메모리는 그 순간부터 사용자 몫'(66~69행 union 설계)이 동시에 참일 수 없다. next 포인터는 free 블록에 저장된다. 평가자가 든 411~413행 multi-pool 모순에 더한 두 번째 근거다. 판정은 원래 오류 확인이라 바뀌지 않는다.
- part2-06 E 6→5: 제목(2행)이 '분석'을 약속하는데 본문은 53~309행 개념 소개가 대부분이다. 루브릭 E 규칙('분석' 약속 + 개념 소개 수준이면 3~5)을 적용했다. G 2→1: 본문에 참고자료가 전혀 없어 'G 2~3 = 참고자료는 있으나 연결이 약함'에 해당하지 않는다(anchor part1-04도 G 1).
- part2-08 E 7→6: 측정 절(435~465행)이 도구 출력 없는 예시 어셈블리와 출처 없는 바이트 수뿐이고 본문 대부분이 개념 소개다. anchor_ref를 part6-09에서 part1-04로 바꿨다(교과서 설명 + 대상 MCU 없는 레지스터 코드 + 출처 없음).
- part3-05 E 5→6: 'No-Exception 설계'와 '코드 크기'는 본문(30~365행, 21·332·367~383행)이 다루고 '결정성'(22행 한 줄)만 거의 빠졌다. 키워드 하나가 빠지면 6~8 구간 감점이고, 3~5는 절반 이상이 빠졌을 때다. 이 때문에 최종 점수가 1차보다 1점 높지만 루브릭 규칙 적용이라 부풀림이 아니다.
- part3-05 D: 점수 8 유지, 다른 시리즈 공개 글 `rtos/practical-internals/part4-13-cpp-in-rtos.md` 53·265행과의 부분 반복을 비교 근거에 추가했다(평가자는 draft인 abseil 글만 비교했다).
- 줄 번호·근거 보정(점수 영향 없음): part2-06 A(15·23·413행, 51행 제외)·D(part5-02 어셈블리 120~124행, jsf-cpp·autosar-cpp 경로 정정), part2-07 D(part1-04 process 예 258~268행·nm 출력 273~277행, '같은 예'→'유사한 예', modern-recipes part8-10 143~155행), part2-08 D(part5-04 116~133행, part3-08 187~208행), part2-09 series_issues(2-10 380~392행, '40편'→'대부분'), part2-10 F·D(part3-01 실제 title, part1-08 91행 문구 확인), part3-01 D(pmr 예제는 변수명만 다름, rtos 4-13 230·238행, 4-04 22행), part3-02 A·C(arena 199~227행, TaskArenaAllocator 235~269행), part3-03 D(rtos part4-05 26·178·230~232·284·313행, part2-02 199~217행 PoolDeleter 추가), part3-04 D(abseil part2-06 175~184행 추가)·C(process_orders·format_log 추가), part3-05 C(304·312행 `class Resource` 재정의).
- 부풀림 판정은 10편 모두 없음이다. part3-05를 뺀 9편은 최종 점수가 1차보다 같거나 낮다.

## 글별 근거

### `part2-06-templates-basics.md` — 53점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 안의 산술 모순(루브릭 3-1). 395~399행 표의 push·pop 크기 합은 24+28+28+32+32+36+80+96+64+72 = 492 B인데, 401행 '총 추가 코드: ~432 B'와 404행 '5개 타입 사용으로 432 B가 늘었습니다'는 432 B라고 적었다. 둘 다 참일 수 없다. git log에는 ba110225(작성), 815510c8·39149f68(폴리싱), 400892d7(linter), ac24bb76(제목 변경), be973200(topic), 0a9dd7bc(slug 고정), b12f53a8('Correct embedded C++ standard guidance', 본문 없음)이 있고, 1차 자료 이름을 댄 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 매크로·void*·템플릿 비교(19~51행), 함수·클래스 템플릿·non-type parameter(53~122행), specialization(207~249행), auto(251~276행), variadic(278~309행)은 C++ 입문서의 표준 목차다. 임베디드 예제 RingBuffer(126~161행), BSRR 오프셋을 쓴 Gpio<Port,Pin>(169~201행), big-endian Serializer(211~249행), fold expression uart_log(315~343행)가 이 글의 색이지만 널리 쓰이는 패턴이다. 15·23·413행 '비용 0'과 406행 '전체 프로젝트에서는 1% 이내'는 근거 없는 단정이라 분석으로 보지 않았다. |
| B | 12 | 문제(17~51행) → 함수·클래스 템플릿(53~122행) → 임베디드 예제 → 함정 6개(347~388행) → 크기 측정(390~406행) → 정리(408~414행)로 기본 흐름은 끝까지 간다. 코드에서 바로 도출되는 RingBuffer 실제 용량 N-1(140행 full 조건)을 말하지 않는다. 측정 절 합계 모순(401·404행)과 컴파일 여부가 열린 예제(288~308행, 322·328행)가 있어 AP-C-24에 따라 B ≤ 13. |
| C | 7 | 어셈블리 출력(72~80행, 195~201행)은 있지만 컴파일러·버전·최적화 플래그·대상 코어가 없다. 394~402행 크기 표는 측정 환경·명령이 없는 수치이고 합계도 맞지 않는다(출처·환경 없는 수치는 C ≤ 8). 288~308행 log/print_each와 322·328행 itoa(v, buf)·ftoa(v, buf)는 그대로 컴파일되는지 알 수 없다. |
| D | 10 | 인접 `part2-05-consteval-constinit.md`(13)는 겹치지 않는다. `part2-07-templates-cost.md`(15)와는 이 글 364~365행 bloat 함정·390~406행 RingBuffer 인스턴스 크기 측정이 2-07의 26~60행 nm 크기 출력·367~384행(375행 RingBuffer 6 instances)과 같은 질문이다. `part5-02-gpio-abstraction.md` 100·120~124행에 이 글 184행 LedRed = Gpio<0x40020000, 5>와 195~201행 어셈블리가 거의 그대로 있다. 다른 시리즈 a-tour-of-cpp chapter07, professional-cpp chapter12, effective-cpp item44, jsf-cpp chapter09, autosar-cpp chapter06은 모두 draft. modern-recipes part9-10 48행 static_assert는 같은 관용구지만 주제가 다르다. |
| E | 5 | 제목(2행)과 description(5행)은 본문 주제와 맞는다. 그러나 제목이 '분석'을 약속하는데 본문은 개념 소개(53~309행)가 대부분이고, 분석 근거는 환경 없는 어셈블리 두 조각과 합계가 맞지 않는 크기 표(394~404행)뿐이다. 대상 독자·전제 지식도 적지 않았다. |
| F | 7 | 426행 다음 글 안내는 seriesOrder 15 `part2-07-templates-cost.md`와 맞다. 관련 항목 418~422행 대상 다섯 개(2-07·2-08·2-09·2-10·5-02)를 열어 라벨이 제목과 맞음을 확인했다. 365·414행이 bloat 해법을 2-07로 넘기는 고유 안내다. 전제 지식 안내가 없고 폰 폭 렌더 확인을 하지 않아 9 이상은 주지 않는다. |
| G | 1 | 본문에 참고자료·출처 링크가 하나도 없다. 253·264·271·339행 표준 버전과 311행 'GCC 13 계열부터'에 cppreference·표준 조항·libstdc++ 릴리스 노트가 없다. 174~180행 레지스터 오프셋과 184~186행 주소는 대상 MCU·reference manual 판을 적지 않았다. |

uncertainties:
- 288~293행 log() 본문이 300행에서야 선언되는 print_each(args...)를 부른다. int·float 인자는 ADL 대상 namespace가 없어 2단계 이름 조회에서 컴파일 오류가 날 수 있고, log는 <cmath>의 ::log와 충돌할 수 있다. 언어 규칙으로 확인하지 않았다.
- 322·328행 itoa(v, buf), ftoa(v, buf)는 표준 함수가 아니고, 비표준 itoa도 보통 radix 인자를 받는다. 두 인자 시그니처의 출처가 없다.
- 311행 libstdc++ std::format 지원이 GCC 13부터라는 주장을 GCC 릴리스 노트로 확인하지 않았다.
- 394~401행 크기 수치의 컴파일러·플래그·코어가 없다. 406행 '1% 이내'는 출처 없는 수치다. 399행 측정 대상 RingBuffer<LogEntry, 16>은 160행 RingBuffer<LogEntry, 64>와 달라 392행 '같은 RingBuffer'와 어긋나 보인다(다른 인스턴스로 읽을 수 있어 오류 확인으로 올리지 않음).
- 186행 Button = Gpio<0x40020400, 13>과 `part5-02-gpio-abstraction.md` 101행 Button = Gpio<0x40020800, 13>('GPIOC pin 13')이 다르다. 다른 글과의 모순이라 factcheck가 아니라 이곳에 적는다.
- 159행 uart_rx를 ISR과 태스크가 함께 쓸 때 head_/tail_ 동기화가 없다. 1차 자료 없이 감점하지 않는다(AP-C-31).

병합 대상: 판정은 오류 확인 때문에 우선 조치이고, 점수 구간(병합 검토)상 후보는 `part2-07-templates-cost.md`(이 글 390~406행 측정 절과 364~365행 bloat 함정을 2-07의 26~60·367~384행으로 옮김)다. 다만 '템플릿 입문' 검색 의도는 2-07과 독립적이므로 다음 조치는 보강이다. 401·404행 합계를 고치거나 환경 없는 측정 표를 지우고 TBD로 두며, GPIO 절(167~205행)은 5-02와 겹치는 어셈블리를 줄이고 5-02로 링크한다.

### `part2-07-templates-cost.md` — 53점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 불일치(루브릭 3-1). 53~57행 nm 예시 출력의 크기는 0x200+0x200+0x2a0+0x2a0+0x3c0 = 512+512+672+672+960 = 3328 B인데, 60행은 '총 3344 B로 무시할 수 없는 크기입니다'라고 적었다. 99행 'Before: 3344 B'와 103행 '-80%'도 이 합계를 이어 쓴다. git log(0a9dd7bc slug 고정, be973200 topic 메타데이터, ac24bb76 제목 변경, 400892d7 린터, 39149f68 문체, 그 이전 작성 커밋)에 1차 자료와 대조한 커밋이 없어 산술 오류가 없었더라도 미검증이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 비-템플릿 helper 분리(62~104행), BufferBase로 N 분리(138~182행), extern template(184~212행), PCH·unity build(298~327행)는 템플릿 bloat 자료에 흔한 목록이다. 이 글만의 것은 before/after 크기(98~104행)와 'STM32 프로젝트' 인스턴스 분포(369~384행)인데 둘 다 환경이 없고 앞쪽 수치는 60행의 틀린 합계를 이어 쓴다. 310행 '30~50%', 327행 '40~70%', 384행 '검토해 봐야 합니다'는 완곡 표현이라 일반론으로 본다. 384행 std::function 대체 판단은 작성자 관점이 조금 있다. |
| B | 11 | 문제(17~24행) → bloat 출처(26~60행) → 패턴 5개(62~239행) → 측정 도구(241~278행) → 컴파일 시간(280~327행) → 함정(329~365행) → 실측(367~384행) → 정리(409~416행)로 흐름은 완성된다. 제목의 '디버그 정보'는 364~365행 두 문장뿐이고 측정 방법이 없다. 패턴 2(106~136행)는 variant visit 비용·한계를 말하지 않고, 140행 설명 문장이 절 제목·코드와 맞지 않는다. 정확성 불확실이 열려 있어 B ≤ 13. |
| C | 6 | nm(51행), bloaty diff(245~255행), 인스턴스 개수 nm(261~264행), PCH 명령·CMake 설정(302~316·322~325행)처럼 실행할 명령은 있다. 그러나 98~104행 before/after, 310·327행 감소율, 336행 '4~8바이트', 371~382행 '~5.5 KB (8% of code section)'에 컴파일러 버전·옵션·보드가 없어 C ≤ 8. 53~60행 예시 출력과 합계가 맞지 않아 실제 실행 결과인지 판단할 수 없다. |
| D | 10 | 같은 시리즈 `part1-04-code-size-analysis.md` 254행 '워크플로 3 — 템플릿 bloat 추적'이 유사한 process<T> 예(258~268행)와 nm 출력(273~277행)으로 이 글 28~60행과 겹치고, 197행 bloaty diff는 이 글 254행과 같다(1-04 286행이 상세를 이 글로 넘김). 인접 `part2-06-templates-basics.md` 364~365행은 링크뿐이다. `part2-08-static-polymorphism.md`는 214~239행과 같은 질문을 다른 기법으로 답한다. 다른 시리즈 `modern-recipes/part8-10-code-size-optimization.md` 143~155행 nm·bloaty가 측정 도구 절과 일부 겹친다. beautiful-cpp item23, autosar-cpp chapter06은 draft라 제외. |
| E | 6 | 제목(2행)의 코드 폭증·인스턴스화는 26~278행에서 다루지만 디버그 정보는 364~365행 두 문장뿐이라 키워드 하나의 부분 미이행이다. 제목에 없는 컴파일 시간·PCH·unity build·modules(280~327·386~407행)가 큰 비중이라 초점도 흐려진다. description(5행)은 본문과 맞는다. |
| F | 7 | 427행 다음 글은 seriesOrder 16 `part2-08-static-polymorphism.md`와 맞다. 420~423행 라벨을 대상과 대조했다: 2-06(14), 1-04(4), 2-08(16), 4-02(30) 모두 맞다. 19행이 전제 글 2-06을 본문에서 가리키고, 패턴 1~5 번호 절이 긴 글의 방향을 잡는다. 폰 폭 렌더 확인이 없어 9 이상은 주지 않는다. |
| G | 2 | 본문에 1차 출처 링크가 없다. 버전 표기는 323행 'CMake 3.16+'과 407행 'GCC 11+가 부분 지원'뿐이다. 측정의 컴파일러·옵션·대상 MCU(369행 '한 STM32 프로젝트')가 없고 extern template·PCH·modules 주장에 표준·GCC·CMake 문서 링크가 없다. |

uncertainties:
- 273행 static_assert 메시지에 __PRETTY_FUNCTION__을 넣는 코드는 C++26 이전 규칙(메시지는 문자열 리터럴)상 컴파일되지 않을 수 있다. 표준 조항으로 확인하지 않았다.
- 182행 'push_impl은 Buffer<T> 단위로 한 번만 컴파일'은 코드상 BufferBase<T>여야 할 것으로 보인다(이름 실수 여부 미확인).
- 122행 'std::variant … 코드는 한 번만 생성됩니다'는 visit이 대안 타입마다 람다를 인스턴스화한다는 점과 맞지 않을 수 있다. 1차 자료 미확인.
- 140행 절 제목 'non-template wrapper'와 문장 '매개변수만 non-type(값)으로 바꾸면 코드는 같지만 타입이 달라집니다'가 코드(BufferBase 분리)와 맞지 않는다.
- 407행 'GCC 11+가 부분 지원', '2026년 기준 임베디드 toolchain 대부분은 아직 미지원'은 출처 없는 날짜 앵커 주장이라 staleness 후보다.
- 310행 PCH 30~50%, 327행 unity build 40~70%, 336행 '4~8바이트', 381행 '~5.5 KB (8%)', 412행 '70% 이상'은 출처·환경 없는 수치다.
- 369~382행 'STM32 프로젝트(FreeRTOS + C++)' 측정이 실제인지 확인할 수 없다(보드·컴파일러·옵션 없음).

병합 대상: 판정은 오류 확인 때문에 우선 조치이고, 점수 구간상 후보는 `part1-04-code-size-analysis.md`(254~286행 워크플로 3이 이 글 26~60행과 비슷한 예를 씀)다. 1-04는 도구 중심이고 이 글은 bloat 통제 패턴(helper 분리, BufferBase, extern template)이라 독립 검색 의도가 있어 다음 조치는 보강이다. 60·99·103행 산술을 3328 B 기준으로 고치거나 근거가 없으면 지우고, 디버그 정보 측정(.debug_* 섹션 크기 등)을 채우거나 제목에서 빼고, 1-04와 겹치는 nm·bloaty 설명은 1-04 링크로 줄인다.

### `part2-08-static-polymorphism.md` — 52점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(f6126835 최초 작성, 815510c8·39149f68 폴리싱, 862fa1b8 TikZ 다이어그램, 400892d7 linter, ac24bb76 제목 변경, be973200 topic 메타데이터, 0a9dd7bc slug 고정)에 C++ 표준·Itanium/ARM C++ ABI·컴파일러 출력·STM32 reference manual과 대조한 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | Shape 예(28~55행), CRTP 구조(64~86행), Comparable mixin(237~273행), 단점·함정 목록(277~433행)은 CRTP 입문 자료의 표준 설명이다. 이 글만의 것은 USART2·SPI1 레지스터에 붙인 Logger·Peripheral CRTP(90~130행, 183~231행), virtual·CRTP 호출부 어셈블리 대조(134~142행, 439~463행), 100 객체·50 클래스 1000 B 절감 계산(465행, 400+600=1000으로 맞음)이다. 어셈블리는 컴파일러·버전이 없는 예시이고, 26행 '수 KB'와 465행 '작은 차이'가 결론을 흐린다. 선택 기준(467~477행)은 일반론이다. |
| B | 12 | 문제(17~26행) → 구조(60~86행) → 임베디드 예(88~231행) → 비교 표(152~160행) → 단점(277~310행) → concepts 결합(377~396행) → 측정(435~465행) → 선택 기준·정리(467~485행)로 흐름은 끝까지 간다. '단점'(277행)·'함정'(338행)·'자주 보는 함정과 안티패턴'(398행) 세 절이 겹친다(279~290행과 429~430행, 371~375행과 419~427행). 387·433·268행 정확성 의문이 열려 있어 AP-C-24에 따라 13 이하. |
| C | 6 | 437행 'ARM Cortex-M4, -O2'뿐이고 컴파일러·버전·objdump 출력이 없다. 450~451행 vtable 12 B·vptr 4 B, 465행 1000 B는 출처·환경 없는 수치라 C ≤ 8. 어셈블리(136~141행, 446~459행)는 실제 도구 출력이 아니라 예시이고 459행 '인라인 가능'은 실제 인라인 여부를 보여 주지 않는다. 128~129행·227~228행은 함수 밖 문장이라 그대로 컴파일되지 않고(AP-C-35), 28~55행은 한 블록에서 Shape·Circle을 두 번 정의한다. |
| D | 11 | 인접 `part2-07-templates-cost.md`(422·427행)·`part2-09-type-traits.md`(441행)는 링크만 해 겹침 없음. `part2-10-concepts.md` 241~251행 LoggerImpl concept·LoggerBase 코드는 이 글 381~393행과 이름만 다르고 거의 같다. `part5-04-hal-design-patterns.md` 116~133행 GpioBase는 이 글 185~207행 PeripheralBase와 같은 패턴, `part3-08-no-rtti-design.md` 187~208행 ShapeBase·Circle은 43~55행과 같다. 다른 시리즈 공개 글은 `rtos/practical-internals/part4-13-cpp-in-rtos.md`뿐이고 342행에서 이 글로 넘긴다. gof item21-strategy는 draft. part1-01(187행)·part3-08(189행)·part5-04(478행)·rtos part4-13(342행)이 이 글을 CRTP 정본으로 링크한다. |
| E | 6 | 제목·description(5행) 'vtable 0, 간접 호출 0'은 비교 표(152~160행)·측정 절(461~462행)·정리(481~482행)와 같은 질문을 향한다. 그러나 '분석'을 약속하는데 측정 절(435~465행)은 도구 출력 없는 예시 어셈블리와 출처 없는 바이트 수뿐이고 본문 대부분(60~86행, 233~433행)은 개념 소개다. |
| F | 5 | 497행 다음 편 'Part 2-09: Type Traits 활용'은 seriesOrder 17과 맞다. 489~491행(2-06·2-09·2-10)은 대상과 맞다. 492행 'Part 5-03: Peripheral 추상화 — CRTP peripheral'은 대상 `part5-03-peripheral-abstraction.md`에 'CRTP'가 한 번도 없고 164행 이후 concept 기반 UartInterface를 쓰므로 라벨이 내용과 다르다. 493행 'GoF 21: Strategy'는 링크가 없고 대상은 draft다. 틀린 관련 링크 라벨 규칙으로 5 이하. |
| G | 1 | 본문에 1차 출처 링크가 없다. C++ 표준 조항(EBO·concepts), C++ ABI vtable 배치, 컴파일러 이름·버전, 대상 MCU·reference manual 판 표기가 없다. 'C++20'(275·293·377행)과 437행 '-O2'만 있다. |

uncertainties:
- 387~393행 concept으로 제약한 CRTP base는 UartLogger : LoggerBase<UartLogger> 지점에서 Derived가 불완전 타입이라 제약 검사가 실패할 수 있다. part2-10 241~263행도 같은 코드. C++ 표준으로 확인하지 않았다.
- 447행 vtable 슬롯 오프셋 [r3, #4]와 137행 [r3]이 다르다. 441행 Logger의 virtual 함수는 하나뿐이라 첫 슬롯 오프셋이 0일 가능성이 있으나, 135행 예는 클래스 정의가 없어 내부 모순으로 확정하지 않았다.
- 156행 'vtable 클래스당 (N * 4 B)'와 450행 'vtable 크기: 12 B'는 N의 정의가 없어 맞는지 판단할 수 없다. -fno-rtti 여부도 없다.
- 433행 'CRTP base가 멤버를 가지면 … EBO 덕분에 보통은 추가 크기가 0'은 EBO가 빈 base에만 적용된다는 점과 어긋나 보인다.
- 268행 Version v1{1, 0, 0}은 Comparable<Version>을 상속하므로 C++17 aggregate 규칙에서 첫 초기화자가 base에 대응해 컴파일되지 않을 수 있다.
- 275행 'CRTP는 C++11부터 가능'은 CRTP가 C++98에서도 쓰인 관용구라는 점과 맞지 않을 수 있다.
- 23·158행 virtual 호출은 inline이 '거의' 되지 않는다는 주장은 devirtualization 동작에 따라 다르다. 출처 없음.
- 26행 '수십 개만으로도 수 KB'와 465행 '1000 B, 작은 차이'는 규모 평가가 어긋난다. 26행은 가상 함수 코드 크기를 포함할 수 있어 내부 모순으로 확정하지 않았다.
- 375행 서로 다른 BaseA<Concrete>·BaseB<Concrete> 다중 상속의 'diamond 문제'는 공통 base가 없으면 생기지 않는다.
- 113~114·213행 USART2->SR/DR, USART_SR_TC/TXE는 STM32F1/F4 계열 레지스터 이름인데 대상 MCU가 본문에 없다.

병합 대상: 병합 대상 없음. 시리즈의 CRTP 정본으로 part1-01(187행)·part3-08(189행)·part5-04(478행)·part2-10(239행)·rtos part4-13(342행)이 링크해 독립 검색 의도가 있다. 다음 조치는 보강이다. 실제 컴파일러·버전으로 뽑은 objdump·size 결과로 측정 절(435~465행)을 채우거나 출처 없는 수치를 지우고, 단점·함정·안티패턴 세 절(277·338·398행)을 합치고, concepts 절(377~396행)은 2-10 링크로 줄이고, 492행 라벨을 고치고 493행 링크 없는 항목을 정리한다.

### `part2-09-type-traits.md` — 59점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(f6126835 최초 작성, 815510c8·39149f68 Tone A 폴리싱, 400892d7 linter, ac24bb76 제목 변경, be973200 topic 메타, 0a9dd7bc slug 고정)에 표준·cppreference·컴파일러 문서와 대조한 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 47~109행 표준 trait 목록은 cppreference 목차 수준이다. 이 글만의 것은 임베디드 예제 세 개다: 113~126행 write_register의 is_trivially_copyable·sizeof<=4 static_assert, 224~264행 정수(big-endian)·float(host endian)·enum(underlying)·trivially copyable로 나누는 serialize, 299~315행 is_register_safe_v. 367행 'false negative가 생길 수 있으므로', 370행 '컴파일러마다 다른 결과를 낼 수 있습니다'는 구체 사례 없는 완곡 표현이라 일반론으로 봤다. |
| B | 14 | 17~45행 문제 → 47~109행 목록 → 130~170행 SFINAE·if constexpr → 172~222행 void_t·concept → 224~347행 응용·tag dispatch → 349~393행 함정 → 395~428행 측정 → 430~436행 정리까지 흐름이 완성됐다. 239행에 float host endian 한계를 적었다. 빠진 것: 제목의 is_pod은 82행 주석 'deprecated in C++20' 한 줄뿐이고, 167·254행 static_assert(sizeof(T) == 0) 관용구의 제약 설명이 없다. 124·125·262행은 '...'이 들어간 의사 코드다. |
| C | 7 | 192~193·292~294행 static_assert가 trait 동작을 스스로 검사한다. 395~428행 측정은 420행 'STM32F4' 외에 컴파일러·버전·옵션·명령이 없고 423~425행 V1 460 B, V2 320 B, V3 280 B 수치만 있어 C ≤ 8. 428행 '빠르며'는 측정하지 않았다. 399~404행 V1은 virtual 두 개뿐인데 420행은 '5개 type별 호출 기준'이라 비교 조건이 재현되지 않는다. |
| D | 11 | `part2-08-static-polymorphism.md`와는 겹침이 거의 없다. `part2-10-concepts.md` 269~290행 enable_if_t 예제가 이 글 134~156행과 같은 형태이고, 2-10 188~204행 decode가 이 글 228~256행 serialize와 같은 뼈대다. 이 글 205~221행 Stringifiable concept은 2-10 주제를 앞당긴다. `part2-07-templates-cost.md` 214~235행 '패턴 5'가 397~428행 V1/V3 비교와 같은 질문이다. 다른 시리즈 abseil part2-04-type-traits, effective-modern-cpp item27, effective-cpp item47은 모두 draft. |
| E | 6 | 제목과 description(5행)은 130~170행 SFINAE, 113~126·299~315행 static_assert 검사와 맞는다. 제목 키워드 is_pod은 82행 주석 한 줄뿐이라 부분 미이행이다. '임베디드 활용'에 비해 임베디드 고유 내용은 세 예제에 그친다. |
| F | 7 | 445~447행 다음 글이 seriesOrder 18 `part2-10-concepts.md`와 맞다. 440~443행 관련 항목 라벨이 대상 제목(2-06 'Templates 기초', 2-08 CRTP, 2-10, 3-08 'No-RTTI C++ 설계')과 맞고, 3-08은 355행 typeid 함정과 내용상 연결된다. 전제 지식(2-06, C++17 요구) 안내가 없어 9 이상은 아니다. |
| G | 1 | 본문에 1차 출처 링크가 없다. 82행 is_pod C++20 폐기, 109행 _v(C++17)·_t(C++14) 도입 시점에 표준 조항·cppreference 인용이 없고, 420행 측정에 컴파일러·버전이 없다. |

uncertainties:
- 30행 'C에서는 불가능합니다(타입 정보가 없음)'는 C11 _Generic의 제한적 타입 분기와 충돌할 수 있다. 표준으로 확인하지 않았다.
- 70행 is_scalar 'arithmetic || enum || pointer'에 member pointer·nullptr_t가 빠졌을 수 있다.
- 132행 '템플릿 인스턴스화 실패가 … 무시'는 SFINAE가 immediate context의 substitution 실패에만 적용되므로 부정확할 수 있다.
- 167·254행 discarded branch의 static_assert(sizeof(T) == 0) 관용구가 C++23(P2593) 이전에 ill-formed NDR 논란이 있는지 미확인.
- 370행 'void_t SFINAE 검출이 컴파일러마다 다른 결과'는 어떤 컴파일러·결함(CWG 1558 등)인지 근거가 없다.
- 386행 주석 '분기 안 들어가지만 검사'와 390행 'false branch는 인스턴스화되지 않으므로 의미상 잘못된 코드도 통과'가 무엇을 검사하는지 모호하다. 언어 규칙 판단이 필요해 오류 확인으로 두지 않았다.
- 420~426행 V1/V2/V3 수치는 환경이 없고 V3가 40 B 작은 이유가 성립하는지 미확인. 2-10 392행은 SFINAE와 concept의 코드 크기가 같다고 적어 비교 기준이 다르다(다른 글과의 비교라 오류 확인 대상 아님).

병합 대상: 병합 대상 없음. 가장 가까운 후보 `part2-10-concepts.md`와 SFINAE→concept 비교·decode/serialize 뼈대가 겹치지만, 이 글은 C++17 trait 카탈로그·void_t·tag dispatch를 맡고 2-10 418행이 이 글을 SFINAE 참조로 연결한다. 다음 조치는 보강이다. 395~428행 측정에 컴파일러·옵션·명령을 붙이거나 TBD로 두고, is_pod 폐기 이유와 대체 trait를 설명하고, 205~221행 concept 예제는 2-10 링크로 바꾸고, 표준·cppreference 출처를 붙인다.

### `part2-10-concepts.md` — 54점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(f6126835 최초 작성, 815510c8·39149f68 폴리싱, 400892d7 linter, ac24bb76 제목 변경, be973200 topic 메타, 0a9dd7bc slug 고정)에 표준([temp.constr])·cppreference·컴파일러 문서와 대조한 커밋이 없다. 평가 중 1차 자료를 열지 않았고 원문 안에서 동시에 참일 수 없는 두 진술도 찾지 못했다. 372행 'ARM Compiler 6, IAR 일부는 지원하지 않습니다'와 412행 'ARM Compiler 6는 부분 지원'은 '일부(버전)'로 읽으면 함께 참일 수 있어 uncertainties로 둔다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 문법 세 가지(70~99행), <concepts> 목록(101~136행), requires 식 4종(155~160행), SFINAE 대체(269~291행), 오버로드(314~331행)는 concepts 입문서의 일반 구성이다. 이 글만의 것은 Driver concept(162~182행), deserialize 우선·trivially copyable 폴백 dispatch(184~209행), sizeof<=4 LightweightNumeric(221~235행), toolchain 함정(371~372행) 정도다. 394행 '약간 빠릅니다', 400행 '30줄짜리 에러가 1~2줄'은 근거 없는 단정이다. |
| B | 12 | 문제(17~43행) → 정의(45~68행) → 문법·표준 concept·requires(70~160행) → 임베디드 예제(162~312행) → 함정(333~375행) → 정리(405~412행)로 흐름은 끝까지 간다. 331행 '더 제약된 concept이 우선합니다'는 subsumption 규칙 설명이 없고, '측정' 절(377~396행)은 측정 없이 결론만 적었다. 237~265행 CRTP+concept 예의 정확성 의심이 열려 있어 B ≤ 13. |
| C | 5 | 컴파일러·버전·-std=c++20 명령·실행 결과가 없다. 36~40행 에러 출력은 예시용 형태이고, 63~65행 개선 메시지도 어느 컴파일러 출력인지 밝히지 않았다. '측정' 절(377~396행)은 코드 두 조각 뒤 392행 '코드 크기는 동일', 394행 '약간 빠릅니다'뿐이다. 400행 '30줄→1~2줄'은 출처·환경 없는 수치라 C ≤ 8이고, 재현 절차가 없다. |
| D | 11 | 같은 시리즈 `part2-08-static-polymorphism.md` 377~394행 코드가 이 글 241~253행과 concept 이름만 다르고 같다. 이 글 184~209행 분기는 `part2-09-type-traits.md` 205~220행 Stringifiable 예와 같은 패턴이다. 372·412행 toolchain 서술은 `part1-08-cpp-standard-choice.md` 91행·143~144행과 겹친다. `part3-01-no-dynamic-alloc.md`·`part5-02-gpio-abstraction.md`도 비교했다. 다른 시리즈 beautiful-cpp item24는 H2 뼈대가 거의 같지만 a-tour-of-cpp chapter08과 함께 draft다. part2-08 491행, part2-09 442·447행이 이 글을 concepts 전용 장으로 가리킨다. |
| E | 7 | 제목과 description의 SFINAE 가독성 개선(269~291행), 에러 메시지 명확화(33~68행), 자체 문서화(401행)를 본문이 모두 다룬다. 에러 메시지 개선을 예시용 출력(36~40·63~65행)으로만 보여 주고, 제목·도입부(17~43행)에 대상 독자·임베디드 문제가 드러나지 않아 9 이상은 아니다. |
| F | 7 | 423행 다음 글 `part3-01-no-dynamic-alloc.md`는 seriesOrder 19로 이 글(18)+1이고 제목과 라벨이 맞다. 관련 항목 416행 2-06(14), 417행 2-08(16), 418행 2-09(17), 419행 1-08(8) 모두 라벨과 대상 제목이 맞는다. 239행 본문이 2-08 CRTP를 직접 가리킨다. 전제 지식 안내가 없고 폰 폭 확인을 하지 않아 8 이상은 주지 않았다. |
| G | 1 | 본문에 표준 조항·P0734·cppreference·컴파일러 문서 링크가 없다. 412·372행 toolchain 버전 주장은 출처가 없고, 예제를 확인한 컴파일러·버전 표기도 없다. |

uncertainties:
- 241~264행 LoggerBase<UartLogger>가 기반 클래스로 인스턴스화될 때 UartLogger는 불완전 타입이라 LoggerImpl<UartLogger> 검사가 정상 클래스에서도 실패할 수 있다. 264행 'BadLogger만 에러'를 [temp.constr]·컴파일러로 확인하지 않았다(part2-08 377~394행도 같은 코드).
- 372행과 412행 ARM Compiler 6 지원 서술이 같은 사실인지 armclang·IAR 문서로 대조하지 않았다.
- 392행 '코드 크기는 동일', 394행 '약간 빠릅니다', 400행 '30줄짜리 에러가 1~2줄'은 출처·측정 환경 없는 주장이다.
- 36~40행 에러 출력은 실제 컴파일러 출력이 아니라 예시로 보인다.
- 101·138행 '표준 concepts (<concepts>)' 아래 std::ranges::*(133~135행)를 함께 나열하고 'C++ Core Library'라는 비표준 용어를 썼다. 408행은 <ranges>를 따로 적는다.
- 331·402행 '더 제약된 concept이 우선'이 subsumption 규칙을 정확히 서술하는지 미확인.
- 233행 'double은 8 byte'는 AVR-GCC처럼 double이 4바이트인 toolchain에서 성립하지 않는다. 대상 ABI 명시가 필요한지 확인하지 않았다.
- 203행 static_assert(sizeof(T) == 0, ...)의 표준 판(C++20/23)별 취급을 확인하지 않았다.
- 273~288행 같은 이름 abs를 SFINAE·concept·abbreviated 세 형태로 한 블록에 두어 그대로 한 파일에 넣으면 재정의·모호성이 생길 수 있다.

병합 대상: 병합 대상 없음. 시리즈 안 concepts 전용 장이고, 다른 시리즈의 같은 주제 글(beautiful-cpp item24, a-tour-of-cpp chapter08)은 draft라 합칠 공개 대상이 아니다. 다음 조치는 보강이다. CRTP 절(241~265행)은 2-08과 역할을 나누고, 측정 절(377~396행)은 실제 컴파일러·버전으로 잰 값이 없으면 지우고, 372·412행 toolchain 주장에 출처를 붙인다.

### `part3-01-no-dynamic-alloc.md` — 52점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug 고정, be973200 topic 메타, ac24bb76 제목 변경, 400892d7 린터, 39149f68·815510c8 폴리싱, 8ec55531 초안)에 MISRA·AUTOSAR·DO-178C, C++ 표준, ETL 문서와 대조한 커밋이 없다. 평가 중 1차 자료를 열지 않았고 본문 안 직접 모순도 찾지 못했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 19~23행 동적 할당 세 위험, 114~129행 stack/static/heap 표, 65~93행 ETL 소개, 184~243행 placement new·optional·Meyers singleton은 입문 자료의 표준 목록이다. 이 글만의 것은 245~301행 vector·string·function 대체 대응, 347~367행 --wrap=malloc 추적, 387~393행 코드 크기 비교인데 수치는 출처·측정 절차가 없다. 36행은 조항 없이 단정한다. ETL·pmr·pool 중 무엇을 언제 고르는지 가르는 분석이 없다. |
| B | 11 | 문제(17~38행) → 표준·ETL·pmr 컨테이너(40~112행) → 패턴 4개(133~243행) → 대체 대응(245~301행) → 함정 6개(303~341행) → 측정(343~395행) → 정리(397~404행)로 끝까지 간다. 89행 외에 ETL이 가득 찼을 때 동작 설명이 없고, 104행 monotonic_buffer_resource가 메모리를 돌려주지 않는다는 한계, 137~173행 ObjectPool의 thread-safety·이중 해제 한계가 빠졌다. 257행 타입 불일치 등 정확성 불확실이 열려 있어 B ≤ 13. |
| C | 6 | 249~262·268~278·286~298행은 한 블록에서 orders·s·cb를 여러 번 선언해 그대로 컴파일되지 않는다. 347~367행 --wrap 추적은 절차는 있으나 __real_malloc 선언과 기대 출력이 없다. 387~393행 'STM32F4 (newlib-nano, -Os)' +6.2/+0.4/+0.2 KB는 툴체인 버전·측정 명령·출처가 없어 C ≤ 8. |
| D | 9 | 인접 `part2-10-concepts.md`(18)는 주제가 다르고 `part3-02-custom-allocator-basics.md`(20)는 allocator 인터페이스다. 103~104행 pmr 예제는 `part3-04-pmr.md` 103~104행과 변수명만 다른 같은 코드다. 137~180행 ObjectPool<Order, 32>는 `part3-03-pool-allocator.md` 29·65·139행과 같은 이름·크기다(135행 '미리보기'). 69~84·290~301행 ETL·delegate는 `part4-02-etl-library.md`와 겹친다. 다른 시리즈 `rtos/practical-internals/part4-04-static-allocation.md` 22행이 36행과 같은 논지, `part4-13-cpp-in-rtos.md` 230·238행 ETL이 67~93행과 겹친다. 고유한 것은 245~301행 정도다. |
| E | 7 | 제목의 placement new(184~197행), 정적 객체(114~131·223~243행), 풀(133~182행)을 모두 다루고 description의 'STL 같은 컨테이너 활용'도 40~110·245~301행이 이행한다. description '임베디드의 첫 번째 원칙'은 근거 없는 단정이고 대상 MCU·인증 환경이 특정되지 않았다. |
| F | 7 | 416행 다음 글은 seriesOrder 20 `part3-02-custom-allocator-basics.md`와 맞다. 408~412행 관련 항목 다섯 개(3-02, 3-03, 3-04, 4-01, 4-02) 라벨이 대상 제목과 맞다. 112·135행 본문 링크가 해당 절의 심화 글을 가리킨다. 전제 지식 안내가 없고 렌더 확인을 하지 않았다. |
| G | 2 | 본문 출처는 67행 ETL 공식 사이트 링크 하나(버전 없음)다. 36행 MISRA·AUTOSAR·DO-178C 주장에 판·조항 번호가 없고, 95·199행 'C++17' 외 표준 조항·cppreference가 없다. 387행 측정 환경에 컴파일러·newlib 버전이 없다. |

uncertainties:
- 257행 std::pmr::vector<Order> orders(&order_pool)의 order_pool은 175행 ObjectPool<Order, 32>라 memory_resource*가 아니다. 컴파일 불가로 보이나 표준으로 확인하지 않았다.
- 204행 주석 'on stack'은 namespace 범위 선언이라 static 저장 기간일 가능성이 크다. 221행은 'stack 또는 static'이라 직접 모순은 아니다.
- 298행 'capture 없으면 inline storage'는 구현(SBO) 의존이라 1차 자료로 확인하지 않았다.
- 36행 '초기화 시점에만 허용'의 근거 조항 미확인(rtos 4-04 232행은 MISRA C:2012 Dir 4.12를 인용한다).
- 42·400행 '<array>가 유일한 stack-only 표준 컨테이너' 단정 미확인.
- 390~392행 코드 크기 수치는 출처·측정 명령·툴체인 버전이 없다.
- 93행 'ETL은 MIT license, header-only'를 ETL 저장소로 확인하지 않았다.
- 353~363행 __real_malloc/__real_free 선언 누락, static 카운터 비원자 증가 문제 여부 미확인.

병합 대상: 병합 대상 없음. 겹치는 부분이 `part3-03-pool-allocator.md`(ObjectPool), `part3-04-pmr.md`(pmr 예제), `part4-02-etl-library.md`(ETL·delegate), `rtos/practical-internals/part4-04-static-allocation.md`(금지 근거)로 흩어져 있어 한 글로 합칠 대상이 없다. 다음 조치는 보강이다. Part 3 도입 글로서 'heap 없이 무엇을 고를지'라는 독립 질문을 가질 수 있다. 후속 글과 같은 코드(103~104행, 137~180행, 69~84행)를 줄이고 ETL/pmr/pool/optional 선택 기준 표로 바꾸며, 36행 규정 주장은 조항으로 확인하거나 지우고, 387~393행 수치는 측정 절차·툴체인 버전을 붙이거나 TBD로 둔다.

### `part3-02-custom-allocator-basics.md` — 46점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 안의 두 위치가 동시에 참일 수 없다. 35행 절 제목 'Allocator Concept (C++17 이전)'과 37행 'C++17 이전의 형태는 이렇습니다' 아래 39~65행 코드에는 value_type 하나만 typedef로 있고, 67~72행은 이것을 핵심 요구사항으로 정리한다. 314행은 'C++17 이전에는 수많은 typedef가 필요했지만 이제 value_type, allocate, deallocate 셋이면 충분합니다'라고 쓴다. 표준([allocator.requirements])은 열어 보지 않았으므로 어느 쪽이 맞는지는 fact-check 단계에서 정한다. git log(8ec55531 작성, 815510c8·39149f68 번역투 정리, 400892d7 linter, ac24bb76 제목 변경, be973200·0a9dd7bc 메타데이터)에 1차 자료와 대조한 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | value_type·allocate·deallocate 요구사항(67~72행), bitset pool(80~111행), bump-pointer arena(199~227행)는 allocator 입문 자료에 흔한 목록이다. 이 글만의 것은 -fno-exceptions용 abort 변형(115~144행)과 static arena를 reset하는 TaskArenaAllocator(235~269행) 정도다. 338행 '꼭 활용합니다', 347행 '단순하게 유지합니다', 372행 '깨질 수 있습니다'는 일반론이고, 365행 '약 3배 빠르고'는 출처·환경이 없다. |
| B | 10 | 문제(17~33행) → 인터페이스(35~74행) → pool → no-exception → pmr(146~158행) → stateful(160~193행) → arena → 사용 예(273~293행) → C++20(295~314행) → 함정(316~347행) → 측정(349~365행) → 정리(367~373행)로 흐름은 완성된다. 92행 PoolAllocator는 n != 1이면 throw하는데 277~288행에서 vector·map·basic_string과 정상 동작하는 것처럼 쓴 부분이 정확성 의문으로 열려 있어 B ≤ 13. 330행은 propagate 계열 설명이 없다. 37행과 314행의 모순이 핵심 질문의 답을 흐린다. |
| C | 5 | 컴파일러·표준 버전·대상 보드가 없고 기대 출력·검증 절차도 없다. 353~363행 1.2 ms / 0.4 ms는 보드·컴파일러·클록·측정 방법이 없어 C ≤ 8. 360행 'pool slot 1개'는 351행 10000회 push_back과 맞지 않는다. 304~305행 MinimalAllocator는 몸체가 비어 반환값이 없어 그대로 쓸 수 없다. |
| D | 10 | `part3-01-no-dynamic-alloc.md` 95~112행 pmr 미리보기가 이 글 146~158행과 같은 역할이다. `part3-03-pool-allocator.md` 61~127행 ObjectPool이 이 글 80~111행과 주제가 겹치고, 3-03 437~455행 측정은 349~365행과 같은 형식, 3-03 396~397행 thread safety 함정은 343~344행과 거의 같다. `part3-04-pmr.md` 246~272행 frame allocator는 235~271행 TaskArenaAllocator와 같은 패턴이고 3-04 113행이 이 글의 Arena를 가리킨다. 다른 시리즈 `programming/code-review/abseil/part2-06-memory-utilities.md` 100~105·177~184행은 관점이 다르다. |
| E | 5 | 제목은 'std::allocator 인터페이스 분석'을 약속하는데 본문은 요구사항 네 줄(69~72행)과 구현 예 나열 수준이다. allocator_traits 기본값(construct/destroy, propagate 계열, rebind)은 307행 주석 한 줄과 324행 한 문장뿐이다. description(5행)은 본문과 맞는다. |
| F | 5 | 384행 다음 글은 seriesOrder 21 `part3-03-pool-allocator.md`와 맞고, 377~380행 관련 항목 라벨도 대상(3-01 19, 3-03, 3-04 22, 4-02 30)과 맞다. 그러나 정리 373행 'C++17 std::pmr이 … 다음 chapter에서 다룹니다'는 실제 다음 편(3-03 Pool Allocator)과 다르다. 다음 편 안내가 틀려 F ≤ 5. 전제 지식 안내가 없다. |
| G | 1 | 본문에 1차 출처 링크가 없다([allocator.requirements], cppreference 등). 74·297·314·324행의 C++17/C++20 변화 주장에 근거 조항이 없고, 컴파일러·표준 라이브러리 버전과 353~363행 측정 환경도 없다. |

uncertainties:
- 92행 PoolAllocator는 n != 1이면 throw한다. vector는 커질 때 n > 1을 요청하므로 277~279행 push_back 두 번과 287~288행 basic_string 대입이 bad_alloc을 낼 수 있다. 1차 자료로 확인하지 않았다.
- 283행 std::map은 노드 타입으로 rebind해서 할당한다. rebind된 타입마다 static storage_가 따로 생기는지 확인하지 않았다.
- 351~363행 std::vector<int> 10000회 push_back을 'pool slot 1개'로 적은 것이 92·96행(slot 하나 = sizeof(T), n == 1만 허용)과 어떻게 함께 성립하는지 불명확하다. 1.2 ms / 0.4 ms는 출처·환경 없는 수치다.
- 74행 'C++20에서는 concept으로 강제됩니다(std::allocator_traits)': allocator_traits는 concept이 아니라고 기억하나 표준으로 확인하지 않았다.
- 324행 'C++17 이후로는 allocator_traits가 자동 rebind': C++11부터라고 기억하지만 확인하지 않았다(314행 주장의 정오도 같은 문제).
- 341행 '-fno-exceptions 환경에서 throw가 발생하면 abort로 떨어집니다': 사용자 코드의 throw는 그 옵션에서 컴파일 오류일 수 있다. GCC 문서로 확인하지 않았다.
- 304~308행 MinimalAllocator에는 operator==가 없다. 72행 요구사항, 369행 '세 가지만 구현하면 됩니다'와 어긋난다(개수 표기 문제라 오류 확인에는 넣지 않음).
- 144행은 abort를 쓰면 STL 호환이 깨지므로 ETL이나 직접 구현 컨테이너를 권하는데, 248~252행 abort 기반 TaskArenaAllocator를 263행에서 std::vector와 단서 없이 쓴다. 권고와 예제의 충돌이라 오류 확인에는 넣지 않았다.

병합 대상: 판정은 오류 확인 때문에 우선 조치이고 점수 구간은 병합 검토다. 병합 대상 없음. pool·arena·측정이 `part3-03-pool-allocator.md`·`part3-04-pmr.md`와 겹치지만 STL allocator 인터페이스라는 고유 역할이 있어 다음 조치는 보강이다. 35·37행과 314행 중 틀린 쪽을 [allocator.requirements]로 확인해 고치고, 373행 '다음 chapter' 문장을 실제 다음 편과 맞추고, 353~363행 측정에 환경을 붙이거나 TBD로 둔다.

### `part3-03-pool-allocator.md` — 50점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 글 안의 코드와 주석이 동시에 참일 수 없다. 64~72행은 `ObjectPool<T, N>`의 N을 슬롯 개수(`Slot slots_[N]`)로, 슬롯 크기를 `sizeof(T)`와 `Slot*` 중 큰 쪽(union)으로 정의하고, 29·36행도 `ObjectPool<Order, 32>`에서 available()==31이라 N이 개수다. 그런데 411~413행은 `ObjectPool<std::byte, 16> small_pool_; // 16 byte 블록`, `<std::byte, 64> // 64 byte`, `<std::byte, 256> // 256 byte`라고 N을 블록 크기로 적었다. 글의 정의대로면 세 pool 모두 포인터 크기 슬롯을 16·64·256개 가진 pool이고, 417~419행은 최대 256바이트 요청에 포인터 크기 슬롯을 돌려준다. 추가로 41행 '할당된 블록의 메모리에는 next pointer를 저장해 둡니다'와 59행 'free list에서 빠져나온 block0의 메모리는 그 순간부터 사용자 몫'이 서로 맞지 않는다(next는 free 블록에 저장된다). git log(0a9dd7bc, 68525f0c, be973200, ac24bb76 등)에 1차 자료와 대조한 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | union 슬롯 구현(63~127행), PoolUniquePtr RAII 래퍼(159~214행), mutex 판(222~256행)과 lock-free 판(264~299행), 통계 pool(309~345행), heap pool(351~370행), multi-pool(405~435행)은 C++ pool 구현 자료에 흔한 목록이다. 이 글만의 판단 기준은 301행 '대부분 mutex면 충분'과 370행 heap pool 조건 정도다. 258행 '1~2 μs', 394행 '10~20% 마진'은 출처 없는 일반론이고, 435행은 완곡 표현이다. |
| B | 10 | 요구사항(21~26행)부터 기본 구현, RAII, thread-safe, lock-free, 통계, heap pool, 함정(372~403행), multi-pool, 측정, 정리까지 흐름은 간다. ThreadSafePool(222~256행)은 `Slot`을 정의하지 않고 생성자(230~233행)에서 free list를 초기화하지 않는다. InstrumentedPool(309~343행)은 `base_allocate`·`allocated_`가 없고, HeapPool(351~366행)은 초기화를 '...'로 생략했다. 411~419행과 41행 문제가 열려 있어 B ≤ 13. |
| C | 6 | 439~453행 측정은 'STM32F4'만 적고 클록·컴파일러·옵션·측정 방법(DWT 등)이 없는데 'alloc 12 cycles, free 10 cycles, malloc 평균 ~120 / max 800+' 같은 수치를 쓴다. C ≤ 8. 258행 1~2 μs도 출처가 없다. 211행 `order->process()`는 132~137행 Order에 없는 멤버다. 실행 조건·기대 출력이 있는 검증 절차가 없다. |
| D | 8 | `part3-01-no-dynamic-alloc.md` 132~180행이 같은 이름 `ObjectPool<Order, 32>`와 construct/destroy를 이미 보여 준다(이 글 104~118·139~152행과 API 동일). `part3-02-custom-allocator-basics.md` 76행 이후 PoolAllocator와 349~365행 측정은 이 글 437~455행과 구조가 같다. `part4-04-lock-free-container.md` 166~172행 이후 LockFreePool이 260~299행을 다시 구현한다. `part2-02-raii-patterns.md` 199~217행 PoolDeleter는 159~214행과 역할이 겹친다. 다른 시리즈 `rtos/practical-internals/part4-05-memory-pool.md` 26·178·284·230~232·313행이 이 글 41·127, 260~299, 405~435, 345·394, 397행과 대응한다. |
| E | 7 | 제목 'Fixed-Size Block과 O(1) 보장'과 description은 63~125행 구현·459행 정리와 맞는다. 그러나 23행 '어떤 상태에서도 일정 시간'과 '보장'에 비해 lock-free 판(273~281·289~294행) CAS 재시도는 상한이 없고 mutex 판(236·249행 portMAX_DELAY) 대기도 O(1)이 아닌데 본문이 이 한계를 짚지 않는다. |
| F | 7 | 19행이 전제 글 3-02를 링크한다. 476행 다음 글은 seriesOrder 22 `part3-04-pmr.md`와 맞다. 468~472행 관련 항목(3-01, 3-02, 3-04, 4-03, 2-02) 라벨과 내용이 맞다. 303행은 lock-free pool 상세를 4-03으로 보내지만 실제로 다루는 글은 part4-04 166행 이후다. 모바일 확인을 하지 않아 9 이상은 주지 않는다. |
| G | 1 | 본문에 1차 출처 링크가 없다. C++ 표준 판(union 활성 멤버, placement new, std::launder), 컴파일러, FreeRTOS 버전(227행), 측정(439행)의 보드 외 환경이 모두 없다. |

uncertainties:
- 211행 `order->process()`: 132~137행 Order에 process 멤버가 없고 207행 자유 함수 `process()`와 이름이 겹친다. 컴파일 오류 후보다.
- 225·267·355행 ThreadSafePool·LockFreePool·HeapPool이 ObjectPool 안 private `Slot`을 정의 없이 쓴다.
- 272~278행 lock-free allocate는 274행 `head->next` 읽기 시점에 다른 스레드가 head를 이미 가져가 쓸 수 있다(ABA와 별개). C++ memory model과 대조하지 않았다.
- 127·460행 '추가 메모리가 전혀 들지 않습니다'는 sizeof(T)가 포인터보다 작으면 슬롯이 포인터 크기로 커진다. 1차 자료로 대조하지 않았다.
- 92·98행 reinterpret_cast 후 접근에 std::launder가 필요한지 C++ 표준으로 확인하지 않았다.
- 258행 1~2 μs, 394행 10~20% 마진, 443~450행 cycle 수치는 출처·환경이 없다.
- part3-02 365행 '약 3배'와 이 글 455행 '약 10배'가 독자에게 상충해 보인다(측정 대상이 달라 오류 확인 아님).
- 55~56행 '해제 후'와 '(또는 LIFO: ...)'가 같은 순서를 두 번 적어 의도가 불명확하다.

병합 대상: 판정은 오류 확인 때문에 우선 조치이고 점수 구간은 병합 검토다. 부분 병합 후보는 `part4-04-lock-free-container.md`(이 글 260~299행 lock-free 절을 4-04로 넘기고 링크만 남김)이고, part3-01 132~180행 ObjectPool 미리보기는 3-01 쪽을 줄인다. `rtos/practical-internals/part4-05-memory-pool.md`는 C 구현이라 병합하지 않는다. 'C++ 템플릿 ObjectPool 구현'이라는 독립 검색 의도가 있어 다음 조치는 보강이다. 411~419행 multi-pool을 블록 크기 타입으로 고치고 41행 '할당된 블록'을 'free 블록'으로 바로잡고, 439~453행 측정 환경을 적거나 TBD로 두고, ThreadSafePool·InstrumentedPool·HeapPool 조각을 완결하거나 '독자 확장'으로 표시한다.

### `part3-04-pmr.md` — 50점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 글 내부 모순과 1차 자료 둘 다에 근거한다. 67행 코드 `virtual bool do_is_equal(const memory_resource&) const noexcept = 0;`(순수 가상, 기본 구현 없음)와 324행 'default `do_is_equal`이 `dynamic_cast`를 사용합니다'는 동시에 참일 수 없다. libc++(Homebrew LLVM) `__memory_resource/memory_resource.h` 53행도 `= 0` 순수 가상이고, `monotonic_buffer_resource.h` 104~105행은 `this == std::addressof(__other)` 주소 비교라 dynamic_cast를 쓰지 않는다(직접 열어 확인). 357행 정리와 함정 5번(323~324행)이 같은 오류 위에 있다. git log(0a9dd7bc slug 고정, be973200 topic 메타데이터, ac24bb76 제목 변경, 400892d7 린터, 39149f68 문체 폴리싱 등)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | memory_resource 인터페이스(47~68행), 표준 resource 세 개(79~111행), 컨테이너 목록(279~288행)은 표준 소개 수준이다. 글 고유 내용은 static buffer·frame allocator 패턴(117~142행, 250~273행)과 -fno-rtti 비교(195~216행)인데 후자는 근거가 약하다. 158행 '보통은 직접 구현한 pool이 더 작고 빠릅니다', 321행 '대부분 무시할 만합니다'는 출처 없는 일반론이다. |
| B | 10 | 문제(17~41행) → 인터페이스(43~73행) → 표준 resource → custom resource → 함정 6개(292~332행) → 측정(334~348행) → 정리 흐름은 갖췄다. 그러나 monotonic buffer가 찼을 때 upstream으로 넘어가는 동작을 121·253행 정적 buffer 패턴에서 다루지 않고, 196~213행 클래스는 do_allocate·do_deallocate가 없어 추상 클래스로 남는다. 324행 오류도 열려 있다. |
| C | 6 | `pool1`·`pool2`(32·228행), `input_requests`·`Order`·`process_orders`(124~131행), `input`·`process_one`·`format_log`(264~266행)가 정의되지 않아 그대로 컴파일되지 않는다. 338~346행 `.text +2.4 KB`/`+0.8 KB`, `~10 cycles`/`~15 cycles`는 컴파일러·코어·옵션 없는 수치라 C ≤ 8이고 재현 절차도 없다. |
| D | 11 | 103~109행 monotonic 예제가 `part3-01-no-dynamic-alloc.md` 103~109행과 코드·주석까지 같다. `part3-02-custom-allocator-basics.md` 146~158행이 pmr를 짧게 소개하고 이 글로 넘긴다. `part3-03-pool-allocator.md`는 pool 구현 자체이고 이 글 160~189행은 그것을 memory_resource로 감싸는 역할이다. 다른 시리즈 effective-cpp item50 238~253행, cpp-software-design guideline38 332~342행, abseil part2-06 175~184행이 겹치나 모두 draft이고 임베디드 정적 buffer·RTTI 관점이 없다. |
| E | 6 | 제목(2행) '임베디드 활용 — … 분석'과 description(5행)은 17~41·218~244행과 맞는다. '분석'을 약속하지만 측정(338~346행)은 출처 없는 수치이고 대부분 개념 소개다. |
| F | 6 | 368행 다음 글 'Part 3-05: No-Exception 설계'는 seriesOrder 23 `part3-05-no-exception-design.md`와 맞고, 안내한 optional·expected도 그 글 15·74행에 있다. 361~364행 관련 링크 4개(3-02, 3-03, 3-01, 1-08) 라벨이 대상 제목과 맞다. 19·113행 본문 링크도 3-02로 맞다. 그 밖의 글 고유 탐색 구조는 약하다. |
| G | 1 | 본문에 표준 조항·cppreference·라이브러리 구현 링크가 없고 컴파일러·표준 라이브러리 버전 표기도 없다. 71행 vptr 4 byte, 340~345행 크기·사이클 수치에 환경이 없다. |

uncertainties:
- 77·354행 '표준 resource는 세 가지'인데 144~158행이 unsynchronized_pool_resource를 따로 소개하고 synchronized_pool_resource는 없다. 개수 표기 문제라 오류 확인에 넣지 않았다.
- 71행 'virtual 함수가 3개'인데 50행 코드에 virtual 소멸자까지 있어 4개다. 개수 표기 문제로 보고 오류 확인에 넣지 않았다. 4 byte vptr도 32비트 대상 전제가 적혀 있지 않다.
- 149~152행 pool_options 지정 초기화는 C++20 문법인데 글은 C++17 기준이다. 표준 문서로 확인하지 않았다.
- 196~213행 RTTI 없는 비교에서 임의의 memory_resource를 static_cast한 뒤 get_type_id()를 부르면 다른 타입일 때 정의되지 않은 동작이라 216행 'type-safe' 주장이 맞지 않을 수 있다.
- 121·253행 upstream 없는 monotonic_buffer_resource는 buffer가 찼을 때 get_default_resource()(기본 heap)로 넘어가는데 글이 다루지 않는다. 표준 [mem.res.monotonic.buffer]로 확인하지 않았다.
- 277행 '<memory_resource>가 제공하는 std::pmr::* 컨테이너' — pmr 별칭은 각 컨테이너 헤더에 선언된다는 기억이 있으나 확인하지 않았다.
- 93행 null_memory_resource의 bad_alloc이 -fno-exceptions 빌드(3-05 전제)에서 어떻게 되는지 다루지 않는다.

병합 대상: 판정은 오류 확인 때문에 우선 조치이고 점수 구간은 병합 검토다. 병합 대상 없음. 같은 주제 다른 시리즈 글은 모두 draft이고, 임베디드 정적 buffer·frame allocator·RTTI 없는 비교 관점은 이 글에만 있어 다음 조치는 보강이다. 324·357행 dynamic_cast 서술을 지우고, 정적 buffer 패턴에 upstream 동작을 적고, 338~346행 측정에 환경을 붙이거나 TBD로 두며, part3-01 103~109행 중복 예제는 3-01 쪽을 줄인다.

### `part3-05-no-exception-design.md` — 48점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 불일치(루브릭 3-1). 376행 `-fexceptions` total ~49 KB(373~375행 42+4.2+3.1=49.3), 380행 `-fno-exceptions` total ~38 KB이므로 차이는 약 11 KB다. 383행은 '약 7 KB 차이가 납니다'라고 적어 같은 블록의 두 합계와 동시에 참일 수 없다(7 KB는 extab+exidx 두 섹션만 더한 값이고 .text 4 KB 차이를 뺐다). git log(45f880d5 초안, 815510c8·39149f68 번역투 폴리싱, 400892d7 linter, ac24bb76 제목 변경, be973200 topic 메타데이터, 0a9dd7bc slug 고정)에 1차 자료와 대조한 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | error code(30~72행), optional(74~117행), std::expected(119~149행), tl::expected(151~164행) 네 패턴과 비교 표(166~173행)는 입문 자료에서 흔한 목록이다. 이 글 고유의 것은 HwError → MeasurementError 계층화 예(210~251행)와 enum + constexpr 메시지 표(275~297행) 정도다. 비교 표의 '코드 크기' 열이 네 행 모두 '작음'(170~173행)이라 선택 기준이 되지 않는다. 22행 '수십 μs', 24행 '인증 환경에서는 대부분 금지'는 출처 없는 일반론이다. |
| B | 10 | 문제(19~26행) → 패턴 넷 → STL throw 함수(175~208행) → 계층화 → monadic 체인(253~273행) → RAII(299~327행) → 함정(329~365행) → 측정(367~383행) → 정리까지 흐름은 있다. 제목의 '결정성'은 22행 한 줄뿐이고, 191~195행은 `-fno-exceptions`에서 어떤 함수가 abort·UB·컴파일 에러인지 '일부는'으로만 적는다. 측정 결론(383행)이 합계(376·380행)와 맞지 않아 AP-C-24에 따라 B ≤ 13. |
| C | 6 | `MAX_ADDR`·`is_ready`·`bus_read`(45~48행) 정의가 없고, 304행과 312행이 같은 블록에서 `class Resource`를 두 번 정의해 그대로는 컴파일되지 않는다(AP-C-35). 측정 블록(369~381행)은 'STM32F4, 같은 단순 프로그램'뿐이고 toolchain·버전·플래그·프로그램이 없어 C ≤ 8. 그 수치마저 383행 결론과 어긋난다. |
| D | 8 | 이 글 119~147행 std::expected·switch on error() ↔ `part3-07-expected.md` 17~72행, 257~264행 and_then 체인 ↔ part3-07 116~126행. 179~201행 `v.at`/`v[idx]` ↔ `part1-02-compiler-flags.md` 106~118행. 299~327행 생성자 실패 factory ↔ `part2-01-raii-basics.md` 406~427행. 210~251행 계층화 ↔ `part3-06-error-handling-patterns.md` 145~175행. 인접 `part3-04-pmr.md`는 겹치지 않는다. 다른 시리즈 `rtos/practical-internals/part4-13-cpp-in-rtos.md` 53·265행 ↔ 301·335행 부분 반복. abseil part3-05, autosar-cpp chapter07은 draft이고 주제가 다르다. |
| E | 6 | 제목(2행)의 'No-Exception C++ 설계'는 본문 전체(30~365행)가, '코드 크기'는 21·332행과 측정 절(367~383행)이 다룬다(결론 산술은 틀림). '결정성'은 22행 한 줄뿐이고 '트레이드오프'는 비교 표 코드 크기 열이 모두 '작음'이라 이행되지 않는다. 키워드 하나가 거의 빠진 부분 미이행이다. description(5행)은 본문과 맞는다. |
| F | 7 | 403행 다음 글은 seriesOrder 24 `part3-06-error-handling-patterns.md`와 맞다. 관련 항목 396~399행 대상(part1-02 78행 절, part3-06, part3-07 seriesOrder 25, part2-01 406행 '4. Constructor에서 실패'가 327행 안내와 맞음)을 열어 대조했다. 149행 본문 링크도 3-07과 맞다. 패턴 1~4 번호 절과 비교 표가 글 고유의 길잡이다. 전제 지식 안내가 없고 폰 폭 렌더를 확인하지 않았다. |
| G | 1 | 본문에 1차 출처 링크가 없다(cppreference, P0323, tl::expected 저장소 등). C++17·C++23 표기(72·74·119·153·208행)는 있지만 측정(369행)에 컴파일러·버전이 없고 22·24행 주장에도 출처가 없다. |

uncertainties:
- 측정 수치 자체(42/4.2/3.1/38 KB, 369~381행)는 출처·환경이 없어 사실 여부를 확인하지 못했다. 오류 확인은 383행 결론과 합계의 산술 불일치에만 근거한다.
- 170행 비교 표가 error code 패턴 표준을 C++98로 적었는데 35행 예제는 `enum class`(C++11)를 쓴다.
- 191~195행 libstdc++/libc++에서 `-fno-exceptions`일 때 `at()`·`stoi()`가 abort·UB·컴파일 에러 중 무엇인지 1차 자료로 확인하지 않았다. part1-02 94·108행과 서술이 다르다(다른 글과의 차이라 오류 확인에 넣지 않음).
- 22행 'throw 시 수십 μs', 24행 '인증 환경에서는 대부분 금지'는 출처 없는 주장이다.
- 97행 'sizeof(T)에 약간 더한 정도', 346행 'sizeof(HugeStruct) + 1'은 정렬 패딩을 무시한 값일 수 있다.
- 259·262행 람다 반환형 `std::expected<float, Error>`의 `Error`가 128행 `ReadError`와 다르고 286행 `enum class Error`와 같은 이름이라 체인이 그대로 컴파일되는지 미확인.

병합 대상: 판정은 오류 확인 때문에 우선 조치이고 점수 구간은 병합 검토다. 병합 후보는 `part3-06-error-handling-patterns.md`·`part3-07-expected.md`지만 네 패턴을 한 번에 비교하는 입구 역할이 남아 있어 다음 조치는 보강이다. 383행 결론을 376·380행 합계와 맞추거나 측정 근거가 없으면 수치를 지우고, '결정성'을 채우거나 제목에서 빼고, 3-07과 겹치는 and_then 체인·switch 예제는 3-07 링크로 줄인다.

## 시리즈 공통 문제

루브릭 5절 기준(3편 이상)에 닿는 것만 적는다.

- 공통 H2 뼈대: '한 줄 요약 / 어떤 문제를 푸는가 / … / 자주 보는 함정과 안티패턴 / 측정 / 정리 / 관련 항목 / 다음 글'이 10편 모두에 있다(예: part2-06 13·17·347·390·408·416·424행, part2-07 13·17·329·367·409·418·425행, part2-08 13·17·398·435·479·487·495행, part2-10 13·17·333·377·405·414·421행, part3-01 13·17·303·343·397·406·414행, part3-03 13·17·372·437·457·466·474행, part3-05 13·17·329·367·385·394·401행). 더블 체크에서 시리즈 41개 파일 중 40편이 같은 뼈대를 쓴다고 셌다. 9절 scaled content 기록 대상이다.
- 출처·환경 없는 '측정' 절: 보드 이름 한 줄이나 '-O2'만 있고 컴파일러·버전·명령이 없다. part2-06 394~402행, part2-07 367~384행, part2-08 435~465행, part2-09 420~426행, part2-10 377~396행(측정값 자체 없음), part3-01 387~393행, part3-02 353~363행, part3-03 439~455행, part3-04 338~346행, part3-05 369~381행. 10편 모두 C ≤ 8 상한이 걸렸다.
- 측정 절 내부 산술·서술 불일치: part2-06 395~404행(492 B vs 432 B), part2-07 53~60·99·103행(3328 B vs 3344 B), part3-05 376·380·383행(11 KB vs 7 KB). 원문만으로 확인된 산술 오류가 3편이다. 측정 절 수치를 전수 검산해야 한다. 그 밖에 내부 모순(part3-02 37·314행, part3-03 411~413·41·59행, part3-04 67·324행)까지 합쳐 오류 확인 6편이다.
- 본문 1차 출처·버전 표기 없음: G가 8편 1점, part2-07·3-01이 2점이다. 표준 조항·cppreference·컴파일러 문서·reference manual 링크가 없고, part3-01만 67행 ETL 사이트 링크가 있다.
- git 이력에 1차 자료 대조 커밋 없음: 10편 모두 작성·폴리싱(815510c8·39149f68)·linter(400892d7)·제목 변경(ac24bb76)·메타데이터(be973200·0a9dd7bc) 커밋뿐이라 '검증됨'이 0편이다. 시리즈가 `/fact-check-round`를 거치지 않았다.
- 제목 '분석'과 본문 개념 소개의 불일치: part2-06(E 5), part2-08(E 6), part3-02(E 5), part3-04(E 6). ac24bb76의 일괄 제목 변경에서 온 것으로 보인다. 제목 키워드 하나가 비는 경우도 part2-07('디버그 정보'), part2-09('is_pod'), part3-05('결정성')에 있다.
- 인접 글 사이 예제 중복: CRTP+concept 코드(part2-08 381~393행 ↔ part2-10 241~253행), SFINAE·if constexpr 직렬화 뼈대(part2-07 214~235행, part2-09 134~156·228~256행, part2-10 188~204·269~290행), pmr monotonic 예제(part3-01 103~109행 ↔ part3-04 103~109행, part3-02 146~158행), ObjectPool·측정(part3-01 132~180행, part3-02 76행~·349~365행, part3-03 63~127·437~455행, part4-04 166행~), GPIO 어셈블리(part2-06 184·195~201행 ↔ part5-02 100·120~124행). 정본 글을 정하고 나머지는 링크로 줄여야 한다.
- 그대로 컴파일되지 않는 조각 코드(AP-C-35 후보): part2-06 288~308·322·328행, part2-08 28~55·128~129·227~228행, part3-01 249~298행(같은 이름 재선언), part3-02 304~305행, part3-03 211·225·309~343행, part3-04 32·124~131·196~213·264~266행, part3-05 45~48·304·312행.
- 시리즈 안팎 서술 모순(다른 글과의 모순이라 오류 확인은 아님): Button GPIO 포트 주소(part2-06 186행, part5-02 101행), C++20 toolchain 지원(part2-10 372·412행, part1-08 91·143~144행), `-fno-exceptions`에서 STL throw 함수 동작(part3-05 191~195행, part1-02 94·108행, rtos practical-internals part4-13 265행). 1차 자료로 정본을 정한다.

## 다음 조치

- 우선 조치(6편, 오류 확인): part2-06 395~404행 크기 합계, part2-07 60·99·103행 3344 B, part3-02 35·37행과 314행의 C++17 이전 allocator 형태, part3-03 411~419행 multi-pool과 41·59행 next 포인터 서술, part3-04 324·357행 dynamic_cast 서술, part3-05 383행 '약 7 KB'를 먼저 정정한다. 근거를 만들 수 없는 수치는 지우거나 TBD로 둔다.
- 링크·안내 정정: part2-08 492행 'CRTP peripheral' 라벨과 493행 링크 없는 GoF 항목, part3-02 373행 '다음 chapter' 문장을 실제 대상과 맞춘다.
- 병합 검토(4편: part2-08·2-09·2-10·3-01): 모두 병합 대상 없음, 다음 조치는 보강이다. part2-08과 part2-10의 CRTP+concept 중복, part2-09와 part2-10의 SFINAE 비교 중복을 한쪽으로 정리하고, part3-01은 후속 글 코드를 줄여 선택 기준 표로 바꾼다.
- Embedded C++ for Real Systems Part 2·3을 `/fact-check-round` 대상으로 올리고, '측정' 절 수치의 진위와 내부 산술을 시리즈 전체에서 검산한다. 시리즈 간 모순 서술은 1차 자료로 정본을 정한 뒤 `data/known-falsehoods.yaml` 등재를 검토한다.
- 이번 루프에서는 원문을 고치지 않았다. 수정은 별도 수정 루프에서 한다.
