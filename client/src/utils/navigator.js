async function copy(text) {
  if (!navigator.clipboard) throw new Error('Clipboard API not supported');
  await navigator.clipboard.writeText(text);
}

async function share(text, url) {
  if (navigator.share) {
    await navigator.share({
      title: '立替清算アプリ',
      text,
      url,
    });
  } else {
    // 対応していないブラウザ（PCのChromeなど）向けの処理
    throw new Error('お使いのブラウザは共有機能に対応していません');
  }
}

export { copy, share };
