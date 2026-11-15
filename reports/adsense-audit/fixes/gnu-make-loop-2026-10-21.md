# GNU Make 수정 루프 — 2026-10-21

공개 GNU Make 7편을 장별로 읽고 수정한 기록이다. 기존 [루프 27](../published-loop-27.md)·[루프 28](../published-loop-28.md)의 오류를 출발점으로 삼았다. 점수·판정·factcheck는 갱신하지 않는다.

## 결정과 범위

1. 발생 맥락: 설치 안내부터 실제 C 빌드까지 독자가 따라 하는 공개 기술 글 7편이다. 버전 경계, 확장 시점, 실패 전파가 잘못되면 설명과 실행 결과가 달라진다.
2. 문제 신호와 반증: 기능이 없다고 한 버전에서 지원하거나, 오류라고 한 Makefile이 성공하거나, 실패를 정상 처리하면 설명을 정정한다. 설명용 조각에는 완성 프로젝트와 같은 실행 보장을 부여하지 않는다.
3. 원인과 대안: macOS 기본 도구와 최신 GNU 버전의 혼동, 패턴 규칙과 명시 규칙의 혼동, 실행 없는 결과 단정이 원인이었다. 일괄 문체 변경 대신 각 주장을 공식 매뉴얼·실제 Makefile로 대조했다.
4. 증거: GNU 공식 소스의 NEWS·doc/make.texi, 기사에 파일명으로 표시한 블록을 직접 추출하는 검증기, 장별 성공·실패 로그다. 한 점수나 전체 빌드 성공만으로 기술적 정확성을 판정하지 않는다.
5. 표본: macOS/AppleClang 21, GNU Make 4.4.1을 임시 디렉터리에서 빌드했다. 시스템 GNU Make 3.81은 교체하지 않았다. 공식 배포 tar.gz의 SHA256은 JSON에 보존했다. 서명 검증이나 다른 OS 실행을 주장하지 않는다.
6. 결정: 아래 확인 오류는 수정(remediated)했다. 예전 GNU Make 전체 버전, 실제 크로스 툴체인 실행, 성능 비교는 검증 범위 밖이다.
7. 변경 경계: 7편 본문·예제·검증기·수정 기록이다. URL·date·draft·seriesOrder를 보존했다. 03·07장의 description은 사실관계에 맞춰 장별 수동 정정했다. 되돌릴 때도 기존 점수나 사용자 변경은 포함하지 않는다.
8. 검증과 재확인: 아래 장별 검증 및 공통 최종 검사 로그를 참조한다. 예제·지원 버전 변경 시 해당 분기를 다시 실행한다. 외부 cited-symbol clone이 없는 검사는 SKIPPED이며 통과로 세지 않는다.

## 장별 수정과 실행

| 장 | 확인한 문제·수정 | 실행 증거와 한계 |
| --- | --- | --- |
| 01 intro | macOS make를 BSD라고 한 설명, .RECIPEPREFIX 버전, 측정하지 않은 성능·역사 설명 정정 | C 3파일 빌드·Hello, 재실행 무변경, 소스/헤더 변경별 재빌드, clean 파일 충돌과 .PHONY, 공백 들여쓰기 실패 확인 |
| 02 rules | order-only의 선행 갱신과 mtime 무시 구분, 중복 :의 마지막 recipe·::의 독립 recipe, .PRECIOUS/.ONESHELL 설명 정정 | 디렉터리 항목 변경 시 불필요한 재빌드 없음, 실패 출력의 DELETE_ON_ERROR 제거/미사용 보존, 단일·이중 콜론 동작 확인 |
| 03 variables | prerequisite 즉시 확장, CC 기본 변수, !=·재귀 확장, 자동 변수 범위 정정 | recursive=after/simple=before, 조기 prerequisite 비어 있음, CLI origin, shell 달러 처리, 자기 참조 실패 확인 |
| 04 pattern-rules | 다중 패턴 출력과 명시 &: 구분, 빈 recipe와 recipe 부재 구분, 암시 규칙 탐색 설명 정정 | 그룹 출력 1회 실행·누락 출력 복구, %.a %.b 패턴 그룹, 명시 의존만 있을 때 암시 recipe 사용/빈 recipe가 억제하는 사례 확인 |
| 05 functions | wildcard가 재귀 globstar라는 설명, define 확장·다중 줄 quote 오류·버전 정정 | 한 단계 wildcard/재귀 find 결과 구분, 다중 줄 인사, 이전 quote 방식의 셸 실패 확인 |
| 06 conditionals | ifdef 빈 값과 origin 존재 여부, else-if와 중첩 endif, -MP의 한계 정정 | 3조건 분기, release/debug 값·헤더 변경 재빌드, 삭제 헤더의 컴파일 실패와 -MP stub 유무에 따른 make 오류 구분 |
| 07 practical | CROSS_COMPILE 설정 순서, 미지원 ARCH, 병렬 clean/all 경쟁, test-verbose의 실패 은폐 정정 | release/debug=42, 병렬 rebuild, 4가지 툴 이름 선택, 잘못된 ARCH·없는 소스 실패, 성공/실패 테스트의 종료 상태 전파 확인. 실제 크로스 컴파일·ASan 성능 측정은 미실행 |

검증 명령: `GNU_MAKE=/private/tmp/adsense-make-tool/make-4.4.1/make node scripts/verify-gnu-make-article-examples.mjs NN` (01~07). 경로는 이번 환경의 임시 빌드이며 재실행 시 GNU Make >=4.3 경로를 지정한다. 각 장의 `gnu-make-chNN-examples.log`·`gnu-make-chNN-gate.log`를 보존했다.

## 1차 자료

[GNU Make 매뉴얼](https://www.gnu.org/software/make/manual/make.html), [공식 4.4.1 소스](https://ftp.gnu.org/gnu/make/make-4.4.1.tar.gz)의 NEWS와 doc/make.texi를 대조했다. 도입 버전은 .RECIPEPREFIX·define 연산자 3.82, file 함수·!= 4.0, 명시 grouped target &: 4.3이다.

최종 공통 검사 결과는 [공통 검증 기록](repair-loops-final-2026-10-21.md), 원문 SHA는 [JSON](gnu-make-loop-2026-10-21.json)을 따른다.
