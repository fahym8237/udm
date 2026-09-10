const FIELDS = [
  ['Course_title','Course Title'],
  ['Course_doc','Course Document / Exam Guide'],
  ['Course_provider_name','Course Provider'],
  ['Course_short_title','Course Short Title'],
  ...Array.from({length:6},(_,i)=>{const n=i+1;return [[`Exam_${n}_title`,`Exam ${n} Title`],[`Exam_${n}_percentage`,`Exam ${n} Percentage`]]}).flat()
];

const SECTIONS = [
  ['promotional_Video_prompt','Promotional Video Prompt'],
  ['cours_prompt','Course Prompt'],
  ['cours_image','Course Image'],
  ['cours_info','Course Info']
];

const EMPTY_DATA = Object.fromEntries(FIELDS.map(([k])=>[k,'']));
let templateText = '';
let generatedText = '';
let generatedSections = {};
let toastTimer = null;

const $ = id => document.getElementById(id);

function buildExamCards(){
  const grid=$('examGrid');
  grid.innerHTML='';
  for(let i=1;i<=6;i++){
    grid.insertAdjacentHTML('beforeend',
      `<article class="exam-card">
        <div class="exam-card-header">
          <span class="exam-number">Exam ${i}</span>
          <div class="percentage-wrap">
            <input class="percentage" id="Exam_${i}_percentage" inputmode="decimal" placeholder="%">
            <span>%</span>
          </div>
        </div>
        <label>Exam ${i} Title<input id="Exam_${i}_title" autocomplete="off"></label>
      </article>`
    );
  }
}

function getData(){
  const d={};
  for(const [k] of FIELDS) d[k]=($(k)?.value||'').trim();
  return d;
}

function setData(data){
  for(const [k] of FIELDS){
    if($(k)) $(k).value=data?.[k]??'';
  }
}

function replacePlaceholders(text,data){
  const missing=[];
  const out=text.replace(/\{([A-Za-z0-9_]+)\}/g,(m,k)=>{
    if(!(k in data)) return m;
    const v=(data[k]||'').trim();
    if(!v) missing.push(k);
    return v;
  });
  return {out,missing:[...new Set(missing)]};
}

function extractSection(text,name){
  const marker=`#${name}#`;
  const start=text.indexOf(marker);
  if(start<0) throw new Error(`Missing section marker: ${marker}`);
  const from=start+marker.length;
  const positions=SECTIONS
    .filter(([n])=>n!==name)
    .map(([n])=>text.indexOf(`#${n}#`,from))
    .filter(x=>x>=0);
  return text.slice(from,positions.length?Math.min(...positions):text.length).trim();
}

function updateSections(){
  const wrap=$('sectionCards');
  wrap.innerHTML='';

  for(const [name,label] of SECTIONS){
    const value=generatedSections[name]||'';
    wrap.insertAdjacentHTML('beforeend',
      `<article class="section-card">
        <div class="section-card-header">
          <h3>${escapeHtml(label)}</h3>
          <span class="section-format">TXT</span>
        </div>
        <textarea id="section_${name}" readonly></textarea>
        <div class="section-actions">
          <button class="primary" data-copy="${name}">Copy</button>
          <button class="secondary" data-download="${name}">Download</button>
        </div>
      </article>`
    );
    $(`section_${name}`).value=value;
  }

  wrap.querySelectorAll('[data-copy]')
    .forEach(btn=>btn.addEventListener('click',()=>copySection(btn.dataset.copy)));

  wrap.querySelectorAll('[data-download]')
    .forEach(btn=>btn.addEventListener('click',()=>downloadSection(btn.dataset.download)));
}

function escapeHtml(s){
  return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function slugify(value){
  return String(value||'')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g,'')
    .replace(/\s+/g,' ')
    .replace(/\.+$/,'')
    .trim();
}

function showToast(message,type='ok'){
  const toast=$('toast');
  if(!toast) return;
  clearTimeout(toastTimer);
  toast.textContent=message;
  toast.className=`toast show ${type}`;
  toastTimer=setTimeout(()=>{
    toast.className='toast';
  },2000);
}

function generate(showMissing=true){
  if(!templateText){
    showToast('Template could not be loaded.','error');
    return false;
  }

  const {out,missing}=replacePlaceholders(templateText,getData());
  generatedText=out;
  generatedSections={};

  for(const [name] of SECTIONS){
    try{
      generatedSections[name]=extractSection(out,name);
    }catch(e){
      generatedSections[name]=e.message;
    }
  }

  $('preview').value=generatedText;
  updateSections();

  if(missing.length && showMissing){
    showToast(`Generated with ${missing.length} empty field(s).`,'error');
  }else{
    showToast('Generated successfully.','ok');
  }
  return true;
}

async function copyText(text){
  try{
    await navigator.clipboard.writeText(text);
  }catch(e){
    const ta=document.createElement('textarea');
    ta.value=text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

async function ensureGenerated(){
  if(!generatedText) return generate(false);
  return true;
}

async function copySection(name){
  if(!(await ensureGenerated()) || !generatedSections[name]) return;
  await copyText(generatedSections[name]);
  const label=SECTIONS.find(([n])=>n===name)?.[1]||name;
  showToast(`${label} copied.`);
}

async function copyAll(){
  if(!(await ensureGenerated())) return;
  await copyText(generatedText);
  showToast('Entire generated version copied.');
}

function makeSectionFilename(name){
  const courseTitle=slugify(getData().Course_title)||'Course';
  const label=SECTIONS.find(([n])=>n===name)?.[1]||name;
  return `${courseTitle} - ${slugify(label)||name}.txt`;
}

async function downloadBlob(text,filename,type='text/plain;charset=utf-8'){
  const blob=new Blob([text],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),100);
}

async function downloadSection(name){
  if(!(await ensureGenerated()) || !generatedSections[name]) return;
  await downloadBlob(generatedSections[name],makeSectionFilename(name));
  const label=SECTIONS.find(([n])=>n===name)?.[1]||name;
  showToast(`${label} downloaded.`);
}

function downloadJson(){
  downloadBlob(
    JSON.stringify(getData(),null,2),
    'course_info.json',
    'application/json;charset=utf-8'
  );
  showToast('Course information JSON downloaded.');
}

function clearAll(){
  setData(EMPTY_DATA);
  generatedText='';
  generatedSections={};
  $('preview').value='';
  updateSections();
  showToast('All fields and generated content cleared.');
}

buildExamCards();

fetch('udm_course_prompt.txt',{cache:'no-store'})
  .then(r=>{
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  })
  .then(t=>{
    templateText=t;
    showToast('Template loaded. Ready.');
  })
  .catch(e=>showToast(`Template load failed: ${e.message}`,'error'));

$('generateBtn').addEventListener('click',()=>generate());
$('refreshBtn').addEventListener('click',()=>generate());
$('copyAllBtn').addEventListener('click',copyAll);
$('saveJsonBtn').addEventListener('click',downloadJson);
$('clearBtn').addEventListener('click',clearAll);

$('loadJsonBtn').addEventListener('click',()=>$('jsonFile').click());
$('jsonFile').addEventListener('change',async e=>{
  const file=e.target.files[0];
  if(!file)return;
  try{
    const data=JSON.parse(await file.text());
    setData(data);
    showToast('JSON imported.');
  }catch(err){
    showToast(`Invalid JSON: ${err.message}`,'error');
  }
  e.target.value='';
});
