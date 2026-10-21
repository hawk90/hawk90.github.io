# 공개 글 AdSense 평가 — 루프 28

> 대상: 공개 글 10편 (GNU Make `seriesOrder` 5~7, HBM·GDDR 심화 `seriesOrder` 1~7)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 스물여덟 번째 루프다. 대상은 `src/content/blog/tools/build/gnu-make/`의 마지막 세 편(chapter05~07, 함수·조건문·실전 Makefile)과 `src/content/blog/embedded/hardware/hbm/`의 앞 일곱 편(chapter01~07, 개요·스택·세대·GDDR·대역폭·열·컨트롤러)이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. `score_status`는 모두 잠정이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `gnu-make/chapter05-functions.md` | 13 | 15 | 8 | 11 | 6 | 7 | 2 | **62** | 미검증 | 보강 | 중간 | `part7-05-kernel-build.md`, `part12-10-on-device-llm.md` |
| `gnu-make/chapter06-conditionals.md` | 13 | 13 | 8 | 10 | 7 | 7 | 2 | **60** | 미검증 | 보강 | 중간 | `part7-05-kernel-build.md`, `part12-10-on-device-llm.md` |
| `gnu-make/chapter07-practical.md` | 11 | 12 | 7 | 8 | 7 | 7 | 2 | **54** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part6-09-isr-api.md` |
| `hbm/chapter01-overview.md` | 13 | 11 | 6 | 9 | 4 | 5 | 2 | **50** | 검증됨 | 보강 | 중간 | `part1-04-uart-hardware.md`, `part12-10-on-device-llm.md` |
| `hbm/chapter02-hbm-stack.md` | 13 | 11 | 5 | 12 | 6 | 5 | 2 | **54** | 검증됨 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `hbm/chapter03-hbm-generations.md` | 15 | 12 | 6 | 10 | 7 | 5 | 3 | **58** | 검증됨 | 병합 검토 | 중간 | `part12-10-on-device-llm.md`, `part7-05-kernel-build.md` |
| `hbm/chapter04-gddr.md` | 12 | 10 | 6 | 10 | 5 | 5 | 2 | **50** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `hbm/chapter05-bandwidth-bottleneck.md` | 15 | 12 | 7 | 10 | 6 | 5 | 1 | **56** | 검증됨 | 병합 검토 | 중간 | `part12-10-on-device-llm.md`, `part7-05-kernel-build.md` |
| `hbm/chapter06-thermal-power.md` | 11 | 8 | 7 | 12 | 5 | 7 | 2 | **52** | 검증됨 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `hbm/chapter07-memory-controller.md` | 11 | 10 | 5 | 10 | 5 | 5 | 2 | **48** | 검증됨 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |

평균 54.4점(10편, 합 544점), 범위 48~62점이다. 판정은 보강 3편(GNU Make ch05·ch06, HBM ch01), 병합 검토 6편, 우선 조치 1편이고 유지·검증 대기·제외 검토는 없다. 점수 구간으로는 GNU Make ch05(62)·ch06(60)만 보강(60~79)이고 나머지 8편은 병합 검토(40~59)다. HBM ch01은 시리즈 허브 첫 글이라 병합 검토 대신 보강으로 두었고, HBM ch04는 오류 확인 1건(23·40행 GDDR6 64 GB/s 대 111행 '192 GB/s = GDDR6의 2배', 원문 내부 산술 불일치) 때문에 우선 조치로 올라갔다. factcheck는 HBM 6편이 커밋 9ad745f7(#58, 장마다 1차 자료를 적은 fact-check 커밋)로 검증됨, GNU Make 3편은 1차 자료 대조 커밋이 없어 미검증이다. 검증됨 6편 모두 80점 미만이라 '유지'·'검증 대기'는 없다. P0는 찾지 못했다. 확인 범위는 각 글 본문 전체, 다음 편 안내의 실제 seriesOrder+1 파일, 관련 항목 링크 대상과 링크 없는 관련 항목 후보 파일의 제목·`draft`, 본문 앵커 대상 heading, HBM ch07 이미지 파일 존재까지이고 렌더링·광고 배치·외부 링크 생존은 보지 않았다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `gnu-make/chapter05-functions.md` | 64 | 62 | -2 | 없음 |
| `gnu-make/chapter06-conditionals.md` | 59 | 60 | +1 | 없음 |
| `gnu-make/chapter07-practical.md` | 55 | 54 | -1 | 없음 |
| `hbm/chapter01-overview.md` | 51 | 50 | -1 | 없음 |
| `hbm/chapter02-hbm-stack.md` | 54 | 54 | 0 | 없음 |
| `hbm/chapter03-hbm-generations.md` | 58 | 58 | 0 | 없음 |
| `hbm/chapter04-gddr.md` | 50 | 50 | 0 | 없음 |
| `hbm/chapter05-bandwidth-bottleneck.md` | 57 | 56 | -1 | 없음 |
| `hbm/chapter06-thermal-power.md` | 52 | 52 | 0 | 없음 |
| `hbm/chapter07-memory-controller.md` | 48 | 48 | 0 | 없음 |

- 기각·추가한 오류 확인: 없음. HBM ch04의 오류 확인(23·40행 GDDR6 최대 16 Gbps·chip BW 64 GB/s 대 111행 GDDR7 '최대 192 GB/s (GDDR6의 2배)', 글이 밝힌 값으로는 3배)은 더블 체크에서 다시 계산해 유지했다.
- 오류 확인으로 올리지 않은 의심: GNU Make ch07 267~285행은 `CC := $(CROSS_COMPILE)gcc`를 즉시 확장으로 고정한 뒤 CROSS_COMPILE을 바꾼다. 같은 구조를 GNU Make 3.81로 `make ARCH=arm` 실행하니 CC=gcc가 나와 300행 주석과 달랐지만, 언어 규칙을 알아야 판단되는 코드 결함이라 루브릭 3-1 예외에 따라 uncertainties에 두었다. GNU Make ch06 571행 ifeq 공백 주장과 340행 오류 메시지도 로컬 3.81 실행 결과(OBS)만 있고 매뉴얼을 열지 않아 같은 처리다. HBM ch03 183행 A100 stack당 311 GB/s가 HBM2 상한 307 GB/s를 넘는 점은 30행이 벤더 정격 초과 운용을 밝혀 동시에 참일 수 있어 올리지 않았다.
- GNU Make ch05: C 9→8(271·274·410·523행 '4.0+'와 637행 '셸 호출보다 빠름'이 출처·환경 없는 구체 주장, 출처 없는 구체 수치 상한 C ≤ 8), G 3→2(657~659·667행 매뉴얼 링크는 글 끝 목록이라 본문 출처가 아님).
- GNU Make ch06: A 12→13. 평가자 근거가 '13~19 구간 하단'이라고 쓰고 점수는 12였다. 합계 59→60이 되어 점수 구간이 병합 검토에서 보강(60~79)으로 바뀌었고, 판정을 보강으로 고쳤다. 평가자가 C에 붙인 '3-1 절차 표 상한(C ≤ 9)'은 측정 절차 표 규칙이라 근거에서 뺐다(점수 8 유지).
- GNU Make ch07: G 3→2(607~611행 글 끝 목록, 버전 표기 없음). D 근거에서 ch02 470~484행(무한 재빌드)과 이 글 522~539행(병렬 빌드 디렉터리 누락)은 질문이 달라 부분 병합 대상에서 뺐다.
- HBM ch01: D 10→9. 평가자가 ch05 22~43행을 비교하지 않았다. 이 글 47~49·121행의 핵심 계산(819 GB/s, 84 GB/s, 5×819≈4.1 TB/s 대 3.35 TB/s)이 ch05 코드 블록에 거의 그대로 있다.
- HBM ch05: G 2→1. 본문에 1차 출처 링크도 도구·CUDA 버전도 없어 버전을 적은 앵커 part7-05(G 2)보다 아래다.
- 줄 번호·근거 보정(점수 영향 없음): GNU Make ch05 D(ch06 376~385행), ch07 D(ch06 500~555·557~562행, bootloader ch03 327~339행 추가), HBM ch02 F(bow/chapter06은 스텁이 아니라 330행 본문이 있는 draft), HBM ch02 D(ch03 110·111·150행, ch07 27·34·187행), HBM ch03 C·D(183행 추가, ch05 23~29행), HBM ch05 D(ch08 175~177행, ch07 55~90행, part2-08 46~53행), HBM ch06(A 47·50행, B 52~73행, G 45~47행).
- 부풀림 판정은 10편 모두 없음이다. GNU Make ch06의 +1은 평가자 근거와 점수의 어긋남을 근거대로 맞춘 것이다.

## 글별 근거

### `gnu-make/chapter05-functions.md` — 62점, 보강

confidence: 중간

factcheck: 미검증. git log(3232b1be 태그 정규화, 0a9dd7bc slug 고정, 07cc1988 관련 항목 추가, be973200 topic 메타, ac24bb76 제목 변경, 400892d7 린터 일괄, 09a00a29 stub 롤아웃, 644b71b5 디렉터리 이동)에 GNU Make Manual·NEWS 같은 1차 자료와 본문 주장을 대조한 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 33행이 스스로 '내장 함수 카탈로그'라 밝히고 68~507행이 매뉴얼 Functions 장 순서를 따른다. 글 고유의 것은 84행 subst 경계 문제(foo.cmd→foo.omd), 236행 Make basename과 유닉스 basename 차이, 292~297·629~637행 realpath 빈 문자열 존재 검사, 444~455행 call→eval 이중 확장 풀이, 335행 `$(or)`와 `?=` 차이다. 212행 매뉴얼 인용·605행 경로 사고처럼 출처 없는 주장이 섞여 13~19 구간 하단. |
| B | 15 | 13~31행 문제 정의 → 37~64행 문법 → 함수군 → 513~566행 실전 Makefile → 570~637행 흔한 실수 6개 → 641~649행 정리로 흐름이 닫힌다. `$(file)`·`$(value)`·`$(origin)`과 Make 버전별 차이 정리가 없어 16점 이상은 아니다. |
| C | 8 | 예제 대부분에 예상 결과 주석(81, 97, 158~160, 167~168, 183, 205~209, 232~233, 374, 389행)이 있고 515~559행은 info 타깃까지 있는 실행 가능한 Makefile이다. 주석은 기대값일 뿐 실행 출력이 아니고 Make 버전·OS가 없다. 271·274·410·523행 '4.0+'와 637행 '셸 호출보다 빠릅니다'가 출처 없이 적혀 C ≤ 8. |
| D | 11 | 같은 시리즈: chapter07 512~520행 wildcard 오타 함정 ↔ 이 글 582~596행, chapter06 376~385행 MAKEFILE_LIST 관용구 ↔ 459~479행, chapter03 434~444행 info·warning·error ↔ 481~495행, chapter07 148~151행 shell find+patsubst+sort dir ↔ 524~530행. chapter04 390~393·422행은 wildcard·patsubst 상세를 이 글로 넘겨 역할이 나뉜다. 다른 시리즈: cmake/chapter02-language.md는 CMake 명령이라 도구가 다르고, modern-recipes/part3-11-make-cmake-cross.md·buildroot/chapter06-br2-external.md는 함수를 맥락 안에서 쓸 뿐이다. 겹치는 절이 네 곳이라 10~14 구간 중간. |
| E | 6 | 제목 키워드 wildcard(252~283행)·patsubst(86~111행)·foreach(369~379행)·shell(341~367행)과 description의 filter·call·eval이 모두 본문에 있다. 제목은 '분석'인데 본문은 카탈로그(33행)이고 foreach는 예제 하나와 두 문장뿐이라 6~8 하단. |
| F | 7 | 653행 다음 장 안내(Ch 6 조건문과 include, -MMD -MP)는 seriesOrder 6 chapter06-conditionals.md와 맞는다. 663~666행 관련 항목 라벨이 대상 제목과 맞는다. 15·304행이 장 간 위치를 짚는다. 477행이 아직 읽지 않은 Ch 6을 'Ch 6에서 본'이라고 과거형으로 가리켜 8점은 주지 않았다. |
| G | 2 | 657~659·667행 GNU Make Manual 링크는 글 끝 목록이다. 271행 `**` 재귀 매칭, 410행 define `:=`, 212행 매뉴얼 인용에 본문 출처가 없고 기준 Make 버전 표기도 없다. |

uncertainties:
- 271~275·523행 'wildcard의 `**` 재귀 매칭은 4.0+에서 셸 globstar에 위임'은 GNU Make가 내부 glob을 쓴다는 기억과 어긋나 틀렸을 수 있으나 매뉴얼·소스를 열지 않았다(기억 기반).
- 212행 '매뉴얼은 … 자연수 직관에 더 가깝다는 설명을 곁들인다' 인용이 매뉴얼에 있는지 미확인.
- 410행 define `:=` 도입 버전(4.0+)을 NEWS로 확인하지 않았다.
- 357행 '모든 호출이 파싱 시점에 일어난다'와 360~361행 '= 로 쓰면 참조할 때마다 find가 돈다'·304행이 실행 시점을 다르게 말한다. 레시피 참조를 명시하지 않아 동시에 거짓이라 확정하지 않았다.
- 258행 'wildcard가 존재를 알아내는 유일한 1차 함수'와 292·629~637행 realpath 존재 검사가 긴장 관계다. '1차' 해석 여지가 있다.
- 566행 '@true는 레시피가 비면 안 되어서 넣는 no-op' 설명을 매뉴얼로 확인하지 않았다.
- 332행 `$(or $(CC),gcc)`는 CC 기본값 cc 때문에 gcc로 채워지는 경우가 드물다(예제 효과가 약함).
- 605행 경로 사고, 637행 realpath 속도는 출처·측정 없는 주장이다.

### `gnu-make/chapter06-conditionals.md` — 60점, 보강

confidence: 중간

factcheck: 미검증. git log(3232b1be, 0a9dd7bc, 07cc1988, be973200, ac24bb76, 69e67197 표 변환, 400892d7, 09a00a29, e8f4f432, 644b71b5)에 GNU Make 매뉴얼·GCC 문서와 대조한 커밋이 없다. 평가 중 1차 자료(매뉴얼·read.c)를 열지 못했고, 로컬 GNU Make 3.81 실행 결과는 uncertainties에만 적었다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 42~163·209~250행은 매뉴얼 Conditionals·Include 범위를 따른다. 글 고유 설명은 125~149행 ifdef(정의 여부)와 `ifeq ($(VAR),)`(빈 값) 구분, 325~340행 -MP 빈 규칙이 헤더 삭제 뒤 재빌드로 이어지는 과정, 484~496행 타겟별 변수가 파싱 시점 `$(info)`에 안 보이는 시점 차이다. 205·323·404행은 근거 없는 단정이고 256~340행은 648행 Paul Smith 글 요약 수준이라 13~19 하단. |
| B | 13 | 13~38 → 42~163 → 167~205 → 209~252 → 256~340 → 344~421 → 425~496 → 500~562 → 566~626 → 630~638행으로 흐름이 이어진다. 571행 ifeq 공백, 340행 오류 메시지, 421행 Kbuild 비재귀 주장이 확인되지 않은 채 열려 있고, chapter01 127행 'GNU Make 4.0 이상' 전제가 이 글에 다시 나오지 않는다. |
| C | 8 | 131·135행 `$(info)` 출력 주석, 280~281행 `gcc -MM` 출력, 461행 펼쳐진 CFLAGS, 502~554행 config.mk·Makefile 전체와 호출 예가 있다. make·gcc 버전과 실제 실행 기록이 없고, 로컬 3.81 실행에서 571·340행이 본문과 다르게 나왔다(OBS). 8~11 구간 하단. |
| D | 10 | 비교한 글: chapter05·chapter07·chapter03, modern-recipes/part3-11-make-cmake-cross.md, cmake/chapter04-options.md. 502~548행 골격이 chapter07 54~96행과 거의 같은 코드이고 chapter07 103행이 이 글로 링크한다. 46행 '지시자 vs `$(if)`'는 chapter05 304~317행, 381~385행 MAKEFILE_LIST는 chapter05 459~471행과 겹친다. part3-11 45·78·83행이 -MMD -MP·-include를 GCC 14.2·GNU make 출처와 함께 한 문단으로 다룬다(크로스 컴파일 중심). cmake ch04는 역할이 다르다. ifdef/빈 값, 파싱 시점 함정, include·-include는 이 글에만 있다. |
| E | 7 | 2행 제목 'ifeq·ifdef·include·-include'와 5행 description을 42~163·344~385·296~340행이 이행한다. 제목·description에 없는 타겟별 변수 절(425~496행, 약 70행)이 있고 독자·전제 버전을 밝히지 않았다. |
| F | 7 | 642행 'Ch 7: 실전 Makefile'은 seriesOrder 7 chapter07-practical.md와 맞고 안내 내용이 대상 201·260·423·455행에 있다. 653~656행 라벨(Ch 5 `$(if)`·MAKEFILE_LIST, Ch 7, Ch 3 우선순위 규칙, CMake Ch 4 옵션과 캐시 변수)이 대상과 맞는다. 46행 '(Ch 5)'에 링크가 없고 전제 지식 안내가 없다. |
| G | 2 | 644~649행 참고 자료(Conditionals·Include, Paul D. Smith, Peter Miller 1997)는 끝 목록이고, 408행 Miller 언급에 링크·버전이 없다. GNU Make·GCC 버전 표기가 없다. |

uncertainties:
- 571행 'ifeq ($(DEBUG), 1) → 거의 항상 false'와 574행 '쉼표 뒤 공백이 인자에 흡수': 로컬 GNU Make 3.81 실행 결과는 참(SPACE-MATCH)이었다(OBS). 매뉴얼 Conditional Syntax·read.c를 열지 못했고 3.81은 시리즈 전제(4.0 이상)보다 낮다.
- 340행 '-MP 없이는 header.h: No such file or directory. Stop.': 3.81 실행에서는 "No rule to make target `header.h', needed by `main.o'.  Stop."이 나왔다(OBS).
- 250행 'sinclude는 POSIX 호환 별명'은 매뉴얼이 다른 make 구현과의 호환을 이유로 든 것으로 기억한다. 미확인.
- 421행 'Kbuild, U-Boot이 모두 비재귀적': Kbuild는 `$(MAKE) $(build)=dir`로 재귀 호출한다고 기억한다. 미확인.
- 404~406행 재귀 Make 단점 정도와 323행 '1990년대 후반에 끝났습니다'는 출처 없는 단정이다.
- 104행 `ifeq ($(CC),gcc)`: CC 기본값이 cc라 두 분기 모두 안 맞을 수 있는데 111행은 '두 컴파일러 모두에서 깔끔하게 빌드'라고만 쓴다. 107행 `-Wno-c++98-compat` 설명도 없다.

병합 대상(부분 정리 후보, 판정은 점수 구간대로 보강): 글 전체로는 병합 대상 없음. 500~562행 실전 예시는 chapter07-practical.md 54~103행과 거의 같은 코드라 이 글 쪽을 줄이고 링크하고, 425~496행 타겟별 변수는 chapter03-variables.md 322행 이후 절로 옮길지 검토한다. 571·340행은 매뉴얼과 실제 실행으로 확인해 고친다.

### `gnu-make/chapter07-practical.md` — 54점, 병합 검토

confidence: 중간

factcheck: 미검증. git log 10개(3232b1be, 0a9dd7bc, 07cc1988, be973200, ac24bb76, 69e67197, 400892d7, 09a00a29, e8f4f432, 644b71b5) 중 GNU Make Manual·GNU Coding Standards·GCC·binutils 문서와 대조한 커밋이 없다. 267~285행 크로스 컴파일 결함은 3.81 재현에서 CC=gcc가 나왔지만 루브릭 3-1 예외(언어 규칙을 알아야 판단되는 코드 결함)로 uncertainties에 둔다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 45~97행 C 골격, 125~189행 sanitizer 분기, 220~224행 `ar rcs` 표, 266~297행 CROSS_COMPILE, 425~506행 install·help·V=1은 매뉴얼·Coding Standards·커널 관용을 모은 목록이다. 이 글만의 해석은 421행 MAKEFLAGS `-j` 경고, 448~451행 PREFIX·DESTDIR 구분, 226행 thin archive 한 문장, 388행 테스트 러너 적용 범위 정도다. 254·421행은 일반론으로 끝난다. |
| B | 12 | 15~22행이 약속한 여섯 항목을 26~506행이 다루고 510~595행까지 흐름은 완성됐다. SONAME 체인은 256행에서 넘기고, 267~285행 크로스 컴파일 블록이 그대로는 크로스 컴파일되지 않는다는 의심이 열려 있어 AP-C-24상 B ≤ 13. |
| C | 7 | 108~114·299~304·383~386·441~446·501~504행 명령은 있지만 make·gcc 버전, OS, 실행 출력이 없다. 197행 'ASan 2~3배 느림, 메모리 3배'는 출처 없는 수치라 C ≤ 8. 300행 주석 'make ARCH=arm # armhf'는 267~277행 구조상 재현 시 CC=gcc가 나온다. 347~364행 테스트 러너에 예상 출력이 없다. |
| D | 8 | 비교한 글: chapter06(인접), chapter02, chapter05, cmake/chapter07-install.md, buildroot/chapter17-sdk.md, bootloader/chapter03-build-system.md. 45~97행 골격이 ch06 500~555행과 변수·규칙까지 거의 같고 101~103행 요약은 ch06 557~562행과 같다. 569~580행 `$$` 실수는 ch02 502~515행과 같다. 522~539행은 ch02 470~484행과 해결만 같고 질문이 다르다. 262~264행은 bootloader ch03 327~339행과 겹치나 그쪽은 U-Boot 사용법이다. cmake ch07 93~116행·buildroot ch17 176~179행 DESTDIR은 맥락이 달라 중복 아님. 라이브러리·테스트 러너·install/help는 이 글에만 있다. |
| E | 7 | 제목·description의 범위는 26·118·201·260·320행 절과 맞는다. description '그대로 쓰는'과 15행 '그대로 옮겨 쓸 수 있는'은 267~285행 결함 의심과 205~252행 설치·SONAME 부재로 약속보다 좁다. |
| F | 7 | 시리즈 마지막 편(chapter08 없음)이라 603행이 cmake/chapter01-intro.md(draft: false)로 안내한다. 615~618행 관련 항목(Ch 6, Ch 5, CMake Ch 7, Buildroot Ch 11) 대상 제목이 라벨과 맞는다. 15행 전제 안내, 102·103행이 ch02 142행·ch06 256행 heading으로 연결된다. 렌더 확인이 없어 9 이상은 아니다. |
| G | 2 | 607~611행 GNU Make Manual·GNU Coding Standards는 끝 목록이다. 본문 주장 옆 출처와 Make·GCC·clang-tidy 버전·OS가 없다. 197·453·599행 주장에 출처가 없다. |

uncertainties:
- 267~285행: `CC := $(CROSS_COMPILE)gcc`를 먼저 고정한 뒤 277·280·283행에서 CROSS_COMPILE을 바꾼다. 3.81로 `make ARCH=arm` 재현 시 CC=gcc가 나와 300행 주석과 다르다. 269~272행 CXX·AR·STRIP·OBJCOPY도 같다. AP-C-24 '내부 모순' 문구와 3-1 예외가 충돌하는 사례라 fact-check 단계에서 매뉴얼 'The Two Flavors of Variables'로 확정해야 한다.
- 197행 ASan 수치를 clang AddressSanitizer 문서와 대조하지 않았다.
- 599행 'GNU Make는 1976년 Stuart Feldman이 만든 도구'는 원조 make와 GNU Make를 섞은 표현일 수 있다(기억 기반).
- 418행 Makefile 안 `MAKEFLAGS += -j$(NPROCS)`의 효과가 버전에 따라 다를 수 있다. 미확인.
- 226행 `ar Trcs` 표기와 빌드 시간 효과를 binutils 문서로 확인하지 않았다.
- 453행 '모든 패키지 매니저가 이 관용을 따른다'는 과일반화 가능성.
- 518행 wildcard가 비면 '할 일 없음'이라 했지만 45~97행 골격에서는 76~78행 링크 레시피가 입력 없이 돌 수 있다. 실행 확인 안 함.
- 102·103행 앵커가 렌더된 id와 맞는지 `audit:anchors`로 확인하지 않았다.

병합 대상: 부분 병합 대상은 `src/content/blog/tools/build/gnu-make/chapter06-conditionals.md` 500~562행(이 글 45~104행과 거의 같음)과 `chapter02-rules.md` 502~515행(`$$`, 이 글 569~580행과 같음). 글 전체 병합 대상은 없다. 다음 조치는 보강이다. 라이브러리·크로스 컴파일·테스트·install 절은 시리즈에서 이 글에만 있고 '실전 Makefile' 검색 의도가 독립적이다(루브릭 5절 '중복 후보가 강하지만 독립 검색 의도 → 차별화 보강'). 기본 골격은 ch06 예와 한쪽으로 정리하고, `:=` 순서 문제를 매뉴얼로 확인해 고치고, 197행 수치는 출처를 달거나 지운다.

### `hbm/chapter01-overview.md` — 50점, 보강

confidence: 중간

factcheck: 검증됨. 9ad745f7 'fact-check round 1: HBM·GDDR series (12 posts) against primary sources (#58)' 안의 'fix(content): fact-check HBM Ch 1 against primary sources'. SK hynix HBM3 양산 시기, H100 PCIe/NVL 메모리 종류, H100 SXM 3.35 TB/s, Micron HBM3E 9.2 Gbps, A64FX·Xeon Max 모드 등을 고쳤고 출처로 NVIDIA Hopper whitepaper·H100 페이지, RTX 4090 사양, L4·L40·Gaudi 3 사양, JEDEC JESD250(2017)·JESD239(2024-03-05), Micron GDDR6X, 벤더 보도자료, Intel Xeon Max 개요, Fujitsu A64FX 사양을 적었다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 47행 RTX 4090 '21 Gbps × 384-bit ÷ 8 = 1,008 GB/s'·chip당 84 GB/s와 49행 H100 SXM5 정격 4.1 TB/s 대비 3.35 TB/s를 같은 틀로 풀고, 121행이 819 대 84 GB/s를 시스템 단위로 다시 맞춘다. 129행은 Xeon Max·A64FX로 'DDR5 후속' 오해를 반박한다. 23~28·57~65·77~80·88~96행은 사양·발표 나열이고 71행은 cost 분석을 '벤더가 공개하지 않습니다'로 비웠다. |
| B | 11 | 17 → 34~39 → 47~49 → 57~67 → 71 → 77~82 → 88~96 → 102~115 → 119~129 → 133~138행으로 흐름은 끝까지 간다. 제목의 capacity는 17행 한 문장, cost는 71행 한 문장이고 37행 DDR per-pin 칸은 TBD다. |
| C | 6 | 실행 절차·관찰이 없는 개념·사양 글이다. 47·49·67·121·135행 산술은 서로 맞지만 사양 수치의 본문 출처 링크가 없어 C ≤ 8. 앵커 part1-04(6)와 같은 수준. |
| D | 9 | 같은 시리즈: 57~65행 per-pin 표가 chapter03 24~27행·chapter04 23~25행과 값이 겹치고, 49행 H100 5 stack·3.35 TB/s는 chapter03 117행과 같다. 47~49·121행 핵심 계산이 chapter05 22~43행 코드 블록에 거의 그대로 있다. 41행 PAM4·PAM3 요약은 chapter04 15행과 같다. chapter02와는 겹치지 않는다. 다른 시리즈: modern-recipes/part8-06-numa.md 125~142행은 OS 관점, cxl/chapter09-flit-format.md 180행은 링크뿐. 표 두 개와 핵심 예제가 반복돼 5~9 구간 상단. |
| E | 4 | 제목·description의 'Bandwidth·Capacity·Cost'와 '시장 분할' 중 bandwidth(34~67행)와 시장 분할(77~82행)만 답한다. capacity는 17행 한 문장, cost는 71행 '공개하지 않습니다' 한 문장이라 키워드 절반 이상 누락(3~5). |
| F | 5 | 142행 다음 편은 seriesOrder 2 chapter02-hbm-stack.md와 맞고 146~148행 링크 라벨도 맞다. 149~151행 'BoW Ch 1', 'UCIe Ch 1', 'CXL Ch 1'은 링크 없는 관련 항목이다. bow·ucie chapter01은 draft: true이고 cxl/chapter01-cxl-position.md는 공개인데도 링크가 없어 F ≤ 5. 102~115행 로드맵 표에도 장 링크가 없다. |
| G | 2 | 57~65행 표가 JESD235B(2018)·JESD235C(2020)·JESD238(2022)·JESD250(2017)·JESD239(2024)와 벤더 이름을 행마다 붙였지만 본문 링크가 없고, 17·49·79·88~96행에 출처 표기가 없다. |

uncertainties:
- 79행 Rebellions REBEL-Quad HBM3E, Google TPU v5p HBM 분류는 Ch 1 fact-check 출처 목록에 없어 확인하지 않았다.
- 21행 'JEDEC 표준 안에서 네 갈래'와 64행 GDDR6X 'Micron'(독자 규격) 표기가 함께 있다. 계열 단위로는 모순이 아니라 오류 확인으로 두지 않았다.
- 90행 2015 Fury X, 96행 2024년 9월 SK hynix 12-Hi 36 GB HBM3E 양산 날짜는 보도자료를 열어 확인하지 않았다.
- 렌더링·`audit:reading` 미실행.

판정 메모: 점수 구간은 병합 검토(40~59)지만 시리즈 허브 첫 글이라 보강으로 둔다. 표·계산은 Ch 3·4·5로 링크하고 줄이며, 제목의 Capacity·Cost를 본문과 맞추고, 149~151행 항목을 지우거나 공개 글로 링크한다.

### `hbm/chapter02-hbm-stack.md` — 54점, 병합 검토

confidence: 중간

factcheck: 검증됨. 9ad745f7(#58) 안의 'fix(content): fact-check HBM Ch 2 against primary sources' — HBM3 channel 표(128-bit×16 → 64-bit×16, PC 32-bit, JEDEC HBM3 release), base die 공정(SK hynix/TSMC MOU 2024-04), HBM4 microbump 유지(775 μm), 12-Hi 높이(SK hynix 12-layer HBM3E release 2024-09)를 고치고 근거 없는 TSV 개수·bump pitch 표를 지웠다. 내부 일관성도 확인했다: 0.95^5/9/13/17 = 77.4/63.0/51.3/41.8%(71~76행), 97행 33%·51.3→41.8%, 63행 64-bit×32 = 2048-bit, 57행 그림 alt와 62행 표, 27행과 114행 모두 맞다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 27행 stack 높이가 cold plate 공유 때문에 제약이라는 설명과 720/775 μm, 49·105행 HBM4 높이 완화 → microbump 유지 인과, 69~78행 95% 가정을 밝힌 0.95^N 표와 KGD·redundancy 보정, 97행 12→16-Hi 용량 33% 대 yield 51.3→41.8% 트레이드오프가 고유하다. 41행 TSV는 '벤더가 공개하지 않습니다', 51행 microbump는 '확인하지 못했습니다'로 끝나고 33행은 업체 발표 요약이다. |
| B | 11 | 19~27 → 29~33 → 35~41 → 43~51 → 53~65 → 67~91 → 93~109 → 111~119행으로 흐름은 완결이다. base die 역할은 31행 한 문장, TSV 개수(41행)와 bump pitch(51행)가 비었고 80~89행 제조 흐름은 설명 없는 목록이다. |
| C | 5 | 실행·측정 대상이 없는 구조 글이다. 69~76행 가정 명시 산술뿐이고 27·33·59~63행 수치에 본문 출처가 없어 C ≤ 8. 4~7 구간 하단. |
| D | 12 | 같은 시리즈: chapter01 105행 로드맵이 TSV·base die·microbump를 이 글에 배정하고 39행은 한 칸뿐이다. chapter03 64·71·110·111·150행 channel 설명 ↔ 이 글 59~65행(65행이 ch03 71행과 거의 같음). chapter06 24~28행 stack 단면 ↔ 19~27행(열 경로 관점, 부분 겹침). chapter07 27·34·187행 ↔ 57·117행. 다른 시리즈: ucie/chapter07-3d-packaging.md·chapter06-2-5d-packaging.md(각 13행 Outline, draft), bow/chapter06-packaging.md(draft). TSV·microbump를 다루는 공개 글은 hbm 시리즈 밖에 없다. |
| E | 6 | 제목 'TSV·Microbump·Base Die의 역할'과 29·35·43행 H2가 맞지만 세 키워드 모두 역할 설명이 짧다(31·41·51행). 부분 미이행으로 6~8 하단. |
| F | 5 | 123행 다음 편 안내가 seriesOrder 3 chapter03-hbm-generations.md와 맞고 127~129행 Ch 1·3·6 링크도 맞다. 130~132행 'UCIe Ch 6/Ch 7', 'BoW Ch 6'은 링크 없는 항목이고 대상 ucie ch06·ch07(13행 Outline)·bow ch06(330행 본문)은 모두 draft: true라 F ≤ 5. |
| G | 2 | 본문에 링크된 1차 출처가 없다. 27행 'JEDEC 기준', 33행 '2024년 4월 MOU', 47행 'SK hynix … MR-MUF'에 문서 번호(JESD238/JESD270-4)·URL이 없다. |

uncertainties:
- 27행 'JEDEC 기준 nominal 높이는 HBM3E까지 720 μm': HBM3E는 별도 JEDEC 규격이 아니라는 점에서 표현이 원문과 맞는지 미확인. 775 μm 출처도 커밋상 2차 매체다.
- 49행 '16-Hi HBM4도 기존 bonding 기술로'의 업체별 접합 방식은 1차 자료로 확인하지 않았다.
- 25행 HBM4 4·8·12·16-Hi와 'HBM3 16-Hi 확장 조항'을 JESD238/JESD270-4 원문으로 확인하지 않았다. 113행은 HBM3를 4·8·12-Hi로만 적어 25행보다 좁지만 모순은 아니다.
- 63행 HBM4 pseudo channel 폭은 비어 있다.
- 80~89행 제조 흐름 번호 목록이 ```text 블록에 있다(§5 후보, 점수 외).

병합 대상: 병합 대상 없음. chapter01 105행 로드맵이 물리 적층을 이 글에 배정했고 ch03(세대)·ch06(열)·ch07(컨트롤러)과 질문이 다르다. 다음 조치는 보강이다. JESD238·JESD270-4 번호와 SK hynix 발표 링크를 본문에 넣고, 31·41·51행을 1차 자료로 채우거나 제목 범위를 좁히고, 59~65행 channel 표는 ch03·ch07 링크로 대체를 검토하고, 130~132행 draft 대상 항목을 지운다.

### `hbm/chapter03-hbm-generations.md` — 58점, 병합 검토

confidence: 중간

factcheck: 검증됨. 9ad745f7(#58) 안의 'fix(content): fact-check HBM Ch 3 against primary sources' — GH100 HBM3/HBM2e 지원, A100 40GB=HBM2, HBM3 symbol 기반 ECC, WDQS/RDQS 3.2 GHz·CK 1.6 GHz, Micron 9.2/SK hynix 9.6 Gbps, 카드 표 stack당 BW를 NVIDIA Volta/Ampere/Hopper 백서·H100/H200/DGX B200 페이지, JEDEC HBM3(2022-01-27)·HBM4(2025-04-16) 발표, 벤더 보도자료, Intel HBM2 FPGA IP 가이드와 대조했다. 15·50·52·92·98·117·137·149·153·182~184·212행 산술에서 동시에 참일 수 없는 모순은 찾지 못했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 15 | 30행이 JEDEC 정격(JESD235B 2.4, JESD235C 3.2 Gbps)과 SK hynix 제품 속도(3.6 Gbps)를 구분하고, 123·200행이 HBM3 6.4 Gbps가 DDR 포함 속도이며 WDQS/RDQS 3.2 GHz·CK 1.6 GHz로 분리됐다고 짚는다. 196행 GH100 패키지 분리, 178~188행 카드 총 BW를 stack 수로 나눈 해석, 141·208행 HBM4 폭 확장 선택이 이 글의 관점이다. 세대별 값 나열과 TBD 칸(23·24·25·27·46·47·67·135·164·165·167행), 190행 '25배' 일반론 때문에 15. |
| B | 12 | 34~219행 흐름은 완성됐다. RAS 표(162~168행) 5행 중 3행이 TBD, HBM3E JEDEC 번호(27행)와 Samsung 행(135행)이 비었다. 190행 '6.25배'·'25배'가 불확실로 열려 있어 B ≤ 13(AP-C-24). |
| C | 6 | 재현 절차·측정은 없고 52·92·137·153·182~184행 사양 유도 산술뿐이다. 190·204행 출처 없는 수치·일반론으로 C ≤ 8. 183행 A100 stack당 311 GB/s가 24·63행 HBM2 최대 307 GB/s를 넘는데 188행 설명이 이 경우를 다루지 않는다. |
| D | 10 | 같은 시리즈 chapter01 57~65·88~96행 ↔ 21~28·30·91·133~134행, chapter02 59~65행 ↔ 64·71·110~111·150행, chapter05 23~29행 ↔ 109·134행. 다른 시리즈는 src/content/blog 전체에서 HBM2E/HBM3E를 grep했고 pcie/STORYBOARD.md(draft) 외에 없다. HBM4 폭 확장, RAS, 카드별 stack당 BW, 함정 절은 이 글 고유다. |
| E | 7 | 제목의 네 세대 모두 절이 있다(54·83·100·125행). 'JEDEC 표준 진화'는 27행 TBD로 한 칸 비었고 description의 'signaling'은 114·123행 정도라 부분 미이행. |
| F | 5 | 223행 다음 편이 seriesOrder 4 chapter04-gddr.md와 맞고 17·190행 장 간 안내가 있다. 227~230행 관련 항목도 맞는다. 231행 'UCIe Ch 5: 버전 비교'는 링크가 없고 대상 ucie/chapter05-version-comparison.md가 draft: true라 F ≤ 5. 72~81행은 불릿에 '├──'를 넣어 가독성이 낮다. |
| G | 3 | 30행 JESD270-4(2025년 4월), 56행 JESD235A 2016·JESD235B 2018, 85행 JESD235C 2020, 104행 JESD238 2022년 1월, 133·134행 양산 발표 월이 주장에 붙어 있고 30·188행이 TBD 이유를 밝힌다. 링크는 없어 2~3 상단. |

uncertainties:
- 190행 '8년 만에 6.25배'의 기준이 없어 15행 '6년 만에 4배', 212행 '9년 만에 약 10배'와 맞출 수 없다.
- 190행 'GPU compute 25배(FP16)'는 출처가 없고 chapter05 15행(V100→H100 연산 약 8배)과 어긋난다. 다른 글과의 불일치라 오류 확인 근거가 아니다.
- 183행 A100 stack당 311 GB/s는 HBM2 상한 307 GB/s를 넘는다. 30행대로 벤더가 정격 위로 돌릴 수 있어 내부 모순으로 확정하지 않았다.
- 156·208행 'HBM4가 HBM3 controller와 하위 호환'의 JEDEC 표현은 원문으로 확인하지 않았다.
- 65~66행 JESD235B 12-Hi·24 GB, 113행 HBM3 '4~64 GB'·'16-Hi 확장 조항'은 JEDEC 원문으로 확인하지 않았다.
- 96행 'A100 80GB (2 TB/s 이상)'의 정확한 값은 확인하지 않았다.

병합 대상: 병합 대상 없음. 'HBM 세대별 사양 비교'는 시리즈 안에서 이 글만 답하고 다른 시리즈에 같은 주제 공개 글이 없다. 다음 조치는 보강이다. ch01 57~65·88~96행, ch02 59~64행 세대 표를 이 글로 링크하게 줄이고, HBM3E JEDEC 번호·RAS TBD 칸을 1차 자료로 채우거나 행을 지우고, 190행은 ch05 15행 수치로 바꾸거나 지우고, 231행 항목을 지운다.

### `hbm/chapter04-gddr.md` — 50점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 불일치(루브릭 3-1). 23행 표와 39~40행 chip 사양 표는 GDDR6를 '최대 16 Gbps', chip BW '최대 64 GB/s'(27행 식 per-pin × 32 ÷ 8)로 적었고, 111행은 GDDR7 chip BW '최대 192 GB/s (GDDR6의 2배)'라고 적었다. 글이 밝힌 값으로는 192 ÷ 64 = 3배라 두 진술이 동시에 참일 수 없다. git 이력에는 9ad745f7(#58) 안의 'fix(content): fact-check HBM Ch 4 (GDDR) against primary sources'(JEDEC JESD250·JESD239 발표, Micron GDDR6X, RTX 5090·RTX 4090·AD102, HPE L4/L40, AMD Strix Halo)가 있어 이 불일치가 없었다면 검증됨이지만, 대조 뒤에도 111행이 남아 있다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 고유한 부분은 85행 −9.5 dB, 91·97행 PAM3 −6.0 dB, 91행 레벨 간격 '50% 넓다', 126행 'PAM4는 UI 폭에서 여유를 얻고 레벨 간격에서 잃는다'(95 ps vs 48 ps), 164~174행 오해 바로잡기(10.5 Gbaud, L4·L40 GDDR6, Strix Halo LPDDR5X)다. 62~83·138~143·109~116행은 발표문·입문 수준이고 GDDR7 48 Gbps 경로는 91행 'log₂3 ≈ 1.58 bit'에서 멈춘다. |
| B | 10 | 15 → 21~27 → 29~58 → 60~118 → 120~126 → 128~146 → 148~156 → 158~174 → 176~182행으로 흐름은 간다. 42·152·153행 TBD로 신뢰성 절은 GDDR7 한 행이고 PCB 절은 한 문장과 UI 계산뿐이다. 111행 불일치로 AP-C-24 B ≤ 13. |
| C | 6 | 27행 식, 53~54행 1,008 GB/s, 85·96~98행 dB, 126행 UI 계산 같은 출처 유도 산술뿐이라 C ≤ 9이고 측정·관찰이 없다. 41행 1.35 V는 출처가 없고 150~154행 3행 중 2행이 TBD다. |
| D | 10 | 같은 시리즈 chapter01 63~65행 세대 표 ↔ 21~25행, chapter01 47행 RTX 4090 계산 ↔ 46~56행, chapter01 134행 ↔ 178~179행, chapter05 35행 GDDR6X 84 GB/s 재계산. 다른 시리즈 pcie/chapter09-physical-layer.md 112·161행 ↔ 74·160~162행. PAM3 절(87~104행), UI 트레이드오프(126행), GDDR channel 비교(130~146행)는 이 글에만 있다. chapter03은 겹치지 않는다. |
| E | 5 | 2·5행이 'PAM 신호로 32 Gbps 도달한 경로'를 약속하지만 본문에 32 Gbps가 없고 15·25·179행은 48 Gbps다. description의 'clock 진화' 절이 없고 48 Gbps 경로 분석도 없다. |
| F | 5 | 186행 다음 편이 seriesOrder 5 chapter05-bandwidth-bottleneck.md와 맞고 190~192행 링크 라벨도 맞다. 193~194행 'UCIe Ch 3', 'BoW Ch 2'는 링크 없는 항목이고 대상 둘 다 draft: true라 F ≤ 5. 전제 지식 안내가 없다. |
| G | 2 | 23·25행 JESD250 (2017)·JESD239 (2024), 106행 'JEDEC JESD239(2024년 3월 5일)', 15·68·89행 JEDEC·Micron 이름이 있지만 링크가 없고, 118·170·174행 제품 주장에 본문 출처가 없다. |

uncertainties:
- 111행 '(GDDR6의 2배)'와 23·40행 '최대 16 Gbps / 64 GB/s' 중 어느 쪽을 고칠지는 JEDEC GDDR7 발표문으로 정해야 한다. 발표문이 비교 기준으로 든 GDDR6 값이 16 Gbps 칩이 아닐 수 있다.
- 23·39행 'GDDR6 최대 16 Gbps'가 이후 개정판·벤더 제품과 맞는지 확인하지 않았다.
- 41행 1.35 V는 출처가 없고, fact-check 커밋이 'VDD values'를 지웠다고 적었는데 이 칸이 남아 있다.
- 113행 density 16~32 Gbit, 112행 channel 4개는 JEDEC 발표문으로 대조하지 않았다.
- 146행 'HBM3는 stack당 16 channel(채널당 64-bit)'은 1차 자료를 열지 않았다.

병합 대상: 판정은 오류 확인 때문에 우선 조치다. 점수 구간 기준 후보는 `src/content/blog/embedded/hardware/hbm/chapter01-overview.md`(세대 표 63~65행, RTX 4090 계산 47행)지만 PAM3·UI 트레이드오프·channel 비교는 이 글에만 있어 독립 검색 의도가 있다. 111행을 JEDEC GDDR7 발표문으로 고친 뒤 다음 조치는 보강이다(세대 표·RTX 4090 계산을 한쪽으로 모음, 32 Gbps·clock 약속 정리, 193~194행 삭제, PAM3 48 Gbps 경로 보강).

### `hbm/chapter05-bandwidth-bottleneck.md` — 56점, 병합 검토

confidence: 중간

factcheck: 검증됨. 9ad745f7(#58) 안의 'fix(content): fact-check HBM Ch 5 against primary sources' — 3.35 TB/s 해석, intensity 표(vector add 0.083, GEMM N/3), 42 ms 하한, knee 295(1,979 TFLOPS sparsity), V100→H100 표를 NVIDIA H100 페이지·Volta/Hopper whitepaper와, DCGM field ID를 dcgm_fields.h·dcgmi dmon 문서와 대조했다. 27·30·33·36·111·113·123~125·148행 산술을 다시 계산했고 내부 모순은 없었다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 15 | 38~43행 정격(5×819.2)과 실제 3.35 TB/s를 나란히 두고 '효율 손실이 아니라 정격보다 낮은 속도의 peak'라고 구분, 105행 dense 990 TFLOPS로 knee 295 FLOP/B, 109~113행 연산별 intensity, 121~125행 V100→H100 knee 139→295, 146~151행 Llama 2 70B batch 1 decode 42 ms 하한이 고유하다. 49~52행 손실 요인은 교과서 목록이고 54·97·186행 완곡 표현은 일반론이다. |
| B | 12 | 19~43 → 45~70 → 72~97 → 99~115 → 117~133 → 135~151 → 153~176 → 178~198 → 200~207행으로 흐름은 완성됐다. 제목의 'Achievable'은 54·203행 '측정으로 확인'으로 끝나 값·비율이 없고 STREAM 코드(76~95행)는 조각이다. 163행 rocprof 플래그 등 불확실이 열려 있어 B ≤ 13. |
| C | 7 | 89~92행 Triad 커널, 94행 BW 식, 159·163·166·175행 명령이 있지만 환경·출력·측정 결과가 없다. 80~86행 cudaMalloc이 함수 밖에 있고 94행 launch·타이밍이 주석뿐이라 실행할 수 없다(AP-C-35). 수치는 출처 유도 산술이라 C ≤ 9. |
| D | 10 | 같은 시리즈: chapter08 175~177행 42 ms 계산 ↔ 146~151행, chapter07 55~90행 ↔ 56~70행. chapter04·06은 겹침 없음. 다른 시리즈: performance-engineering/part2-08-memory-bandwidth.md 17~42·46~53·55~66행 ↔ 72~97·49~52·99~113행, part1-07-modeling.md 53~94행 roofline·STREAM OI. 이 글은 HBM·H100 수치로 knee와 memory wall을 계산하는 역할이라 구별된다. |
| E | 6 | Theoretical(19~43행)·Roofline(99~115행)·Memory Wall(117~133행)은 이행하나 Achievable은 값이 없다. 제목이 일반 범위인데 본문은 HBM·NVIDIA GPU 범위라 E ≤ 8. description 5행과 허브 chapter01 108행의 'sustained BW' 약속도 본문에 없다. |
| F | 5 | 17행 이전 편 ch04 링크, 211행 다음 편이 seriesOrder 6 chapter06-thermal-power.md와 맞고 안내 내용이 ch06 23·31·37·52행 H2와 맞는다. 215~217행 라벨도 맞다. 218행 'CXL Ch 8: ML 가속기 — memory wall 보완 경로'는 링크가 없고 실제 cxl/chapter08-cxl-mem.md 제목은 'CXL.mem — M2S·S2M·HDM Decoder'라 F ≤ 5. |
| G | 1 | 본문 출처 링크가 없다. 105행 1,979 TFLOPS, 123행 V100 125 TFLOPS·900 GB/s, 131행 L2 50 MB, 172~174행 DCGM field ID에 출처 표기가 없고 Nsight Compute·ROCm·DCGM·CUDA 버전도 없다. |

uncertainties:
- 163행 `rocprof --hsa-trace --hip-trace`의 현재 ROCm(rocprofv3 전환) 기준 유효성을 확인하지 않았다.
- 39행 '5 × 819 = 4,096 GB/s'는 27행 819가 819.2의 반올림이라 생긴 표기 차이다. 값은 맞다.
- 131행 H100 L2 50 MB는 커밋상 whitepaper로 대조됐으나 직접 열지 않았다.
- 190행 'MLPerf Inference가 그런 기준'은 출처 없는 평가 문장이다.
- 80~95행 STREAM 코드의 컴파일 여부는 확인하지 않았다(AP-C-35 후보).

병합 대상: 병합 대상 없음. 가장 가까운 후보는 performance-engineering/part2-08-memory-bandwidth.md와 hbm/chapter08-npu-gpu-usage.md 175~177행이지만, part2-08은 CPU·LPDDR 대상이고 이 글은 HBM·H100 knee·memory wall 계산이라는 독립 검색 의도가 있으며 ch06 17행·ch09 138행·ch12 44·146행이 이 글을 roofline 참조점으로 링크한다. 다음 조치는 보강이다(achievable 값의 1차 출처를 넣거나 54·203행을 TBD로, whitepaper·H100 페이지·dcgm_fields.h 링크와 도구 버전, 218행 수정·삭제, STREAM 코드를 실행 가능하게 고치거나 발췌라고 표시, ch08과 겹치는 42 ms 계산 정리).

### `hbm/chapter06-thermal-power.md` — 52점, 병합 검토

confidence: 중간

factcheck: 검증됨. 9ad745f7(#58) 본문의 'fix(content): fact-check HBM Ch 6 — keep what has a source' 절. DGX B200 공랭(약 14.3 kW)과 GB200 NVL72 liquid, nvml.h 0x4=SwPowerCap·0x20=SwThermalSlowdown, 열 흐름 화살표를 고쳤고 출처로 JEDEC HBM3/HBM4 발표(EDN 재게재), NVIDIA Ampere 백서(A100 400 W), H100·DGX B200·GB200 NVL72 페이지, nvml.h(nvidia-settings repo), nvidia-smi 문서를 적었다. 근거 없는 수치는 지우고 refresh 값은 TBD로 둔 기록도 있다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 고유한 것은 47·50·77~79행 'DGX B200은 공랭, GB200 NVL72는 liquid라 냉각 방식은 rack 밀도로 갈린다'와 65~73·81~83행 `clocks_event_reasons.active`에서 0x04와 0x20을 구분해 읽는 법이다. 29행 열 구조는 정성 한 문단, 33~35행 refresh는 교과서 설명 뒤 TBD, 87행 'cooling 설계도 달라집니다'는 완곡 표현이다. |
| B | 8 | 흐름은 있으나 35행 refresh 비용 TBD, 43~48행 cooling 표의 45·46·48행 TBD, 21행 전압 값 외 전력 관리(power state·DVFS)가 없다. throttling 절(52~73행)만 완결된다. 5~9 구간. |
| C | 7 | 58행 `nvidia-smi --query-gpu=temperature.memory,clocks_event_reasons.active --format=csv`와 67~71행 비트 표가 있다. 62행 출력 예에 GPU 모델·드라이버·부하 조건이 없어 C ≤ 8이고 실측 결과가 없다. |
| D | 12 | 같은 시리즈 chapter03 26·30·114·154행 ↔ 21·91행 전압 문단, chapter05 49행 ↔ 33행 refresh 설명, chapter07 123~129행(per-bank 스케줄링, 각도 다름), chapter02 27행(cold plate 높이, 이 글 25~29행은 열 경로), chapter08 241행(표 한 줄). 다른 시리즈 performance-engineering/part3-10-thermal.md 70~92행은 CPU trip point·cpufreq라 대상·도구가 다르다. |
| E | 5 | 제목 '열 설계와 전력 관리 — Stack 열 부하·Refresh Cost·냉각 솔루션' 중 '전력 관리'는 21행 전압뿐, 'Refresh Cost'는 35행 TBD, 'Stack 열 부하'는 29행 한 문단이다. 키워드 절반 이상 사실상 미이행. description(5행)은 본문과 맞다. |
| F | 7 | 99행 다음 편 'Ch 7: 메모리 컨트롤러 인터페이스'가 seriesOrder 7 chapter07-memory-controller.md이고 안내 내용이 ch07 55·85·94행 H2와 맞는다. 103~105행 ch02·ch05·ch07 라벨이 맞고 17행이 장 간 질문을 잇는다. 전제 지식·렌더 확인이 없어 9 이상은 아니다. |
| G | 2 | 21행 JESD238·JESD270-4 번호와 65행 'NVML 헤더(nvml.h)' 언급뿐이고 링크·드라이버 버전이 없다. 45~47행 A100 400 W, H100 700 W, DGX B200 14.3 kW에 본문 출처가 없다. |

uncertainties:
- 58행 `clocks_event_reasons.active`는 최신 이름이고 옛 드라이버는 `clocks_throttle_reasons.active`를 쓴다고 알고 있다. 바뀐 버전은 문서로 확인하지 않았다(기억 기반).
- 58행 `temperature.memory`가 일부 SKU에서 N/A인지 확인하지 않았다.
- 62행 출력 92·0x…20이 실측인지 알 수 없고, '# SW Thermal Slowdown' 주석은 nvidia-smi 출력이 아니다.
- 70행은 0x20을 'GPU 온도 또는 메모리 온도'로, 83행은 '메모리 온도 때문이면 0x20'이라고 써서 0x20만으로 HBM 원인을 단정하는 것처럼 읽힐 수 있다. 동시에 참일 수 있어 표현 문제다.
- 21행 HBM4 VDDQ '0.7~0.9 V'와 chapter03 154행 이산값 표기가 다르다. JESD270-4로 확인하지 않았다.
- 46·47행 수치는 커밋 출처 목록에 있지만 이번에 NVIDIA 페이지를 직접 열지 않았다.

병합 대상: 병합 대상 없음. 21행 전압은 ch03 26·30·114행과, 33행 refresh는 ch05 49행과 겹치지만 'HBM 냉각 방식과 throttling 비트 판독'은 시리즈 안 다른 글에 없는 질문이다. 다음 조치는 보강이다(35행 TBD를 JEDEC 원문으로 채우거나 제목에서 'Refresh Cost'를 뺌, '전력 관리'를 본문 범위로 좁힘, 62행 출력에 GPU·드라이버 버전과 nvml.h·nvidia-smi·JEDEC 링크, cooling 표 TBD 정리).

### `hbm/chapter07-memory-controller.md` — 48점, 병합 검토

confidence: 중간

factcheck: 검증됨. 9ad745f7(#58) 안의 'fix(content): fact-check HBM Ch 7 against primary sources' — tCCD_L/tCCD_S 대소 관계, Xilinx 컨트롤러를 PG276 기준(256-bit AXI 포트 32개, 14.375 GB/s × 32 = 460 GB/s, Alveo U55C 16 GB HBM2, segmented crossbar)으로, HBM3 on-die ECC를 symbol 기반으로 고치고 근거 없는 수치를 삭제·TBD로 했다. 출처는 JEDEC HBM3 release, AMD Alveo U55C 제품 페이지, AMD PG276.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 38행이 스스로 'DRAM 계열 공통'이라 하고 57~83·85~92·94~121·123~129·131~137·149행은 일반 컨트롤러 개념이다. HBM 고유 값은 34·51·129행 모두 TBD다. 고유한 것은 153행 PG276 포트 32개·460 GB/s와 53·177~183행 tCCD_L/tCCD_S·AXI-Stream 오해 교정 정도다. 83·175행은 출처 없는 일반론. |
| B | 10 | 19~34 → 36~53 → 55~83 → 85~121 → 123~129 → 131~137 → 139~141 → 143~149 → 151~165 → 167~183 → 185~191행으로 흐름은 간다. 34·51·129행 TBD, ECC 절 두 문장(141행), queue 절 그림 하나(147행)라 10~15 하단. |
| C | 5 | 61~68·75~78행 의사 명령, 109~119행 XOR 코드는 110행 주석대로 가상 비트 위치다. 137행은 예시일 뿐이고 153행 수치는 판·링크가 없다. 실행 조건·예상 결과가 없어 4~7 구간. |
| D | 10 | 같은 시리즈 chapter05 49~51·56~62·64~68행 ↔ 59~71·85~92·94~96행, chapter05 196~198행 ↔ 169~171행, chapter06 33~35행 ↔ 125~129행, chapter02 ↔ 21~34·187행. 다른 시리즈 ddr/chapter11-controller.md 55행은 draft라 공개 중복 아님. page policy·FR-FCFS·turnaround·PG276 절은 이 글에만 있다. |
| E | 5 | 제목 'HBM 메모리 컨트롤러 분석'을 약속하지만 본문은 DRAM 공통 개념 소개(38행)이고 HBM 고유 구성은 34행 TBD다. Address Mapping(94~121행)·Scheduling(55~83·149행)은 다룬다. |
| F | 5 | 17행 이전 편, 195행 다음 편(chapter08-npu-gpu-usage.md, seriesOrder 8), 199~201행 Ch 5·6·8 라벨은 맞다. 202행 'CXL Ch 4: CXL.mem'은 링크가 없고 cxl/chapter04-pooling-gfam.md는 'Pooling·GFAM·Fabric'(CXL.mem은 chapter08), 203행 'BoW Ch 4'는 링크 없고 draft라 F ≤ 5. |
| G | 2 | 34행 'JEDEC HBM3 발표'에 날짜·번호가 없고 153행 PG276·Alveo U55C는 판·링크가 없다. 141·149행 주장에 출처가 없다. |

uncertainties:
- 83·175행 'adaptive 방식이 흔하다'는 출처 없는 일반화다.
- 96행 '큰 stride가 한 bank에 몰린다'와 104행 '작은 범위 반복 sweep이 같은 bank만 hit'은 상위 비트 매핑에서 104행 쪽이 맞고 96행이 어색하지만 '~수 있습니다'로 완화된 문장이라 내부 모순으로 확정하지 않았다.
- 125~129행 HBM2/HBM3 REFpb 지원 여부를 JESD235/JESD238로 확인하지 않았다.
- 153행 14.375 GB/s·460 GB/s는 PG276 원문을 열지 않았다. 내부 산술(14.375 × 32 = 460, 2 stack × 8 channel × 2 PC = 32)은 맞다.
- 149행 FR-FCFS 정의를 Rixner et al.(ISCA 2000)으로 확인하지 않았다.

병합 대상: 병합 대상 없음. chapter05와 row hit/miss·bank conflict 설명(ch05 49~68행 ↔ 이 글 59~96행)이 겹치지만 page policy·FR-FCFS·turnaround·PG276 AXI 포트 구조는 이 글에만 있고 'HBM 메모리 컨트롤러' 검색 의도가 있다. 다음 조치는 보강이다(34·51·129행 TBD를 JESD238로 채움, JEDEC·PG276 출처를 판·링크와 함께 본문에, 202~203행을 cxl/chapter08-cxl-mem.md 링크로 고치거나 지움, ch05와 겹치는 bank conflict 설명은 링크로 줄임).

## 시리즈 공통 문제

루브릭 5절 기준(3편 이상)으로 묶었다.

- HBM 링크 없는 관련 항목(F ≤ 5 반복): ch01 149~151행(BoW·UCIe·CXL Ch 1), ch02 130~132행(UCIe Ch 6/7, BoW Ch 6), ch03 231행(UCIe Ch 5), ch04 193~194행(UCIe Ch 3, BoW Ch 2), ch05 218행(CXL Ch 8 '— ML 가속기', 실제 제목과 다름), ch07 202~203행(CXL Ch 4 번호 오류, BoW Ch 4 draft). 6편이다. 대상 대부분이 draft이고, 커밋 9ad745f7이 Ch 1·Ch 8에서 같은 문제를 일부 지웠으나 남았다. 시리즈 단위로 한 번에 지우거나 공개 글로 링크해야 한다.
- HBM 본문 1차 출처 부재(G 1~3): fact-check 출처가 커밋 9ad745f7 본문에만 있고 본문에는 규격 번호·이름만 있다. ch01 57~65행, ch02 27·33행, ch03 30·56·85·104행, ch04 23·25·106행, ch05(출처·버전 모두 없음), ch06 21·65행, ch07 34·153행. 7편 모두다.
- HBM fact-check 뒤 TBD·완곡 문장으로 빈 핵심 칸: ch02 41·51행, ch03 23·24·25·27·46·47·67·135·164·165·167행, ch04 42·152·153행, ch05 54·97·203행('측정으로 확인'), ch06 35·45·46·48행, ch07 34·51·129행. 6편이다. 1차 자료로 채울지 절·제목 범위를 좁힐지 시리즈 단위로 정해야 한다.
- HBM 제목·description이 본문보다 넓음(E 4~6): ch01 2·5행 Capacity·Cost(71행), ch04 2·5행 '32 Gbps'·clock(본문 48 Gbps), ch05 'Achievable'(54행)·허브 108행 'sustained BW', ch06 2행 '전력 관리'·'Refresh Cost'(35행 TBD), ch07 2행 '분석'(38행 공통 개념). 5편이다. fact-check 때 내용을 지우고 제목은 남긴 경우가 많다.
- HBM 표·계산 반복: per-pin·세대 표(ch01 57~65행, ch03 21~28행, ch04 21~25행), H100 정격 대 실제 계산(ch01 47~49·121행, ch03 117행, ch05 22~43행), GDDR6X chip 84 GB/s(ch01 47행, ch04 46~56행, ch05 35행), channel/pseudo channel(ch02 59~65행, ch03 64·71·110·111·150행, ch07 27·34·187행), 전압 문단(ch03 26·30·114·154행, ch06 21·91행). 정본을 정하고 나머지는 링크로 줄이는 구조 결정이 필요하다.
- HBM ch05를 옛 제목 'Ch 5: 대역폭 계산과 병목 분석'으로 링크: ch03 230행, ch04 186·191행, ch06 104행, ch07 199행, ch08 276행(ch09 138행만 새 제목).
- HBM·GNU Make 공통 H2 뼈대: '… → 자주 하는/흔한 실수 → 정리 → 다음 편 → 관련 항목'. HBM ch02 93·111·121·125행, ch05 178·200·209·213행, ch06 75·89·97·101행, ch07 167·185·193·197행, GNU Make ch05 570·641·651·655·661행, ch06 566~657행. 9절 scaled content 수치 기록 대상이다.
- GNU Make 기준 버전 표기 부재와 끝 목록형 참고 자료(G 2, 세 편 모두): ch05 271·410·523행 '4.0+' 출처 없음·655~659행, ch06 644~649행(chapter01 127행 '4.0 이상' 전제가 다시 나오지 않음), ch07 607~611행. 다른 편도 ch02 217행(3.82+)·ch03 196행(4.0)·ch04 364행(4.3)처럼 기능 하나에만 버전을 단다.
- GNU Make 코드·함정 중복(세 편 모두 관련): 기본 골격(ch06 502~548행 ↔ ch07 45~97행), MAKEFILE_LIST 관용구(ch05 459~479행 ↔ ch06 376~385행), wildcard 오타(ch05 582~596행 ↔ ch07 512~520행), shell find 골격(ch05 524~530행 ↔ ch07 148~151행), info·warning·error(ch05 481~495행 ↔ ch03 434~444행), `$$` 셸 변수(ch02 502~515행 ↔ ch07 569~580행).
- GNU Make 1차 자료 대조 커밋 없음: ch05·ch06·ch07 모두 미검증이다. 시리즈 단위 `/fact-check-round` 대상이다.

## 다음 조치

- 우선 조치: `hbm/chapter04-gddr.md` 111행 'GDDR6의 2배'와 23·40행 GDDR6 64 GB/s 중 어느 쪽을 고칠지 JEDEC GDDR7 발표문으로 정한다. 이 루프에서는 원문을 고치지 않았다.
- HBM 시리즈 단위 정리: 링크 없는 관련 항목 6편 일괄 정리, ch05 옛 제목 링크 5편 갱신, 커밋 9ad745f7 출처를 본문 링크로 옮기기, TBD 칸을 채울지 절·제목을 좁힐지 결정, 세대 표·계산의 정본 지정(ch03 세대 표, ch05 대역폭 계산).
- HBM ch01은 허브라 보강으로 두고 Capacity·Cost 제목 약속과 로드맵 표 링크를 먼저 맞춘다.
- GNU Make: ch07 267~285행 `:=` 순서 문제, ch06 571·340행, ch05 271·410행 버전 주장을 GNU Make Manual·NEWS로 확인하는 `/fact-check-round`가 필요하다. ch06·ch07의 같은 Makefile 골격은 한쪽만 남기는 구조 결정을 사용자에게 올린다.
- 렌더링·`audit:reading`·`audit:anchors`(GNU Make ch07 102·103행 앵커 포함)는 다음 루프나 릴리스 검사에서 확인한다.
