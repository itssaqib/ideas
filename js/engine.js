/* Pakistan Policy Quest - game engine (v2)
   All interaction uses delegated data-act handlers (no inline onclick),
   so it works under strict CSP, sandboxed previews, and every browser. */
"use strict";

/* ---------- storage shim: localStorage when available, memory otherwise ---------- */
var store={_m:{},
 get:function(k){try{var v=window.localStorage.getItem(k);if(v!==null)return v;}catch(e){}return (k in this._m)?this._m[k]:null;},
 set:function(k,v){this._m[k]=v;try{window.localStorage.setItem(k,v);}catch(e){}},
 del:function(k){delete this._m[k];try{window.localStorage.removeItem(k);}catch(e){}}};

/* ---------- state ---------- */
var S;
function freshState(){return{name:"",city:null,role:null,
 tags:{theme:{},geo:{},data:{},causal:{},horizon:{}},
 act:0,journal:[],badges:[],method:null,robust:false,_trapped:false,
 scenesDone:[],sceneRound:0,obq:0,bazaarOpened:[],
 dirChosen:null,refine:{brief:false,geoNarrow:false,primary:false},
 md:"",wish:"",polish:null,chat:[],_optList:null,_onOpt:null,_dirs:null,_alts:null};}
S=freshState();

function T(axis,obj){for(var k in obj){S.tags[axis][k]=(S.tags[axis][k]||0)+obj[k];}}
function topOf(axis,fallback){var best=fallback||null,bv=-1;for(var k in S.tags[axis]){if(S.tags[axis][k]>bv){bv=S.tags[axis][k];best=k;}}return best;}
function ranked(axis){var a=[];for(var k in S.tags[axis])a.push([k,S.tags[axis][k]]);a.sort(function(x,y){return y[1]-x[1];});return a.map(function(p){return p[0];});}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function el(id){return document.getElementById(id);}

/* ---------- journal, badges, toast ---------- */
function J(tag,text){S.journal.push({tag:tag,text:text});renderJournal();}
function renderJournal(){var b=el("jbody");if(!b)return;
 b.innerHTML=S.journal.map(function(e){return '<div class="je"><span class="tag">'+esc(e.tag)+'</span>'+esc(e.text)+'</div>';}).join("");
 b.scrollTop=b.scrollHeight;
 var st=el("stamps");if(st)st.innerHTML=S.badges.map(function(x){return '<span class="stamp">'+esc(x)+'</span>';}).join("");}
function badge(name){if(S.badges.indexOf(name)>=0)return;S.badges.push(name);renderJournal();
 var st=el("stamps");if(st&&st.lastChild)st.lastChild.classList.add("new");
 toast("\uD83C\uDF96 Badge earned: "+name);}
function toast(msg){var t=el("toast");if(!t)return;t.textContent=msg;t.classList.add("show");
 clearTimeout(t._h);t._h=setTimeout(function(){t.classList.remove("show");},2800);}

/* ---------- acts bar & screen ---------- */
var ACTNAMES=["0 \u00B7 Chai & Character","1 \u00B7 Field Diaries","2 \u00B7 Data Bazaar","3 \u00B7 The Secretary","4 \u00B7 Proposal Desk"];
function setAct(n){S.act=n;var bar=el("actbar");if(!bar)return;
 bar.innerHTML=ACTNAMES.map(function(nm,i){var cls=i<n?"done":(i===n?"now":"");var mark=i<n?"\u2611":"\u2610";
  return '<span class="'+cls+'">'+mark+" Act "+nm+"</span>";}).join("");}
function go(html){var sc=el("screen");if(!sc)return;
 sc.style.animation="none";void sc.offsetWidth;sc.style.animation="";
 sc.innerHTML=html;window.scrollTo({top:0,behavior:"smooth"});}

/* ---------- options (exam-paper style) ---------- */
function optHTML(list){return '<div class="opts">'+list.map(function(o,i){
 var letter=String.fromCharCode(97+i);
 return '<button class="opt" data-act="opt" data-arg="'+i+'"><span class="k">('+letter+')</span><span>'+o.t+(o.sub?'<small>'+o.sub+'</small>':'')+'</span></button>';
}).join("")+'</div><div class="keyhint">Tip: press a\u2013'+String.fromCharCode(96+list.length)+' or 1\u2013'+list.length+'</div>';}
function setOpts(list,handler){S._optList=list;S._onOpt=handler;}
function clearOpts(){S._optList=null;S._onOpt=null;}

/* ---------- modal ---------- */
function modal(title,bodyHTML,buttons){var w=el("modalwrap");if(!w)return;
 var btns=(buttons||[]).map(function(b){return '<button class="btn '+(b.cls||"")+'" data-act="'+b.act+'"'+(b.arg!==undefined?' data-arg="'+b.arg+'"':'')+'>'+b.label+'</button>';}).join("");
 w.innerHTML='<div class="modal"><h3>'+title+'</h3>'+bodyHTML+'<div class="btnbar">'+btns+'<button class="btn ghost" data-act="modalClose">Close</button></div></div>';
 w.classList.add("open");}
function modalClose(){var w=el("modalwrap");if(w){w.classList.remove("open");w.innerHTML="";}}

/* =======================================================================
   GAME FLOW
   ======================================================================= */
function titleScreen(){clearOpts();setAct(0);
 go('<div class="card"><div class="kicker">Welcome \u00B7 A field kit disguised as a game</div>'+
 '<h2>You are about to design real research.</h2>'+
 '<p>Over five short acts you will wander Pakistani field sites, rummage through real datasets, argue with a skeptical Secretary, and walk out with a <b>complete, thesis-ready research proposal</b> \u2014 question, data, identification strategy, 12-month plan, ethics, the lot.</p>'+
 '<p class="small">No question here asks "what is your research interest." Your choices will tell us. Watch the &#128221; Journal (right edge) as the engine reads your trail. <b>Give me my proposal</b> (top bar) works at any moment; <b>Restart</b> wipes the slate. With AI enabled (\u2699 button), a live AI supervisor joins you at the Proposal Desk.</p>'+
 '<h3>Sign the field register</h3><input type="text" id="pname" placeholder="Your name (or a nom de recherche)" maxlength="40" autocomplete="off">'+
 '<div class="btnbar"><button class="btn" data-act="start">Start Game</button></div>'+quoteHTML()+'</div>');
 var inp=el("pname");if(inp){inp.focus();inp.addEventListener("keydown",function(e){if(e.key==="Enter")ACTIONS.start();});}}

function startNamed(){var v=el("pname");S.name=(v&&v.value.trim())||"Researcher";
 J("Act 0","Field register signed: "+S.name+".");pickCity();}

function pickCity(){go('<div class="card"><div class="kicker">Act 0 \u00B7 Chai &amp; Character</div><h2>Where does your story start, '+esc(S.name)+'?</h2><p>Pick the desk you report to on Monday.</p>'+optHTML(CITIES)+'</div>');
 setOpts(CITIES,function(o){S.city=o.t.split(" \u2014")[0];T("geo",o.geo);J("Act 0","Based in "+S.city+".");pickRole();});}
function pickRole(){go('<div class="card"><div class="kicker">Act 0 \u00B7 Chai &amp; Character</div><h2>And who are you there?</h2>'+optHTML(ROLES)+'</div>');
 setOpts(ROLES,function(o){S.role=o.t;for(var ax in o.tags)T(ax,o.tags[ax]);J("Act 0","Role: "+o.t+".");S.obq=0;obqStep();});}
function obqStep(){var i=S.obq;if(i>=OBQ.length){wishScreen();return;}
 var Q=OBQ[i];go('<div class="card"><div class="kicker">Act 0 \u00B7 Question '+(i+1)+" of "+(OBQ.length+1)+'</div><h2>'+Q.q+'</h2>'+optHTML(Q.o)+'</div>');
 setOpts(Q.o,function(o){for(var ax in o.tags)T(ax,o.tags[ax]);J("Act 0",'"'+o.t.replace(/\u201C|\u201D/g,"")+'"');S.obq++;obqStep();});}

function wishScreen(){clearOpts();
 go('<div class="card"><div class="kicker">Act 0 \u00B7 Question '+(OBQ.length+1)+" of "+(OBQ.length+1)+'</div><h2>One line, your own words:</h2><p>What problem from daily life in Pakistan do you quietly wish someone would finally fix?</p>'+
 '<textarea id="wish" placeholder="e.g., Why does my cousin\u2019s village school still have no science teacher..."></textarea>'+
 '<div class="btnbar"><button class="btn" data-act="wishdone">Log it</button><button class="btn ghost" data-act="wishskip">Skip</button></div>'+
 '<p class="qnote" id="wishnote">'+(AI.on()?"AI is on \u2014 your own words will be read properly, not just keyword-matched.":"Tip: enable AI (\u2699) and this box gets read by a real language model.")+'</p></div>');
 var w=el("wish");if(w)w.focus();}
function wishDone(){var v=(el("wish")?el("wish").value.trim():"");
 if(!v){obDone();return;}
 S.wish=v;
 var finish=function(tags,how){var hits=0;
  if(tags){T("theme",tags);hits=Object.keys(tags).length;}
  else{WISHMAP.forEach(function(p){if(p[0].test(v)){T("theme",p[1]);hits++;}});how="keyword scan";}
  J("Act 0","Wish logged: \u201C"+v.slice(0,120)+(v.length>120?"\u2026":"")+"\u201D"+(hits?" (heard via "+how+")":""));
  obDone();};
 if(AI.on()){var n=el("wishnote");if(n)n.textContent="Reading your wish\u2026";
  AI.tagWish(v).then(function(tags){finish(tags,"AI reading");}).catch(function(){finish(null);});}
 else finish(null);}
function wishSkip(){J("Act 0","Wish left unwritten \u2014 the field will speak instead.");obDone();}
function obDone(){var lead=ranked("theme").slice(0,2).map(function(k){return THEMES[k]?THEMES[k].label:k;});
 J("Act 0","Early leanings: "+(lead.length?lead.join(" + "):"still forming")+".");
 clearOpts();
 go('<div class="card"><div class="kicker">Act 0 \u00B7 Complete</div><h2>Character logged. Boots on.</h2><p>Your bag holds a notebook, a phone with offline maps, and a thermos. Three field visits await \u2014 chosen by what your answers have already whispered.</p>'+quoteHTML()+'<div class="btnbar"><button class="btn" data-act="act1">Open the field diaries \u2192</button></div></div>');}

/* ---- Act 1 ---- */
function act1Start(){setAct(1);S.sceneRound=0;nextScene();}
function sceneScore(sc){var s=(S.tags.theme[sc.primary]||0);var tg=topOf("geo");if(tg&&sc.geo[tg])s+=0.6;return s+Math.random()*0.25;}
function nextScene(){if(S.sceneRound>=3){clearOpts();
  go('<div class="card"><div class="kicker">Act 1 \u00B7 Complete</div><h2>Three diaries filled.</h2><p>Your notebook has opinions now. Time to see what data could carry them.</p>'+quoteHTML()+'<div class="btnbar"><button class="btn" data-act="act2">Enter the Data Bazaar \u2192</button></div></div>');return;}
 var pool=SCENES.filter(function(sc){return S.scenesDone.indexOf(sc.id)<0;});
 pool.sort(function(a,b){return sceneScore(b)-sceneScore(a);});
 var pick;
 if(S.sceneRound===1){var firstTheme=SCENES.filter(function(sc){return S.scenesDone.indexOf(sc.id)>=0;}).map(function(sc){return sc.primary;});
  var alt=pool.filter(function(sc){return firstTheme.indexOf(sc.primary)<0;});pick=(alt[0]||pool[0]);}
 else pick=pool[0];
 S.scenesDone.push(pick.id);showScene(pick);}
function showScene(sc){go('<div class="card"><div class="kicker">Act 1 \u00B7 Field Diary '+(S.sceneRound+1)+' of 3 \u00B7 '+sc.kick+'</div><h2>'+sc.title+'</h2><p>'+sc.text+'</p><h3>'+sc.q+'</h3>'+optHTML(sc.o)+'</div>');
 setOpts(sc.o,function(o){T("theme",(o.tags&&o.tags.theme)||{});if(o.tags&&o.tags.data)T("data",o.tags.data);if(o.tags&&o.tags.causal)T("causal",o.tags.causal);T("geo",sc.geo);
  J("Diary "+(S.sceneRound+1),(o.note||o.t));showFollow(sc);});}
function showFollow(sc){var f=sc.follow;
 go('<div class="card"><div class="kicker">Act 1 \u00B7 Field Diary '+(S.sceneRound+1)+' \u00B7 '+sc.title+'</div><h2>'+f.q+'</h2>'+optHTML(f.o)+'</div>');
 setOpts(f.o,function(o){for(var ax in o.tags)T(ax,o.tags[ax]);J("Diary "+(S.sceneRound+1),(o.note||o.t));S.sceneRound++;nextScene();});}

/* ---- Act 2 ---- */
function bazaarRank(){var td=topOf("data");var arr=[];for(var k in DATA){var d=DATA[k],s=0;for(var t in d.aff)s+=d.aff[t]*(S.tags.theme[t]||0);
 if(td&&FAM[k]===td)s+=1.5;arr.push([k,s]);}arr.sort(function(a,b){return b[1]-a[1];});return arr.map(function(p){return p[0];});}
function act2Start(){setAct(2);renderBazaar();}
function renderBazaar(){clearOpts();var keys=bazaarRank().slice(0,6);var opened=S.bazaarOpened.length;
 var html='<div class="card"><div class="kicker">Act 2 \u00B7 The Data Bazaar</div><h2>Six files, one afternoon.</h2><p>A friendly statistician has left these on the table \u2014 stacked, suspiciously, in the order of your interests. <b>Open any two.</b></p><div class="stalls">';
 keys.forEach(function(k){var d=DATA[k];var op=S.bazaarOpened.indexOf(k)>=0;
  html+='<button class="stall'+(op?" opened":"")+'" data-act="stall" data-arg="'+k+'" '+(op?"disabled":"")+'><h4>'+d.name+'</h4><span class="yrs">'+d.yrs+'</span><p>'+d.vars.split(".")[0]+'.</p></button>';});
 html+='</div>'+(opened>=2?'<div class="btnbar"><button class="btn" data-act="act3">To the Secretary\u2019s office \u2192</button></div>':'<p class="qnote">'+(2-opened)+' more to open.</p>')+'</div>';
 go(html);}
function openStall(k){var d=DATA[k];if(!d||S.bazaarOpened.indexOf(k)>=0)return;
 go('<div class="card"><div class="kicker">Act 2 \u00B7 File opened</div><h2>'+d.name+'</h2><span style="font-family:var(--mono);color:var(--madder);font-size:12px;letter-spacing:.1em">'+d.yrs+'</span>'+
 '<dl class="dcard"><dt>What lives inside</dt><dd>'+d.vars+'</dd><dt>How to get it</dt><dd>'+d.access+'</dd><dt>Honest limitation</dt><dd>'+d.limit+'</dd></dl>'+
 '<h3>You flip straight to\u2026</h3>'+optHTML(d.peek)+'</div>');
 setOpts(d.peek,function(o){for(var ax in o.tags)T(ax,o.tags[ax]);
  S.bazaarOpened.push(k);
  J("Bazaar","Opened "+d.name+" \u2014 "+o.t.split(":")[0]+".");
  if(k==="pslm_d")badge("District Data Sleuth");
  if(k==="pdhs")badge("Gender Data Detective");
  if(S.bazaarOpened.length===2){var f1=FAM[S.bazaarOpened[0]],f2=FAM[S.bazaarOpened[1]];if(f1!==f2)badge("Linkage Artist");}
  renderBazaar();});}

/* ---- Act 3 ---- */
var METHOPTS=[
 {t:"Compare treated districts to untouched ones, before versus after \u2014 the change in the change.",sub:"Difference-in-differences",m:"did"},
 {t:"Exploit the fact that it arrived district by district \u2014 early adopters versus late.",sub:"Staggered rollout / event study",m:"esdid"},
 {t:"Run one big regression and control for everything I can think of.",sub:"Kitchen-sink OLS",m:"TRAP"},
 {t:"Use the hard eligibility cutoff \u2014 families just above versus just below the line.",sub:"Regression discontinuity",m:"rdd"},
 {t:"Find a shock that moves exposure to the program but nothing else about the outcome.",sub:"Instrumental variables",m:"iv"},
 {t:"Randomize a small pilot with an implementing partner and measure properly.",sub:"Field experiment (RCT)",m:"rct"},
 {t:"Be honest: with this data, document the patterns rigorously and event-study the sharp shocks \u2014 no causal headline.",sub:"Honest descriptive panel",m:"panel"}];
function act3Start(){setAct(3);var th=topOf("theme","education");var prog=PROGRAM[th]||"the program";
 go('<div class="card"><div class="kicker">Act 3 \u00B7 The Secretary\u2019s Question</div><h2>Committee Room 3, 4:45 p.m.</h2>'+
 '<p>The Additional Secretary (Planning) has given you eleven minutes and is already unimpressed. He taps your one-pager on '+prog+'. <i>\u201CBeta, everything you people show me is correlation. The places that got '+prog+' were CHOSEN \u2014 they were different to begin with. Convince me you can measure what it actually DID.\u201D</i></p>'+
 '<h3>Your move:</h3>'+optHTML(METHOPTS)+'</div>');
 setOpts(METHOPTS,methodPicked);}
function methodPicked(o){if(o.m==="TRAP"){trapScreen();return;}
 S.method=o.m;T("causal",o.m==="rct"?{experimental:2}:(o.m==="panel"?{descriptive:2}:{quasi:2}));
 if(["did","esdid","rdd","iv"].indexOf(o.m)>=0&&!S._trapped)badge("Quasi-Experimental Guru");
 J("Act 3","Chose "+METH[o.m].label+" for the Secretary.");robQ();}
function trapScreen(){S._trapped=true;clearOpts();
 go('<div class="card"><div class="kicker">Act 3 \u00B7 A short, educational silence</div><h2>The Secretary smiles. That is worse than shouting.</h2>'+
 '<p><i>\u201CControl for everything? Can you control for AMBITION, beta? For the MNA\u2019s phone call that put the program there? The things that chose these districts are exactly the things you cannot see in your dataset.\u201D</i></p>'+
 '<div class="callout"><b>Field note:</b> adding controls only fixes selection on <i>observables</i>. Program placement is usually driven by unobservables \u2014 political pull, local trends, need. You need a source of variation, not a longer regression.</div>'+
 '<div class="btnbar"><button class="btn" data-act="retry3">Try again \u2014 properly</button></div></div>');}
function act3Retry(){var opts=METHOPTS.filter(function(o){return o.m!=="TRAP";});
 go('<div class="card"><div class="kicker">Act 3 \u00B7 Second attempt</div><h2>\u201CGood. Now \u2014 where is your variation?\u201D</h2>'+optHTML(opts)+'</div>');
 setOpts(opts,methodPicked);}
function robQ(){var R=ROBQ[S.method];
 go('<div class="card"><div class="kicker">Act 3 \u00B7 The follow-up jab</div><h2>'+R.q+'</h2>'+optHTML(R.o)+'</div>');
 setOpts(R.o,function(o){if(o.best){S.robust=true;badge(["did","esdid"].indexOf(S.method)>=0?"Parallel-Trends Whisperer":"Threats-to-Validity Slayer");
   J("Act 3","Parried the follow-up. The Secretary writes something \u2014 possibly your name.");}
  else{J("Act 3","Stumbled on the follow-up: "+(o.note||"weak answer")+" (Noted for the robustness chapter.)");toast("Hm. "+(o.note||"Not quite."));}
  clearOpts();
  go('<div class="card"><div class="kicker">Act 3 \u00B7 Complete</div><h2>\u201CEleven minutes. Not wasted.\u201D</h2><p>He slides your one-pager back. <i>\u201CBring me the full proposal. If the design survives MY economists, we will talk data letters.\u201D</i></p>'+quoteHTML()+'<div class="btnbar"><button class="btn" data-act="act4">To the Proposal Desk \u2192</button></div></div>');});}

/* ---- Act 4 ---- */
function bestDesign(themeKey,method){var ds=THEMES[themeKey].designs;var m=ds.filter(function(d){return d.m===method;});if(m.length)return m[0];
 var hi=ds.filter(function(d){return d.feas==="High";});return hi[0]||ds[0];}
function act4Start(){setAct(4);synthesize();}
function synthesize(){clearOpts();var order=ranked("theme").filter(function(k){return THEMES[k];});
 if(!order.length){T("theme",{education:1});order=["education"];toast("No strong signals yet \u2014 starting you with a classic.");}
 var m=S.method||"did";var dirs=[],used={};
 var t1=order[0],d1=bestDesign(t1,m);dirs.push({th:t1,d:d1});used[d1.id]=1;
 if(order[1]){var d2=bestDesign(order[1],m);if(!used[d2.id]){dirs.push({th:order[1],d:d2});used[d2.id]=1;}}
 var wild=THEMES[t1].designs.filter(function(d){return !used[d.id]&&d.m!==d1.m;})[0];
 if(wild)dirs.push({th:t1,d:wild,wild:true});
 S._dirs=dirs;
 var html='<div class="card"><div class="kicker">Act 4 \u00B7 The Proposal Desk</div><h2>Your trail points here, '+esc(S.name||"Researcher")+'.</h2><p>Themes: <b>'+order.slice(0,2).map(function(k){return THEMES[k].label;}).join("</b> + <b>")+'</b>. Method instinct: <b>'+METH[m].label+'</b>. Pick a direction \u2014 you can refine or swap after.</p><div class="dirs">';
 dirs.forEach(function(x,i){var fcls=x.d.feas==="High"?"hi":(x.d.feas==="Medium"?"med":"amb");
  html+='<button class="dir" data-act="dir" data-arg="'+i+'"><span class="pill">'+THEMES[x.th].label+'</span><span class="pill">'+METH[x.d.m].short+'</span><span class="pill '+fcls+'">Feasibility: '+x.d.feas+'</span>'+(x.wild?'<span class="pill">Wildcard</span>':'')+
   '<h4>'+x.d.title+'</h4><p class="small">'+x.d.rq+'</p><div class="pc"><div class="plus"><b>Why it sings</b>'+METH[x.d.m].pros[0]+'.</div><div class="minus"><b>Eyes open</b>'+x.d.feasNote+'</div></div></button>';});
 html+='</div></div>';go(html);}
function chooseDir(i){var x=S._dirs&&S._dirs[+i];if(!x)return;
 S.dirChosen=x;S.polish=null;S.chat=[];J("Act 4","Direction chosen: "+x.d.title+".");buildProposal();}

function effFlags(){var f=(S.dirChosen&&S.dirChosen.d.flags)||{};return{primary:!!f.primary||S.refine.primary,admin:!!f.admin};}
function buildProposal(){clearOpts();var x=S.dirChosen,th=THEMES[x.th],d=x.d,M=METH[d.m],fl=effFlags();
 var horizon=S.refine.brief?"policy":topOf("horizon","thesis");
 var geo=topOf("geo");var geoLine=(S.refine.geoNarrow&&geo&&PROV[geo])?PROV[geo]:null;
 if(fl.primary)badge("IRB-Ready");
 var fcls=d.feas==="High"?"hi":(d.feas==="Medium"?"med":"amb");
 var h=[],md=[];
 h.push('<div class="doc" id="pdoc"><div class="formno" style="display:flex;justify-content:space-between"><span>Form PSQ\u201326 \u00B7 Research Proposal</span><span>Prepared for: '+esc(S.name||"Researcher")+'</span></div>');
 h.push('<div class="eyebrow">\u00A70 \u00B7 Title</div><h2>'+((S.polish&&S.polish.title)?esc(S.polish.title):d.title)+'</h2>'+
  ((S.polish&&S.polish.title)?'<p class="small">Library title: '+d.title+'</p>':'')+
  (geoLine?'<p class="small"><b>Geographic focus:</b> '+geoLine+'</p>':'')+
  '<p><span class="pill">'+th.label+'</span><span class="pill">'+M.label+'</span><span class="pill '+fcls+'">Feasibility: '+d.feas+'</span><span class="pill">'+(horizon==="policy"?"6-month policy track":horizon==="paper"?"journal-bound":"12-month thesis track")+'</span></p>');
 md.push("# "+((S.polish&&S.polish.title)?S.polish.title:d.title)+"\n\nPrepared for: "+(S.name||"Researcher")+(geoLine?"\nGeographic focus: "+geoLine:"")+"\nTheme: "+th.label+" | Method: "+M.label+" | Feasibility: "+d.feas+"\n");
 if(S.polish){h.push('<div class="aipolish"><span class="who">AI supervisor\u2019s tailoring \u2014 review before adopting</span><p>'+esc(S.polish.hook||"")+'</p>'+
   (S.polish.subqs&&S.polish.subqs.length?('<ul>'+S.polish.subqs.map(function(s){return"<li>"+esc(s)+"</li>";}).join("")+'</ul>'):'')+
   (S.polish.threat?('<p class="small"><b>Added threat:</b> '+esc(S.polish.threat.t)+' <b>Mitigation:</b> '+esc(S.polish.threat.m)+'</p>'):'')+'</div>');
  md.push("## AI supervisor's tailoring (review before adopting)\n"+(S.polish.hook||"")+"\n"+(S.polish.subqs||[]).map(function(s){return "- "+s;}).join("\n")+(S.polish.threat?("\n- Added threat: "+S.polish.threat.t+" -> "+S.polish.threat.m):"")+"\n");}
 h.push('<div class="eyebrow">\u00A71 \u00B7 Research question</div><p><b>'+d.rq+'</b></p><h3>Sub-questions</h3><ol>'+d.sub.map(function(s){return"<li>"+s+"</li>";}).join("")+'</ol>');
 md.push("## 1. Research question\n"+d.rq+"\n\nSub-questions:\n"+d.sub.map(function(s,i){return(i+1)+". "+s;}).join("\n")+"\n");
 h.push('<div class="eyebrow">\u00A72 \u00B7 Motivation & policy relevance</div><p>'+d.hook+'</p><ul><li><b>Global anchors:</b> '+th.sdg+'.</li><li><b>National anchor:</b> '+th.uraan+'; legacy Vision 2025 continuity.</li><li>'+th.prov+'</li></ul>');
 md.push("## 2. Motivation & policy relevance\n"+d.hook+"\n- Global anchors: "+th.sdg+"\n- National anchor: "+th.uraan+"\n- "+th.prov+"\n");
 h.push('<div class="eyebrow">\u00A73 \u00B7 Literature anchors</div><ul class="refs">'+d.anchors.concat(M.refs).map(function(a){return"<li>"+a+"</li>";}).join("")+'</ul><p class="small">Snowball from these: their references, and who cites them (Google Scholar), define your reading list.</p>');
 md.push("## 3. Literature anchors\n"+d.anchors.concat(M.refs).map(function(a){return"- "+a;}).join("\n")+"\n");
 h.push('<div class="eyebrow">\u00A74 \u00B7 Data</div>');md.push("## 4. Data");
 d.data.forEach(function(k){var D=DATA[k];
  h.push('<h3>'+D.name+' <span style="font-family:var(--mono);font-size:11px;color:var(--madder)">'+D.yrs+'</span></h3><dl class="dcard"><dt>Key content</dt><dd>'+D.vars+'</dd><dt>Access</dt><dd>'+D.access+'</dd><dt>Limitation to write down now</dt><dd>'+D.limit+'</dd></dl>');
  md.push("\n### "+D.name+" ("+D.yrs+")\n- Key content: "+D.vars+"\n- Access: "+D.access+"\n- Limitation: "+D.limit);});
 h.push('<div class="callout"><b>Linkage is the edge:</b> the identification below lives in merging these sources \u2014 build the merge keys (district/tehsil crosswalks, GPS joins) early and document them like they are results. They are.</div>');
 md.push("\nLinkage note: identification lives in merging these sources; build and document crosswalks early.\n");
 h.push('<div class="eyebrow">\u00A75 \u00B7 Identification strategy \u2014 '+M.label+'</div><p>'+M.blurb+'</p><p>'+d.ident+'</p><div class="eq">'+esc(d.eq)+'</div><h3>Assumptions you are signing up to defend</h3><ul>'+M.assum.map(function(a){return"<li>"+a+"</li>";}).join("")+'</ul>');
 md.push("## 5. Identification strategy ("+M.label+")\n"+M.blurb+"\n"+d.ident+"\n\nEquation: "+d.eq+"\n\nAssumptions:\n"+M.assum.map(function(a){return"- "+a;}).join("\n")+"\n");
 h.push('<div class="eyebrow">\u00A76 \u00B7 Robustness plan</div><ul>'+M.robust.map(function(r){return"<li>"+r+"</li>";}).join("")+'</ul>');
 md.push("## 6. Robustness plan\n"+M.robust.map(function(r){return"- "+r;}).join("\n")+"\n");
 h.push('<div class="eyebrow">\u00A77 \u00B7 Threats & mitigation</div>'+d.threats.map(function(t){return'<div class="threat"><span><b>Threat:</b> '+t.t+'</span><span><b>Mitigation:</b> '+t.m+'</span></div>';}).join(""));
 md.push("## 7. Threats & mitigation\n"+d.threats.map(function(t){return"- Threat: "+t.t+" -> Mitigation: "+t.m;}).join("\n")+"\n");
 var rows=planRows(horizon,fl);
 h.push('<div class="eyebrow">\u00A78 \u00B7 Step-by-step plan ('+(rows.length<=6?"6-month policy track":"12-month thesis track")+')</div><div class="plan">'+rows.map(function(r){return'<div class="row"><span class="m">'+r.m+'</span><span>'+r.t+'</span></div>';}).join("")+'</div>');
 md.push("## 8. Step-by-step plan\n"+rows.map(function(r){return"- "+r.m+": "+r.t;}).join("\n")+"\n");
 h.push('<div class="eyebrow">\u00A79 \u00B7 Ethics & research conduct</div>'+ethicsText(fl));
 md.push("## 9. Ethics & research conduct\n"+ethicsText(fl).replace(/<[^>]+>/g,"")+"\n");
 h.push('<div class="eyebrow">\u00A710 \u00B7 Extensions & scaling</div><ul>'+d.ext.map(function(e){return"<li>"+e+"</li>";}).join("")+'</ul>');
 md.push("## 10. Extensions & scaling\n"+d.ext.map(function(e){return"- "+e;}).join("\n")+"\n");
 var themesR=ranked("theme").filter(function(k){return THEMES[k];}).slice(0,3).map(function(k){return THEMES[k].label;});
 h.push('<div class="eyebrow">\u00A711 \u00B7 Your field profile</div><p class="small">Inferred from your trail \u2014 themes: '+themesR.join(", ")+'. Method: '+M.label+'. City base: '+(S.city||"\u2014")+'. Badges: '+(S.badges.join(" \u00B7 ")||"none yet")+'.</p>');
 md.push("## 11. Field profile\nThemes: "+themesR.join(", ")+" | Method: "+M.label+" | City: "+(S.city||"-")+" | Badges: "+(S.badges.join(", ")||"none")+"\n\n(Generated by Pakistan Policy Quest - built by Saqib. Verify latest data releases on the PBS microdata portal & dhsprogram.com.)");
 h.push('</div>');
 S.md=md.join("\n");
 var actions='<div class="btnbar noprint"><button class="btn" data-act="dl">Download .md</button><button class="btn ghost" data-act="copy">Copy text</button><button class="btn ghost" data-act="print">Print / PDF</button><button class="btn ghost" data-act="refine">Refine \u25BE</button><button class="btn madder" data-act="restartAsk">New quest</button></div>';
 var aihub='<div class="aihub noprint"><h3>\uD83E\uDDE0 AI Supervisor\u2019s Office</h3><p class="small">'+(AI.on()?"Connected \u2014 model: "+AI.cfg.model+".":"Not connected \u2014 open \u2699 AI settings to add a key, or try anyway if you are running this inside Claude.")+'</p>'+
  '<div class="btnbar"><button class="btn ghost" data-act="aiPolish">\u2728 Tailor this proposal to my trail</button><button class="btn ghost" data-act="aiCfg">\u2699 AI settings</button></div>'+
  '<div class="ailog" id="ailog">'+renderChat()+'</div>'+
  '<div class="askrow"><input type="text" id="aiq" placeholder="Ask your supervisor anything about this proposal\u2026" autocomplete="off"><button class="btn" data-act="aiAsk">Ask</button></div></div>';
 go('<div class="card noprint" style="margin-bottom:16px"><div class="kicker">Act 4 \u00B7 Delivered</div><h2>Your proposal, '+esc(S.name||"Researcher")+'.</h2><p class="small">Refine to swap designs, narrow geography, switch tracks, or bolt on a primary-data module. Export before you close the tab.</p>'+actions+'</div>'+h.join("")+aihub);
 var q=el("aiq");if(q)q.addEventListener("keydown",function(e){if(e.key==="Enter")ACTIONS.aiAsk();});}
function renderChat(){if(!S.chat.length)return '<div class="msg ai"><span class="who">Supervisor</span>Bring me questions \u2014 identification worries, data doubts, how to defend this in a viva. I have read your proposal.</div>';
 return S.chat.map(function(m){return '<div class="msg '+m.r+'"><span class="who">'+(m.r==="you"?"You":(m.r==="wait"?"\u2026":"Supervisor"))+'</span>'+esc(m.t).replace(/\n/g,"<br>")+'</div>';}).join("");}
function refreshChat(){var lg=el("ailog");if(lg){lg.innerHTML=renderChat();lg.scrollTop=lg.scrollHeight;}}

function refinePanel(){clearOpts();var x=S.dirChosen;var order=ranked("theme").filter(function(k){return THEMES[k];}).slice(0,3);if(order.indexOf(x.th)<0)order.unshift(x.th);
 var alts=[];order.forEach(function(tk){THEMES[tk].designs.forEach(function(d){if(d.id!==x.d.id)alts.push({tk:tk,d:d});});});
 S._alts=alts.slice(0,6);
 var html='<div class="card"><div class="kicker">Refine \u00B7 The desk is yours</div><h2>Adjust and regenerate.</h2><h3>Toggles</h3><div class="btnbar">'+
 '<button class="btn ghost" data-act="tglBrief">'+(S.refine.brief?"\u2611":"\u2610")+' 6-month policy track</button>'+
 '<button class="btn ghost" data-act="tglGeo">'+(S.refine.geoNarrow?"\u2611":"\u2610")+' Focus on '+(PROV[topOf("geo")]||"your province")+'</button>'+
 '<button class="btn ghost" data-act="tglPrimary">'+(S.refine.primary?"\u2611":"\u2610")+' Add a primary-data module</button></div>'+
 '<h3>Swap to another design</h3><div class="dirs">'+S._alts.map(function(a,i){var fc=a.d.feas==="High"?"hi":(a.d.feas==="Medium"?"med":"amb");
  return '<button class="dir" data-act="alt" data-arg="'+i+'"><span class="pill">'+THEMES[a.tk].label+'</span><span class="pill">'+METH[a.d.m].short+'</span><span class="pill '+fc+'">'+a.d.feas+'</span><h4>'+a.d.title+'</h4><p class="small">'+a.d.rq+'</p></button>';}).join("")+'</div>'+
 '<div class="btnbar"><button class="btn" data-act="backToDoc">\u2190 Back to my proposal</button></div></div>';
 go(html);}

/* ---------- exports ---------- */
function downloadMD(){try{var blob=new Blob([S.md],{type:"text/markdown"});var a=document.createElement("a");
 a.href=URL.createObjectURL(blob);a.download="research-proposal.md";document.body.appendChild(a);a.click();
 setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);toast("Proposal downloaded.");}catch(e){copyMD();}}
function copyMD(){var done=function(){toast("Proposal copied to clipboard.");};
 function legacyCopy(){var ta=document.createElement("textarea");ta.value=S.md;document.body.appendChild(ta);ta.select();
  try{document.execCommand("copy");done();}catch(e){toast("Copy failed \u2014 use Print / PDF instead.");}ta.remove();}
 if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(S.md).then(done,legacyCopy);}else legacyCopy();}

/* ---------- shortcuts ---------- */
function skipToProposal(){if(!S.name)S.name="Researcher";
 if(!ranked("theme").filter(function(k){return THEMES[k];}).length){T("theme",{education:1});toast("Thin trail \u2014 dealing you a classic. Refine freely.");}
 if(!S.method){var c=topOf("causal");S.method=c==="experimental"?"rct":(c==="descriptive"?"panel":"did");}
 setAct(4);J("Shortcut","Jumped straight to the Proposal Desk.");synthesize();}
function restartAsk(){modal("Wipe the register?","<p>This clears your journal, badges, and proposal, and starts a new quest. Export anything you want to keep first.</p>",
 [{label:"Yes, restart",act:"restartYes",cls:"madder"}]);}
function restartYes(){modalClose();S=freshState();renderJournal();titleScreen();toast("Fresh notebook. Same curiosity.");}

/* =======================================================================
   ACTION REGISTRY + DELEGATED EVENTS (the button fix)
   ======================================================================= */
var ACTIONS={
 start:startNamed,
 journal:function(){var j=el("journal");if(j)j.classList.toggle("open");},
 skip:skipToProposal,
 restartAsk:restartAsk,restartYes:restartYes,modalClose:modalClose,
 wishdone:wishDone,wishskip:wishSkip,
 act1:act1Start,act2:act2Start,act3:act3Start,act4:act4Start,retry3:act3Retry,
 opt:function(arg){var i=+arg;var l=S._optList;if(l&&l[i]&&S._onOpt)S._onOpt(l[i],i);},
 stall:function(arg){openStall(arg);},
 dir:function(arg){chooseDir(arg);},
 alt:function(arg){var a=S._alts&&S._alts[+arg];if(!a)return;S.dirChosen={th:a.tk,d:a.d};S.method=a.d.m;S.polish=null;J("Refine","Swapped to: "+a.d.title+".");buildProposal();},
 refine:refinePanel,backToDoc:buildProposal,
 tglBrief:function(){S.refine.brief=!S.refine.brief;buildProposal();},
 tglGeo:function(){S.refine.geoNarrow=!S.refine.geoNarrow;buildProposal();},
 tglPrimary:function(){S.refine.primary=!S.refine.primary;buildProposal();},
 dl:downloadMD,copy:copyMD,print:function(){try{window.print();}catch(e){}},
 aiCfg:function(){AI.settings();},aiSave:function(){AI.save();},aiClear:function(){AI.clear();},
 aiPolish:function(){AI.polish();},aiAsk:function(){AI.ask();}
};
document.addEventListener("click",function(e){
 var t=e.target&&e.target.closest?e.target.closest("[data-act]"):null;
 if(!t||t.disabled)return;
 var fn=ACTIONS[t.dataset.act];
 if(fn){e.preventDefault();fn(t.dataset.arg,t);}
});
document.addEventListener("keydown",function(e){
 var tag=e.target&&e.target.tagName;if(tag==="INPUT"||tag==="TEXTAREA")return;
 if(!S._optList)return;
 var c=e.key.toLowerCase(),idx=-1;
 if(c>="1"&&c<="9")idx=+c-1;else if(c>="a"&&c<="i")idx=c.charCodeAt(0)-97;
 if(idx>=0&&idx<S._optList.length)ACTIONS.opt(idx);
});

/* ---------- boot ---------- */
function boot(){setAct(0);renderJournal();titleScreen();if(window.AI&&AI.init)AI.init();}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
