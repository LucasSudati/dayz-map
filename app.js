// Centralizo o acesso aos elementos e defino a escala ilustrativa da grade.
const $=id=>document.getElementById(id), MAX=15360, SIZE=800, key='dayz-map-proto-01';

// Recupero os dados locais; inicio camadas padrão quando não existe estado válido.
let state;
try{state=JSON.parse(localStorage.getItem(key))}catch{};
if(!state||!Array.isArray(state.layers))state={layers:[{id:'private',name:'Privado',visible:true},{id:'team',name:'Esquadrão (simulado)',visible:true}],markers:[],routes:[]};

// Guardo zoom, deslocamento, gesto de arrasto, rota temporária e imagem carregada.
let scale=1,tx=0,ty=0,drag=null,routeDraft=null,mapUrl=null,contextPoint=null;

// Preservo as posições na tela dos marcadores criados antes da inversão do eixo.
if(!state.yDownMigrated){for(const m of state.markers||[])m.z=MAX-m.z;
for(const r of state.routes||[])for(const p of r.points||[])p.z=MAX-p.z;
state.yDownMigrated=true;
localStorage.setItem(key,JSON.stringify(state))}

// Limito a paleta às dez cores disponíveis na interface.
const PALETTE=['#FF0000','#00FF00','#0000FF','#00FFFF','#FF00FF','#FFFF00','#FF8000','#8000FF','#FFFFFF','#A0A0A0'];

// Descrevo os desenhos vetoriais de cada tipo de marcador.
const SHAPES={"home":"<path d=\"M7 17L17 9l10 8M10 17v11h14V17M15 28v-8h5v8\"/>","player":"<circle cx=\"17\" cy=\"12\" r=\"4\"/>
<path d=\"M9 28v-7q0-5 8-5t8 5v7\"/>","car":"<path d=\"M7 24l3-10h14l3 10v4H7zM8 22h18M12 14l2-4h6l2 4\"/>","motorcycle":"<circle cx=\"9\" cy=\"25\" r=\"4\"/>
<circle cx=\"25\" cy=\"25\" r=\"4\"/>
<path d=\"M9 25l5-9 5 9h6l-4-11h-4\"/>","target":"<circle cx=\"17\" cy=\"19\" r=\"10\"/>
<circle cx=\"17\" cy=\"19\" r=\"5\"/>
<path d=\"M17 6v8m0 10v8M4 19h8m10 0h8\"/>","supply":"<rect x=\"8\" y=\"11\" width=\"18\" height=\"17\" rx=\"1\"/>
<path d=\"M8 16h18M17 11v17\"/>","water":"<path d=\"M17 7C13 13 9 17 9 22a8 8 0 0 0 16 0c0-5-4-9-8-15z\"/>","warning":"<path d=\"M17 7L30 29H4zM17 15v7m0 4v1\"/>","meet":"<circle cx=\"11\" cy=\"14\" r=\"4\"/>
<circle cx=\"23\" cy=\"14\" r=\"4\"/>
<path d=\"M3 28v-5q0-5 8-5t8 5v5M18 22q1-4 5-4 8 0 8 5v5\"/>","pin":"<circle cx=\"17\" cy=\"18\" r=\"8\"/>
<path d=\"M17 5v5m0 15v5M4 18h5m16 0h5\"/>"};

// Converto ícones antigos para os tipos atuais quando necessário.
const OLD={'📍':'pin','🚙':'car','🏠':'home','📦':'supply','⚠️':'warning','👤':'player'};

// Guardo a cor escolhida para os próximos marcadores.
let markerColor='#FFFFFF';

// Produzo o SVG do marcador com a cor validada na paleta.
function pinSVG(type,color){const shape=SHAPES[type]||SHAPES[OLD[type]]||SHAPES.pin;
const c=PALETTE.includes(color)?color:'#FFFFFF';
return '<svg viewBox="0 0 34 46" aria-hidden="true">
<path d="M17 1C8 1 2 8 2 17c0 12 15 27 15 27s15-15 15-27C32 8 26 1 17 1z" fill="#1b2535" stroke="'+c+'" stroke-width="2"/>
<g fill="none" stroke="'+c+'" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+shape+'</g>
</svg>'}
// Refaço os botões da paleta e atualizo a seleção ativa.
function renderPalette(){$('palette').innerHTML=PALETTE.map(c=>'<button type="button" class="'+(c===markerColor?'active':'')+'" style="background:'+c+'" title="'+c+'" data-color="'+c+'">
</button>').join('');
$('palette').querySelectorAll('button').forEach(b=>b.onclick=()=>{markerColor=b.dataset.color;$('markerBorder').value=markerColor;renderPalette()})}
// Persisto o estado no navegador e escapo texto antes de inseri-lo em HTML.
function save(){localStorage.setItem(key,JSON.stringify(state))}function esc(t){return String(t).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]))}function currentLayer(){return $('targetLayer').value||state.layers[0]?.id}
// Reconstruo as camadas, visibilidade, seleção e exclusão associada.
function renderLayers(){const sel=currentLayer();$('layers').innerHTML=state.layers.map(l=>`<div class="layer">
<input type="checkbox" data-toggle="${esc(l.id)}" ${l.visible?'checked':''} aria-label="Exibir ${esc(l.name)}">
<span class="name">${esc(l.name)}</span>${l.id==='private'?'<small>local</small>':`<button class="delete" data-remove="${esc(l.id)}" title="Remover camada">×</button>`}</div>`).join('');$('targetLayer').innerHTML=state.layers.map(l=>`<option value="${esc(l.id)}" ${l.id===sel?'selected':''}>${esc(l.name)}</option>`).join('');$('layers').querySelectorAll('[data-toggle]').forEach(el=>el.onchange=()=>{state.layers.find(l=>l.id===el.dataset.toggle).visible=el.checked;save();renderMap()});$('layers').querySelectorAll('[data-remove]').forEach(el=>el.onclick=()=>{if(!confirm('Excluir camada e todos os seus marcadores e rotas?'))return;state.layers=state.layers.filter(l=>l.id!==el.dataset.remove);state.markers=state.markers.filter(m=>m.layer!==el.dataset.remove);state.routes=state.routes.filter(r=>r.layer!==el.dataset.remove);save();renderLayers();renderMap()})}
// Converto coordenadas da grade em pixels; limito a conversão inversa aos extremos.
function pixel(x,z){return{x:x/MAX*SIZE,y:z/MAX*SIZE}}function coord(x,y){return{x:Math.round(Math.max(0,Math.min(MAX,x/SIZE*MAX))),z:Math.round(Math.max(0,Math.min(MAX,y/SIZE*MAX)))}}function worldPos(e){const r=$('world').getBoundingClientRect();return{x:(e.clientX-r.left)/scale,y:(e.clientY-r.top)/scale}}
// Carrego a imagem localmente via URL temporária; não envio arquivos a servidor.
$('mapFile').addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;if(mapUrl)URL.revokeObjectURL(mapUrl);mapUrl=URL.createObjectURL(f);$('baseMap').src=mapUrl;$('baseMap').style.display='block';$('world').classList.add('has-map');});$('clearMap').onclick=()=>{if(mapUrl)URL.revokeObjectURL(mapUrl);mapUrl=null;$('baseMap').removeAttribute('src');$('baseMap').style.display='none';$('world').classList.remove('has-map');$('mapFile').value='';};
// Aplico zoom e deslocamento ao mundo e compenso a escala dos ícones.
function transform(){$('markers').querySelectorAll('.pin').forEach(e=>e.style.transform='scale('+(1/scale)+')');$('world').style.transform=`translate(calc(-50% + ${tx}px),calc(-50% + ${ty}px)) scale(${scale})`}function visible(layer){return state.layers.some(l=>l.id===layer&&l.visible)}
// Desenho controles para editar cores, espessuras e excluir elementos.
function renderEditors(){const me=$('markerEditors'),re=$('routeEditors');me.innerHTML=state.markers.map(m=>`<div class="edit-item">
<span class="label" title="${esc(m.name)}">${esc(m.icon)} ${esc(m.name)}</span>
<input type="color" aria-label="Borda do marcador" data-mborder="${esc(m.id)}" value="${esc(m.borderColor||'#d7dde6')}">
<input type="color" aria-label="Fundo do marcador" data-mbg="${esc(m.id)}" value="${esc(m.bgColor||'#1b2535')}">
<button data-mdel="${esc(m.id)}" title="Excluir marcador">×</button>
</div>`).join('');re.innerHTML=state.routes.map((r,i)=>`<div class="edit-item">
<span class="label">Rota ${i+1}</span>
<input type="color" aria-label="Cor da rota" data-rcolor="${esc(r.id)}" value="${esc(r.color||'#96badd')}">
<input type="number" style="width:53px" min="1" max="12" title="Espessura" data-rwidth="${esc(r.id)}" value="${Math.max(1,Math.min(12,Number(r.width)||1))}">
<button data-rdel="${esc(r.id)}" title="Excluir rota">×</button>
</div>`).join('');me.querySelectorAll('[data-mborder],[data-mbg]').forEach(el=>el.oninput=()=>{let m=state.markers.find(m=>m.id===(el.dataset.mborder||el.dataset.mbg));if(!m)return;m[el.dataset.mborder?'borderColor':'bgColor']=el.value;save();renderMap()});re.querySelectorAll('[data-rcolor],[data-rwidth]').forEach(el=>el.oninput=()=>{let r=state.routes.find(r=>r.id===(el.dataset.rcolor||el.dataset.rwidth));if(!r)return;r[el.dataset.rcolor?'color':'width']=el.dataset.rwidth?Math.max(1,Math.min(12,Number(el.value)||1)):el.value;save();renderMap();});me.querySelectorAll('[data-mdel]').forEach(el=>el.onclick=()=>{if(!confirm('Excluir marcador?'))return;state.markers=state.markers.filter(m=>m.id!==el.dataset.mdel);save();renderMap()});re.querySelectorAll('[data-rdel]').forEach(el=>el.onclick=()=>{if(!confirm('Excluir rota?'))return;state.routes=state.routes.filter(r=>r.id!==el.dataset.rdel);save();renderMap()})}
// Refaço marcadores e linhas de rota com base nas camadas visíveis.
function renderMap(){$('markers').innerHTML='';state.markers.filter(m=>visible(m.layer)).forEach(m=>{const p=pixel(m.x,m.z),el=document.createElement('button');el.className='pin';el.style.left=p.x+'px';el.style.top=p.y+'px';el.innerHTML=pinSVG(m.icon,m.borderColor||'#FFFFFF')+'<span>'+esc(m.name)+' · '+m.x+', '+m.z+' (teste)</span>';el.title='Clique para selecionar as coordenadas: '+m.name;el.style.borderColor=m.borderColor||'#d7dde6';el.style.backgroundColor='transparent';el.style.marginLeft='-17px';el.style.marginTop='-44px';el.style.transformOrigin='50% 100%';el.style.transform='scale('+(1/scale)+')';el.onclick=e=>{e.stopPropagation();$('x').value=m.x;$('y').value=m.z;$('markerName').value=m.name;$('markerBorder').value=m.borderColor||'#d7dde6';$('markerBg').value=m.bgColor||'#1b2535';$('status').textContent=`X: ${m.x} | Z: ${m.z} (teste)`;};$('markers').appendChild(el)});let svg='';for(const r of [...state.routes,...(routeDraft?[routeDraft]:[])]){if(!visible(r.layer)||r.points.length<2)continue;svg+=`<polyline points="${r.points.map(p=>{let a=pixel(p.x,p.z);return a.x+','+a.y}).join(' ')}" fill="none" stroke="${esc(r.color||'#96badd')}" stroke-width="${Math.max(1,Math.min(12,Number(r.width)||1))}" stroke-linecap="round" stroke-linejoin="round"/>`} $('lines').innerHTML=svg;renderEditors()}
// Adiciono camadas com identificadores únicos e salvo a alteração.
$('addLayer').onclick=()=>{const n=$('newLayer').value.trim();if(!n)return;state.layers.push({id:crypto.randomUUID(),name:n,visible:true});$('newLayer').value='';save();renderLayers();renderMap()};// Valido coordenadas e crio o marcador na camada selecionada.
$('addMarker').onclick=()=>{const x=Number($('x').value),z=Number($('y').value);if(!Number.isFinite(x)||!Number.isFinite(z)||x<0||z<0||x>MAX||z>MAX)return alert('Coordenadas de teste devem estar entre 0 e 15360.');state.markers.push({id:crypto.randomUUID(),name:$('markerName').value.trim()||'Marcador',icon:$('icon').value,layer:currentLayer(),x,z,borderColor:markerColor,bgColor:$('markerBg').value});$('markerName').value='';save();renderMap()};
// Centralizo a coordenada solicitada na grade ilustrativa.
$('go').onclick=()=>{let x=Number($('x').value),z=Number($('y').value);if(x<0||z<0||x>MAX||z>MAX)return;const p=pixel(x,z);tx=(400-p.x)*scale;ty=(400-p.y)*scale;transform();$('status').textContent=`X: ${x} | Z: ${z} (teste)`};// Inicio um rascunho de rota e só salvo rotas com pelo menos dois pontos.
$('route').onclick=()=>{routeDraft={id:crypto.randomUUID(),layer:currentLayer(),points:[],color:$('routeColor').value,width:Math.max(1,Math.min(12,Number($('routeWidth').value)||1))};$('route').textContent='Rota em andamento…';renderMap()};$('endRoute').onclick=()=>{if(routeDraft&&routeDraft.points.length>=2)state.routes.push(routeDraft);routeDraft=null;$('route').textContent='Começar rota (clique no mapa)';save();renderMap()};
// Configuro arrasto, seleção de pontos e zoom por roda do mouse.
const vp=$('viewport');vp.addEventListener('pointerdown',e=>{if(e.target.closest('button')||e.target.closest('#toolbar'))return;drag={x:e.clientX,y:e.clientY,tx,ty,moved:false};vp.setPointerCapture(e.pointerId);vp.classList.add('dragging')});vp.addEventListener('pointermove',e=>{if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>5)drag.moved=true;tx=drag.tx+dx;ty=drag.ty+dy;transform()}else{const p=worldPos(e),c=coord(p.x,p.y);$('status').textContent=`X: ${c.x} | Z: ${c.z} (grade de teste)`}});vp.addEventListener('pointerup',e=>{if(!drag)return;const moved=drag.moved;drag=null;vp.classList.remove('dragging');if(!moved){const p=worldPos(e);if(p.x>=0&&p.y>=0&&p.x<=SIZE&&p.y<=SIZE){const c=coord(p.x,p.y);$('x').value=c.x;$('y').value=c.z;$('status').textContent=`X: ${c.x} | Z: ${c.z} (teste)`;if(routeDraft){routeDraft.points.push(c);renderMap()}}}});vp.addEventListener('wheel',e=>{e.preventDefault();scale=Math.max(.45,Math.min(64,scale*(e.deltaY<0?1.12:.89)));transform()},{passive:false});// Disponibilizo zoom por botões e retorno à vista inicial.
$('plus').onclick=()=>{scale=Math.min(64,scale*1.2);transform()};$('minus').onclick=()=>{scale=Math.max(.45,scale/1.2);transform()};$('home').onclick=()=>{scale=1;tx=ty=0;transform()};// Exijo confirmação antes de apagar o estado local.
$('reset').onclick=()=>{if(confirm('Apagar dados locais do protótipo?')){localStorage.removeItem(key);location.reload()}};// Exporto um JSON com camadas, marcadores e rotas; importação ainda não existe.
$('export').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='dayz-mapa-dados.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};// Ferramentas contextuais, mantendo a lógica existente de dados locais.
// Alterno a visibilidade do painel de ferramentas.
$('togglePanel').onclick=()=>{$('layout').classList.toggle('compact');$('togglePanel').setAttribute('aria-expanded',String(!$('layout').classList.contains('compact')))};
// Transfiro uma posição clicada para os campos de coordenadas.
function choosePoint(p){const c=coord(p.x,p.y);$('x').value=c.x;$('y').value=c.z;return c}
// Posiciono o menu contextual dentro da área visível do mapa.
function openContext(e){e.preventDefault();const p=worldPos(e);if(p.x<0||p.y<0||p.x>SIZE||p.y>SIZE)return;contextPoint=choosePoint(p);const box=$('context'),r=vp.getBoundingClientRect();box.style.left=Math.max(0,Math.min(e.clientX-r.left,r.width-205))+'px';box.style.top=Math.max(0,Math.min(e.clientY-r.top,r.height-155))+'px';box.style.display='block'}
// Ativo o menu de contexto e fecho-o ao clicar fora.
vp.addEventListener('contextmenu',openContext);
vp.addEventListener('pointerdown',e=>{if(!e.target.closest('#context'))$('context').style.display='none'},true);
// Crio um marcador na posição selecionada pelo menu de contexto.
$('ctxMarker').onclick=()=>{if(!contextPoint)return;$('markerName').value=prompt('Nome do marcador:','Marcador')||'Marcador';$('addMarker').click();$('context').style.display='none'};
// Acrescento um ponto à rota temporária usando o menu contextual.
$('ctxRoute').onclick=()=>{if(!contextPoint)return;if(!routeDraft)$('route').click();routeDraft.points.push({...contextPoint});renderMap();$('context').style.display='none'};
// Copio coordenadas para a área de transferência, com alternativa manual.
$('ctxCopy').onclick=async()=>{if(!contextPoint)return;try{await navigator.clipboard.writeText(contextPoint.x+', '+contextPoint.z)}catch{prompt('Copiar coordenadas:',contextPoint.x+', '+contextPoint.z)}$('context').style.display='none'};
$('markerTool').onclick=()=>{$('layout').classList.remove('compact');$('markerName').focus()};
$('routeTool').onclick=()=>{(routeDraft?$('endRoute'):$('route')).click()};
renderPalette();renderLayers();renderMap();transform();
