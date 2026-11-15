# Valgrind 수정 루프 — 2026-10-22

공개 Valgrind 5편과 published-loop-41의 원문 근거를 대조했다. **문서 정정과 정상 fixture 컴파일/실행까지만 확인했으며 실제 Valgrind 분석은 5편 모두 대기**다. 점수·판정·factcheck는 변경하지 않는다.

## 결정 근거와 범위

1. 맥락: 도구 선택, Memcheck 옵션·누수 분류, pthread 분석, suppression과 CI를 따라 하는 공개 기술 글이다.
2. 신호·반증: 공식 옵션의 기본값·단위·매칭 방향과 다른 설명, 특정 라이브러리라는 이유만으로 무해·오탐이라고 한 지침을 확인했다. 도구마다 결과가 다른 것만으로 어느 쪽이 정확하다고 결론 내리지 않는다.
3. 원인·대안: API의 이름에서 의미를 추정하고 형식 예시를 실측처럼 제시한 문제였다. 공개 글을 삭제하지 않고 확인한 주장과 조건을 수정하고, 실행 가능한 fixture를 추가했다.
4. 증거: 공식 Valgrind core/Memcheck/Helgrind/DRD 매뉴얼과 지원 플랫폼 목록, 명명된 소스 추출·컴파일·정상 분기 실행 로그다. Linux 분석 결과를 만들어 넣지 않는다.
5. 표본: macOS arm64·Clang 23.1.3. valgrind/docker/podman/limactl 실행 파일이 없어 지원 Linux 도구 실행은 하지 않았다. ASan·LSan 결과로 Valgrind 결과를 대신하지 않는다.
6. 결정: 확인된 설명 오류는 수정(remediated)했다. **실행 검증 상태는 대기**이며 아래 prepared full 검증 분기는 실행하지 않았다. 최초 Linux 실행에서 기대와 다르면 중단하고 원문·검증기를 함께 다시 검토한다.
7. 변경 경계: 5편 본문·명명 예제·검증기·기록이다. frontmatter·URL·date·공개 상태를 보존한다. 사용자 기존 변경과 평가 파일을 되돌리지 않는다.
8. 잔여 위험: 지원 Linux에서 각 정상/결함/suppression 분기를 실행하고 실제 보고 종류·코드·범위를 확인해야 한다. 원격 CI와 GDB 연동도 미검증이다. 환경 확보 없이 완료로 바꾸지 않는다.

| 장 | 확인 오류·수정 | 이번 실행 / 다음 검증 |
| --- | --- | --- |
| 01 intro | MSan과 미초기화 검사 역할 충돌, 완전 syscall 추적·유일한 도구·성능 순위·Apple Silicon 지원 상실 주장 정정 | leak.c 컴파일·free 분기 실행. 실제 누수 보고와 플랫폼별 설치는 대기 |
| 02 Memcheck | leak-check 기본 summary/yes=full, 오류 집계와 exitcode 구분, vgdb-error=0 시작 전 중단, read 버퍼 초기화·debug info·오버런 폭·경고 무시 지침 정정 | bounds.c 컴파일·정상 value=42. bad의 Invalid write·도구 종료코드97은 대기 |
| 03 Leak Report | leak-resolution 기본 high, show-reachable=yes=all, 자식 해제 필요, 빈 기반 클래스·STL 자동 무시·block 수와 호출 빈도 혼동 정정 | graph.c 컴파일·free 분기 실행. keep/lost 분류와 휴리스틱은 대기 |
| 04 Helgrind/DRD | 단순 lockset 모델·DRD 우월 순위·가짜 시간 표, shared-threshold reader lock ms, exclusive-threshold 경합 진단, condvar·annotation 범위 정정 | mutex counter.cpp 컴파일·counter=4000. RACY의 두 도구 보고와 옵션 동작은 대기 |
| 05 suppression | Param 필수 정보 줄, malloc 첫 프레임과 바깥 호출자 방향, 일반 regex 오해, 요약 숫자/규칙 수 혼동, 생성 옵션의 범위, plain CTest·사용자 매크로·GitLab stage 정정 | suppression-case.c 컴파일·clean 분기 실행. 16바이트만 제외하고 own 32바이트는 계속 보고하는 부정 대조군 검증은 대기 |

`node scripts/verify-valgrind-article-examples.mjs NN --fixtures-only`가 이번 실행 명령이다. 이 모드는 명시적으로 `NOT RUN Valgrind analysis`를 출력한다. 실제 Linux에서는 해당 옵션 없이 도구 검증을 진행하도록 준비했지만 그 분기를 이번 환경에서 실행·검증했다고 주장하지 않는다. 각 장 valgrind-chNN-examples.log를 참조한다.

## 1차 자료

- [Memcheck 옵션과 누수 분류](https://valgrind.org/docs/manual/mc-manual.html)
- [Core 옵션과 suppression](https://valgrind.org/docs/manual/manual-core.html)
- [Helgrind](https://valgrind.org/docs/manual/hg-manual.html), [DRD](https://valgrind.org/docs/manual/drd-manual.html)
- [공식 지원 플랫폼](https://valgrind.org/info/platforms.html)

최종 gate·사이트 빌드·점수 보존 검사는 이번 연속 수정의 공통 기록에 덧붙인다. 수정과 재채점은 분리한다.


[최종 공통 검증](repair-loops-final-2026-10-22.md)에서 최종 사이트 빌드·gate·앵커·읽기·메타데이터·점수 보존 검사를 확인한다.
