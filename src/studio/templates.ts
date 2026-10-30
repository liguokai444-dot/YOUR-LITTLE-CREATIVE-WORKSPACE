export interface StudioTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tone: string;
  code?: string;
  file?: string;
}

export const deskImage = `${import.meta.env.BASE_URL}images/studio-desk.jpg`;

export const defaultCode = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FORM & FIELD · 日常里的灵感</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #34483c;
      background: #faf9f5;
      font-family: Arial, "Microsoft YaHei", sans-serif;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 23px 32px;
      font-size: 11px;
    }
    .wordmark { font-size: 19px; font-weight: 700; }
    nav { display: flex; gap: 22px; }
    a { color: inherit; text-decoration: none; }
    .hero {
      min-height: 480px;
      padding: 35px 40px;
      background: linear-gradient(180deg, #faf9f5 0%, #faf9f5ed 17%, #faf9f500 68%),
        url("${deskImage}") center bottom / cover;
    }
    .eyebrow { font-size: 8px; letter-spacing: 3px; color: #8a957f; }
    h1 {
      margin: 22px 0 18px;
      font: 500 61px / .97 Georgia, serif;
      letter-spacing: -3px;
    }
    h1 span { color: #7b8b6c; }
    .intro { font-size: 14px; letter-spacing: 3px; }
    .note { max-width: 270px; font-size: 11px; line-height: 1.9; color: #74806b; }
    button {
      margin-top: 12px;
      padding: 12px 19px;
      border: none;
      background: #405a45;
      color: #fffdf4;
      font-size: 10px;
      cursor: pointer;
    }
    footer { display: flex; justify-content: space-between; padding: 24px 32px; font-size: 9px; color: #8d9680; }
    @media (max-width: 420px) {
      header { padding: 22px 24px; }
      nav { gap: 14px; }
      .hero { padding: 28px; min-height: 500px; }
      h1 { font-size: 54px; }
      footer { padding: 22px 24px; }
    }
  </style>
</head>
<body>
  <header>
    <a class="wordmark" href="#home">f / f.</a>
    <nav><a href="#about">关于我们</a><a href="#about">寻找灵感 ↗</a></nav>
  </header>
  <main class="hero" id="home">
    <p class="eyebrow">A LITTLE ROOM FOR INSPIRATION</p>
    <h1>FORM<br /><span>& FIELD.</span></h1>
    <p class="intro">让灵感，回到日常。</p>
    <p class="note">在平凡的日子里，留一点空间给美好的事物。<br />一束光，一片绿，和一个刚刚好的开始。</p>
    <button id="collect">收藏这一刻 ↗</button>
  </main>
  <footer id="about"><span>MADE FOR SLOW MOMENTS.</span><span>用心，发现日常。</span></footer>
  <script>
    let ideas = 0;
    document.querySelector('#collect').addEventListener('click', () => {
      ideas += 1;
      document.querySelector('.note').textContent = '第 ' + ideas + ' 份灵感，已为你收藏。';
      console.log('灵感已收藏', { count: ideas });
    });
  </script>
</body>
</html>`;

const profileCode = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>林间 · 个人主页</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f5f1ed; color: #45413d; font-family: Arial, "Microsoft YaHei", sans-serif; }
    main { max-width: 620px; margin: 0 auto; padding: 66px 36px; }
    .mark { width: 64px; height: 64px; display: grid; place-items: center; border-radius: 50%; background: #d4c8b8; font: 28px Georgia, serif; }
    .eyebrow { font-size: 10px; color: #968979; letter-spacing: 3px; margin-top: 38px; }
    h1 { font-size: 39px; font-weight: 400; line-height: 1.5; letter-spacing: 2px; }
    .intro { line-height: 2; color: #918779; font-size: 13px; }
    .links { margin-top: 40px; border-top: 1px solid #ddd4c7; }
    a { display: flex; justify-content: space-between; padding: 22px 0; text-decoration: none; color: inherit; border-bottom: 1px solid #ddd4c7; font-size: 13px; }
    footer { font-size: 10px; color: #a39685; margin-top: 50px; }
  </style>
</head>
<body>
  <main>
    <div class="mark">lin.</div>
    <p class="eyebrow">DESIGNER & EVERYDAY OBSERVER</p>
    <h1>你好，我是林间。<br />让设计，温柔一点。</h1>
    <p class="intro">一名热爱排版、自然与细节的独立设计师。<br />记录生活里微小却闪光的灵感，做有温度的作品。</p>
    <div class="links"><a href="mailto:hello@example.com">聊聊新想法 <span>↗</span></a><a href="#journal">我的小小手记 <span>↓</span></a></div>
    <footer id="journal">SOMEWHERE BETWEEN DESIGN AND LIFE.</footer>
  </main>
</body>
</html>`;

const counterCode = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>一点点进步 · 交互示例</title>
  <style>
    body { min-height: 100vh; margin: 0; display: grid; place-items: center; background: #edf2eb; color: #365344; font-family: Arial, "Microsoft YaHei", sans-serif; }
    main { text-align: center; padding: 45px; }
    small { letter-spacing: 4px; color: #91a18b; font-size: 9px; }
    h1 { font-size: 24px; font-weight: 400; letter-spacing: 3px; margin-top: 30px; }
    #count { font: 100px Georgia, serif; margin: 22px 0; }
    p { color: #8e9f87; font-size: 12px; }
    button { border: 1px solid #adc1a6; background: transparent; color: #365344; padding: 12px 19px; font-size: 15px; cursor: pointer; }
    .buttons { display: flex; justify-content: center; gap: 12px; margin-top: 30px; }
    button:hover { background: #dae6d5; }
  </style>
</head>
<body>
  <main>
    <small>A LITTLE BETTER, EVERY DAY</small>
    <h1>每一步，都算数。</h1>
    <div id="count">0</div>
    <p>点一点，给今天加一点小进步。</p>
    <div class="buttons"><button id="minus" aria-label="减少">−</button><button id="reset">重置</button><button id="plus" aria-label="增加">+</button></div>
  </main>
  <script>
    let count = 0;
    const update = () => {
      document.querySelector('#count').textContent = count;
      console.log('当前计数：', count);
    };
    document.querySelector('#plus').onclick = () => { count++; update(); };
    document.querySelector('#minus').onclick = () => { count--; update(); };
    document.querySelector('#reset').onclick = () => { count = 0; update(); };
  </script>
</body>
</html>`;

export const blankCode = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>我的新页面</title>
  <style>
    body { font-family: sans-serif; padding: 40px; }
  </style>
</head>
<body>
  <h1>从这里，开始你的灵感。</h1>
</body>
</html>`;

export const templates: StudioTemplate[] = [
  { id: 'nature', name: '自然系着陆页', description: '一束光、一片绿，和简洁的品牌表达。', category: '品牌页面', tone: 'nature', code: defaultCode },
  { id: 'profile', name: '温柔的个人主页', description: '用舒服的留白，介绍特别的自己。', category: '个人主页', tone: 'profile', code: profileCode },
  { id: 'counter', name: '一点点小交互', description: '试一试按钮交互，也看看控制台。', category: 'JavaScript', tone: 'counter', code: counterCode },
  { id: 'pelican', name: '鹈鹕的兜风时间', description: '纯 SVG 动画，让小小的想象动起来。', category: 'SVG 动画', tone: 'pelican', file: 'examples/pelican.html' },
];
