# GNU Make·Python Debugging 최종 확인 — 2026-10-21

이번 추가 수정은 GNU Make 7편과 Python Debugging 5편이다. 앞선 CMake 9편과 합쳐 21편을 수정했다. **21편 전부의 모든 기능이 실행 검증됐다는 의미는 아니다.** py-spy 1편의 외부 수집은 대기이며, debugpy는 설정·기동만 확인했다. 각 보고서의 실행 범위가 우선한다.

- GNU Make 01~07 검증기: 모두 exit 0. 마지막 07에는 test-verbose 성공/실패 전파 검사를 추가해 다시 실행했다. 예상 실패 사례는 종료 상태와 원인 메시지를 검사했다.
- Python 01~05 검증기: 모두 exit 0. 04의 PASS는 workload baseline만 뜻하며 NOT RUN 출력으로 py-spy 미실행을 표시했다. 05는 첫 시도에서 weakref로 SAVEALL 보존을 판별하지 못해 실패했고, 객체 ID 보존 및 후속 수집으로 수정한 뒤 재실행했다.
- 두 디렉터리 최종 publish gate: 각각 exit 0. 외부 clone 없는 cited-symbol은 SKIPPED이며 실제 검증 통과가 아니다. [GNU gate](gnu-make-loop-gate-2026-10-21.log) · [Python gate](python-debug-loop-gate-2026-10-21.log)
- 최종 내용으로 `npm run build`: exit 0, 1,135페이지. [빌드 로그](repair-loops-build-2026-10-21.log)
- `node scripts/audit-anchor-links.mjs`: exit 0, 링크 67건 검사·finding 0. [로그](repair-loops-anchors-2026-10-21.log)
- `node scripts/audit-reading-experience.mjs --quiet`: exit 0. 출력 없는 정상 종료이며 모바일 육안 검사로 세지 않는다. [로그](repair-loops-reading-2026-10-21.log)
- 12편 `check-inline-math`: 의도하지 않은 인라인 수식 없음. `git diff --check`: 통과.
- HEAD와 구조화 frontmatter 비교: GNU 03·07 description, Python 02 title의 장별 사실 정정만 다르다. URL·date·draft·series·seriesOrder를 포함한 나머지 필드는 동일하다. [무결성 기록](repair-loops-integrity-2026-10-21.json)
- 점수·판정·factcheck는 이 루프에서 쓰거나 재계산하지 않았다. 기존 작업으로 이미 수정된 평가 파일들은 그대로 두었다. 무결성 JSON의 점수 파일 44개 SHA는 **이번 종료 시점의 재개용 스냅샷**이며, 시작 전과의 일치 증거를 새로 만들었다는 뜻은 아니다.

## debugpy 별도 기동 증거

실행 도구가 반환한 결과를 아래에 옮겼다. 별도 IDE 연결·breakpoint 검사는 하지 않았다.

```text
PYTHONPATH=/Users/hawk/.vscode/extensions/ms-python.debugpy-2026.6.0-darwin-arm64/bundled/libs \
/opt/homebrew/bin/python3.14 -Xfrozen_modules=off -c \
'import debugpy; print(debugpy.listen(("127.0.0.1",0)))'

('127.0.0.1', 52445)
exit 0
```

같은 API의 sandbox 내 최초 시도는 EPERM이었고 승인된 재실행에서 위 결과를 얻었다. 임시 포트는 매 실행 달라진다. 이 명령은 listen 자체 검사이며 기사의 환경 변수 분기에서 실제 IDE attach까지 완료한 기록이 아니다.

다음 수정 대상은 Sanitizers 5편이다. py-spy는 지원 인터프리터와 attach 권한이 있는 환경에서 record/SVG를 확보해야 외부 수집 검증 상태를 바꾼다. 전체 수정 종료 후에만 기존 점수표에 일괄 재채점한다.
