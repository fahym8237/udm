const FIELDS = [
  ['Course_title','Course Title'],
  ['Course_doc','Course Document / Exam Guide'],
  ['Course_provider_name','Course Provider'],
  ['Course_short_title','Course Short Title'],
  ...Array.from({length:6},(_,i)=>{const n=i+1;return [[`Exam_${n}_title`,`Exam ${n} Title`],[`Exam_${n}_percentage`,`Exam ${n} Percentage`]]}).flat()
];
const SECTIONS = [
  ['promotional_Video_prompt','Promotional Video Prompt'],['cours_prompt','Course Prompt'],['cours_image','Course Image'],['cours_info','Course Info']
];
const EMPTY_DATA = Object.fromEntries(FIELDS.map(([k])=>[k,'']));
let templateText = '';
let generatedText = '';
let generatedSections = {};

const $ = id => document.getElementById(id);

function buildExamCards(){
  const grid=$('examGrid');
  grid.innerHTML='';
  for(let i=1;i<=6;i++){
    grid.insertAdjacentHTML('beforeend',`<article class="exam-card"><div class="exam-card-header"><span class="exam-number">Exam ${i}</span><div class="percentage-wrap"><input class="percentage" id="Exam_${i}_percentage" inputmode="decimal" placeholder="%"><span>%</span></div></div><label>Exam ${i} Title<input id="Exam_${i}_title" autocomplete="off"></label></article>`);
  }
}
function getData(){
  const d={}; for(const [k] of FIELDS){d[k]=($(k)?.value||'').trim()} return d;
}
function setData(data){for(const [k] of FIELDS){if($(k)) $(k).value=data?.[k]??''}}
function replacePlaceholders(text,data){
  const missing=[];
  const out=text.replace(/\{([A-Za-z0-9_]+)\}/g,(m,k)=>{
    if(!(k in data)) return m;
    const v=(data[k]||'').trim(); if(!v) missing.push(k); return v;
  });
  return {out,missing:[...new Set(missing)]};
}
function extractSection(text,name){
  const marker=`#${name}#`, start=text.indexOf(marker);
  if(start<0) throw new Error(`Missing section marker: ${marker}`);
  const from=start+marker.length;
  const positions=SECTIONS.filter(([n])=>n!==name).map(([n])=>text.indexOf(`#${n}#`,from)).filter(x=>x>=0);
  return text.slice(from,positions.length?Math.min(...positions):text.length).trim();
}
function updateSections(){
  const wrap=$('sectionCards'); wrap.innerHTML='';
  for(const [name,label] of SECTIONS){
    const value=generatedSections[name]||'';
    wrap.insertAdjacentHTML('beforeend',`<article class="section-card"><h3>${escapeHtml(label)}</h3><textarea id="section_${name}" readonly></textarea><div class="section-actions"><button class="primary" data-copy="${name}">Copy section</button></div></article>`);
    $(`section_${name}`).value=value;
  }
  wrap.querySelectorAll('[data-copy]').forEach(btn=>btn.addEventListener('click',()=>copySection(btn.dataset.copy)));
}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function generate(showMissing=true){
  if(!templateText){setStatus('Template could not be loaded.','error');return false}
  const {out,missing}=replacePlaceholders(templateText,getData());
  generatedText=out; generatedSections={};
  for(const [name] of SECTIONS){try{generatedSections[name]=extractSection(out,name)}catch(e){generatedSections[name]=e.message}}
  $('preview').value=generatedText; updateSections();
  if(missing.length && showMissing) setStatus(`Generated with ${missing.length} empty field(s).`,'error'); else setStatus('Generated successfully. Nothing was stored.','ok');
  return true;
}
async function copyText(text){
  try{await navigator.clipboard.writeText(text)}catch(e){
    const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
  }
}
async function copySection(name){
  if(!generatedText) generate(false); if(!generatedSections[name]) return;
  await copyText(generatedSections[name]); setStatus(`Copied ${name}.`,'ok');
}
async function copyAll(){if(!generatedText) generate(false); await copyText(generatedText);setStatus('Copied entire generated version.','ok')}
function setStatus(msg,type=''){const s=$('status');s.textContent=msg;s.className=`status ${type}`}
function downloadJson(){
  const blob=new Blob([JSON.stringify(getData(),null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='course_info.json'; a.click(); URL.revokeObjectURL(a.href);
  setStatus('Course information JSON downloaded.','ok');
}
function clearAll(){setData(EMPTY_DATA);generatedText='';generatedSections={};$('preview').value='';updateSections();setStatus('Fields cleared.','ok')}

buildExamCards();
fetch('udm_course_prompt.txt',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.text()}).then(t=>{templateText=t;setStatus('Template loaded. Ready.','ok')}).catch(e=>setStatus(`Template load failed: ${e.message}`,'error'));
$('generateBtn').addEventListener('click',()=>generate());$('refreshBtn').addEventListener('click',()=>generate());$('copyAllBtn').addEventListener('click',copyAll);$('saveJsonBtn').addEventListener('click',downloadJson);$('clearBtn').addEventListener('click',clearAll);
$('loadJsonBtn').addEventListener('click',()=>$('jsonFile').click());
$('jsonFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());setData(data);setStatus('JSON imported.','ok')}catch(err){setStatus(`Invalid JSON: ${err.message}`,'error')}e.target.value=''})
