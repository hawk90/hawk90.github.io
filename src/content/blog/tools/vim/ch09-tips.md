---
title: "Vim 마스터하기: 실전 팁"
date: 2026-05-13
description: "생산성을 높이는 워크플로우와 팁"
series: "Vim 마스터하기"
seriesOrder: 9
tags: [vim, editor, tips, productivity, workflow]
---

> **Vim 마스터하기** Chapter 9: 실전 팁

## 1. Vim의 핵심 철학

### 반복 가능한 변경 만들기

**`.` 명령을 위한 설계:**

```vim
" 나쁜 예: 여러 동작
i글자<Esc>w          " i로 입력, Esc, w로 이동

" 좋은 예: 하나의 변경
ciw새단어<Esc>       " 단어 전체 변경
```

> 변경을 하나의 "원자적" 작업으로 만들면 `.`으로 반복 가능

### 이동과 편집 분리

```vim
" 검색으로 이동, 편집은 따로
/pattern<CR>     " 위치 찾기
cgn새단어<Esc>   " 변경
n.n.n.           " 다음 찾기 + 반복
```

### 텍스트 객체 활용

```vim
" 커서 위치에 무관하게 같은 결과
" 괄호 안 어디서든
ci(              " 괄호 안 전체 변경

" 단어 중간에서도
daw              " 단어 전체 삭제
```

## 2. 효율적인 편집 패턴

### 검색 + cgn 패턴

가장 강력한 반복 편집 방법:

```vim
" 변수명 일괄 변경
/oldName<CR>     " 검색
cgnnewName<Esc>  " 첫 번째 변경
n                " 다음 확인
.                " 변경 적용 (또는 n으로 건너뛰기)
```

### 비주얼 모드 + normal 명령

```vim
" 선택 영역에 같은 작업 적용
V5j              " 6줄 선택
:normal @a       " 매크로 실행
:normal I// <CR> " 각 줄 앞에 주석
:normal A;<CR>   " 각 줄 끝에 세미콜론
```

### 전역 명령 패턴

```vim
" 패턴 매치 줄에 작업
:g/TODO/d        " TODO 줄 삭제
:g/DEBUG/normal I// " DEBUG 줄 주석처리
:g/^$/d          " 빈 줄 삭제
:v/pattern/d     " 패턴 없는 줄 삭제
```

### 외부 명령 활용

```vim
" 선택 영역에 외부 명령 적용
:%!sort          " 전체 정렬
:'<,'>!sort -u   " 선택 영역 정렬 + 중복 제거
:%!jq .          " JSON 포맷팅
:%!python -m json.tool  " JSON 포맷팅 (대안)
```

## 3. 실전 시나리오

### 함수 인자 순서 바꾸기

```vim
" func(a, b) → func(b, a)
f(                " ( 로 이동
dib               " 괄호 안 삭제
i새인자<Esc>
```

### 변수 선언 추가

```vim
" 여러 줄에 const 추가
Ctrl-v5j          " 블록 선택
I                 " 삽입
const <Esc>       " 입력 + Esc
```

### 줄 정렬/정리

```vim
" 줄들을 알파벳순 정렬
Vip               " 문단 선택
:sort             " 정렬

" 중복 제거
:sort u

" 역순 정렬
:sort!
```

### 괄호/따옴표 추가

```vim
" 단어를 따옴표로 감싸기
ysiw"             " (vim-surround)

" 괄호 변경
cs({              " () → {}
cs"'              " "" → ''
ds"               " "" 제거
```

### 들여쓰기 수정

```vim
" 블록 들여쓰기
>ip               " 문단 들여쓰기
<ip               " 문단 내어쓰기
=ip               " 문단 자동 들여쓰기
gg=G              " 전체 파일 자동 들여쓰기
```

## 4. 터미널 통합

### Vim 내 터미널

```vim
:terminal         " 터미널 열기
:term             " 축약

" 터미널에서 Normal 모드로
Ctrl-\Ctrl-n      " 또는 설정으로 Esc 매핑

" 분할로 열기
:vs | terminal
:sp | terminal
```

### 외부 명령 실행

```vim
:!ls              " 명령 실행 후 결과 표시
:r !ls            " 명령 출력을 버퍼에 삽입
:r !date          " 현재 날짜 삽입
:.!bash           " 현재 줄을 bash로 실행, 결과로 교체
```

### 컴파일/테스트

```vim
:make             " make 실행
:copen            " quickfix 창 열기
:cn               " 다음 에러
:cp               " 이전 에러

" 또는 vim-test 사용
:TestNearest      " 현재 테스트 실행
:TestFile         " 파일 테스트
```

## 5. 세션 관리

### 세션 저장/복원

```vim
:mksession! ~/session.vim   " 세션 저장
:source ~/session.vim       " 세션 복원

" 또는 vim 시작시
vim -S ~/session.vim
```

### 자동 세션 관리

```vim
" vimrc에 추가
autocmd VimLeavePre * mksession! ~/.vim/session.vim
autocmd VimEnter * source ~/.vim/session.vim
```

## 6. 스니펫과 약어

### 약어 (Abbreviations)

```vim
" 자동 교정
iabbrev teh the
iabbrev widht width

" 긴 텍스트 축약
iabbrev @@ myemail@example.com
iabbrev ssig -- <CR>Best regards,<CR>John Doe

" 코드 템플릿
iabbrev ifmain if __name__ == '__main__':<CR>main()
```

### 스니펫 플러그인

```vim
Plug 'SirVer/ultisnips'
Plug 'honza/vim-snippets'

" 또는 coc-snippets
" :CocInstall coc-snippets
```

## 7. 고급 이동 기법

### 마크 활용

```vim
" 작업 중인 위치 마킹
ma               " 마크 a 설정
'a               " 마크 줄로 이동
`a               " 정확한 위치로 이동

" 특수 마크
`.               " 마지막 편집 위치
`^               " 마지막 삽입 위치
`"               " 마지막 종료 위치
```

### 점프 리스트 활용

```vim
Ctrl-o           " 이전 점프 위치
Ctrl-i           " 다음 점프 위치
:jumps           " 점프 리스트 보기

" 점프를 발생시키는 동작
/pattern         " 검색
gg, G            " 파일 시작/끝
{n}G             " n번 줄
%                " 매칭 괄호
```

### 파일 간 이동

```vim
gf               " 커서 아래 파일 열기
gF               " 파일:줄번호 형식 지원
Ctrl-^           " 이전 버퍼로
```

## 8. 시간 절약 팁

### 명령줄 히스토리

```vim
:                " 명령 모드 진입
Ctrl-p           " 이전 명령
Ctrl-n           " 다음 명령
q:               " 명령 히스토리 창

/                " 검색 모드
q/               " 검색 히스토리 창
```

### 레지스터 활용

```vim
" 마지막 검색 패턴
:s/<Ctrl-r>/new/g    " / 레지스터 사용

" 삭제한 텍스트
"0p              " 마지막 yank (삭제 아님)
"1p              " 마지막 삭제 (줄 단위)
```

### 빠른 편집

```vim
" 숫자 증감
Ctrl-a           " 증가
Ctrl-x           " 감소
5Ctrl-a          " 5 증가

" 대소문자 변환
~                " 토글
gUiw             " 단어 대문자
guiw             " 단어 소문자
```

## 9. 디버깅 및 문제 해결

### 키 매핑 확인

```vim
:map             " 모든 매핑
:nmap <leader>   " leader로 시작하는 매핑
:verbose map {key}  " 특정 키 매핑 출처
```

### 옵션 확인

```vim
:set option?     " 현재 값
:set option      " 켜기 (boolean)
:set nooption    " 끄기
:verbose set option?  " 설정 출처
```

### 플러그인 디버깅

```vim
vim -u NONE      " 설정 없이 시작
vim --startuptime log.txt  " 시작 시간 측정
:scriptnames     " 로드된 스크립트 목록
```

## 10. 치트시트

### 가장 유용한 명령어 TOP 20

| 명령 | 동작 |
|------|------|
| `.` | 마지막 변경 반복 |
| `ciw` | 단어 변경 |
| `ci"` | 따옴표 안 변경 |
| `cgn` | 다음 검색 결과 변경 |
| `*` | 커서 단어 검색 |
| `Ctrl-o` | 이전 점프 위치 |
| `Ctrl-^` | 이전 버퍼 |
| `zz` | 현재 줄 중앙으로 |
| `gg=G` | 전체 들여쓰기 |
| `:%s/old/new/gc` | 확인하며 치환 |
| `@:` | 마지막 명령 반복 |
| `q:` | 명령 히스토리 |
| `:g/pattern/d` | 패턴 줄 삭제 |
| `"0p` | 마지막 yank 붙여넣기 |
| `gv` | 마지막 선택 다시 |
| `gi` | 마지막 삽입 위치에서 Insert |
| `Ctrl-a/x` | 숫자 증감 |
| `:%!sort` | 외부 명령으로 정렬 |
| `"+p` | 클립보드 붙여넣기 |
| `''` | 이전 위치로 점프 |

## 실습

1. 코드 파일에서 `cgn` + `.` 반복 연습
2. `:g/pattern/normal` 연습
3. 세션 저장/복원 테스트
4. 외부 명령 `:%!` 활용

## 요약

- `.` 반복을 위한 원자적 변경 설계
- `cgn` + `n.` = 강력한 검색-변경 패턴
- `:g/pattern/command` = 일괄 처리
- `:%!command` = 외부 명령 활용
- 마크, 점프 리스트로 효율적 이동
- 세션 저장으로 작업 상태 유지
