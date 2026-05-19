---
title: "Vim 마스터하기: 플러그인"
date: 2026-05-17T08:00:00
description: "플러그인 매니저와 추천 플러그인"
series: "Vim 마스터하기"
seriesOrder: 8
tags: [vim, editor, plugins, vim-plug, neovim]
draft: true
---

> **Vim 마스터하기** Chapter 8: 플러그인

## 1. 플러그인 매니저

### vim-plug (추천)

가볍고 빠른 미니멀 플러그인 매니저.

**설치:**

```bash
# Vim
curl -fLo ~/.vim/autoload/plug.vim --create-dirs \
    https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim

# Neovim
curl -fLo ~/.local/share/nvim/site/autoload/plug.vim --create-dirs \
    https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
```

**사용:**

```vim
call plug#begin('~/.vim/plugged')

Plug 'tpope/vim-sensible'
Plug 'junegunn/fzf', { 'do': { -> fzf#install() } }
Plug 'junegunn/fzf.vim'

call plug#end()
```

**명령:**

| 명령 | 동작 |
|------|------|
| `:PlugInstall` | 플러그인 설치 |
| `:PlugUpdate` | 플러그인 업데이트 |
| `:PlugClean` | 미사용 플러그인 삭제 |
| `:PlugUpgrade` | vim-plug 자체 업데이트 |
| `:PlugStatus` | 상태 확인 |

### lazy.nvim (Neovim 전용)

현대적이고 빠른 Neovim 플러그인 매니저.

```lua
-- ~/.config/nvim/lua/plugins.lua
return {
    { 'nvim-telescope/telescope.nvim', dependencies = { 'nvim-lua/plenary.nvim' } },
    { 'nvim-treesitter/nvim-treesitter', build = ':TSUpdate' },
}
```

## 2. 필수 플러그인

### vim-sensible

합리적인 기본값 설정.

```vim
Plug 'tpope/vim-sensible'
```

### fzf.vim

퍼지 파인더 (파일, 버퍼, 명령어 검색).

```vim
Plug 'junegunn/fzf', { 'do': { -> fzf#install() } }
Plug 'junegunn/fzf.vim'

" 키맵
nnoremap <C-p> :Files<CR>
nnoremap <leader>b :Buffers<CR>
nnoremap <leader>rg :Rg<CR>
nnoremap <leader>/ :BLines<CR>
nnoremap <leader>h :History<CR>
nnoremap <leader>c :Commands<CR>
```

### vim-surround

괄호, 따옴표 등 감싸기/변경/삭제.

```vim
Plug 'tpope/vim-surround'

" 사용법
" cs"'     " "hello" → 'hello' (change surround)
" ds"      " "hello" → hello (delete surround)
" ysiw"    " hello → "hello" (you surround inner word)
" yss"     " 줄 전체 감싸기
" VS"      " Visual 모드에서 감싸기
```

### vim-commentary

빠른 주석 토글.

```vim
Plug 'tpope/vim-commentary'

" 사용법
" gcc      줄 주석 토글
" gc{motion}  모션 범위 주석
" gcap     문단 주석
" gcgc     연속 주석 블록 해제
```

### vim-repeat

플러그인 명령도 `.`으로 반복.

```vim
Plug 'tpope/vim-repeat'
```

### vim-fugitive

강력한 Git 통합.

```vim
Plug 'tpope/vim-fugitive'

" 명령
" :Git 또는 :G     git status
" :Git diff
" :Git blame
" :Git log
" :Gvdiffsplit     수직 diff
```

## 3. 생산성 플러그인

### NERDTree (파일 탐색기)

```vim
Plug 'preservim/nerdtree'

nnoremap <leader>n :NERDTreeToggle<CR>
nnoremap <leader>f :NERDTreeFind<CR>

let NERDTreeShowHidden=1
```

### nvim-tree (Neovim)

```lua
{ 'nvim-tree/nvim-tree.lua', dependencies = { 'nvim-tree/nvim-web-devicons' } }
```

### vim-airline / lualine

상태줄 개선.

```vim
Plug 'vim-airline/vim-airline'
Plug 'vim-airline/vim-airline-themes'
```

### vim-easymotion

화면 내 빠른 점프.

```vim
Plug 'easymotion/vim-easymotion'

" <leader><leader>w   단어로 점프
" <leader><leader>f{c}  문자로 점프
```

### leap.nvim (Neovim)

더 현대적인 모션 플러그인.

```lua
{ 'ggandor/leap.nvim' }
```

### undotree

Undo 히스토리 시각화.

```vim
Plug 'mbbill/undotree'

nnoremap <leader>u :UndotreeToggle<CR>
```

### vim-multiple-cursors

다중 커서 편집.

```vim
Plug 'mg979/vim-visual-multi'

" Ctrl-n  커서 추가 (같은 단어)
" Ctrl-Down/Up  위아래 커서 추가
```

## 4. 개발 플러그인

### coc.nvim

LSP 클라이언트 + 자동 완성 (node.js 필요).

```vim
Plug 'neoclide/coc.nvim', {'branch': 'release'}

" 익스텐션 설치
" :CocInstall coc-json coc-tsserver coc-python coc-rust-analyzer

" 키맵
nmap <silent> gd <Plug>(coc-definition)
nmap <silent> gy <Plug>(coc-type-definition)
nmap <silent> gi <Plug>(coc-implementation)
nmap <silent> gr <Plug>(coc-references)
nmap <leader>rn <Plug>(coc-rename)

" Tab 자동완성
inoremap <silent><expr> <TAB>
      \ coc#pum#visible() ? coc#pum#next(1) :
      \ CheckBackspace() ? "\<Tab>" :
      \ coc#refresh()
inoremap <expr><S-TAB> coc#pum#visible() ? coc#pum#prev(1) : "\<C-h>"
```

### nvim-lspconfig (Neovim)

내장 LSP 설정.

```lua
{
    'neovim/nvim-lspconfig',
    dependencies = {
        'williamboman/mason.nvim',
        'williamboman/mason-lspconfig.nvim',
    }
}
```

### treesitter (Neovim)

향상된 구문 하이라이팅.

```vim
Plug 'nvim-treesitter/nvim-treesitter', {'do': ':TSUpdate'}
```

### ALE

비동기 린터/포매터.

```vim
Plug 'dense-analysis/ale'

let g:ale_linters = {
\   'python': ['flake8', 'pylint'],
\   'javascript': ['eslint'],
\}

let g:ale_fixers = {
\   '*': ['remove_trailing_lines', 'trim_whitespace'],
\   'python': ['black'],
\   'javascript': ['prettier'],
\}

let g:ale_fix_on_save = 1
```

### vim-test

테스트 실행.

```vim
Plug 'vim-test/vim-test'

nnoremap <leader>tn :TestNearest<CR>
nnoremap <leader>tf :TestFile<CR>
nnoremap <leader>ts :TestSuite<CR>
nnoremap <leader>tl :TestLast<CR>
```

## 5. 언어별 플러그인

```vim
" Go
Plug 'fatih/vim-go', { 'do': ':GoUpdateBinaries' }

" Rust
Plug 'rust-lang/rust.vim'

" JavaScript/TypeScript
Plug 'pangloss/vim-javascript'
Plug 'leafgarland/typescript-vim'
Plug 'peitalin/vim-jsx-typescript'

" Python
Plug 'vim-python/python-syntax'

" Markdown
Plug 'plasticboy/vim-markdown'
Plug 'iamcco/markdown-preview.nvim', { 'do': 'cd app && npm install' }
```

## 6. 테마

```vim
" 인기 테마
Plug 'morhetz/gruvbox'
Plug 'arcticicestudio/nord-vim'
Plug 'joshdick/onedark.vim'
Plug 'dracula/vim', { 'as': 'dracula' }
Plug 'catppuccin/vim', { 'as': 'catppuccin' }

" 설정
set termguicolors
set background=dark
colorscheme gruvbox
```

## 7. 완성된 플러그인 설정 예제

```vim
call plug#begin('~/.vim/plugged')

" 기본
Plug 'tpope/vim-sensible'
Plug 'tpope/vim-surround'
Plug 'tpope/vim-commentary'
Plug 'tpope/vim-repeat'
Plug 'tpope/vim-fugitive'

" 탐색
Plug 'junegunn/fzf', { 'do': { -> fzf#install() } }
Plug 'junegunn/fzf.vim'
Plug 'preservim/nerdtree'

" UI
Plug 'vim-airline/vim-airline'
Plug 'morhetz/gruvbox'

" 개발
Plug 'neoclide/coc.nvim', {'branch': 'release'}
Plug 'dense-analysis/ale'
Plug 'vim-test/vim-test'

call plug#end()

" === 플러그인 설정 ===
" fzf
nnoremap <C-p> :Files<CR>
nnoremap <leader>b :Buffers<CR>
nnoremap <leader>rg :Rg<CR>

" NERDTree
nnoremap <leader>n :NERDTreeToggle<CR>
let NERDTreeShowHidden=1

" 테마
set termguicolors
set background=dark
colorscheme gruvbox
```

## 실습

1. vim-plug 설치
2. vimrc에 플러그인 추가
3. `:PlugInstall` 실행
4. fzf, surround, commentary 사용해보기
5. 색상 테마 변경해보기

## 요약

- **vim-plug**: 간편한 플러그인 매니저
- 필수: fzf, surround, commentary, fugitive
- 생산성: NERDTree, airline, easymotion
- 개발: coc.nvim 또는 nvim-lspconfig, ALE
- `:PlugInstall`로 설치, `:PlugUpdate`로 업데이트
