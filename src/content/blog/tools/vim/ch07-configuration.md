---
title: "Vim 마스터하기: 설정 (vimrc)"
date: 2026-05-13
description: "vimrc 설정, 키 매핑, 옵션 커스터마이징"
series: "Vim 마스터하기"
seriesOrder: 7
tags: [vim, editor, vimrc, configuration, settings]
---

> **Vim 마스터하기** Chapter 7: 설정 (vimrc)

## 1. 설정 파일 위치

```bash
# Vim
~/.vimrc                    # 사용자 설정
~/.vim/                     # 플러그인, 색상 등

# Neovim
~/.config/nvim/init.vim     # Vimscript
~/.config/nvim/init.lua     # Lua (권장)
~/.config/nvim/             # 설정 폴더
```

## 2. 기본 설정

### 필수 설정

```vim
" 기본값 개선
set nocompatible            " Vi 호환 모드 끄기
filetype plugin indent on   " 파일 타입 감지
syntax enable               " 문법 하이라이트

" 인코딩
set encoding=utf-8
set fileencoding=utf-8
```

### 편집 설정

```vim
" 들여쓰기
set tabstop=4               " 탭 너비
set shiftwidth=4            " 자동 들여쓰기 너비
set softtabstop=4           " 탭 키 동작
set expandtab               " 탭을 스페이스로
set autoindent              " 자동 들여쓰기
set smartindent             " 스마트 들여쓰기

" 검색
set incsearch               " 점진적 검색
set hlsearch                " 검색 하이라이트
set ignorecase              " 대소문자 무시
set smartcase               " 대문자 포함시 구분

" 기타
set backspace=indent,eol,start  " 백스페이스 동작
set hidden                  " 숨김 버퍼 허용
set autoread                " 외부 변경 자동 로드
set clipboard=unnamedplus   " 시스템 클립보드 사용
```

### UI 설정

```vim
" 줄 번호
set number                  " 줄 번호 표시
set relativenumber          " 상대 줄 번호

" 화면 표시
set cursorline              " 현재 줄 하이라이트
set showcmd                 " 명령 표시
set showmode                " 모드 표시
set showmatch               " 매칭 괄호 하이라이트
set wrap                    " 줄 바꿈
set linebreak               " 단어 단위 줄 바꿈

" 상태줄
set laststatus=2            " 항상 상태줄 표시
set ruler                   " 커서 위치 표시

" 스크롤
set scrolloff=8             " 스크롤 시 여백
set sidescrolloff=8         " 수평 스크롤 여백

" 탭/공백 문자 표시
set list
set listchars=tab:▸\ ,trail:·,extends:>,precedes:<
```

### 성능/동작 설정

```vim
" 성능
set lazyredraw              " 매크로 실행 중 화면 갱신 지연
set ttyfast                 " 빠른 터미널 연결

" 파일
set nobackup                " 백업 파일 안 만듦
set noswapfile              " 스왑 파일 안 만듦
set nowritebackup

" 또는 백업 디렉토리 지정
" set backupdir=~/.vim/backup//
" set directory=~/.vim/swap//
" set undodir=~/.vim/undo//

" Undo 지속성
set undofile                " undo 히스토리 저장
set undolevels=1000         " undo 횟수
```

## 3. 키 매핑

### 매핑 명령

| 명령 | 모드 | 재귀적 |
|------|------|--------|
| `map` | Normal, Visual, Operating-pending | O |
| `nmap` | Normal | O |
| `vmap` | Visual | O |
| `imap` | Insert | O |
| `cmap` | Command-line | O |
| `noremap` | Normal, Visual, Operating-pending | X |
| `nnoremap` | Normal | X |
| `vnoremap` | Visual | X |
| `inoremap` | Insert | X |
| `cnoremap` | Command-line | X |

> **항상 `noremap` 계열 사용** - 재귀적 매핑은 예상치 못한 동작을 유발할 수 있다.

### Leader 키

```vim
" Leader 키 설정 (기본값: \)
let mapleader = " "         " 스페이스를 leader로
let maplocalleader = ","    " 로컬 leader

" 사용 예
nnoremap <leader>w :w<CR>   " 저장
nnoremap <leader>q :q<CR>   " 종료
```

### 실용적 키맵

```vim
" === 이동 ===
" 화면 줄 단위 이동 (wrap된 줄에서)
nnoremap j gj
nnoremap k gk

" 줄 처음/끝으로 빠르게
nnoremap H ^
nnoremap L $

" === 편집 ===
" 실행 취소 break points (Insert 모드)
inoremap , ,<C-g>u
inoremap . .<C-g>u
inoremap ! !<C-g>u
inoremap ? ?<C-g>u

" 줄 이동
nnoremap <A-j> :m .+1<CR>==
nnoremap <A-k> :m .-2<CR>==
vnoremap <A-j> :m '>+1<CR>gv=gv
vnoremap <A-k> :m '<-2<CR>gv=gv

" === 검색 ===
" 검색 하이라이트 끄기
nnoremap <leader><space> :nohlsearch<CR>

" 선택 영역 검색
vnoremap // y/\V<C-R>=escape(@",'/\')<CR><CR>

" === 버퍼/윈도우 ===
" 버퍼 탐색
nnoremap <Tab> :bn<CR>
nnoremap <S-Tab> :bp<CR>
nnoremap <leader>bd :bd<CR>

" 윈도우 이동
nnoremap <C-h> <C-w>h
nnoremap <C-j> <C-w>j
nnoremap <C-k> <C-w>k
nnoremap <C-l> <C-w>l

" 윈도우 분할
nnoremap <leader>v :vsplit<CR>
nnoremap <leader>s :split<CR>

" === 기타 ===
" 저장
nnoremap <leader>w :w<CR>

" vimrc 편집/리로드
nnoremap <leader>ev :e $MYVIMRC<CR>
nnoremap <leader>sv :source $MYVIMRC<CR>

" 터미널에서 ESC로 Normal 모드
tnoremap <Esc> <C-\><C-n>

" Y를 일관되게 (기본 Y는 yy와 동일)
nnoremap Y y$

" 복사 후 커서 유지
vnoremap y ygv<Esc>

" 붙여넣기 후 커서를 끝으로
vnoremap <silent> p p`]
nnoremap <silent> p p`]
```

## 4. 자동 명령 (Autocommands)

### 기본 구문

```vim
autocmd {event} {pattern} {command}

" 그룹으로 관리 (중복 방지)
augroup MyGroup
    autocmd!                " 기존 명령 제거
    autocmd FileType python setlocal tabstop=4
augroup END
```

### 실용적 Autocommands

```vim
augroup MyAutoCommands
    autocmd!

    " 파일 타입별 설정
    autocmd FileType python setlocal tabstop=4 shiftwidth=4
    autocmd FileType javascript setlocal tabstop=2 shiftwidth=2
    autocmd FileType yaml setlocal tabstop=2 shiftwidth=2
    autocmd FileType go setlocal noexpandtab

    " 마지막 편집 위치로 이동
    autocmd BufReadPost *
        \ if line("'\"") > 1 && line("'\"") <= line("$") |
        \   execute "normal! g`\"" |
        \ endif

    " 저장 시 후행 공백 제거
    autocmd BufWritePre * %s/\s\+$//e

    " 특정 파일 타입에서만
    " autocmd BufWritePre *.py %s/\s\+$//e

    " 포커스 복귀 시 파일 재로드
    autocmd FocusGained * checktime

    " 윈도우 크기 변경 시 창 균등 분할
    autocmd VimResized * wincmd =

augroup END
```

## 5. 색상 및 테마

```vim
" 색상 설정
set termguicolors           " True color 지원
set background=dark         " 또는 light

" 색상 테마 (설치 필요)
colorscheme desert          " 기본 테마
" colorscheme gruvbox       " 인기 테마
" colorscheme nord
" colorscheme onedark
```

## 6. 완성된 vimrc 예제

```vim
" ============================================================
" 기본 설정
" ============================================================
set nocompatible
filetype plugin indent on
syntax enable

set encoding=utf-8
set fileencoding=utf-8

" ============================================================
" 편집
" ============================================================
set tabstop=4
set shiftwidth=4
set softtabstop=4
set expandtab
set autoindent
set smartindent

set backspace=indent,eol,start
set hidden
set autoread
set clipboard=unnamedplus

" ============================================================
" 검색
" ============================================================
set incsearch
set hlsearch
set ignorecase
set smartcase

" ============================================================
" UI
" ============================================================
set number
set relativenumber
set cursorline
set showcmd
set showmode
set showmatch
set wrap
set linebreak

set laststatus=2
set ruler
set scrolloff=8
set sidescrolloff=8

set list
set listchars=tab:▸\ ,trail:·

" ============================================================
" 성능/파일
" ============================================================
set lazyredraw
set nobackup
set noswapfile
set nowritebackup
set undofile

" ============================================================
" 키맵
" ============================================================
let mapleader = " "

" 저장/종료
nnoremap <leader>w :w<CR>
nnoremap <leader>q :q<CR>

" 검색 하이라이트 끄기
nnoremap <leader><space> :nohlsearch<CR>

" 버퍼 탐색
nnoremap <Tab> :bn<CR>
nnoremap <S-Tab> :bp<CR>

" 윈도우 이동
nnoremap <C-h> <C-w>h
nnoremap <C-j> <C-w>j
nnoremap <C-k> <C-w>k
nnoremap <C-l> <C-w>l

" Y 일관되게
nnoremap Y y$

" ============================================================
" Autocommands
" ============================================================
augroup MyAutoCommands
    autocmd!
    autocmd BufReadPost * if line("'\"") > 1 && line("'\"") <= line("$") | exe "normal! g`\"" | endif
    autocmd BufWritePre * %s/\s\+$//e
    autocmd FocusGained * checktime
augroup END
```

## 실습

1. `~/.vimrc` 파일 생성/편집
2. 기본 설정 추가
3. Leader 키 매핑 설정
4. `:source %`로 리로드 테스트
5. 자주 쓰는 명령을 키맵으로 등록

## 요약

- `~/.vimrc` = Vim 설정 파일
- `set option` = 옵션 설정
- `nnoremap` = 키 매핑 (비재귀)
- `let mapleader` = Leader 키 설정
- `augroup` + `autocmd` = 자동 명령
- 설정 파일 수정 후 `:source $MYVIMRC`로 리로드
