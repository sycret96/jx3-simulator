const fs = require('fs');
const path = require('path');
const vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const m = html.match(/<script id="engine">([\s\S]*?)<\/script>/);
if (!m) { console.error('未找到 engine script'); process.exit(1); }
const ctx = { module: { exports: {} }, console };
vm.createContext(ctx);
vm.runInContext(m[1], ctx);
const JX3 = ctx.module.exports || ctx.JX3;
if (!JX3 || !JX3.simulate) { console.error('引擎未导出'); process.exit(1); }

let fail = 0;
const ok = (cond, name, extra) => {
  console.log((cond ? 'PASS  ' : 'FAIL  ') + name + (extra !== undefined ? '  → ' + extra : ''));
  if (!cond) fail++;
};
const A = ks => ks.map(k => ({ skill: k }));
const CH = 'chirilun', YY = 'youyuelun', LR = 'lirizhan', YZ = 'yinyuezhan',
  JS = 'jingshi', SSJ = 'shengsijie', GM = 'guangmingxiang', QY = 'quyeduanchou', AC = 'anchenmisan';

console.log('=== 1. 基础循环 ===');
let r = JX3.simulate(A([LR, CH, CH, CH, JS, YZ, YY, YY, YY, JS]), {});
console.log('时长', r.duration.toFixed(2), '总伤害', Math.round(r.total), 'DPS', Math.round(r.dps));
r.events.forEach(e => console.log(
  `  ${String(e.i + 1).padStart(2)} ${e.start.toFixed(2)}s ${e.name}${e.segLabel ? '·' + e.segLabel : ''}${e.formLabel ? '·' + e.formLabel : ''}`.padEnd(32)
  + ' dmg' + String(Math.round(e.damage)).padStart(6)
  + ' 日' + String(e.day).padStart(4) + ' 月' + String(e.moon).padStart(4)
  + ' 珥' + e.riE + ' 芒' + e.yueM + ' 相' + e.gmN,
  ' ' + e.notes.join(';')));
ok(r.events.length === 10, '事件数 = 10', r.events.length);
ok(r.events[3].day === 100, '赤日轮三段后日灵满 100', r.events[3].day);
ok(r.events[4].form === 'day', '净世取满日形态', r.events[4].form);
ok(r.events[4].day === 0, '净世后日灵清零', r.events[4].day);
ok(r.events[8].moon === 100, '幽月轮三段后月魂满 100', r.events[8].moon);
ok(r.events[9].form === 'moon', '第二次净世取满月形态', r.events[9].form);
ok(r.illegalCount === 0, '无非法施放', r.illegalCount);
ok(Math.abs(r.duration - 15) < 1e-9, '10 技能 × 1.5s GCD = 15s', r.duration);

console.log('\n=== 2. 日珥 / 月芒 → 光明相 ===');
r = JX3.simulate(A([LR, CH, CH, CH, JS, YZ]), {});
ok(r.events[0].riE === 1, '烈日斩命中非侠士 → 日珥 +1', r.events[0].riE);
ok(r.events[5].yueM === 0 && r.events[5].gmN === 1, '银月斩的月芒与日珥合成光明相 1 层', '珥' + r.events[5].riE + ' 芒' + r.events[5].yueM + ' 相' + r.events[5].gmN);
ok(r.merges === 1, '合成次数 = 1', r.merges);
r = JX3.simulate(A([LR, YZ, LR]), {});
ok(r.events[2].riE === 1 && r.events[2].gmN === 1, '待消耗存相（gmCharges>0）不阻断珥/芒：第3个烈日斩仍得日珥', '珥' + r.events[2].riE + ' 相' + r.events[2].gmN);
// 主动光明相 10s 窗口内才阻断珥/芒生成（情报：光明相期间不再获得）
r = JX3.simulate(A([LR, YZ, GM, LR]), {});
ok(r.events[2].offGcd === true, '主动光明相不占 GCD（瞬发）', r.events[2].offGcd);
ok(r.events[3].riE === 0 && r.events[3].notes.join('').indexOf('光明相期间') >= 0,
   '主动光明相 10s 窗口内：烈日斩无法获得日珥', '珥' + r.events[3].riE + ' | ' + r.events[3].notes.join(';'));
r = JX3.simulate(A([LR, YZ]), { ermang: false });
ok(r.events[1].yueM === 0 && r.events[1].riE === 0, '关闭体系后不再产生珥/芒', '珥' + r.events[1].riE + ' 芒' + r.events[1].yueM);

console.log('\n=== 3. 生死劫（秘籍：返灵 + 珥芒 + 颜色互换）===');
r = JX3.simulate(A([LR, CH, CH, CH, SSJ]), {});
console.log('  ' + r.events[4].notes.join(';'));
ok(r.events[4].form === 'day', '生死劫消耗满日', r.events[4].form);
ok(r.events[4].moon === 100, '秘籍返还异色满灵（满月）', r.events[4].moon);
ok(r.events[4].riE === 0 && r.events[4].yueM === 2, '得日珥后颜色互换 → 月芒 2 层', '珥' + r.events[4].riE + ' 芒' + r.events[4].yueM);
ok(r.events[4].damage < 500, '生死劫伤害极低', Math.round(r.events[4].damage));
r = JX3.simulate(A([LR, CH, CH, CH, SSJ]), { ssjSecret: false });
ok(r.events[4].moon === 0 && r.events[4].yueM === 0, '关闭秘籍后无返灵与互换', '月' + r.events[4].moon + ' 芒' + r.events[4].yueM);

console.log('\n=== 4. 光明相（主动）===');
const plain = JX3.simulate(A([LR, CH, CH, CH, JS]), {});
r = JX3.simulate(A([LR, CH, CH, CH, GM, JS]), {});
console.log('  ' + r.events[5].notes.join(';'));
ok(r.gmTriggers.active === 1, '主动光明相触发 1 次', r.gmTriggers.active);
ok(r.events[5].day === 100, '耗灵后立即返还满日（可连发净世）', r.events[5].day);
ok(r.events[5].forceCrit === true, '该次招式必会心');
ok(r.events[5].damage > plain.events[4].damage * 2, '伤害远高于无光明相时',
  Math.round(plain.events[4].damage) + ' → ' + Math.round(r.events[5].damage));

console.log('\n=== 5. 光明相（自动，来自珥+芒）===');
r = JX3.simulate(A([LR, CH, CH, CH, JS, YZ, YY, YY, YY, JS]), {});
ok(r.gmTriggers.auto === 1, '自动光明相触发 1 次', r.gmTriggers.auto);
ok(r.events[9].moon === 100, '自动光明相同样返还满灵', r.events[9].moon);
ok(r.events[9].forceCrit === false, '自动光明相默认不必会心（情报：生效时不再必会心）');
r = JX3.simulate(A([LR, CH, CH, CH, JS, YZ, YY, YY, YY, JS]), { gmAutoCrit: true });
ok(r.events[9].forceCrit === true, '开启「自动也必会心」后生效');

console.log('\n=== 6. 暗尘弥散 + 驱夜断愁 ===');
r = JX3.simulate(A([AC, QY]), {});
console.log('  ' + r.events[1].notes.join(';'));
ok(r.events[1].day === 40, '驱夜断愁 +40 资源（点【明焰续夜】后为 40）', r.events[1].day);
ok(r.events[1].wait === 0, '伪装中重置 CD，无需等待', r.events[1].wait);
ok(r.quyeResets >= 1, '进入伪装重置驱夜 CD', r.quyeResets);
r = JX3.simulate(A([QY, QY]), {});
ok(Math.abs(r.events[1].wait - 23.5) < 1e-9, '无伪装时第二次驱夜等 25s 调息（等 23.5s）', r.events[1].wait);
const back = JX3.simulate(A([QY]), { quyeBackstab: true }).events[0].damage;
const front = JX3.simulate(A([QY]), { quyeBackstab: false }).events[0].damage;
ok(Math.abs(back / front - 1.3) < 1e-6, '背后施展 +30%', (back / front).toFixed(4));
r = JX3.simulate(A([QY]), { quyeRequireStealth: true });
ok(r.events[0].illegal === true, '勾选「必须伪装」后无隐身则非法');
ok(r.events[0].damage === 0, '非法驱夜不计伤害');

console.log('\n=== 6.5 驱夜断愁方向跟随珥/芒（明焰续夜）===');
r = JX3.simulate(A([YZ, QY]), {});
ok(r.events[0].yueM === 1, '银月斩得月芒', r.events[0].yueM);
ok(r.events[1].moon === 80, '有月芒时驱夜给月魂（40+40）', r.events[1].moon);
ok(r.events[1].day === 0, '有月芒无日珥时不给日灵', r.events[1].day);
ok(r.events[1].gain.res === 'moon', '驱夜资源方向=月魂', r.events[1].gain.res);
r = JX3.simulate(A([LR, QY]), {});
ok(r.events[0].riE === 1, '烈日斩得日珥', r.events[0].riE);
ok(r.events[1].day === 80, '有日珥时驱夜给日灵', r.events[1].day);
ok(r.events[1].gain.res === 'day', '驱夜资源方向=日灵', r.events[1].gain.res);
r = JX3.simulate(A([AC, QY]), {});
ok(r.events[1].day === 40 && r.events[1].moon === 0, '无珥芒时回落补较低（日灵）', '日' + r.events[1].day + ' 月' + r.events[1].moon);

console.log('\n=== 6.6 暗尘弥散不占 GCD ===');
r = JX3.simulate(A([CH, AC, CH]), {});
ok(r.events[1].offGcd === true, '暗尘弥散标记为不占 GCD', r.events[1].offGcd);
ok(Math.abs(r.events[1].end - r.events[1].start) < 1e-9, '暗尘弥散时长为 0（不推进时间）', r.events[1].end - r.events[1].start);
ok(Math.abs(r.events[2].start - r.events[1].end) < 1e-9, '暗尘后下一技能立即接续（同刻触发）', r.events[2].start + ' vs ' + r.events[1].end);
ok(Math.abs(r.events[2].start - r.events[0].end) < 1e-9, '暗尘等同于瞬间插入（不额外占时）', r.events[2].start + ' vs ' + r.events[0].end);
r = JX3.simulate(A([LR, AC, YZ]), {});
ok(r.events[1].day === 40 && r.events[1].moon === 0 && r.events[1].riE === 1, '暗尘不改动资源（透传前后状态）', '日' + r.events[1].day + ' 月' + r.events[1].moon + ' 珥' + r.events[1].riE);
ok(r.events[2].gmN === 1, '暗尘后银月斩仍正常结算珥芒→合成光明相', r.events[2].gmN);

console.log('\n=== 7. 资源锁死 / 溢出 / 非法 ===');
r = JX3.simulate(A([LR, CH, CH, CH, YZ, YY]), {});
ok(r.events[4].moon === 0 && r.blocked.moon === 60, '日灵满时月魂被锁死', 'moon=' + r.events[4].moon + ' blocked=' + r.blocked.moon);
r = JX3.simulate(A([CH, JS]), {});
ok(r.events[1].illegal === true && r.events[1].damage === 0, '净世无满资源 → 非法且不计伤害');
r = JX3.simulate(A([SSJ]), {});
ok(r.events[0].illegal === true, '生死劫无满资源 → 非法');
r = JX3.simulate(A([CH, CH, CH, CH, CH, CH]), {});
ok(r.overflow.day === 20, '日灵溢出 20', r.overflow.day);
r = JX3.simulate(A([LR, LR, LR, LR]), {});
ok(Math.abs(r.events[3].wait - 10.5) < 1e-9, '第 4 个烈日斩等充能 10.5s', r.events[3].wait);

console.log('\n=== 8. 增伤 / 连击 / AoE / DOT ===');
ok(Math.abs(JX3.simulate(A([LR, CH]), {}).events[1].damage / JX3.simulate(A([CH]), {}).events[0].damage - 1.5) < 1e-6, '烈日 debuff 下赤日轮 ×1.5');
r = JX3.simulate(A([CH, CH, JS, CH]), {});
ok(r.events[0].seg === 0 && r.events[1].seg === 1, '连续赤日轮段数递增', r.events[0].seg + ',' + r.events[1].seg);
const one = JX3.simulate(A([LR, CH, CH, CH, JS]), { targets: 1 }).events[4].damage;
const five = JX3.simulate(A([LR, CH, CH, CH, JS]), { targets: 5 }).events[4].damage;
ok(five > one * 2, '5 目标时净世满日 AoE 伤害提高', Math.round(one) + ' → ' + Math.round(five));
ok(Math.abs(JX3.simulate(A([YZ, CH, CH, CH]), { dotTick: 100 }).dotDmg - 300) < 1e-6, 'DOT 6s 内跳 3 次', JX3.simulate(A([YZ, CH, CH, CH]), { dotTick: 100 }).dotDmg);
ok(JX3.simulate(A([YZ, YZ]), { dotTick: 100 }).dotDmg === 0, '提前刷新 DOT 吞掉剩余跳数');

console.log('\n=== 9. 示例·齐光 全流程 ===');
const DEMO2 = [LR, CH, CH, CH, JS, YZ, YY, YY, YY, GM, JS, JS, SSJ, AC, QY];
r = JX3.simulate(A(DEMO2), {});
console.log('时长', r.duration.toFixed(2), '总伤害', Math.round(r.total), 'DPS', Math.round(r.dps),
  '| 光明相 主动' + r.gmTriggers.active + ' 自动' + r.gmTriggers.auto, '| 非法', r.illegalCount);
r.events.forEach(e => console.log(
  `  ${String(e.i + 1).padStart(2)} ${e.start.toFixed(2)}s ${e.name}${e.formLabel ? '·' + e.formLabel : ''}`.padEnd(28)
  + ' dmg' + String(Math.round(e.damage)).padStart(7)
  + ' 日' + String(e.day).padStart(4) + ' 月' + String(e.moon).padStart(4)
  + ' 珥' + e.riE + ' 芒' + e.yueM + ' 相' + e.gmN, ' ' + e.notes.join(';')));
ok(r.duration > 0 && r.total > 0, '齐光示例可正常模拟', Math.round(r.dps));
ok(r.gmTriggers.active + r.gmTriggers.auto >= 1, '光明相被触发', r.gmTriggers.active + r.gmTriggers.auto);

console.log('\n=== 10. 边界 ===');
r = JX3.simulate([], {});
ok(r.duration === 0 && r.total === 0 && r.dps === 0, '空序列安全', JSON.stringify({ d: r.duration, t: r.total, p: r.dps }));
r = JX3.simulate([{ skill: '不存在的技能' }], {});
ok(r.events.length === 0, '未知技能被跳过');

console.log(fail === 0 ? '\n全部通过' : `\n${fail} 项失败`);
process.exit(fail ? 1 : 0);
