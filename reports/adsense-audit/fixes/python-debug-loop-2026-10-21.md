# Python Debugging 수정 루프 — 2026-10-21

공개 Python Debugging 5편의 원문과 [기존 루프 40](../published-loop-40.md)을 대조했다. 재채점하지 않는다. 수정 상태와 실행 범위를 구분한다.

## 결정과 범위

1. 맥락: pdb·debugpy·asyncio·외부 샘플러·메모리 진단을 따라 하는 독자를 위한 공개 글 5편이다.
2. 문제 신호와 반증: import 누락으로 진단 훅 자체가 실패하거나, 허용된 순차 실행을 오류라고 하거나, 보존된 순환 객체를 약한 참조만으로 해제 판정하면 원래 설명은 틀린다. 실제 dump/IDE attach 없이 성공을 추정하지 않는다.
3. 원인과 대안: 예시 출력·플러그인·인터프리터의 서로 다른 책임을 혼동했다. 전면 재작성 대신 잘못된 조건과 범위를 정정하고 독립 프로세스에서 최소 예제를 실행했다.
4. 증거: 장별 명명된 코드 블록을 추출한 검증 로그와 공식 Python/debugpy/py-spy 문서다. 프로그램의 정상 출력만으로 도구의 모든 기능을 보장하지 않는다.
5. 표본: macOS CPython 3.15.0 기본 환경. debugpy는 기존 VSCode 확장에 동봉된 1.8.20과 CPython 3.14.8을 사용했다. 새로운 패키지는 설치하지 않았다. py-spy는 설치되어 있지 않다.
6. 결정: 아래 확인 오류는 수정했다. 04는 문서 정정·입력 프로그램 검증까지이며 **외부 py-spy 실행 검증 대기**다. 02도 IDE attach 성공 판정이 아닌 설정·기동 smoke 검사다.
7. 변경 경계: 5편 본문·예제와 검증기·기록이다. URL·date·draft·seriesOrder를 보존하고, 02 title의 PyCharm 공통 어댑터라는 오해를 장별 수동 정정했다. 기존 점수 파일은 변경하지 않는다.
8. 재확인: 아래 정상·부정 사례를 보존했다. IDE·컨테이너·워커 attach, 실제 장애/권한·외부 profiler는 해당 환경 확보 후 확인한다. 확인 전 완료 범위를 넓혀 기록하지 않는다.

## 장별 수정과 실행

| 장 | 문제·수정 | 실행 증거·잔여 확인 |
| --- | --- | --- |
| 01 pdb | sys.excepthook의 traceback import 누락, 훅의 적용 범위, pdb 명령/표현식 혼동, 다음 장 오연결 수정 | 실제 ZeroDivisionError 후 pdb에서 numerator=42·호출 위치 조회. import를 제거한 반례에서 NameError 재현. 정상 프로그램이 아니라 예외 진단이므로 비정상 종료도 확인 |
| 02 debugpy | PyCharm 어댑터 구분, 없는 CLI 옵션·포트 충돌 방식 제거, 빠진 import·루프백/SSH/컨테이너 경계 정정 | launch.json 3구성 파싱·attach 주소, 비활성 상태 기동, 실제 debugpy --help 확인. 별도 승인된 로컬 listen API는 127.0.0.1:52445로 성공. IDE breakpoint·DAP attach·reload/자식 프로세스는 미검증 |
| 03 asyncio | 순차 asyncio.run 허용/실행 중 중첩 금지, 취소 후 finally await, task 예외·awaiter stack 한계 정정 | 순차 1,1/중첩 RuntimeError, 취소 정리 True, 결정적인 경쟁 unlocked=1/locked=2 확인. 운영 이벤트 루프 정지나 IDE 전체 awaiter 체인 검증은 아님 |
| 04 py-spy | 무정지·무부하·진단 시간 보장 제거, --nonblocking의 일관성 비용, flamegraph 폭, GIL 필터·권한 설명 정정 | 입력 workload 2회 checksum=666566670000만 실행. **py-spy attach/record/SVG·오버헤드는 NOT RUN**. 지원 인터프리터와 권한이 있는 환경에서 실제 수집 필요 |
| 05 faulthandler/tracemalloc | 임의 MiB/cycle 수치, 추적 블록/객체 혼동, DEBUG_SAVEALL/최종화 순환 설명 정정. 미실행 memory_profiler 수치 제거 | 페이로드 32768바이트·추적 증가/해제 감소, SAVEALL 보존/플래그 복원 후 후속 수집, dump의 capture 프레임 확인. 보존 판정은 객체 ID로 수행(약한 참조는 먼저 지워질 수 있음). SIGSEGV·외부 패키지 실행은 아님 |

검증기: `node scripts/verify-python-debugging-examples.mjs NN`. 02는 `DEBUG_PYTHON=/opt/homebrew/bin/python3.14`와 기존 확장의 `PYTHONPATH`를 지정했다. 환경 의존 경로는 이번 기동 증거이며 설치 안내를 대체하지 않는다. `python-debug-chNN-examples.log`·`python-debug-chNN-gate.log`에 결과를 보존했다.

02의 최초 listen 시도는 sandbox에서 EPERM으로 실패했고, 승인 후 같은 로컬 API를 sandbox 밖에서 실행해 성공했다. 이를 IDE 연결 성공이나 원격 노출 검증으로 기록하지 않는다.

## 1차 자료

- [Python pdb](https://docs.python.org/3.15/library/pdb.html), [asyncio runners](https://docs.python.org/3.15/library/asyncio-runner.html), [tasks](https://docs.python.org/3.15/library/asyncio-task.html)
- [tracemalloc](https://docs.python.org/3.15/library/tracemalloc.html), [gc](https://docs.python.org/3.15/library/gc.html), [faulthandler](https://docs.python.org/3.15/library/faulthandler.html)
- [debugpy CLI](https://github.com/microsoft/debugpy/wiki/Command-Line-Reference), [VSCode Python debugging](https://code.visualstudio.com/docs/python/debugging), [JetBrains 원격 디버깅](https://www.jetbrains.com/help/pycharm/remote-debugging-with-product.html)
- [py-spy upstream README](https://github.com/benfred/py-spy): 비정지 모드·권한·네이티브 스택·GIL 필터 설명. 문서 대조와 실제 실행은 별개다.

최종 공통 검사는 [공통 검증 기록](repair-loops-final-2026-10-21.md), 원문 SHA는 [JSON](python-debug-loop-2026-10-21.json)을 따른다.
