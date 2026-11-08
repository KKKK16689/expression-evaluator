/**
 * 从 index.html 中抽取 CORE 代码块执行，验证的就是页面里真正跑的那份算法。
 * 用法：node test.js
 */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const m = html.match(/\/\* =+ CORE START =+ \*\/([\s\S]*?)\/\* =+ CORE END =+ \*\//);
if (!m) { console.error('未找到 CORE 代码块'); process.exit(1); }

const factory = new Function(m[1] + '\nreturn {analyze:analyze, precede:precede, PRECEDE:PRECEDE};');
const { analyze } = factory();

const CASES = [
  { expr: '3+4*5',            expect: 23,     why: '优先级：* 先于 +' },
  { expr: '(3+4)*5-6/2',      expect: 32,     why: '括号 + 优先级 + 实数除法' },
  { expr: '((2+3)*4)',        expect: 20,     why: '多重括号' },
  { expr: '7/2',              expect: 3.5,    why: 'double 数值栈' },
  { expr: '5/(3-3)',          expect: 'ERR',  why: '除零异常' },
  { expr: '123',              expect: 123,    why: '多位数拼接' },
  { expr: '8-4-2',            expect: 2,      why: '同级左结合' },
  { expr: '100+2*(3+45)/6-9', expect: 107,    why: '综合' },
  { expr: '9-(2-3)',          expect: 10,     why: '括号改变减法顺序' },
  { expr: '((1+2)*(3+4))',    expect: 21,     why: '双层括号嵌套' },
  { expr: '100*100/8',        expect: 1250,   why: '大数据 + 左结合' },
  { expr: '2+',               expect: 'ERR2', why: '非法表达式（操作数不足）' },
  { expr: '1+2*3-(4+5)',      expect: -2,     why: '结果为负' }
];

let pass = 0;
const rows = [];
for (const c of CASES) {
  const r = analyze(c.expr);
  let ok, got;
  if (c.expect === 'ERR') {
    got = (r.error || fmt(r.result)).split('，')[0];
    ok = /除数为 0/.test(got);
  } else if (c.expect === 'ERR2') {
    got = (r.error || fmt(r.result)).split('，')[0];
    ok = !!r.error;
  } else {
    got = r.error ? r.error.split('，')[0] : fmt(r.result);
    ok = !r.error && Math.abs(r.result - c.expect) < 1e-9;
  }
  if (ok) pass++;
  rows.push({ expr: c.expr, postfix: r.postfix || '—', got: String(got), expect: String(c.expect === 'ERR' ? '除零错误' : c.expect === 'ERR2' ? '非法表达式' : c.expect), ok, why: c.why, steps: r.steps.length });
}

function fmt(n) { return String(Math.round(n * 1e6) / 1e6); }

const pad = (s, n) => { s = String(s); const w = [...s].reduce((a, ch) => a + (ch.charCodeAt(0) > 255 ? 2 : 1), 0); return s + ' '.repeat(Math.max(0, n - w)); };

console.log('\n表达式求值器 · 算法自检（与实验报告算法一致）\n' + '─'.repeat(96));
console.log(pad('输入表达式', 22) + pad('后缀表达式', 26) + pad('实得结果', 16) + pad('期望', 12) + '结论');
console.log('─'.repeat(96));
for (const r of rows) {
  console.log(pad(r.expr, 22) + pad(r.postfix, 26) + pad(r.got, 16) + pad(r.expect, 12) + (r.ok ? 'PASS' : 'FAIL'));
}
console.log('─'.repeat(96));
console.log(`合计 ${rows.length} 组，通过 ${pass} 组，失败 ${rows.length - pass} 组\n`);

// 额外：打印用例 2 的完整回放轨迹，确认两个栈的行为
const demo = analyze('(3+4)*5-6/2');
console.log(`(3+4)*5-6/2 回放轨迹（共 ${demo.steps.length} 步）`);
demo.steps.forEach((s, i) => {
  console.log(`  ${String(i + 1).padStart(2)}. [STEP ${s.phase}] ${s.msg}`);
  console.log(`      运算符栈 [${s.op.join(' ')}]   数值栈 [${s.val.join(' ')}]`);
});

process.exit(rows.length - pass === 0 ? 0 : 1);
