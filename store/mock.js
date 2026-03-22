// ── 统一数据结构 Mock ──────────────────────────────────
const MOCK_GROUPS = [
  { id:'g001', creatorId:'u001', nickname:'盗哥', personality:'ENFP', destination:'七星岩', startTime:'03-28 09:00', current:2, max:4, status:'recruiting', tags:['拍照','徒步','打卡'], intro:'喜欢拍风景，希望找到志同道合的朋友一起去七星岩！日出必打卡。', matchReasons:['兴趣一致','时间匹配'], cover:{color:'linear-gradient(135deg,#667eea,#764ba2)',emoji:'🏔️'} },
  { id:'g002', creatorId:'u002', nickname:'旅行的意义', personality:'INFP', destination:'鼎湖山', startTime:'03-29 08:30', current:3, max:4, status:'recruiting', tags:['登山','自然','解压'], intro:'周末登鼎湖山，目前3人，再招1名队友，i人友好~', matchReasons:[], cover:{color:'linear-gradient(135deg,#11998e,#38ef7d)',emoji:'🌿'} },
  { id:'g003', creatorId:'u003', nickname:'特种兵小队', personality:'ESTP', destination:'肇庆古城', startTime:'03-29 07:00', current:4, max:4, status:'full', tags:['特种兵','打卡','citywalk'], intro:'一天打卡肇庆古城所有景点，已满员。', matchReasons:[], cover:{color:'linear-gradient(135deg,#f093fb,#f5576c)',emoji:'🏯'} },
  { id:'g004', creatorId:'u004', nickname:'cpdd女孩', personality:'ENFJ', destination:'端州美食街', startTime:'03-30 18:00', current:1, max:3, status:'recruiting', tags:['美食','cpdd','夜生活'], intro:'晚上去端州美食街吃吃逛逛，找2个小伙伴！', matchReasons:['都喜欢美食','同城出行'], cover:{color:'linear-gradient(135deg,#f7971e,#ffd200)',emoji:'🍜'} },
  { id:'g005', creatorId:'u005', nickname:'穷游达人', personality:'ISFP', destination:'西江苗寨', startTime:'04-05 06:00', current:2, max:5, status:'recruiting', tags:['穷游','人文','摄影'], intro:'五一假期西江苗寨深度游，预算300以内，慢节奏出行。', matchReasons:[], cover:{color:'linear-gradient(135deg,#4facfe,#00f2fe)',emoji:'🏘️'} },
  { id:'g006', creatorId:'u006', nickname:'山野小分队', personality:'ISTP', destination:'鸡笼顶', startTime:'04-06 07:00', current:2, max:6, status:'recruiting', tags:['徒步','露营','野外'], intro:'鸡笼顶穿越露营，需要有徒步经验，装备齐全。', matchReasons:[], cover:{color:'linear-gradient(135deg,#43e97b,#38f9d7)',emoji:'⛺'} }
];

const MOCK_POSTS = [
  { id:'p001', title:'一次玩够肇庆五大景点！特种兵路线', author:'特种兵小王', likes:128, cover:{color:'linear-gradient(135deg,#f093fb,#f5576c)',emoji:'🏛️'}, destination:'肇庆' },
  { id:'p002', title:'七星岩凌晨打卡，人少景美超治愈', author:'摄影爱好者', likes:86, cover:{color:'linear-gradient(135deg,#667eea,#764ba2)',emoji:'🌅'}, destination:'七星岩' },
  { id:'p003', title:'鼎湖山徒步全攻略，i人友好版', author:'徒步er', likes:59, cover:{color:'linear-gradient(135deg,#11998e,#38ef7d)',emoji:'🌲'}, destination:'鼎湖山' },
  { id:'p004', title:'肇庆端州美食地图，吃货必收藏', author:'美食侦探', likes:203, cover:{color:'linear-gradient(135deg,#f7971e,#ffd200)',emoji:'🍱'}, destination:'端州' }
];

module.exports = { MOCK_GROUPS, MOCK_POSTS };
