// 코드 복사 버튼 기능
document.addEventListener('DOMContentLoaded', function() {
    // 모든 코드 블록 찾기
    const codeBlocks = document.querySelectorAll('pre.highlight');

    codeBlocks.forEach(function(codeBlock) {
        // 언어 감지
        const parent = codeBlock.parentElement;
        let language = 'code';

        if (parent && parent.classList.contains('highlighter-rouge')) {
            const classList = parent.className.split(' ');
            classList.forEach(function(className) {
                if (className.startsWith('language-')) {
                    language = className.replace('language-', '').toUpperCase();
                }
            });
        }

        // 언어 라벨 생성
        const languageLabel = document.createElement('span');
        languageLabel.className = 'language-label';
        languageLabel.textContent = language;

        // 복사 버튼 생성
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-code-button';
        copyButton.innerHTML = 'Copy';

        // 버튼 컨테이너 생성
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'code-header';
        buttonContainer.appendChild(languageLabel);
        buttonContainer.appendChild(copyButton);

        // 코드 블록 앞에 버튼 추가
        codeBlock.parentNode.insertBefore(buttonContainer, codeBlock);

        // 복사 기능
        copyButton.addEventListener('click', function() {
            const code = codeBlock.querySelector('code').textContent;

            // 클립보드에 복사
            navigator.clipboard.writeText(code).then(function() {
                // 성공 피드백
                copyButton.innerHTML = 'Copied!';
                copyButton.classList.add('copied');

                // 2초 후 원래대로
                setTimeout(function() {
                    copyButton.innerHTML = 'Copy';
                    copyButton.classList.remove('copied');
                }, 2000);
            }).catch(function(err) {
                // 폴백: 구식 방법
                const textArea = document.createElement('textarea');
                textArea.value = code;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);

                copyButton.innerHTML = 'Copied!';
                setTimeout(function() {
                    copyButton.innerHTML = 'Copy';
                }, 2000);
            });
        });
    });
});