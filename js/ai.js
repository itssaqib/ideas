/* Pakistan Policy Quest - optional AI layer.
   Works two ways:
   1. On GitHub Pages / any host: the user pastes their own Anthropic API key
      (stored only in THEIR browser, sent only to api.anthropic.com).
   2. Inside Claude.ai (artifact preview): calls can work without a key.
   Everything degrades gracefully - the game is fully playable without AI. */
"use strict";

var AI={
 cfg:{key:store.get("ppq_key")||"",model:store.get("ppq_model")||"claude-sonnet-4-6"},
 keylessOK:false,
 on:function(){return !!this.cfg.key||this.keylessOK;},

 init:function(){this.chip();},
 chip:function(){var c=document.getElementById("aichip");
  if(c)c.textContent="\u2699 AI \u00B7 "+(this.on()?"on":"off");},

 settings:function(){
  modal("\u2699 AI settings",
   '<p class="small">Adds a live <b>AI supervisor</b> to the Proposal Desk: it reads your wish in your own words, tailors your proposal, and answers questions about it.</p>'+
   '<label>Anthropic API key</label><input type="password" id="aikey" placeholder="sk-ant-..." value="'+esc(this.cfg.key)+'" autocomplete="off">'+
   '<label>Model</label><select id="aimodel">'+
    ["claude-sonnet-4-6","claude-haiku-4-5","claude-opus-4-8"].map(function(m){return '<option value="'+m+'"'+(m===AI.cfg.model?" selected":"")+'>'+m+'</option>';}).join("")+
   '</select>'+
   '<p class="small" style="margin-top:12px">Your key is stored <b>only in this browser</b> and sent <b>only to api.anthropic.com</b>. API usage is billed to the key\u2019s owner \u2014 a full playthrough costs a few cents on Sonnet, less on Haiku. Get a key at console.anthropic.com. Running this inside Claude? Leave the key blank and just try a feature \u2014 it may work without one.</p>',
   [{label:"Save",act:"aiSave"},{label:"Clear key",act:"aiClear",cls:"ghost"}]);},
 save:function(){var k=document.getElementById("aikey"),m=document.getElementById("aimodel");
  this.cfg.key=(k&&k.value.trim())||"";this.cfg.model=(m&&m.value)||"claude-sonnet-4-6";
  store.set("ppq_key",this.cfg.key);store.set("ppq_model",this.cfg.model);
  this.chip();modalClose();toast(this.cfg.key?"AI connected.":"Saved \u2014 no key set.");},
 clear:function(){this.cfg.key="";store.del("ppq_key");this.chip();modalClose();toast("Key cleared from this browser.");},

 call:function(userContent,system,maxTok,history){
  var headers={"content-type":"application/json"};
  if(this.cfg.key){headers["x-api-key"]=this.cfg.key;
   headers["anthropic-version"]="2023-06-01";
   headers["anthropic-dangerous-direct-browser-access"]="true";}
  var msgs=(history||[]).concat([{role:"user",content:userContent}]);
  var self=this;
  return fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:headers,
   body:JSON.stringify({model:this.cfg.model,max_tokens:maxTok||1024,system:system||"",messages:msgs})})
  .then(function(r){return r.json().catch(function(){return{};}).then(function(j){
    if(!r.ok)throw new Error((j&&j.error&&j.error.message)||("HTTP "+r.status));
    return j;});})
  .then(function(j){if(!self.cfg.key)self.keylessOK=true;self.chip();
    return (j.content||[]).filter(function(b){return b.type==="text";}).map(function(b){return b.text;}).join("\n");});},

 parseJSON:function(text){try{var t=String(text).replace(/```json|```/g,"").trim();
  var a=t.indexOf("{"),b=t.lastIndexOf("}");if(a<0||b<a)return null;
  return JSON.parse(t.slice(a,b+1));}catch(e){return null;}},

 /* --- Feature 1: read the free-text wish properly --- */
 tagWish:function(text){
  var sys="You classify one line written by a Pakistani Master's student about a problem they wish were fixed. Respond with ONLY a JSON object, no prose and no code fences. Keys must be a subset of: education, gender, health, poverty, climate, conflict, governance, labor. Values are integers 1-3 for relevance strength. Example: {\"education\":3,\"gender\":2}. If nothing fits, return {}.";
  return this.call("Line: "+text,sys,200).then(function(out){
   var j=AI.parseJSON(out);if(!j)throw new Error("parse");
   var clean={},allow=["education","gender","health","poverty","climate","conflict","governance","labor"];
   allow.forEach(function(k){var v=Math.round(Number(j[k]));if(v>=1)clean[k]=Math.min(3,v);});
   return Object.keys(clean).length?clean:null;});},

 /* --- Feature 2: tailor the proposal to this specific player --- */
 profileText:function(){
  var themes=ranked("theme").filter(function(k){return THEMES[k];}).slice(0,3).map(function(k){return THEMES[k].label;}).join(", ");
  var trail=S.journal.slice(-10).map(function(e){return e.tag+": "+e.text;}).join(" | ");
  return "Name: "+(S.name||"Researcher")+". City base: "+(S.city||"?")+". Role: "+(S.role||"?")+
   ". Inferred themes: "+themes+". Chosen method: "+(S.method?METH[S.method].label:"?")+
   ". Their own words (wish): \""+(S.wish||"none given")+"\". Recent trail: "+trail;},
 polish:function(){
  if(!S.dirChosen){toast("Reach the Proposal Desk first.");return;}
  var d=S.dirChosen.d;
  S.chat.push({r:"wait",t:"Tailoring the proposal to your trail\u2026"});refreshChat();
  var sys="You are a senior development economist at a Pakistani policy school, supervising a Master's student. You will tailor a template research proposal to this specific student. Respond with ONLY a JSON object, no prose, no code fences, with exactly these keys: title (string, <=14 words, sharp and Pakistan-specific), hook (string, one paragraph <=90 words connecting the design to the student's own words and trail), subqs (array of exactly 2 new sub-question strings specific to their interests), threat (object with keys t and m: one additional identification threat and its mitigation). Do not invent citations or datasets.";
  var user="STUDENT PROFILE: "+this.profileText()+
   "\n\nTEMPLATE DESIGN: Title: "+d.title+". Research question: "+d.rq+". Method: "+METH[d.m].label+". Motivation: "+d.hook+". Data: "+d.data.map(function(k){return DATA[k].name;}).join(", ")+".";
  this.call(user,sys,700).then(function(out){
   S.chat=S.chat.filter(function(m){return m.r!=="wait";});
   var j=AI.parseJSON(out);
   if(j&&(j.title||j.hook)){S.polish={title:j.title||"",hook:j.hook||"",subqs:Array.isArray(j.subqs)?j.subqs.slice(0,2):[],threat:(j.threat&&j.threat.t)?j.threat:null};
    buildProposal();toast("\u2728 Proposal tailored \u2014 see the green box under the title.");}
   else{S.chat.push({r:"ai",t:out.slice(0,900)});buildProposal();}
  }).catch(function(err){AI.fail(err);});},

 /* --- Feature 3: supervisor chat --- */
 ask:function(){var box=document.getElementById("aiq");var q=box?box.value.trim():"";
  if(!q){toast("Type a question first.");return;}
  if(!S.md){toast("Generate a proposal first.");return;}
  box.value="";
  S.chat.push({r:"you",t:q});S.chat.push({r:"wait",t:"Thinking\u2026"});refreshChat();
  var sys="You are a rigorous, kind senior development economist supervising a Master's student in Pakistan. Ground every answer in the student's proposal below. Be concrete; default to <=180 words unless asked for depth. Push back on weak identification. Never invent citations, datasets, or results.\n\nPROPOSAL:\n"+S.md.slice(0,7000);
  var hist=S.chat.filter(function(m){return m.r==="you"||m.r==="ai";}).slice(-7,-1)
   .map(function(m){return{role:m.r==="you"?"user":"assistant",content:m.t};});
  this.call(q,sys,600,hist).then(function(out){
   S.chat=S.chat.filter(function(m){return m.r!=="wait";});
   S.chat.push({r:"ai",t:out||"(empty reply)"});refreshChat();
  }).catch(function(err){AI.fail(err);});},

 fail:function(err){S.chat=S.chat.filter(function(m){return m.r!=="wait";});
  var msg=String(err&&err.message||err);
  S.chat.push({r:"ai",t:"Connection problem: "+msg+(AI.cfg.key?"":" \u2014 you likely need an API key (\u2699 AI settings).")});
  refreshChat();if(!AI.cfg.key)AI.settings();}
};
